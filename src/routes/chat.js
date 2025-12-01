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

    // Step 1: Retrieve and re-rank docs with query optimization
    const docs = await retrieveContext(question);

    // Step 2: Combine into context with relevance indicators
    const contextText = docs
      .map(
        (d) =>
          `[Relevance: ${(d.relevanceScore * 100).toFixed(0)}%]\nSection: ${d.title}\nSource: ${d.source}\n\n${d.content}`
      )
      .join("\n\n---\n\n");

    // Step 3: Generate final answer
    const answer = await generateAnswer(question, contextText);

    res.json({ reply: answer, docsUsed: docs.length });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
