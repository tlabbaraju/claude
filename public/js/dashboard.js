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
  const countEl = document.getElementById('record-count');
  if (countEl) countEl.textContent = `${requests.length} record${requests.length !== 1 ? 's' : ''}`;

  if (!requests.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <p>No project requests yet.</p>
            <a href="/new-request.html" class="btn">+ New Request</a>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = requests.map(r => `
    <tr>
      <td class="id-cell"><a href="/edit-request.html?id=${r.project_id}" class="id-link">${r.project_id}</a></td>
      <td class="project-name-cell">${esc(r.project_name)}</td>
      <td class="date-cell">${fmtDate(r.request_date)}</td>
      <td class="requestor-cell">${esc(r.requestor)}</td>
      <td class="description-cell" title="${esc(r.description)}">${esc(r.description)}</td>
      <td>${r.it_comments ? `<span class="it-badge" title="${esc(r.it_comments)}">${esc(r.it_comments)}</span>` : '<span class="text-muted">—</span>'}</td>
      <td class="actions-cell">
        <a href="/edit-request.html?id=${r.project_id}" class="btn btn-sm">Edit</a>
        <button onclick="deleteRequest(${r.project_id})" class="btn btn-sm btn-danger">Delete</button>
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
