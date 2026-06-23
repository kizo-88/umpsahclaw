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
  // Server-side conversation persistence (so history survives across devices).
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function listConversations(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title, createdAt, updatedAt FROM conversations WHERE userId = ? ORDER BY updatedAt DESC`,
      [userId || ''],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function getConversationMessages(conversationId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT role, content, createdAt FROM messages WHERE conversationId = ? ORDER BY id ASC`,
      [conversationId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function addMessage(conversationId, userId, role, content, title) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO conversations (id, userId, title) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP, title = COALESCE(conversations.title, excluded.title)`,
      [conversationId, userId || '', title || null],
      (err) => {
        if (err) return reject(err);
        db.run(
          `INSERT INTO messages (conversationId, role, content) VALUES (?, ?, ?)`,
          [conversationId, role, content],
          function (e) { return e ? reject(e) : resolve(this.lastID); }
        );
      }
    );
  });
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
  getAllMemories,
  listConversations,
  getConversationMessages,
  addMessage,
};
