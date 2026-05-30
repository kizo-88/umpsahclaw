const { Composio } = require('composio-core');

// Initialize Composio SDK (Requires COMPOSIO_API_KEY in environment)
// Fallback to a placeholder so it doesn't crash if missing during local development
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY || 'dummy_key_for_dev'
});

/**
 * Fetch available tools for a given integration (e.g. "github", "gmail")
 */
async function getTools(appName) {
  try {
    const tools = await composio.apps.getTools(appName);
    return tools;
  } catch (error) {
    console.error(`Error fetching tools for ${appName}:`, error.message);
    return [];
  }
}

/**
 * Execute a specific tool action via Composio
 */
async function executeAction(actionName, params, entityId = "default") {
  try {
    const entity = await composio.getEntity(entityId);
    const result = await entity.execute(actionName, params);
    return result;
async function getConnections() {
  try {
    const connections = await composio.connectedAccounts.list();
    return connections.items ? connections.items.map(c => c.appName) : [];
  } catch (error) {
    console.error(`Error fetching connections:`, error.message || "Composio SDK Error");
    return []; // Safe fallback
  }
}

async function initiateConnection(appName, entityId = "default") {
  try {
    const connection = await composio.connectedAccounts.initiate({ 
        appName: appName, 
        authConfigIds: [],
        redirectUrl: "http://localhost:5173/integrations" 
    });
    return connection.redirectUrl;
  } catch (error) {
    console.error(`Error initiating connection for ${appName}:`, error.message || "Composio SDK Error");
    // Fallback if SDK fails
    console.log(`[ComposioService] Fallback to manual connection for ${appName}`);
    return `https://dashboard.composio.dev/`;
  }
}

async function executeAction(actionName, params, entityId = "default") {
  try {
    const actionResult = await composio.actions.execute({
      action: actionName,
      params: params
    });
    return actionResult;
  } catch (error) {
    console.error(`Error executing action ${actionName}:`, error.message || "Composio SDK Error");
    throw error;
  }
}

module.exports = {
  getTools,
  getConnections,
  initiateConnection,
  executeAction
};
