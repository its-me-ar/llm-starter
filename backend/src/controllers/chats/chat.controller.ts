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
    } catch (error) {
        console.error(error);

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};