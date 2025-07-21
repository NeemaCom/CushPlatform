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

  // Robust Firebase initialization with fallback
  window.initializeFirebaseAuth = async () => {
    try {
      // First, wait for the main Firebase initialization
      if (window.firebaseInitPromise && !window.firebaseInitialized) {
        console.log('Waiting for main Firebase initialization in auth-fix...');
        try {
          await Promise.race([
            window.firebaseInitPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Main Firebase init timeout in auth-fix')), 15000))
          ]);
          console.log('Main Firebase initialization completed in auth-fix');
        } catch (error) {
          console.warn('Main Firebase init timeout in auth-fix:', error.message);
        }
      }

      // Wait for Firebase SDK to load with longer timeout
      let attempts = 0;
      while (!window.firebaseApp && attempts < 100) {
        console.log(`Waiting for firebaseApp... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.firebaseApp) {
        console.error('Firebase app not available, trying to initialize directly...');
        
        // Try to initialize Firebase directly if the main app hasn't done it yet
        try {
          const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
          const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          
          const firebaseConfig = {
            apiKey: "AIzaSyD06ZHGJlv-1g0WqfymtGkiHAHeX1O1UGI",
            authDomain: "portal.we-cush.com",
            projectId: "cushportal",
            storageBucket: "cushportal.firebasestorage.app",
            messagingSenderId: "304174661302",
            appId: "1:304174661302:web:8bc1e5f413aae91336f017",
            measurementId: "G-VGYNJNCJ2F"
          };
          
          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          
          window.firebaseApp = app;
          window.firebaseAuth = auth;
          
          console.log('Firebase initialized directly in auth-fix module');
        } catch (directInitError) {
          throw new Error('Firebase failed to initialize after 10 seconds - ' + directInitError.message);
        }
      }

      // Ensure firebaseAuth is available
      if (!window.firebaseAuth) {
        console.log('firebaseAuth not set, waiting...');
        attempts = 0;
        while (!window.firebaseAuth && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!window.firebaseAuth) {
        console.error('Firebase Auth still not available, trying to get it from app...');
        if (window.firebaseApp) {
          const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          window.firebaseAuth = getAuth(window.firebaseApp);
          console.log('Firebase Auth retrieved from app');
        } else {
          throw new Error('Firebase Auth not available after extended initialization');
        }
      }

      console.log('Firebase Auth initialization successful');
      return window.firebaseAuth;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  };

  // Enhanced Google Sign-In with both popup and redirect fallback
  window.performGoogleSignIn = async (preferredMethod = 'popup') => {
    try {
      const auth = await window.initializeFirebaseAuth();
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Store the method being used
      sessionStorage.setItem(AUTH_METHOD_KEY, 'google');
      
      if (preferredMethod === 'popup') {
        try {
          console.log('Attempting Google sign-in with popup...');
          const result = await signInWithPopup(auth, provider);
          console.log('Google sign-in successful via popup');
          return result;
        } catch (popupError) {
          console.log('Popup sign-in failed:', popupError.code, popupError.message);
          
          // If popup fails for any reason, try redirect method
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request' ||
              popupError.message.includes('popup')) {
            console.log('Popup failed, falling back to redirect method...');
            console.log('Setting redirect flag for detection...');
            
            // Set flags to help with redirect detection
            sessionStorage.setItem('google_auth_redirect', 'true');
            sessionStorage.setItem('auth_redirect_timestamp', Date.now().toString());
            window.captureIntendedUrl();
            
            await signInWithRedirect(auth, provider);
            return null; // Will be handled by getRedirectResult on next page load
          }
          throw popupError;
        }
      } else {
        // Use redirect method directly
        console.log('Using redirect method for Google sign-in...');
        window.captureIntendedUrl();
        await signInWithRedirect(auth, provider);
        return null; // Will be handled by getRedirectResult on next page load
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

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