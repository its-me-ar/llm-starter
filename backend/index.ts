import "dotenv/config";
import express from "express";
import router from "./src/routers";
import bodyParser from "body-parser";
import morgan from "morgan";

const app = express();
const env = process.env.NODE_ENV === "development" ? "dev" : "combined";

const PORT = process.env.PORT || 3000;
app.use(morgan(env));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use("/api", router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});