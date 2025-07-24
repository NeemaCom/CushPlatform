// Comprehensive Firebase Authentication Fix
// This module handles all Firebase authentication scenarios robustly

(function() {
  console.log('Firebase Authentication Fix Module loaded');

  // Store intended destination before authentication
  const INTENDED_URL_KEY = 'cush_intended_url';
  const AUTH_METHOD_KEY = 'cush_auth_method';
  
  // Capture intended URL before any authentication attempt
  window.captureIntendedUrl = () => {
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (currentUrl !== '/' && currentUrl !== '/#signin' && currentUrl !== '/#signup') {
      sessionStorage.setItem(INTENDED_URL_KEY, currentUrl);
    }
  };

  // Get and clear intended URL after authentication
  window.getIntendedUrl = () => {
    const url = sessionStorage.getItem(INTENDED_URL_KEY);
    sessionStorage.removeItem(INTENDED_URL_KEY);
    return url || '#dashboard'; // Default to dashboard
  };

  // Enhanced error handling with user-friendly messages
  window.handleFirebaseAuthError = (error, isSignUp = false) => {
    console.error('Firebase Auth Error:', error);
    
    // Don't show error for user-cancelled actions
    if (error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/cancelled-popup-request') {
      console.log('User cancelled authentication');
      return null;
    }

    // Map error codes to user-friendly messages
    const errorMessages = {
      'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
      'auth/unauthorized-domain': 'Authentication is not configured for this domain. Please contact support.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
      'auth/invalid-credential': 'Invalid credentials. Please try again.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
      'auth/internal-error': 'An internal error occurred. Please try again later.'
    };

    return errorMessages[error.code] || error.message || 'Authentication failed. Please try again.';
  };

  // Use the centralized Firebase initialization coordinator
  window.initializeFirebaseAuth = async () => {
    try {
      console.log('firebase-auth-fix using centralized coordinator...');
      return await window.waitForFirebase('firebase-auth-fix', 25000);
    } catch (error) {
      console.error('Firebase initialization error in auth-fix:', error);
      throw error;
    }
  };

  // Redirect all Google sign-in calls to simplified function
  window.performGoogleSignIn = window.simpleGoogleSignIn;

  // Handle redirect result on page load
  window.handleFirebaseRedirectResult = async () => {
    try {
      const auth = await window.initializeFirebaseAuth();
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      console.log('Checking for redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('Redirect result found:', result.user.email);
        
        // Track successful authentication
        if (window.trackAuthEvent) {
          const method = sessionStorage.getItem(AUTH_METHOD_KEY) || 'google';
          window.trackAuthEvent(method, 'sign_in_redirect');
        }
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      const errorMessage = window.handleFirebaseAuthError(error);
      if (errorMessage) {
        window.showErrorNotification(errorMessage);
      }
      return null;
    }
  };

  // Sync Firebase user with backend
  window.syncFirebaseUserWithBackend = async (firebaseUser, isNewUser = false) => {
    try {
      console.log('Syncing Firebase user with backend:', firebaseUser.email);
      
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          firstName: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : '',
          lastName: firebaseUser.displayName ? firebaseUser.displayName.split(' ').slice(1).join(' ') : '',
          isNewUser: isNewUser,
          acceptTerms: true,
          acceptPrivacy: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync with backend');
      }

      const data = await response.json();
      console.log('Backend sync successful:', data.user.email);
      
      // Update global user state
      if (window.setUser) {
        window.setUser(data.user);
      }
      
      return data.user;
    } catch (error) {
      console.error('Backend sync error:', error);
      throw error;
    }
  };

  // Complete authentication flow with proper redirection
  window.completeAuthenticationFlow = async (firebaseUser, isNewUser = false) => {
    try {
      // First sync with backend
      const backendUser = await window.syncFirebaseUserWithBackend(firebaseUser, isNewUser);
      
      if (backendUser) {
        // Show success message
        window.showSuccessNotification(
          isNewUser ? 
          'Account created successfully! Welcome to CushGlobal!' : 
          'Successfully signed in! Redirecting...'
        );
        
        // Get intended URL or default to dashboard
        const intendedUrl = window.getIntendedUrl();
        
        // Redirect after a short delay
        setTimeout(() => {
          console.log('Redirecting to:', intendedUrl);
          if (intendedUrl.startsWith('#')) {
            window.location.hash = intendedUrl.substring(1);
          } else {
            window.location.href = intendedUrl;
          }
          
          // Force hash change event if needed
          if (intendedUrl.includes('#')) {
            window.dispatchEvent(new Event('hashchange'));
          }
        }, 1500);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Authentication flow error:', error);
      window.showErrorNotification(error.message || 'Authentication failed. Please try again.');
      return false;
    }
  };

  // Enhanced auth state listener
  window.setupFirebaseAuthStateListener = async () => {
    try {
      const auth = await window.initializeFirebaseAuth();
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      let isFirstCheck = true;
      
      onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? user.email : 'null');
        
        // Skip the first check to avoid redirect loops
        if (isFirstCheck) {
          isFirstCheck = false;
          
          // Check for redirect result first
          const redirectResult = await window.handleFirebaseRedirectResult();
          if (redirectResult && redirectResult.user) {
            await window.completeAuthenticationFlow(redirectResult.user);
            return;
          }
        }
        
        if (user) {
          // User is signed in, ensure backend is synced
          try {
            // Check if backend session exists
            const response = await fetch('/api/auth/me', {
              credentials: 'include'
            });
            
            if (!response.ok) {
              // Backend session missing, sync it
              console.log('Backend session missing, syncing...');
              await window.syncFirebaseUserWithBackend(user);
            }
          } catch (error) {
            console.error('Backend check error:', error);
          }
        }
      });
    } catch (error) {
      console.error('Auth state listener setup error:', error);
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.setupFirebaseAuthStateListener);
  } else {
    window.setupFirebaseAuthStateListener();
  }

  // Notification helpers
  window.showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  };

  window.showErrorNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  };

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  console.log('Firebase Authentication Fix Module ready');
})();