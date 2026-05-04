(async () => {
  const user = await checkAuth();
  if (!user) return;
  await loadUsers();
})();

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to load users');
    const users = await res.json();
    renderTable(users);
  } catch (err) {
    showError(err.message);
  }
}

function renderTable(users) {
  const tbody = document.getElementById('users-tbody');
  const countEl = document.getElementById('record-count');
  if (countEl) countEl.textContent = `${users.length} record${users.length !== 1 ? 's' : ''}`;

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <p>No users found.</p>
            <a href="/user-edit.html" class="btn">+ Add User</a>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="id-cell"><a href="/user-edit.html?id=${u.user_id}" class="id-link">${u.user_id}</a></td>
      <td style="font-weight:600;">${esc(u.username)}</td>
      <td class="date-cell">${fmtDate(u.created_at)}</td>
      <td class="actions-cell">
        <a href="/user-edit.html?id=${u.user_id}" class="btn btn-sm">Edit</a>
        <button onclick="deleteUser(${u.user_id})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    await loadUsers();
  } catch (err) {
    showError(err.message);
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d) ? String(val) : d.toLocaleDateString();
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}
