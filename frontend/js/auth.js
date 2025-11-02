// Authentication UI & logic

const showLogin = () => { const m=document.getElementById('loginModal'); if(m){ m.style.display='block'; const f=document.getElementById('loginForm'); if(f) f.reset(); }};
const showRegister = () => { const m=document.getElementById('registerModal'); if(m){ m.style.display='block'; const f=document.getElementById('registerForm'); if(f) f.reset(); }};
const hideModals = () => { document.querySelectorAll('.modal').forEach(m=>m.style.display='none'); };

const login = async (email, password) => {
  const r = await api.post('/auth/login', { email, password });
  if (r && r.success) {
    const { user, accessToken, refreshToken, needsApproval } = r.data;
    api.setToken(accessToken); localStorage.setItem('ebookdz_refresh_token', refreshToken); api.setUser(user); hideModals();
    showNotification(needsApproval? 'Account pending admin approval':'Login successful!','success');
    redirectToDashboard(user);
  } else {
    showNotification((r && r.message) || 'Login failed','error');
  }
};

const register = async (userData) => {
  const r = await api.post('/auth/register', userData);
  if (r && r.success) { showNotification('Registration successful! Account pending admin approval.','success'); hideModals(); showLogin(); }
  else { showNotification((r && r.message) || 'Registration failed','error'); }
};

const logout = async () => { try { await api.post('/auth/logout'); } catch(e){} finally { api.removeToken(); showNotification('Logged out successfully','success'); window.location.href='/'; } };

const redirectToDashboard = (user) => {
  if (user.status !== 'approved') return showPendingApproval();
  if (user.role === 'admin') return showAdminDashboard();
  if (user.role === 'vendor') return showVendorDashboard();
  return showClientDashboard();
};

document.addEventListener('DOMContentLoaded', () => {
  const lf=document.getElementById('loginForm'); if(lf){ lf.addEventListener('submit', async (e)=>{e.preventDefault(); const d=new FormData(lf); await login(d.get('email'), d.get('password'));}); }
  const rf=document.getElementById('registerForm'); if(rf){ rf.addEventListener('submit', async (e)=>{e.preventDefault(); const d=new FormData(rf); await register({ email:d.get('email'), password:d.get('password'), firstName:d.get('firstName'), lastName:d.get('lastName'), phone:d.get('phone'), role:d.get('role')||'client' });}); }
  if (auth.isLoggedIn()) { updateNavigation(auth.getUser()); }
});