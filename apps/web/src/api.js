const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const SERVER_ORIGIN = API_BASE.replace(/\/api$/, '');
export const fileUrl = (p) => (p ? `${SERVER_ORIGIN}${p}` : '');
export const proofFileUrl = (id) => `${API_BASE}/proofs/${id}/file`;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined });
  } catch {
    throw new ApiError(`Cannot reach the ProofLoop API at ${API_BASE}. Start the backend (npm run dev) and make sure MongoDB is running.`, 0);
  }
  let data = {};
  try { data = await response.json(); } catch { /* empty body */ }
  if (!response.ok) throw new ApiError(data.message || `Request failed (${response.status})`, response.status);
  return data;
}
