import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { genAIService } from "../../services/genai";

export const startChat = async (req: Request, res: Response) => {
    try {
        const { message, temperature } = req.body;

        const aiResponse = await genAIService.generateContent(message, temperature);

        const text =
            aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const result = {
            data: {
                reply: text,
                model: aiResponse.modelVersion,
                response_id: aiResponse.responseId,
                usage: {
                    input_tokens: aiResponse.usageMetadata?.promptTokenCount,
                    output_tokens: aiResponse.usageMetadata?.candidatesTokenCount,
                    tokens_used: aiResponse.usageMetadata?.totalTokenCount,
                },
                finish_reason: aiResponse?.candidates?.[0]?.finishReason,
                temperature: temperature,
            },
        };

        console.log("AI LOG:", result);

        res.status(StatusCodes.OK).json(result);
    } catch (error: any) {
        console.error(error);
        
        const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;
        let message = "Internal server error";

        if (status === 429) {
            message = "Quota exceeded. Please wait a moment and try again.";
        } else if (status === 404) {
            message = "AI Model not found. Please check your configuration.";
        }

        res.status(status).json({ message });
    }
};

export const streamChat = async (req: Request, res: Response) => {
    try {
        const { message, temperature } = req.body;

        const stream = await genAIService.generateContentStream(message, temperature);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        for await (const chunk of stream) {
            const token = chunk?.text;
            if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error: any) {
        console.error("Streaming Error:", error);
        
        const status = error.status || StatusCodes.INTERNAL_SERVER_ERROR;
        let message = "Internal server error";

        if (status === 429) {
            message = "Quota exceeded. Please wait a moment and try again.";
        } else if (status === 404) {
            message = "AI Model not found. Please check your configuration.";
        }

        // If headers are already sent, we can't send a JSON error, but we can write an error event
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            res.end();
        } else {
            res.status(status).json({ message });
        }
    }
};