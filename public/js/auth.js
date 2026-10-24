document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const alertBox = document.getElementById('alert');

  if (getToken() && (loginForm || registerForm)) {
    location.href = '/dashboard.html';
    return;
  }

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    try {
      const body = {
        identifier: loginForm.identifier.value.trim(),
        password: loginForm.password.value
      };
      const data = await api.post('/api/auth/login', body);
      setAuth(data.token, data.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showAlert(alertBox, err.message);
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    if (registerForm.password.value !== registerForm.confirmPassword.value) {
      showAlert(alertBox, 'Passwords do not match');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Creating account...';
    try {
      const body = {
        name: registerForm.name.value.trim(),
        username: registerForm.username.value.trim(),
        erpId: registerForm.erpId ? registerForm.erpId.value.trim() : '',
        email: registerForm.email.value.trim(),
        password: registerForm.password.value,
        confirmPassword: registerForm.confirmPassword.value
      };
      const data = await api.post('/api/auth/register', body);
      setAuth(data.token, data.user);
      location.href = '/dashboard.html';
    } catch (err) {
      showAlert(alertBox, err.message);
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  });
});
