async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/index.html';
      return null;
    }
    const data = await res.json();
    const usernameEl = document.getElementById('nav-username');
    if (usernameEl) usernameEl.textContent = data.user.username;
    return data.user;
  } catch {
    window.location.href = '/index.html';
    return null;
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/index.html';
  }
}
