const API_BASE = window.JANSUVIDA_API_BASE || '/api';

const modal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const nameField = document.getElementById('nameField');
const modalSwitch = document.getElementById('modalSwitch');

function getToken() {
  return localStorage.getItem('jansuvida_token');
}

function openModal(type) {
  if (!modal) return;
  const register = type === 'register';
  modalTitle.textContent = register ? 'Create Account' : 'Customer Login';
  modalText.textContent = register ? 'अपना नाम और मोबाइल नंबर दर्ज करें।' : 'अपने Customer Portal में प्रवेश करें।';
  nameField.hidden = !register;
  modalSwitch.innerHTML = register
    ? 'पहले से account है? <button data-modal="login">Login करें</button>'
    : 'नया ग्राहक? <button data-modal="register">Register करें</button>';
  modal.dataset.mode = register ? 'register' : 'login';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-modal]');
  if (trigger) openModal(trigger.dataset.modal);
  if (event.target === modal || event.target.id === 'modalClose') {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('show')) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
});

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body;
}

document.getElementById('authForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const mobile = form.querySelector('input[type="tel"]')?.value.trim();
  const name = form.querySelector('#nameField input')?.value.trim();
  const mode = modal?.dataset.mode || 'login';
  try {
    const data = await apiFetch(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(mode === 'register' ? { name, mobile } : { mobile }),
    });
    if (data.token) localStorage.setItem('jansuvida_token', data.token);
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    alert(mode === 'register' ? 'Registration सफल हुआ।' : 'Login सफल हुआ।');
    if (document.getElementById('tracking')) await loadMyApplications();
  } catch (error) {
    alert(error.message);
  }
});

const search = document.getElementById('serviceSearch');
const cards = [...document.querySelectorAll('.service-card')];
const noResults = document.getElementById('noResults');
search?.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach((card) => {
    const match = !query || card.dataset.name.includes(query) || card.textContent.toLowerCase().includes(query);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  noResults.hidden = visible !== 0;
});

function statusLabel(status) {
  const labels = {
    pending: 'Pending',
    processing: 'Processing',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
  };
  return labels[status] || status || 'Unknown';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function loadMyApplications() {
  const result = document.getElementById('trackResult');
  if (!result || !getToken()) return;
  try {
    const data = await apiFetch('/applications');
    const applications = data.applications || [];
    if (!applications.length) {
      result.hidden = false;
      result.innerHTML = '<p>अभी कोई application नहीं मिली।</p>';
      return;
    }
    result.hidden = false;
    result.innerHTML = `<div class="application-list">${applications.map((item) => `
      <article class="application-item">
        <strong>${escapeHtml(item.application_no)}</strong>
        <span>${escapeHtml(item.service_name || 'Service')}</span>
        <span>Status: <b>${escapeHtml(statusLabel(item.status))}</b></span>
        <span>Payment: ${escapeHtml(item.payment_status || 'pending')}</span>
        ${item.remarks ? `<small>Remark: ${escapeHtml(item.remarks)}</small>` : ''}
      </article>`).join('')}</div>`;
  } catch (error) {
    result.hidden = false;
    result.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

document.getElementById('trackForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const number = document.getElementById('applicationNo').value.trim();
  const result = document.getElementById('trackResult');
  if (!getToken()) {
    result.hidden = false;
    result.innerHTML = 'Application status देखने के लिए पहले <button data-modal="login">Login</button> करें।';
    return;
  }
  try {
    const data = await apiFetch(`/applications/${encodeURIComponent(number)}`);
    const item = data.application || data;
    result.hidden = false;
    result.innerHTML = `<strong>${escapeHtml(item.application_no || number)}</strong><br>Service: ${escapeHtml(item.service_name || '')}<br>Status: <b>${escapeHtml(statusLabel(item.status))}</b><br>Payment: ${escapeHtml(item.payment_status || 'pending')}${item.remarks ? `<br>Remark: ${escapeHtml(item.remarks)}` : ''}`;
  } catch (error) {
    result.hidden = false;
    result.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
});

const menuBtn = document.getElementById('menuBtn');
menuBtn?.addEventListener('click', () => {
  const nav = document.querySelector('.nav');
  nav.style.display = nav.style.display === 'flex' ? '' : 'flex';
  nav.style.position = 'absolute';
  nav.style.top = '74px';
  nav.style.left = '0';
  nav.style.right = '0';
  nav.style.padding = '18px 4%';
  nav.style.background = '#fff';
  nav.style.borderBottom = '1px solid #e7ecf4';
  nav.style.flexDirection = 'column';
});

if (getToken()) loadMyApplications();
