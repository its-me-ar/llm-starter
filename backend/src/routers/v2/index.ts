import { Router } from "express";
import AIRouter from "./ai.router";

const router = Router();

router.use("/ai", AIRouter);

export default router;
