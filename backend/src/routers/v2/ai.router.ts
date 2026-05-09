import { Router } from "express";
import { addText, searchText, getAllEmbeddings, uploadPDF, ask, conversation, getSessions, getSessionMessages } from "../../controllers/ai/ai.controller";
import { validateSchema } from "../../middleware/validate-schema";
import { addTextSchema } from "../../controllers/ai/ai.schema";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/text", validateSchema(addTextSchema), addText);
router.get("/text", searchText);
router.get("/embeddings", getAllEmbeddings);
router.post("/upload", upload.single("pdf"), uploadPDF);
router.get("/ask", ask);
router.post("/conversation", conversation);
router.get("/sessions", getSessions);
router.get("/sessions/:id/messages", getSessionMessages);

export default router;
