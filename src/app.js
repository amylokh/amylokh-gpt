import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`amylokh-gpt backend running on port ${PORT}`);
});