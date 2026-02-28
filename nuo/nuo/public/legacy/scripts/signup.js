// signup.js - Registration handler

// Prefer a globally injected value (set in index.html during Vite build),
// with a local dev fallback.
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

const signupForm = document.getElementById('signupForm');
const signupBtn = signupForm.querySelector('.login-btn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Validation
  if (username.length < 3) {
    showError('Username must be at least 3 characters');
    return;
  }
  
  if (password.length < 8) {
    showError('Password must be at least 8 characters');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  await handleSignup(username, password);
});

async function handleSignup(username, password) {
  setLoading(true);
  hideError();
  hideSuccess();
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
      let msg = 'Registration failed';
      if (Array.isArray(data.detail)) {
        // FastAPI validation errors
        msg = data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join('; ');
      } else if (typeof data.detail === 'string') {
        msg = data.detail;
      } else if (data.message) {
        msg = data.message;
      }
      throw new Error(msg);
    }
    
    // Show success message
    showSuccess('Account created successfully! Redirecting to login...');
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
    
  } catch (error) {
    console.error('Signup error:', error);
    showError(error.message || 'Registration failed. Username may already exist.');
    setLoading(false);
  }
}

function setLoading(loading) {
  if (loading) {
    signupBtn.classList.add('loading');
    signupBtn.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    confirmPasswordInput.disabled = true;
  } else {
    signupBtn.classList.remove('loading');
    signupBtn.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    confirmPasswordInput.disabled = false;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

function hideError() {
  errorMessage.classList.remove('show');
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.add('show');
}

function hideSuccess() {
  successMessage.classList.remove('show');
}

document.addEventListener('contextmenu', e => e.preventDefault());
