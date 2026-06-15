// Central API base for the UMPSAHLLM Node backend.
// Override per-environment with VITE_API_BASE (e.g. https://api.umpsahllm.com for production).
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3002';
