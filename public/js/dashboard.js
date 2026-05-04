(async () => {
  const user = await checkAuth();
  if (!user) return;
  await loadRequests();
})();

async function loadRequests() {
  try {
    const res = await fetch('/api/requests');
    if (!res.ok) throw new Error('Failed to load requests');
    const requests = await res.json();
    renderTable(requests);
  } catch (err) {
    showError(err.message);
  }
}

function renderTable(requests) {
  const tbody = document.getElementById('requests-tbody');

  if (!requests.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">No project requests yet. <a href="/new-request.html">Create one.</a></div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = requests.map(r => `
    <tr>
      <td>${r.project_id}</td>
      <td>${esc(r.project_name)}</td>
      <td>${fmtDate(r.request_date)}</td>
      <td>${esc(r.requestor)}</td>
      <td class="description-cell" title="${esc(r.description)}">${esc(r.description)}</td>
      <td>${r.it_comments ? esc(r.it_comments) : '<span class="text-muted">—</span>'}</td>
      <td style="white-space:nowrap">
        <a href="/edit-request.html?id=${r.project_id}" class="btn btn-sm">Edit</a>
        <button onclick="deleteRequest(${r.project_id})" class="btn btn-sm btn-danger" style="margin-left:4px">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteRequest(id) {
  if (!confirm('Delete this request? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    await loadRequests();
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
