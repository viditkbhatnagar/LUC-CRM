// Fetch wrapper. Same-origin cookie auth (credentials:'include'); sends the
// X-Requested-With guard header on state-changing requests (04 §5). Non-2xx
// responses throw an ApiError carrying the server's { code, message, details }.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);

  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code, e.message, e.details ?? data?.existingLead);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  // multipart upload (documents → storage adapter)
  upload: async (path, formData) => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: formData,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const e = data?.error || {};
      throw new ApiError(res.status, e.code, e.message, e.details);
    }
    return data;
  },
};

export default api;
