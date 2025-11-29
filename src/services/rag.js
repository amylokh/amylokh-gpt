import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./embeddings.js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function retrieveContext(query) {
  // 1. Convert question to embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Call Supabase vector function
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.2,  // lower = more results
    match_count: 5
  });

  if (error) {
    console.error("Supabase retrieval error:", error);
    return [];
  }

  return data;
}
