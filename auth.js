const API = 'https://doodledo-backend.onrender.com';

let currentTab = 'login';

function showTab(tab) {
  currentTab = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('auth-submit').textContent = tab === 'login' ? 'Login' : 'Sign Up';
  document.getElementById('auth-error').textContent = '';
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorEl = document.getElementById('auth-error');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  const endpoint = currentTab === 'login' ? '/api/auth/login' : '/api/auth/signup';

  try {
    document.getElementById('auth-submit').textContent = 'Please wait...';
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.message || 'Something went wrong.';
      showTab(currentTab);
      return;
    }

    // Save token and email
    localStorage.setItem('token', data.token);
    localStorage.setItem('userEmail', data.email);

    // Hide auth screen, show app
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = '';

  } catch (err) {
    errorEl.textContent = 'Cannot reach server. Try again.';
    showTab(currentTab);
  }
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    // Already logged in — hide auth, show app
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = '';
  } else {
    // Not logged in — show auth, hide app
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}