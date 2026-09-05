/* ==========================================================================
   AUTHENTICATION & USER STATE MANAGEMENT MODULE
   ========================================================================== */

let currentUser = null;

const initAuth = () => {
  const token = localStorage.getItem('expense_tracker_token');
  const storedUser = localStorage.getItem('expense_tracker_user');

  if (token && storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      showAppScreen();
    } catch (e) {
      handleLogout();
    }
  } else {
    showAuthScreen();
  }
};

const switchAuthTab = (tab) => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const subtitle = document.getElementById('auth-subtitle');

  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    subtitle.textContent = 'Welcome back! Log in to manage your budget & track expenses.';
  } else {
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    subtitle.textContent = 'Create your account to start managing expenses and smart budget goals.';
  }
};

const fillDemoCredentials = async () => {
  document.getElementById('login-email').value = 'demo@example.com';
  document.getElementById('login-password').value = 'password123';

  // Automatically submit demo registration or login
  try {
    showToast('Logging into Demo Account...', 'info');
    const response = await authAPI.login({
      email: 'demo@example.com',
      password: 'password123'
    });
    setSession(response.token, response.user);
  } catch (err) {
    // If demo account doesn't exist yet, register it automatically!
    try {
      const regRes = await authAPI.register({
        name: 'Alex Morgan',
        email: 'demo@example.com',
        password: 'password123',
        currency: '$',
        monthlyBudget: 2500
      });
      setSession(regRes.token, regRes.user);
    } catch (regErr) {
      showToast(regErr.message || 'Demo login failed', 'error');
    }
  }
};

const handleLogin = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const response = await authAPI.login({ email, password });
    setSession(response.token, response.user);
    showToast(`Welcome back, ${response.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Login failed. Please check credentials.', 'error');
  }
};

const handleRegister = async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const currency = document.getElementById('reg-currency').value;
  const monthlyBudget = document.getElementById('reg-budget').value;

  try {
    const response = await authAPI.register({
      name,
      email,
      password,
      currency,
      monthlyBudget: Number(monthlyBudget)
    });
    setSession(response.token, response.user);
    showToast(`Account created successfully! Welcome ${response.user.name}.`, 'success');
  } catch (err) {
    showToast(err.message || 'Registration failed.', 'error');
  }
};

const setSession = (token, user) => {
  localStorage.setItem('expense_tracker_token', token);
  localStorage.setItem('expense_tracker_user', JSON.stringify(user));
  currentUser = user;
  showAppScreen();
};

const handleLogout = () => {
  localStorage.removeItem('expense_tracker_token');
  localStorage.removeItem('expense_tracker_user');
  currentUser = null;
  showAuthScreen();
  showToast('Logged out successfully', 'info');
};

const showAuthScreen = () => {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
};

const showAppScreen = () => {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  updateUserHeaderUI();
  if (typeof initDashboard === 'function') {
    initDashboard();
  }
};

const updateUserHeaderUI = () => {
  if (!currentUser) return;

  const nameEl = document.getElementById('display-user-name');
  const emailEl = document.getElementById('display-user-email');
  const avatarEl = document.getElementById('user-avatar-display');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (emailEl) emailEl.textContent = currentUser.email;
  if (avatarEl) {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    avatarEl.textContent = initial;
  }
};

// Profile Modal Handlers
const openProfileModal = () => {
  if (!currentUser) return;

  document.getElementById('profile-name').value = currentUser.name;
  document.getElementById('profile-email').value = currentUser.email;
  document.getElementById('profile-currency').value = currentUser.currency || '$';
  document.getElementById('profile-budget').value = currentUser.monthlyBudget || 2500;
  document.getElementById('profile-password').value = '';

  document.getElementById('profile-modal').classList.remove('hidden');
};

const closeProfileModal = () => {
  document.getElementById('profile-modal').classList.add('hidden');
};

const handleProfileFormSubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  const currency = document.getElementById('profile-currency').value;
  const monthlyBudget = Number(document.getElementById('profile-budget').value);
  const password = document.getElementById('profile-password').value;

  const updateData = { name, currency, monthlyBudget };
  if (password.trim().length > 0) {
    updateData.password = password;
  }

  try {
    const response = await authAPI.updateProfile(updateData);
    currentUser = response.user;
    localStorage.setItem('expense_tracker_user', JSON.stringify(currentUser));
    updateUserHeaderUI();
    closeProfileModal();
    showToast('Profile and budget updated successfully!', 'success');
    
    // Refresh main view metrics
    if (typeof refreshAnalytics === 'function') {
      refreshAnalytics();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'error');
  }
};
