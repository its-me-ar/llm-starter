import ChatRouter from "./chat.router"
import { Router } from "express"
import AIRouter from "./ai.router"

const router = Router()

router.use("/chat", ChatRouter)
router.use("/ai", AIRouter)

export default router