const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Point the vault at a temp dir BEFORE requiring the service (it reads VAULT_PATH at load).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'umpsah-vault-'));
process.env.VAULT_PATH = tmp;
fs.writeFileSync(path.join(tmp, 'apples.md'), 'Apples are red fruit. Orchard harvest notes.');
fs.writeFileSync(path.join(tmp, 'cars.md'), 'Cars have engines and wheels. Traffic report.');

const rag = require('../ragService');

// Ollama mock whose embeddings throw -> forces the keyword/recency fallback path.
const ollamaThatFails = { embeddings: async () => { throw new Error('no embed model'); } };

test('search falls back to keyword ranking and finds the relevant doc', async () => {
  const ctx = await rag.search(ollamaThatFails, 'red fruit orchard', 1);
  assert.ok(ctx.includes('apples.md'), 'should surface the apples doc as top-1');
  assert.ok(!ctx.includes('cars.md'), 'should not surface the unrelated cars doc at k=1');
});

test('search always returns a string (even with no keyword match)', async () => {
  const ctx = await rag.search(ollamaThatFails, 'zzz nonexistent term', 1);
  assert.strictEqual(typeof ctx, 'string');
});

test('search uses embeddings when available and ranks by cosine similarity', async () => {
  // Deterministic fake embeddings: 2-d vectors keyed off whether the text mentions fruit.
  const fakeOllama = {
    embeddings: async ({ prompt }) => ({
      embedding: /fruit|apple|red|orchard/i.test(prompt) ? [1, 0] : [0, 1],
    }),
  };
  const ctx = await rag.search(fakeOllama, 'tell me about red fruit', 1);
  assert.ok(ctx.includes('apples.md'), 'embedding search should rank the fruit doc first');
});
