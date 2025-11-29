import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// embedding function
async function embed(text) {
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-3-small",
      input: text
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return response.data.data[0].embedding;
}

// main ingestion function
async function ingest() {
  const raw = fs.readFileSync("knowledge-base/resume.json", "utf8");
  const docs = JSON.parse(raw);

  for (const doc of docs) {
    const embedding = await embed(doc.content);

    await supabase.from("documents").upsert({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      embedding
    });

    console.log(`Uploaded: ${doc.id}`);
  }
}

ingest();
