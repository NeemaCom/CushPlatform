// Ultimate Firebase Authentication + Redirect Fix
// This module handles the critical redirect issue that's causing homepage loops

(function() {
  console.log('Redirect Auth Fix Module loaded');
  
  let isProcessingAuth = false;
  
  // Check if we're returning from Google OAuth redirect
  const isOAuthRedirect = () => {
    const url = window.location.href;
    const params = new URLSearchParams(window.location.search);
    
    return (
      url.includes('/__/auth/handler') ||
      params.has('apiKey') ||
      params.has('authType') ||
      params.has('state') ||
      document.referrer.includes('accounts.google.com')
    );
  };
  
  // Main authentication handler for redirects
  window.handleOAuthRedirect = async () => {
    if (isProcessingAuth) return;
    isProcessingAuth = true;
    
    console.log('Processing OAuth redirect...');
    
    try {
      // Use the global Firebase auth that's already initialized
      const auth = window.firebaseAuth;
      if (!auth) {
        console.error('Firebase auth not initialized');
        return false;
      }
      
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Wait a moment for Firebase to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('OAuth redirect successful:', result.user.email);
        
        // Track successful authentication
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_in_redirect');
        }
        
        // Sync with backend
        const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
        
        if (backendUser) {
          // Show success message
          if (window.showSuccessNotification) {
            window.showSuccessNotification('Successfully signed in! Redirecting to dashboard...');
          }
          
          // Clean the URL and redirect to dashboard
          console.log('Redirecting to dashboard...');
          setTimeout(() => {
            window.location.replace(window.location.origin + '/#dashboard');
          }, 1000);
          
          return true;
        }
      } else {
        console.log('No redirect result found');
      }
    } catch (error) {
      console.error('OAuth redirect error:', error);
      
      if (window.showErrorNotification) {
        window.showErrorNotification('Authentication failed. Please try again.');
      }
    } finally {
      isProcessingAuth = false;
    }
    
    return false;
  };
  
  // Enhanced Google Sign-In with better redirect handling
  window.performSecureGoogleSignIn = async (method = 'popup') => {
    try {
      // Use the global Firebase auth
      let auth = window.firebaseAuth;
      if (!auth) {
        auth = await window.initializeFirebaseAuth();
      }
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      if (method === 'popup') {
        try {
          console.log('Attempting popup sign-in...');
          const result = await signInWithPopup(auth, provider);
          
          if (result && result.user) {
            console.log('Popup sign-in successful');
            
            // Sync with backend
            const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
            
            if (backendUser) {
              // Show success and redirect
              if (window.showSuccessNotification) {
                window.showSuccessNotification('Successfully signed in! Redirecting...');
              }
              
              setTimeout(() => {
                window.navigate('dashboard');
              }, 1500);
              
              return result;
            }
          }
        } catch (popupError) {
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user') {
            console.log('Popup blocked/closed, switching to redirect...');
            
            // Store intent to redirect to dashboard after auth
            sessionStorage.setItem('auth_redirect_intent', 'dashboard');
            
            // Use redirect method
            await signInWithRedirect(auth, provider);
            return null; // Page will reload and be handled by redirect handler
          }
          throw popupError;
        }
      } else {
        // Direct redirect method
        console.log('Using redirect method...');
        sessionStorage.setItem('auth_redirect_intent', 'dashboard');
        await signInWithRedirect(auth, provider);
        return null;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };
  
  // Set up auth state listener for redirect handling
  const setupAuthRedirectListener = async () => {
    if (isOAuthRedirect()) {
      console.log('OAuth redirect page detected, setting up auth listener...');
      
      // Wait for Firebase to be initialized
      let attempts = 0;
      while (!window.firebaseAuth && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!window.firebaseAuth) {
        console.error('Firebase auth not available after waiting');
        return;
      }
      
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Listen for auth state changes on redirect
      onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
          console.log('Auth state changed to signed in on redirect page:', user.email);
          
          // Sync with backend
          const backendUser = await window.syncFirebaseUserWithBackend(user, false);
          
          if (backendUser) {
            console.log('Backend sync successful, redirecting to dashboard...');
            
            if (window.showSuccessNotification) {
              window.showSuccessNotification('Successfully signed in! Redirecting...');
            }
            
            // Redirect to dashboard
            setTimeout(() => {
              window.location.replace(window.location.origin + '/#dashboard');
            }, 1500);
          }
        }
      });
    }
  };
  
  // Check for redirect on page load
  const checkRedirectOnLoad = async () => {
    if (isOAuthRedirect()) {
      console.log('OAuth redirect detected, processing...');
      
      // Set up auth listener first
      await setupAuthRedirectListener();
      
      // Also try the direct method
      const success = await window.handleOAuthRedirect();
      
      if (!success) {
        console.log('Direct redirect processing failed, relying on auth state listener...');
      }
    }
  };
  
  // Initialize redirect checking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkRedirectOnLoad);
  } else {
    checkRedirectOnLoad();
  }
  
  console.log('Redirect Auth Fix Module ready');
})();