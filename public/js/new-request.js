(async () => {
  const user = await checkAuth();
  if (!user) return;

  document.getElementById('request_date').value = todayISO();
})();

document.getElementById('new-request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  const payload = {
    project_name: document.getElementById('project_name').value.trim(),
    request_date: document.getElementById('request_date').value,
    requestor:    document.getElementById('requestor').value.trim(),
    description:  document.getElementById('description').value.trim()
  };

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Failed to create request';
      errEl.style.display = 'block';
      return;
    }
    window.location.href = '/dashboard.html';
  } catch {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
  }
});

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
