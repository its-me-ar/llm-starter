import { z } from 'zod';

export const startChatSchema = z.object({
    message: z.string().min(1, "Message is required"),
    temperature: z.number().min(0).max(1).optional().default(0.7),
})