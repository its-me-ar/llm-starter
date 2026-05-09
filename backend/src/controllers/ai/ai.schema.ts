import { z } from 'zod';

export const addTextSchema = z.object({
    text: z.string().min(1, "Text is required"),
})