import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { genAIService } from "../../services/genai";
import { FileService } from "../../services/FileService";
import {
  buildContext,
  buildConversationHistory,
  chunkText,
  cosineSimilarity,
  generateChunkEmbeddings,
} from "./utils";
import { PDFParse } from "pdf-parse";
import { aiRepository } from "../../repositories/ai.repository";

interface Item {
  id: number;
  text: string;
  embedding: number[];
}

const fileService = new FileService();
let items: Item[] = [];

// Load embeddings on startup
(async () => {
  try {
    items = await fileService.loadEmbeddings();
    console.log(`Loaded ${items.length} embeddings from file`);
  } catch (error) {
    console.error("Failed to load embeddings:", error);
    items = [];
  }
})();

export const addText = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const trimText = text.trim();

    const resp = await genAIService.embeddings(trimText);
    const embeddingValues = resp.embeddings?.[0]?.values;

    if (!embeddingValues || !Array.isArray(embeddingValues)) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to generate embeddings" });
    }
    const newId = items.length + 1;

    items.push({
      id: newId,
      text: trimText,
      embedding: embeddingValues,
    });

    // Save embeddings to file
    try {
      await fileService.saveEmbeddings(items);
    } catch (saveError) {
      console.error("Failed to save embeddings:", saveError);
      // Don't fail the request if save fails, just log it
    }

    return res.status(StatusCodes.OK).json({
      message: "Text added successfully",
      item: {
        id: newId,
        text: trimText,
      },
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;

    res
      .status(status)
      .json({ message: error.message || "Internal server error" });
  }
};

export const searchText = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    if (!search)
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Search query is required",
      });

    const queryText = search.toString().trim();
    const resp = await genAIService.embeddings(queryText);

    const queryEmbedding = resp.embeddings?.[0]?.values;

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to generate query embeddings" });
    }

    const results = items.map((item) => {
      const score = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        id: item.id,
        text: item.text,
        score: Number(score.toFixed(4)),
      };
    });
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 3);

    return res.status(StatusCodes.OK).json({
      message: "Top Results",
      results: topResults,
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;

    res
      .status(status)
      .json({ message: error.message || "Internal server error" });
  }
};

export const getAllEmbeddings = async (req: Request, res: Response) => {
  try {
    return res.status(StatusCodes.OK).json({
      message: "All embeddings retrieved successfully",
      items: items.map((item) => ({
        id: item.id,
        text: item.text,
        // Optionally exclude embedding vectors if they're too large
        // embedding: item.embedding
      })),
      count: items.length,
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;

    res
      .status(status)
      .json({ message: error.message || "Internal server error" });
  }
};

export const uploadPDF = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No file uploaded",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Only PDF files are allowed",
      });
    }

    // Parse PDF
    const parser = new PDFParse({ data: req.file.buffer });

    const pdfData = await parser.getText();
    const extractedText = pdfData.text;

    const chunks = chunkText(extractedText);

    const embeddedChunks = await generateChunkEmbeddings(chunks);

    // Insert all chunks concurrently
    const results = await Promise.all(
      embeddedChunks.map((chunk) => {
        return aiRepository.insertChunk({
          source_file: req.file!.originalname,
          chunk_index: chunk.chunk_index,
          content: chunk.text,
          embedding: chunk.embedding,
        });
      }),
    );

    // Log insert errors if any
    results.forEach((result) => {
      if (result.error) {
        console.error(result.error);
      }
    });

    return res.status(StatusCodes.OK).json({
      message: "PDF parsed successfully",
      fileName: req.file.originalname,
      fileSize: req.file.size,
      pages: pdfData.total,
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;

    res
      .status(status)
      .json({ message: error.message || "Failed to parse PDF" });
  }
};

