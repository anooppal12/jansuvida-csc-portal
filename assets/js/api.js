const JansuvidaAPI = (() => {
  const base = (window.JANSUVIDA_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
  const tokenKey = 'jansuvida_access_token';
  async function request(path, options = {}) {
    const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
    const token = localStorage.getItem(tokenKey);
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + path, { ...options, headers });
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    return data;
  }
  return {
    base,
    async register(payload) { return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }); },
    async login(payload) { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }); localStorage.setItem(tokenKey, data.accessToken); localStorage.setItem('jansuvida_customer', JSON.stringify(data.customer)); return data; },
    logout() { localStorage.removeItem(tokenKey); localStorage.removeItem('jansuvida_customer'); },
    async services() { return request('/services'); },
    async applications() { return request('/applications'); },
    async application(no) { return request('/applications/' + encodeURIComponent(no)); },
    async createApplication(payload) { return request('/applications', { method: 'POST', body: JSON.stringify(payload) }); },
    async documents(applicationId) { return request('/documents/application/' + applicationId); },
    async addDocument(payload) { return request('/documents', { method: 'POST', body: JSON.stringify(payload) }); },
    async payments() { return request('/payments'); },
    async createPayment(payload) { return request('/payments', { method: 'POST', body: JSON.stringify(payload) }); }
  };
})();