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
  
  // Enhanced auth completion handler for redirects
  const handleAuthCompletion = async () => {
    if (!isOAuthRedirect()) return;
    
    console.log('Setting up comprehensive auth completion handler...');
    
    // Wait for Firebase to be fully initialized
    let attempts = 0;
    while (!window.firebaseAuth && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.firebaseAuth) {
      console.error('Firebase auth not available after waiting 5 seconds');
      window.location.replace(window.location.origin + '/?error=firebase_timeout');
      return;
    }
    
    try {
      const { getRedirectResult, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      console.log('Firebase modules loaded, checking for auth completion...');
      
      // Method 1: Direct getRedirectResult check
      const checkRedirectResult = async () => {
        try {
          console.log('Checking getRedirectResult...');
          const result = await getRedirectResult(window.firebaseAuth);
          
          if (result && result.user) {
            console.log('getRedirectResult successful:', result.user.email);
            return result.user;
          }
          
          console.log('No redirect result found');
          return null;
        } catch (error) {
          console.error('getRedirectResult error:', error);
          return null;
        }
      };
      
      // Method 2: Auth state listener
      const setupAuthListener = () => {
        return new Promise((resolve) => {
          console.log('Setting up auth state listener...');
          
          const unsubscribe = onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
              console.log('Auth state listener detected user:', user.email);
              unsubscribe();
              resolve(user);
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            console.log('Auth state listener timeout');
            unsubscribe();
            resolve(null);
          }, 10000);
        });
      };
      
      // Try both methods
      const user = await checkRedirectResult() || await setupAuthListener();
      
      if (user) {
        console.log('Authentication successful, syncing with backend...');
        
        // Sync with backend
        const backendUser = await window.syncFirebaseUserWithBackend(user, false);
        
        if (backendUser) {
          console.log('Backend sync successful, redirecting to dashboard...');
          
          if (window.showSuccessNotification) {
            window.showSuccessNotification('Successfully signed in! Redirecting...');
          }
          
          // Track successful authentication
          if (window.trackAuthEvent) {
            window.trackAuthEvent('google', 'sign_in_redirect_complete');
          }
          
          // Clean redirect
          setTimeout(() => {
            window.location.replace(window.location.origin + '/#dashboard');
          }, 1000);
        } else {
          console.error('Backend sync failed');
          window.location.replace(window.location.origin + '/?error=backend_sync_failed');
        }
      } else {
        console.error('No authentication result found after all methods');
        window.location.replace(window.location.origin + '/?error=auth_incomplete');
      }
      
    } catch (error) {
      console.error('Auth completion handler error:', error);
      window.location.replace(window.location.origin + '/?error=auth_handler_failed');
    }
  };
  
  // Main redirect checker
  const checkRedirectOnLoad = async () => {
    if (isOAuthRedirect()) {
      console.log('OAuth redirect detected, starting comprehensive auth completion...');
      await handleAuthCompletion();
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