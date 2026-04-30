import { openDB } from 'idb';

const DB_NAME = 'umpsahllm_vault';
const STORE_NAME = 'messages';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const storageService = {
  async saveMessages(sessionId, messages) {
    const db = await dbPromise;
    return db.put(STORE_NAME, messages, sessionId);
  },

  async getMessages(sessionId) {
    const db = await dbPromise;
    return db.get(STORE_NAME, sessionId) || [];
  },

  async deleteMessages(sessionId) {
    const db = await dbPromise;
    return db.delete(STORE_NAME, sessionId);
  }
};
