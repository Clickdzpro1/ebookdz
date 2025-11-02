// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

const api = {
  getToken: () => localStorage.getItem('ebookdz_token'),
  setToken: (t) => localStorage.setItem('ebookdz_token', t),
  removeToken: () => { localStorage.removeItem('ebookdz_token'); localStorage.removeItem('ebookdz_refresh_token'); localStorage.removeItem('ebookdz_user'); },
  getUser: () => { const u = localStorage.getItem('ebookdz_user'); return u ? JSON.parse(u) : null; },
  setUser: (u) => localStorage.setItem('ebookdz_user', JSON.stringify(u)),
  request: async (url, options = {}) => {
    const token = api.getToken();
    const config = { headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) , ...(options.headers||{}) }, ...options };
    if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);
    const resp = await fetch(`${API_BASE_URL}${url}`, config);
    if (resp.status === 401) { api.removeToken(); if (typeof showLogin === 'function') showLogin(); return null; }
    const data = await resp.json().catch(() => ({}));
    return { ...data, status: resp.status };
  },
  get: (u) => api.request(u),
  post: (u,b) => api.request(u,{method:'POST',body:b}),
  put: (u,b) => api.request(u,{method:'PUT',body:b}),
  patch: (u,b) => api.request(u,{method:'PATCH',body:b}),
  delete: (u) => api.request(u,{method:'DELETE'})
};

const auth = {
  isLoggedIn: () => !!api.getToken(),
  getUser: () => api.getUser(),
  hasRole: (r) => { const u = api.getUser(); return u && u.role === r; },
  isApproved: () => { const u = api.getUser(); return u && u.status === 'approved'; },
  canAccess: (res) => { const u = api.getUser(); if (!u) return false; if (u.role === 'admin') return true; const m={ 'vendor-dashboard':['vendor','admin'], 'admin-dashboard':['admin'], 'slickpay-config':['vendor','admin'], 'book-management':['vendor','admin'], 'user-approval':['admin']}; const roles=m[res]; return roles && roles.includes(u.role); }
};
