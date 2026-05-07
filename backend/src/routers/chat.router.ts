import { Router } from "express";
import { startChat, streamChat } from "../controllers/chats/chat.controller";
import { validateSchema } from "../middleware/validate-schema";
import { startChatSchema } from "../controllers/chats/chats.schema";

const router = Router();

router.post("/", validateSchema(startChatSchema), startChat);
router.post("/stream", validateSchema(startChatSchema), streamChat);

export default router;