export const ask = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      question,
      topN,
      session_id,
    } = req.query as { question: string; topN?: string; session_id: string };

    const SIMILARITY_THRESHOLD = 0.5;

    // Validate question
    if (!question) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({
          message:
            "Question is required",
        });
    }

    // Validate session
    if (!session_id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({
          message:
            "Session ID is required",
        });
    }

    const sessionResp =
      await aiRepository.validateSession(
        session_id as string
      );

    if (!sessionResp?.data) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({
          message:
            "Invalid session ID",
        });
    }

    // Validate topN
    const matchCount = Math.min(
      Number(topN) || 5,
      10
    );

    const queryText =
      question.toString().trim();

    // Load conversation history FIRST
    const historyResp =
      await aiRepository.getRecentMessages(
        session_id as string
      );

    const history =
      buildConversationHistory(
        historyResp.data || []
      );

    // Generate embedding
    const embeddingResp =
      await genAIService.embeddings(
        queryText
      );

    const queryEmbedding =
      embeddingResp.embeddings?.[0]
        ?.values;

    if (
      !queryEmbedding ||
      !Array.isArray(queryEmbedding)
    ) {

      return res
        .status(
          StatusCodes.INTERNAL_SERVER_ERROR
        )
        .json({
          message:
            "Failed to generate query embedding",
        });
    }

    // Save user message
    await aiRepository.saveMessage({
      session_id:
        session_id as string,

      role: "user",

      message: queryText,
    });

    // Retrieve chunks
    const { data, error } =
      await aiRepository.matchDocuments(
        queryEmbedding,
        matchCount
      );

    if (error) {

      console.error(error);

      return res
        .status(
          StatusCodes.INTERNAL_SERVER_ERROR
        )
        .json({
          message:
            "Failed to retrieve documents",
        });
    }

    // No chunks found
    if (!data || data.length === 0) {

      return res
        .status(StatusCodes.OK)
        .json({
          message:
            "Not found in document",

          answer:
            "I don't know.",

          results: [],
        });
    }

    // Filter low similarity
    const filteredChunks =
      data.filter(
        (chunk: any) =>
          chunk.similarity >=
          SIMILARITY_THRESHOLD
      );

    // No relevant chunks
    if (
      filteredChunks.length === 0
    ) {

      return res
        .status(StatusCodes.OK)
        .json({
          message:
            "No relevant context found",

          answer:
            "I don't know.",

          results: [],
        });
    }

    // Build RAG context
    const context =
      buildContext(filteredChunks);

    // Final prompt
    const prompt = `
You are a helpful document assistant.

Rules:
- Answer ONLY using provided context
- Never fabricate information
- If answer missing say:
  "I don't know."
- Cite chunk indexes when possible
- Keep answers concise

Previous Conversation:
${history}

Context:
${context}

Question:
${queryText}
`;


    console.log(prompt);

    // Generate answer
    const finalResponse =
      await genAIService
        .generatePdfResponse({
          prompt,
        });

    const answer =
      finalResponse?.text?.trim() ||
      "I don't know.";

    // Save assistant response
    await aiRepository.saveMessage({
      session_id:
        session_id as string,

      role: "assistant",

      message: answer,
    });

    return res
      .status(StatusCodes.OK)
      .json({

        message:
          "Answer generated successfully",

        question:
          queryText,

        answer,

        totalMatches:
          filteredChunks.length,

        sources:
          filteredChunks.map(
            (chunk: any) => ({
              chunk_index:
                chunk.chunk_index,

              source_file:
                chunk.source_file,

              similarity:
                Number(
                  chunk.similarity.toFixed(
                    4
                  )
                ),

              preview:
                chunk.content.slice(
                  0,
                  200
                ),
            })
          ),
      });

  } catch (error: any) {

    console.error(error);

    const status =
      error.status ||
      StatusCodes.INTERNAL_SERVER_ERROR;

    return res.status(status).json({
      message:
        error.message ||
        "Internal server error",
    });
  }
};


export const conversation = async (req: Request, res: Response) => {
  try {

    const resp = await aiRepository.createSession();
    if (resp.success) {
      return res.status(StatusCodes.OK).json({
        message: "Conversation created successfully",
        session_id: resp?.data?.id,
      });
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to create conversation",
      });
    }
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;

    res
      .status(status)
      .json({ message: error.message || "Internal server error" });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { data, error } = await aiRepository.getSessions();
    if (error) throw error;

    return res.status(StatusCodes.OK).json({
      message: "Sessions retrieved successfully",
      sessions: data,
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};

export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { data, error } = await aiRepository.getSessionMessages(id);
    if (error) throw error;

    return res.status(StatusCodes.OK).json({
      message: "Messages retrieved successfully",
      messages: data,
    });
  } catch (error: any) {
    console.error(error);
    const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};