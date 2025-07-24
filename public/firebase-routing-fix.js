// Firebase Authentication + Hash Routing Conflict Resolution
// This module ensures Firebase auth processes BEFORE client-side routing takes over

(function() {
  console.log('Firebase Routing Fix Module loaded');

  // Flag to track if we're in the middle of processing Firebase auth
  let processingFirebaseAuth = false;
  let originalHashChangeHandler = null;
  let deferredHashChanges = [];

  // Store the original hash before any auth attempts
  const PRE_AUTH_HASH_KEY = 'cush_pre_auth_hash';
  
  // Temporarily disable hash routing while Firebase processes authentication
  window.pauseHashRouting = () => {
    console.log('Pausing hash routing for Firebase auth processing...');
    processingFirebaseAuth = true;
    
    // Store current hash as intended destination
    const currentHash = window.location.hash;
    if (currentHash && currentHash !== '#signin' && currentHash !== '#signup') {
      sessionStorage.setItem(PRE_AUTH_HASH_KEY, currentHash);
    }
  };

  // Resume hash routing after Firebase auth is complete
  window.resumeHashRouting = () => {
    console.log('Resuming hash routing after Firebase auth...');
    processingFirebaseAuth = false;
    
    // Process any deferred hash changes
    deferredHashChanges.forEach(hash => {
      console.log('Processing deferred hash change:', hash);
      window.location.hash = hash;
    });
    deferredHashChanges = [];
  };

  // Enhanced navigation that respects Firebase auth processing
  window.navigateWithAuthSupport = (hash) => {
    if (processingFirebaseAuth) {
      console.log('Deferring navigation during auth processing:', hash);
      deferredHashChanges.push(hash);
      return;
    }
    
    console.log('Navigating to:', hash);
    window.location.hash = hash;
  };

  // Get the intended destination after auth
  window.getIntendedDestination = () => {
    const stored = sessionStorage.getItem(PRE_AUTH_HASH_KEY);
    sessionStorage.removeItem(PRE_AUTH_HASH_KEY);
    return stored || '#dashboard';
  };

  // Enhanced Google Sign-In that properly handles hash routing
  window.performGoogleSignInWithRouting = async (preferredMethod = 'popup') => {
    try {
      // Pause hash routing during auth
      window.pauseHashRouting();
      
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

      if (preferredMethod === 'popup') {
        try {
          console.log('Attempting Google sign-in with popup (routing paused)...');
          const result = await signInWithPopup(auth, provider);
          console.log('Popup sign-in successful');
          return result;
        } catch (popupError) {
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user') {
            console.log('Popup failed, falling back to redirect method...');
            
            // Clear any hash that might interfere with redirect
            const currentHash = window.location.hash;
            if (currentHash) {
              sessionStorage.setItem(PRE_AUTH_HASH_KEY, currentHash);
              // Temporarily clear hash for clean redirect
              history.replaceState(null, null, window.location.pathname + window.location.search);
            }
            
            await signInWithRedirect(auth, provider);
            return null; // Will be handled by getRedirectResult on next load
          }
          throw popupError;
        }
      } else {
        // Use redirect method directly
        console.log('Using redirect method...');
        
        // Clear hash for clean redirect and store intended destination
        const currentHash = window.location.hash;
        if (currentHash && currentHash !== '#signin' && currentHash !== '#signup') {
          sessionStorage.setItem(PRE_AUTH_HASH_KEY, currentHash);
        } else {
          // Default to dashboard for sign-in/sign-up pages
          sessionStorage.setItem(PRE_AUTH_HASH_KEY, '#dashboard');
        }
        // Temporarily clear hash for clean redirect
        history.replaceState(null, null, window.location.pathname + window.location.search);
        
        await signInWithRedirect(auth, provider);
        return null;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      window.resumeHashRouting();
      throw error;
    }
  };

  // Enhanced redirect result handler that manages routing
  window.handleFirebaseRedirectWithRouting = async () => {
    try {
      console.log('Checking for Firebase redirect result (routing paused)...');
      window.pauseHashRouting();
      
      const auth = await window.initializeFirebaseAuth();
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('Redirect result found:', result.user.email);
        
        // Track successful authentication
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_in_redirect');
        }
        
        // Complete authentication flow immediately
        await window.completeAuthenticationWithRouting(result.user, false);
        return result;
      }
      
      // No redirect result, resume normal routing
      console.log('No redirect result found, resuming routing...');
      window.resumeHashRouting();
      return null;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      window.resumeHashRouting();
      
      const errorMessage = window.handleFirebaseAuthError ? 
        window.handleFirebaseAuthError(error) : error.message;
      if (errorMessage && window.showErrorNotification) {
        window.showErrorNotification(errorMessage);
      }
      return null;
    }
  };

  // Complete authentication with proper routing restoration
  window.completeAuthenticationWithRouting = async (firebaseUser, isNewUser = false) => {
    try {
      console.log('Completing authentication with routing support...');
      
      // Sync with backend first
      const backendUser = await window.syncFirebaseUserWithBackend(firebaseUser, isNewUser);
      
      if (backendUser) {
        // Show success message
        if (window.showSuccessNotification) {
          window.showSuccessNotification(
            isNewUser ? 
            'Account created successfully! Welcome to CushGlobal!' : 
            'Successfully signed in! Redirecting...'
          );
        }
        
        // Resume routing and get intended destination
        window.resumeHashRouting();
        const intendedDestination = window.getIntendedDestination();
        
        // Navigate to intended destination
        setTimeout(() => {
          console.log('Redirecting to:', intendedDestination);
          
          // Clean up the URL if it has auth handler params
          if (window.location.pathname.includes('/__/auth/handler') || 
              window.location.search.includes('apiKey')) {
            // Replace the current URL with clean version
            const cleanUrl = window.location.origin + '/';
            history.replaceState(null, null, cleanUrl);
          }
          
          const destination = intendedDestination.startsWith('#') ? 
            intendedDestination.substring(1) : intendedDestination;
          
          window.navigateWithAuthSupport(destination);
          
          // Force hash change event
          window.dispatchEvent(new Event('hashchange'));
        }, 1500);
        
        return true;
      }
      
      // Resume routing even if backend sync failed
      window.resumeHashRouting();
      return false;
    } catch (error) {
      console.error('Authentication completion error:', error);
      window.resumeHashRouting();
      
      if (window.showErrorNotification) {
        window.showErrorNotification(error.message || 'Authentication failed. Please try again.');
      }
      return false;
    }
  };

  // Enhanced auth state listener that respects routing
  window.setupFirebaseAuthWithRouting = async () => {
    try {
      // First, check for redirect result before any routing
      const redirectResult = await window.handleFirebaseRedirectWithRouting();
      if (redirectResult && redirectResult.user) {
        // Authentication was handled in handleFirebaseRedirectWithRouting
        return;
      }

      const auth = await window.initializeFirebaseAuth();
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed (routing aware):', user ? user.email : 'null');
        
        if (user) {
          // Check if this is from a redirect that we haven't processed yet
          const urlParams = new URLSearchParams(window.location.search);
          const hasAuthHandler = window.location.pathname.includes('/__/auth/handler') || 
                                urlParams.has('apiKey') || 
                                urlParams.has('authType');
          
          if (hasAuthHandler) {
            console.log('Processing auth from redirect handler...');
            await window.completeAuthenticationWithRouting(user, false);
            return;
          }
          
          // User is signed in, ensure backend is synced
          try {
            const response = await fetch('/api/auth/me', {
              credentials: 'include'
            });
            
            if (!response.ok) {
              // Backend session missing, sync it
              console.log('Backend session missing, syncing...');
              await window.syncFirebaseUserWithBackend(user);
              
              // After sync, redirect to dashboard if we're not already there
              const currentHash = window.location.hash;
              if (!currentHash.startsWith('#dashboard')) {
                setTimeout(() => {
                  console.log('Redirecting authenticated user to dashboard...');
                  window.navigate('dashboard');
                }, 1000);
              }
            }
          } catch (error) {
            console.error('Backend check error:', error);
          }
        }
      });
    } catch (error) {
      console.error('Auth setup error:', error);
      window.resumeHashRouting();
    }
  };

  // Initialize on load - prioritize Firebase over routing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.setupFirebaseAuthWithRouting);
  } else {
    window.setupFirebaseAuthWithRouting();
  }

  console.log('Firebase Routing Fix Module ready');
})();