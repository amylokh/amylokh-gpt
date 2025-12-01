import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embeddings.js";
import "dotenv/config";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Generate multiple search queries from a single question
async function expandQuery(question) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a query expansion expert. Generate 3-4 alternative phrasings of the user question to improve search results. Return only the queries, one per line, without numbering.",
        },
        {
          role: "user",
          content: `Original question: "${question}"\n\nGenerate alternative search queries:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const expandedQueries = response.data.choices[0].message.content
    .split("\n")
    .filter((q) => q.trim().length > 0);

  return [question, ...expandedQueries];
}

// Retrieve context using multiple query variations
export async function retrieveContext(question) {
  try {
    // Step 1: Expand the query
    const queries = await expandQuery(question);
    console.log("Expanded queries:", queries);

    // Step 2: Retrieve documents for each query
    const allDocs = [];
    for (const query of queries) {
      const queryEmbedding = await generateEmbedding(query);

      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_count: 10,
        match_threshold: 0.2,
      });

      if (error) throw error;
      allDocs.push(...data);
    }

    // Step 3: Deduplicate and re-rank
    const uniqueDocs = deduplicateDocs(allDocs);
    const rankedDocs = uniqueDocs
      .map((doc) => ({
        ...doc,
        relevanceScore: calculateRelevanceScore(doc, question),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Keep top 5 after re-ranking

    return rankedDocs;
  } catch (error) {
    console.error("Error retrieving context:", error);
    throw error;
  }
}

// Remove duplicate documents
function deduplicateDocs(docs) {
  const seen = new Set();
  return docs.filter((doc) => {
    const id = `${doc.id}-${doc.title}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function calculateRelevanceScore(doc, question) {
  // Similarity score (already in doc.similarity from Supabase)
  const similarityScore = doc.similarity || 0;

  // Content quality: longer, more detailed content scores higher
  const contentLength = doc.content?.length || 0;
  const contentQuality = Math.min(contentLength / 500, 1); // Normalize to 0-1

  // Keyword matching: bonus if question keywords appear in title/content
  const keywords = question.toLowerCase().split(" ");
  const titleContent = `${doc.title} ${doc.content}`.toLowerCase();
  const keywordMatches = keywords.filter((kw) =>
    titleContent.includes(kw)
  ).length;
  const keywordScore = Math.min(keywordMatches / keywords.length, 1);

  // Weighted combination
  const finalScore =
    similarityScore * 0.6 + // Semantic similarity (60%) - from embeddings
    contentQuality * 0.2 + // Content depth (20%) - longer = more detailed
    keywordScore * 0.2; // Keyword matching (20%) - question words in content

  return finalScore;
}
