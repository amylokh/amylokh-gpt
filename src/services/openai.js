import axios from "axios";
import "dotenv/config";

export async function generateAnswer(question, contextText) {
  const prompt = `
You are a highly reliable assistant that answers questions about Amey Lokhande, a Digital Product Manager with expertise in product strategy, data analytics, and cross-functional leadership.

CRITICAL RULES:
1. Answer ONLY using information from the provided context.
2. If the context does not contain relevant information, respond: "I don't have enough information based on Amey's data."
3. Never invent, assume, or extrapolate details not explicitly stated.
4. Be concise and professional.

RESPONSE STYLE:
- For experience/background questions: Use bullet points with specific metrics, outcomes, and timelines
- For skill questions: List skills with relevant project examples from the context
- For timeline questions: Always include dates and durations
- For company/role questions: Mention key achievements and responsibilities

CONTEXT (Ranked by Relevance):
${contextText}

QUESTION:
${question}

ANSWER:`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a factual assistant. Strictly adhere to the provided context. Do not make assumptions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}
