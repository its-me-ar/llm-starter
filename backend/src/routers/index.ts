import ChatRouter from "./chat.router"
import { Router } from "express"

const router = Router()

router.use("/chat", ChatRouter)

export default router