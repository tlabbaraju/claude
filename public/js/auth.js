/* Shared auth utilities */

async function checkAuth(requiredRole) {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) { window.location.href = '/index.html'; return null; }
    const user = await res.json();
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = user.role === 'admin' ? '/admin-grid.html' : '/dashboard.html';
      return null;
    }
    return user;
  } catch {
    window.location.href = '/index.html';
    return null;
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDelta(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  const s = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n >= 0 ? '+' + s : s;
}

function showAlert(el, msg, type = 'error') {
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3000);
}
