import axios from "axios";
import "dotenv/config";

export async function generateAnswer(question, contextText) {
  const prompt = `
You are an AI assistant for the portfolio website of Amey Lokhande.
Use ONLY the context provided to answer the question accurately.

CONTEXT:
${contextText}

QUESTION:
${question}

If the answer is not available in the context, say: 
"I don't have enough information based on Amey's data."
`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0  // precise answers only
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  return response.data.choices[0].message.content;
}
