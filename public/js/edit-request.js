const requestId = new URLSearchParams(window.location.search).get('id');

if (!requestId) window.location.href = '/dashboard.html';

(async () => {
  const user = await checkAuth();
  if (!user) return;

  try {
    const res = await fetch(`/api/requests/${requestId}`);
    if (!res.ok) {
      window.location.href = '/dashboard.html';
      return;
    }
    const r = await res.json();
    document.getElementById('project_name').value = r.project_name ?? '';
    document.getElementById('request_date').value  = toDateInput(r.request_date);
    document.getElementById('requestor').value     = r.requestor ?? '';
    document.getElementById('description').value   = r.description ?? '';
    document.getElementById('it_comments').value   = r.it_comments ?? '';
  } catch {
    window.location.href = '/dashboard.html';
  }
})();

document.getElementById('edit-request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  const payload = {
    project_name: document.getElementById('project_name').value.trim(),
    request_date: document.getElementById('request_date').value,
    requestor:    document.getElementById('requestor').value.trim(),
    description:  document.getElementById('description').value.trim(),
    it_comments:  document.getElementById('it_comments').value.trim() || null
  };

  try {
    const res = await fetch(`/api/requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to save changes';
      errEl.style.display = 'block';
      return;
    }
    window.location.href = '/dashboard.html';
  } catch {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
  }
});

function toDateInput(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
