import express from "express";
import { retrieveContext } from "../services/rag.js";
import { generateAnswer } from "../services/openai.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Step 1: Retrieve top docs
    const docs = await retrieveContext(question);

    // Step 2: Combine into a single context string
    const contextText = docs
  .map(d => `Section: ${d.title}\nSource: ${d.source}\n\n${d.content}`)
  .join("\n\n---\n\n");

    // Step 3: Generate final answer using GPT-4o Mini
    const answer = await generateAnswer(question, contextText);

    res.json({ reply: answer });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
