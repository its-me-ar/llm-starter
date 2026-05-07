import { GoogleGenAI } from "@google/genai";

export class GenAIService {
    private client: GoogleGenAI | null = null;
    private modelName: string | null = null;

    constructor() {
        // Initialization is deferred until first use to ensure env vars are loaded
    }

    private init() {
        if (this.client) return;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not defined in environment variables");
        }
        this.client = new GoogleGenAI({ apiKey: apiKey || "" });
        this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    }

    /**
     * Generates content using the configured model.
     * In the new @google/genai SDK, we use client.models.generateContent directly.
     */
    public async generateContent(prompt: string, temperature: number = 0.7, maxOutputTokens: number = 100000, systemInstruction: string = 'You are a helpful coding assistant') {
        this.init();
        if (!this.client) throw new Error("GenAI client not initialized");

        return this.client.models.generateContent({
            model: this.modelName!,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: temperature,
                maxOutputTokens: maxOutputTokens,
                systemInstruction: systemInstruction
            }
        });
    }

    public async generateContentStream(prompt: string, temperature: number = 0.7, maxOutputTokens: number = 100000, systemInstruction: string = 'You are a helpful coding assistant') {
        this.init();
        if (!this.client) throw new Error("GenAI client not initialized");

        return this.client.models.generateContentStream({
            model: this.modelName!,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: temperature,
                maxOutputTokens: maxOutputTokens,
                systemInstruction: systemInstruction
            }
        });
    }
}

// Exporting a singleton instance for use throughout the application.
export const genAIService = new GenAIService();