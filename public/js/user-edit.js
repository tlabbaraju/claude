const params = new URLSearchParams(window.location.search);
const userId = params.get('id');

(async () => {
  const user = await checkAuth();
  if (!user) return;

  if (userId) {
    // Edit mode
    document.getElementById('page-title').textContent = 'Edit User';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    const pwMarker = document.getElementById('pw-required-marker');
    if (pwMarker) pwMarker.style.display = 'none';
    const pwInput = document.getElementById('password');
    if (pwInput) pwInput.placeholder = 'Leave blank to keep current';

    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error('Failed to load user');
      const data = await res.json();
      document.getElementById('username').value = data.username || '';
    } catch (err) {
      showError(err.message);
    }
  } else {
    // Add mode
    document.getElementById('page-title').textContent = 'Add User';
    document.getElementById('submit-btn').textContent = 'Add User';
  }
})();

document.getElementById('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error-msg');
  errorEl.style.display = 'none';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm_password').value;

  if (!username) {
    showError('Username is required.');
    return;
  }

  if (!userId && !password) {
    showError('Password is required when creating a new user.');
    return;
  }

  if (password && password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  const body = { username };
  if (password) body.password = password;

  try {
    let res;
    if (userId) {
      res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Operation failed');
      return;
    }
    window.location.href = '/users.html';
  } catch (err) {
    showError('Network error. Please try again.');
  }
});

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}
