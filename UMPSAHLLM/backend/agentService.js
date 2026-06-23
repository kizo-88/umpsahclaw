// Agentic chat: lets the cloud (OpenAI-compatible) model call Composio tools for the
// user's connected apps, looping until it produces a final answer.
//
// Fully defensive: with no CLOUD_LLM_API_KEY it returns a clear message; with no
// COMPOSIO_API_KEY / no connected apps / SDK mismatch it falls back to plain chat.
// It can never crash the server.

const axios = require('axios');

let OpenAIToolSet = null;
try { ({ OpenAIToolSet } = require('composio-core')); } catch (e) { /* optional */ }

const apiKey = () => process.env.CLOUD_LLM_API_KEY;
const baseURL = () => process.env.CLOUD_LLM_BASE_URL || 'https://api.openai.com/v1';
const model = () => process.env.CLOUD_LLM_MODEL || 'gpt-4o-mini';

async function chatCompletion(messages, tools) {
  const body = { model: model(), messages };
  if (tools && tools.length) { body.tools = tools; body.tool_choice = 'auto'; }
  const r = await axios.post(`${baseURL()}/chat/completions`, body, {
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    timeout: 60000,
  });
  return r.data;
}

async function agentChat({ messages, apps = [], maxSteps = 5 }) {
  if (!apiKey()) {
    return { response: '[System]: Cloud Engine API Key missing. Set CLOUD_LLM_API_KEY on the NAS.' };
  }

  let toolset = null;
  let tools = [];
  if (OpenAIToolSet && process.env.COMPOSIO_API_KEY && apps.length) {
    try {
      toolset = new OpenAIToolSet({ apiKey: process.env.COMPOSIO_API_KEY });
      tools = await toolset.getTools({ apps });
    } catch (e) {
      console.warn('[agent] Composio tools unavailable; continuing as plain chat:', e.message);
      tools = [];
      toolset = null;
    }
  }

  const convo = [...messages];
  for (let step = 0; step < maxSteps; step++) {
    const data = await chatCompletion(convo, tools);
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) return { response: '[No response from model]' };
    convo.push(msg);

    if (msg.tool_calls && msg.tool_calls.length && toolset) {
      try {
        const toolResults = await toolset.handleToolCall(data);
        const results = Array.isArray(toolResults) ? toolResults : [toolResults];
        msg.tool_calls.forEach((tc, i) => {
          convo.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(results[i] ?? results) });
        });
        continue; // let the model use the tool results
      } catch (e) {
        return { response: `[Tool execution error]: ${e.message}`, steps: step + 1 };
      }
    }
    return { response: msg.content || '', steps: step + 1 };
  }
  return { response: '[Agent reached the step limit without a final answer]', steps: maxSteps };
}

module.exports = { agentChat };
