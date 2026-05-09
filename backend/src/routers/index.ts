import ChatRouter from "./chat.router"
import { Router } from "express"
import AIRouter from "./ai.router"
import V2Router from "./v2"

const router = Router()

router.use("/chat", ChatRouter)
router.use("/ai", AIRouter)
router.use("/v2", V2Router)

export default router