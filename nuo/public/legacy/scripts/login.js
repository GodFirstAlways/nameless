// login.js - Authentication handler

// API Configuration
// Prefer a globally injected value (set in index.html during Vite build),
// with a local dev fallback.
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginBtn = loginForm.querySelector('.login-btn');
const errorMessage = document.getElementById('errorMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');

// Check if already logged in
checkExistingAuth();

// Form submission handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!username || !password) {
    showError('Please enter both username and password');
    return;
  }
  
  await handleLogin(username, password);
});

async function handleLogin(username, password) {
  setLoading(true);
  hideError();
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }
    
    // Store authentication data
    const storage = rememberCheckbox.checked ? localStorage : sessionStorage;
    storage.setItem('authToken', data.access_token);
    storage.setItem('userType', data.role.toLowerCase());
    storage.setItem('username', data.username);
    storage.setItem('userId', data.user_id);
    
    // Set expiry to 24 hours
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    storage.setItem('tokenExpiry', expiryDate.toISOString());
    
    // Redirect based on user type
    redirectToDashboard(data.role.toLowerCase());
    
  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Invalid credentials. Please try again.');
    setLoading(false);
  }
}

function redirectToDashboard(userType) {
  setTimeout(() => {
    if (userType === 'owner' || userType === 'co_owner') {
      window.location.href = 'admin-dashboard.html';
    } else if (userType === 'reseller') {
      window.location.href = 'reseller-dashboard.html';
    } else if (userType === 'customer') {
      window.location.href = 'customer-dashboard.html';
    } else {
      showError('Unknown user role. Please contact support.');
      setLoading(false);
    }
  }, 500);
}

function checkExistingAuth() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType');
  const tokenExpiry = localStorage.getItem('tokenExpiry') || sessionStorage.getItem('tokenExpiry');
  
  if (token && userType) {
    if (tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      if (expiryDate > new Date()) {
        redirectToDashboard(userType);
        return;
      } else {
        clearAuth();
      }
    } else {
      redirectToDashboard(userType);
      return;
    }
  }
}

function setLoading(loading) {
  if (loading) {
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
  } else {
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

function hideError() {
  errorMessage.classList.remove('show');
}

function clearAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('tokenExpiry');
  
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userType');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('tokenExpiry');
}

document.addEventListener('contextmenu', e => e.preventDefault());
