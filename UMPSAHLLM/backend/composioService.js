// Composio integration for UMPSAHLLM.
// Standardized on the composio-core SDK. Degrades gracefully when COMPOSIO_API_KEY
// is not configured so the backend never crashes on startup.

const HAS_KEY = !!process.env.COMPOSIO_API_KEY;

let composio = null;
try {
  const { Composio } = require('composio-core');
  composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY || 'dummy_key_for_dev' });
  console.log(HAS_KEY ? '🟢 Composio SDK initialized' : '⚠️ Composio SDK loaded WITHOUT an API key (set COMPOSIO_API_KEY)');
} catch (e) {
  console.warn('⚠️ Composio SDK unavailable:', e.message);
}

function ensureReady() {
  if (!composio) throw new Error('Composio SDK not installed/initialized.');
  if (!HAS_KEY) throw new Error('COMPOSIO_API_KEY is not configured on the NAS.');
}

/**
 * Fetch available tools for a given integration (e.g. "github", "gmail").
 */
async function getTools(appName) {
  try {
    ensureReady();
    return await composio.apps.getTools(appName);
  } catch (error) {
    console.error(`[Composio] getTools(${appName}) failed:`, error.message);
    return [];
  }
}

/**
 * List the apps the user has connected accounts for.
 */
async function getConnections() {
  try {
    ensureReady();
    const connections = await composio.connectedAccounts.list();
    return connections.items ? connections.items.map((c) => c.appName) : [];
  } catch (error) {
    console.error('[Composio] getConnections failed:', error.message);
    return []; // Safe fallback so the UI still renders.
  }
}

/**
 * Kick off an OAuth connection flow for an app, returning the redirect URL.
 */
async function initiateConnection(appName, entityId = 'default') {
  try {
    ensureReady();
    const redirectBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const connection = await composio.connectedAccounts.initiate({
      appName,
      authConfigIds: [],
      redirectUrl: `${redirectBase}/integrations`,
    });
    return connection.redirectUrl;
  } catch (error) {
    console.error(`[Composio] initiateConnection(${appName}) failed:`, error.message);
    // Fall back to the Composio dashboard so the user can connect manually.
    return 'https://dashboard.composio.dev/';
  }
}

/**
 * Execute a specific tool action via Composio.
 */
async function executeAction(actionName, params = {}, entityId = 'default') {
  ensureReady();
  return await composio.actions.execute({ action: actionName, params });
}

module.exports = {
  getTools,
  getConnections,
  initiateConnection,
  executeAction,
};
