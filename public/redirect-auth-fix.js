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
      const auth = await window.initializeFirebaseAuth();
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Wait a moment for Firebase to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
          
          // Clean the URL first
          const cleanUrl = window.location.origin + '/#dashboard';
          window.location.replace(cleanUrl);
          
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
      const auth = await window.initializeFirebaseAuth();
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
  
  // Check for redirect on page load
  const checkRedirectOnLoad = async () => {
    if (isOAuthRedirect()) {
      console.log('OAuth redirect detected, processing...');
      const success = await window.handleOAuthRedirect();
      
      if (!success) {
        // If redirect processing failed, go to homepage
        console.log('Redirect processing failed, going to homepage');
        window.location.replace(window.location.origin + '/');
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