// Embeddings-based retrieval over the Markdown Vault synced to Supabase (pgvector).
//
// Uses Ollama embeddings (default model: nomic-embed-text) to embed files from 
// the NAS vault and stores them in Supabase. Performs vector similarity search 
// on Supabase via match_documents RPC. Falls back to local keyword search if offline.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const VAULT_DIR = process.env.VAULT_PATH || path.resolve(__dirname, 'vault');

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// supabase-js eagerly builds a RealtimeClient, which needs a global WebSocket. Node < 22
// has none, so createClient() throws during require() and takes the whole process down.
// We only ever use .from()/.rpc(), never realtime — so hand it `ws` when the global is
// missing, and degrade to local search if init fails for any other reason.
let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    let realtime;
    if (typeof globalThis.WebSocket === 'undefined') {
      realtime = { transport: require('ws') };
    }
    supabase = createClient(supabaseUrl, supabaseKey, realtime ? { realtime } : undefined);
  } catch (err) {
    supabase = null;
    console.warn(`[rag] Supabase client init failed (${err.message}). Falling back to local search.`);
  }
} else {
  console.warn('[rag] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Supabase RAG disabled, falling back to local search.');
}

let embeddingsEnabled = true;

async function embed(ollama, text) {
  const res = await ollama.embeddings({ model: EMBED_MODEL, prompt: String(text).slice(0, 8000) });
  return res.embedding;
}

function listDocs() {
  if (!fs.existsSync(VAULT_DIR)) return [];
  return fs.readdirSync(VAULT_DIR).filter((f) => f.endsWith('.md'));
}

// Refresh the vault embedding index on Supabase
async function buildIndex(ollama) {
  if (!embeddingsEnabled || !supabase) return;
  
  for (const f of listDocs()) {
    const full = path.join(VAULT_DIR, f);
    const mtime = fs.statSync(full).mtimeMs;
    
    try {
      // Check if this version of the file is already embedded in Supabase
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id, metadata')
        .eq('metadata->>file', f)
        .maybeSingle();

      if (existingDoc && existingDoc.metadata && existingDoc.metadata.mtime === mtime) {
        continue; // Skip, already up to date
      }

      const text = fs.readFileSync(full, 'utf-8');
      const vector = await embed(ollama, text);
      
      const doc = {
        content: text,
        metadata: { file: f, mtime: mtime },
        embedding: vector
      };

      if (existingDoc) {
        // Update existing record
        await supabase.from('documents').update(doc).eq('id', existingDoc.id);
      } else {
        // Insert new record
        await supabase.from('documents').insert(doc);
      }
      console.log(`[rag] Synced ${f} to Supabase`);
    } catch (err) {
      console.error(`[rag] Failed to sync ${f} to Supabase:`, err.message);
    }
  }
}

function formatContext(docs) {
  if (!docs || !docs.length) return '';
  let ctx = '\n\n=== LONG TERM MEMORY (Vault) ===\nRelevant context from your Markdown Vault:\n';
  for (const d of docs) {
    const fileName = d.metadata ? d.metadata.file : 'Document';
    ctx += `\n--- ${fileName} ---\n${d.content || d.text}\n`;
  }
  return ctx;
}

function fallbackSearch(query, k) {
  const terms = String(query || '').toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const scored = listDocs().map((f) => {
    const full = path.join(VAULT_DIR, f);
    const text = fs.readFileSync(full, 'utf-8');
    const lower = text.toLowerCase();
    const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
    return { file: f, text, score, mtime: fs.statSync(full).mtimeMs };
  });
  scored.sort((a, b) => (b.score - a.score) || (b.mtime - a.mtime));
  return formatContext(scored.slice(0, k));
}

// Return the top-K most relevant vault docs for a query as a context string.
async function search(ollama, query, k = 3) {
  if (embeddingsEnabled && supabase) {
    try {
      await buildIndex(ollama);
      const qv = await embed(ollama, query || '');
      
      // Call the match_documents RPC function in Supabase
      const { data: ranked, error } = await supabase.rpc('match_documents', {
        query_embedding: qv,
        match_threshold: 0.3, // Similarity threshold
        match_count: k
      });

      if (error) throw error;
      
      return formatContext(ranked);
    } catch (e) {
      console.warn('[rag] Supabase embeddings search failed, falling back to keyword/recency:', e.message);
    }
  }
  return fallbackSearch(query, k);
}

module.exports = { search, buildIndex };
