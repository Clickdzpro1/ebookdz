// UI helpers and simple dashboards

const showNotification = (message, type = 'info') => {
  const n=document.createElement('div'); n.className=`notification notification--${type}`; n.innerHTML=`<span>${message}</span><button onclick="this.parentElement.remove()">&times;</button>`; (document.getElementById('notifications')||document.body).appendChild(n); setTimeout(()=>n.remove(),5000);
};

const updateNavigation = (user) => {
  const nav=document.querySelector('.nav'); if(!nav) return; const sec=nav.querySelector('.auth-section')||nav.querySelector('div:last-child');
  if(user){ sec.innerHTML=`<span>Welcome, ${user.firstName}!</span><button onclick="showDashboard()" class="ghost">Dashboard</button><button onclick="logout()" class="ghost">Logout</button>`; }
  else { sec.innerHTML=`<button onclick="showLogin()" class="ghost">Login</button><button onclick="showRegister()" class="cta">Sign Up</button>`; }
};

const showDashboard = () => { const u=auth.getUser(); if(u) redirectToDashboard(u); };

const showPendingApproval = () => {
  document.body.innerHTML = `
    <div class="pending-approval">
      <h2>Account Pending Approval</h2>
      <p>Your account is waiting for admin approval. You'll be notified once approved.</p>
      <button onclick="logout()" class="btn cta">Logout</button>
    </div>
  `;
};

const showAdminDashboard = () => {
  document.body.innerHTML = `
    <div class="dashboard admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div class="dashboard-grid">
        <div class="card"><h3>Pending Users</h3><div id="pendingUsers">Loading...</div></div>
        <div class="card"><h3>Platform Stats</h3><div id="platformStats">Loading...</div></div>
      </div>
    </div>`;
  loadAdminData();
};

const showVendorDashboard = () => {
  document.body.innerHTML = `
    <div class="dashboard vendor-dashboard">
      <h1>Vendor Dashboard</h1>
      <div class="dashboard-grid">
        <div class="card"><h3>My Books</h3><div id="vendorBooks">Loading...</div></div>
        <div class="card"><h3>Sales Analytics</h3><div id="salesAnalytics">Loading...</div></div>
        <div class="card"><h3>SlickPay Config</h3><div id="slickpayConfig">Loading...</div></div>
      </div>
    </div>`;
  loadVendorData();
};

const showClientDashboard = () => {
  document.body.innerHTML = `
    <div class="dashboard client-dashboard">
      <h1>My Library</h1>
      <div class="dashboard-grid">
        <div class="card"><h3>My Books</h3><div id="userLibrary">Loading...</div></div>
        <div class="card"><h3>Purchase History</h3><div id="purchaseHistory">Loading...</div></div>
        <div class="card"><h3>Browse Books</h3><div id="browseBooks">Loading...</div></div>
      </div>
    </div>`;
  loadClientData();
};

const showHomePage = () => { window.location.href='/'; };

const loadAdminData = async () => {
  const users=await api.get('/admin/users?status=pending'); if(users&&users.success) displayPendingUsers(users.data);
  const analytics=await api.get('/admin/analytics/overview'); if(analytics&&analytics.success) displayAnalytics(analytics.data);
};

const loadVendorData = async () => {
  const books=await api.get('/vendor/books'); if(books&&books.success) displayVendorBooks(books.data);
  const a=await api.get('/vendor/analytics'); if(a&&a.success) displayVendorAnalytics(a.data);
  loadSlickPayConfig();
};

const loadClientData = async () => {
  const lib=await api.get('/users/library'); if(lib&&lib.success) displayUserLibrary(lib.data);
  const pur=await api.get('/users/purchases'); if(pur&&pur.success) displayPurchaseHistory(pur.data);
  const books=await api.get('/books'); if(books&&books.success) displayBrowseBooks(books.data);
};

const displayPendingUsers = (users) => {
  const c=document.getElementById('pendingUsers'); c.innerHTML = users.map(u=>`<div class="user-item"><span>${u.first_name} ${u.last_name} (${u.email})</span><button onclick="approveUser(${u.id})">Approve</button><button onclick="rejectUser(${u.id})">Reject</button></div>`).join('');
};

const displayVendorBooks = (books) => { const c=document.getElementById('vendorBooks'); c.innerHTML = books.map(b=>`<div class="book-item"><span>${b.title} - ${b.status}</span><span>$${b.price}</span></div>`).join(''); };

const displayUserLibrary = (books) => { const c=document.getElementById('userLibrary'); c.innerHTML = books.map(b=>`<div class="book-item"><span>${b.title} by ${b.author}</span><button onclick="downloadBook(${b.id})">Download</button></div>`).join(''); };

const displayPurchaseHistory = (rows) => { const c=document.getElementById('purchaseHistory'); c.innerHTML = rows.map(r=>`<div class="book-item"><span>#${r.transaction_uuid}</span><span>${r.title}</span><span>${r.amount} DZD</span></div>`).join(''); };

const displayBrowseBooks = (books) => { const c=document.getElementById('browseBooks'); c.innerHTML = books.map(b=>`<div class="book-item"><span>${b.title} - ${b.author}</span><button onclick="startCheckout(${b.id})">Buy</button></div>`).join(''); };

const displayVendorAnalytics = (data) => { const c=document.getElementById('salesAnalytics'); c.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`; };

const approveUser = async (id) => { const r=await api.patch(`/admin/users/${id}/approve`); if(r&&r.success){ showNotification('User approved','success'); loadAdminData(); } };
const rejectUser = async (id) => { const reason=prompt('Rejection reason:'); if(!reason) return; const r=await api.patch(`/admin/users/${id}/reject`,{reason}); if(r&&r.success){ showNotification('User rejected','success'); loadAdminData(); } };

const downloadBook = (bookId) => { window.open(`${API_BASE_URL}/users/download/${bookId}`,'_blank'); };

const startCheckout = async (bookId) => { const r=await api.post('/payments/checkout',{bookId}); if(r&&r.success){ window.location.href=r.data.paymentUrl; } else { showNotification(r?.message||'Checkout failed','error'); } };

const loadSlickPayConfig = async () => {
  const c=document.getElementById('slickpayConfig'); const cfg=await api.get('/payments/config');
  c.innerHTML = `
    <div>
      <p>Status: ${cfg?.data? 'Configured' : 'Not configured'}</p>
      <button onclick="openSlickPayForm()">${cfg?.data? 'Update Keys' : 'Add Keys'}</button>
      <button onclick="testSlickPay()">Test Connection</button>
    </div>`;
};

const openSlickPayForm = () => {
  const apiKey = prompt('Enter SlickPay API Key:'); if(!apiKey) return;
  const secretKey = prompt('Enter SlickPay Secret Key:'); if(!secretKey) return;
  api.post('/payments/config',{ apiKey, secretKey, isTestMode: true }).then(r=>{ if(r&&r.success){ showNotification('SlickPay keys saved','success'); loadSlickPayConfig(); } else { showNotification(r?.message||'Failed to save keys','error'); } });
};

const testSlickPay = async () => { const r=await api.post('/payments/config/test'); if(r&&r.success){ showNotification('SlickPay connection OK','success'); } else { showNotification('SlickPay test failed','error'); } };
