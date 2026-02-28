// auth-check.js - Global authentication checker for navigation
// Include this script in ALL pages to dynamically show/hide login link

(function() {
  'use strict';
  
  // Check if user is authenticated
  function isAuthenticated() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userType = localStorage.getItem('userType') || sessionStorage.getItem('userType');
    const tokenExpiry = localStorage.getItem('tokenExpiry') || sessionStorage.getItem('tokenExpiry');
    
    if (!token || !userType) {
      return false;
    }
    
    // Check if token is expired
    if (tokenExpiry) {
      const expiryDate = new Date(tokenExpiry);
      if (expiryDate <= new Date()) {
        // Token expired, clear auth
        clearAuth();
        return false;
      }
    }
    
    return true;
  }
  
  // Get user type
  function getUserType() {
    return localStorage.getItem('userType') || sessionStorage.getItem('userType');
  }
  
  // Get username
  function getUsername() {
    return localStorage.getItem('username') || sessionStorage.getItem('username');
  }
  
  // Clear authentication
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
  
  // Get dashboard URL based on role
  function getDashboardUrl(userType) {
    // OWNER, CO_OWNER, and RESELLER all use reseller dashboard
    // (or you can create separate admin dashboard for owners)
    if (userType === 'owner' || userType === 'co_owner' || userType === 'reseller') {
      return 'reseller-dashboard.html';
    } else if (userType === 'customer') {
      return 'customer-dashboard.html';
    }
    return 'login.html'; // Fallback
  }
  
  // Update navigation based on auth status
  function updateNavigation() {
    const nav = document.querySelector('header nav ul');
    if (!nav) return;
    
    // Find the login link
    const loginLink = nav.querySelector('a[href="login.html"]');
    
    if (isAuthenticated()) {
      const userType = getUserType();
      const username = getUsername();
      const dashboardUrl = getDashboardUrl(userType);
      
      // Remove login link if it exists
      if (loginLink) {
        loginLink.parentElement.remove();
      }
      
      // Check if dashboard link already exists
      const existingDashboard = nav.querySelector('.dashboard-link');
      if (!existingDashboard) {
        // Create dashboard link
        const dashboardLi = document.createElement('li');
        const dashboardLink = document.createElement('a');
        dashboardLink.className = 'dashboard-link';
        dashboardLink.href = dashboardUrl;
        
        // Set label based on role
        if (userType === 'owner' || userType === 'co_owner') {
          dashboardLink.textContent = 'Admin Panel';
        } else if (userType === 'reseller') {
          dashboardLink.textContent = 'Reseller Panel';
        } else {
          dashboardLink.textContent = 'Dashboard';
        }
        
        dashboardLi.appendChild(dashboardLink);
        nav.appendChild(dashboardLi);
        
        // Create logout link
        const logoutLi = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'logout-link';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          clearAuth();
          window.location.href = 'index.html';
        });
        
        logoutLi.appendChild(logoutLink);
        nav.appendChild(logoutLi);
      }
    } else {
      // User is not authenticated
      // Make sure login link exists
      if (!loginLink) {
        const loginLi = document.createElement('li');
        const newLoginLink = document.createElement('a');
        newLoginLink.href = 'login.html';
        newLoginLink.className = 'login-link';
        newLoginLink.textContent = 'Login';
        loginLi.appendChild(newLoginLink);
        nav.appendChild(loginLi);
      }
      
      // Remove dashboard and logout links if they exist
      const dashboardLink = nav.querySelector('.dashboard-link');
      const logoutLink = nav.querySelector('.logout-link');
      if (dashboardLink) dashboardLink.parentElement.remove();
      if (logoutLink) logoutLink.parentElement.remove();
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavigation);
  } else {
    updateNavigation();
  }
  
  // Also export for use in other scripts
  window.AuthCheck = {
    isAuthenticated,
    getUserType,
    getUsername,
    clearAuth,
    getDashboardUrl
  };
})();
