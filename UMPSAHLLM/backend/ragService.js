// Embeddings-based retrieval over the Markdown Vault.
//
// Uses Ollama embeddings (default model: nomic-embed-text — `ollama pull nomic-embed-text`)
// to semantically rank vault documents for a query. If the embedding model isn't
// available it transparently falls back to keyword-overlap + recency, so RAG always works.

const fs = require('fs');
const path = require('path');

const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text';
const VAULT_DIR = process.env.VAULT_PATH || path.resolve(__dirname, 'vault');

// In-memory index of { file, mtime, text, vector }. Rebuilt incrementally by mtime.
let index = [];
let embeddingsEnabled = true;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function embed(ollama, text) {
  const res = await ollama.embeddings({ model: EMBED_MODEL, prompt: String(text).slice(0, 8000) });
  return res.embedding;
}

function listDocs() {
  if (!fs.existsSync(VAULT_DIR)) return [];
  return fs.readdirSync(VAULT_DIR).filter((f) => f.endsWith('.md'));
}

// Refresh the vault embedding index (only re-embeds new/changed files).
async function buildIndex(ollama) {
  if (!embeddingsEnabled) return;
  const existing = new Map(index.map((e) => [e.file, e]));
  const next = [];
  for (const f of listDocs()) {
    const full = path.join(VAULT_DIR, f);
    const mtime = fs.statSync(full).mtimeMs;
    const prev = existing.get(f);
    if (prev && prev.mtime === mtime) { next.push(prev); continue; }
    const text = fs.readFileSync(full, 'utf-8');
    const vector = await embed(ollama, text);
    next.push({ file: f, mtime, text, vector });
  }
  index = next;
}

function formatContext(docs) {
  if (!docs.length) return '';
  let ctx = '\n\n=== LONG TERM MEMORY (Vault) ===\nRelevant context from your Markdown Vault:\n';
  for (const d of docs) ctx += `\n--- ${d.file} ---\n${d.text}\n`;
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
  if (embeddingsEnabled) {
    try {
      await buildIndex(ollama);
      if (index.length) {
        const qv = await embed(ollama, query || '');
        const ranked = index
          .map((e) => ({ file: e.file, text: e.text, score: cosine(qv, e.vector) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, k);
        return formatContext(ranked);
      }
    } catch (e) {
      console.warn('[rag] embeddings unavailable, falling back to keyword/recency:', e.message);
      embeddingsEnabled = false; // stop retrying the model this process lifetime
    }
  }
  return fallbackSearch(query, k);
}

module.exports = { search, buildIndex };
