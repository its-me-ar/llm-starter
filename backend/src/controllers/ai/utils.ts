import { genAIService } from "../../services/genai";
import { Chunk, EmbeddedChunk, RetrievedChunk } from "./types";

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, val, index) => {
    return sum + val * b[index];
  }, 0);
}

function magnitude(vec: number[]) {
  return Math.sqrt(
    vec.reduce((sum, val) => {
      return sum + val * val;
    }, 0),
  );
}

export function cosineSimilarity(a: number[], b: number[]) {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  return dot / (magA * magB);
}

export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50,
): Chunk[] {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < words.length) {
    const end = start + chunkSize;

    const chunk = words.slice(start, end);

    chunks.push({
      chunk_index: chunkIndex,
      text: chunk.join(" "),
      char_start: start,
      char_end: end,
    });

    start += chunkSize - overlap;
    chunkIndex++;
  }

  return chunks;
}


export async function generateChunkEmbeddings(
  chunks: Chunk[]
): Promise<EmbeddedChunk[]> {

  const embeddedChunks: EmbeddedChunk[] = [];

  for (const chunk of chunks) {

    const resp = await genAIService.embeddings(chunk.text);

    const embedding =
      resp.embeddings?.[0]?.values;

    if (!embedding || !Array.isArray(embedding)) {
      continue;
    }

    console.log(embedding.length)
    embeddedChunks.push({
      chunk_index: chunk.chunk_index,
      text: chunk.text,
      word_start: chunk.char_start,
      word_end: chunk.char_end,
      embedding
    });
  }

  return embeddedChunks;
}

export function buildContext(
  chunks: RetrievedChunk[]
): string {

  return chunks
    .map((chunk) => chunk.content)
    .join("\n\n");
}

export function buildConversationHistory(
  messages: any[]
) {

  return messages
    .reverse()
    .map(
      (msg) =>
        `${msg.role}: ${msg.message}`
    )
    .join("\n");
}

