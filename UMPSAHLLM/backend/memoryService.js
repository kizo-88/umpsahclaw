const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// MEMORY_DB_PATH lets the SQLite DB live on a mounted volume so memories survive
// container rebuilds (default keeps the old in-image location for back-compat).
const DB_PATH = process.env.MEMORY_DB_PATH || path.join(__dirname, 'memory.sqlite');
const VAULT_PATH = process.env.VAULT_PATH || path.join(__dirname, 'vault');

// Ensure the DB directory and Vault directory exist
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(VAULT_PATH)) {
  fs.mkdirSync(VAULT_PATH, { recursive: true });
}

// Initialize SQLite DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite Memory DB:', err.message);
  } else {
    console.log('Connected to SQLite Memory DB.');
    initSchema();
  }
});

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt TEXT NOT NULL,
      consensus TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function saveToMemory(prompt, consensus) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO interactions (prompt, consensus) VALUES (?, ?)`;
    db.run(query, [prompt, consensus], function(err) {
      if (err) {
        return reject(err);
      }
      
      const id = this.lastID;
      
      // Save Obsidian Markdown file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Interaction_${timestamp}.md`;
      const mdContent = `---
id: ${id}
date: ${new Date().toISOString()}
tags: [interaction, consensus]
---

# Prompt
${prompt}

## Consensus
${consensus}
`;
      
      fs.writeFileSync(path.join(VAULT_PATH, filename), mdContent, 'utf-8');
      
      resolve(id);
    });
  });
}

function getAllMemories() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM interactions ORDER BY timestamp DESC`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  saveToMemory,
  getAllMemories
};
