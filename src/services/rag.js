import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embeddings.js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function retrieveContext(question) {
  const questionEmbedding = await generateEmbedding(question);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: questionEmbedding,
    match_count: 15, // Retrieve more candidates for re-ranking
    match_threshold: 0.2,
  });

  if (error) throw error;

  // Re-ranking: Score documents by semantic relevance + content quality
  const rankedDocs = data
    .map((doc) => ({
      ...doc,
      relevanceScore: calculateRelevanceScore(doc, question),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Keep top 5 after re-ranking

  return rankedDocs;
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
