// Simple and robust OAuth redirect handler
// This handles the core OAuth redirect issue that's causing the authentication failure

(function() {
  console.log('OAuth Redirect Handler loaded');

  // Enhanced OAuth redirect detection
  const isOAuthReturn = () => {
    const url = window.location.href;
    const hasFirebaseAuthHandler = url.includes('__/auth/handler') || url.includes('firebaseapp.com');
    const hasOAuthParams = url.includes('apiKey=') || 
                          url.includes('authType=signInViaRedirect') ||
                          document.referrer.includes('accounts.google.com') ||
                          document.referrer.includes('firebase');
    
    console.log('OAuth check:', { url, hasFirebaseAuthHandler, hasOAuthParams, referrer: document.referrer });
    return hasFirebaseAuthHandler || hasOAuthParams;
  };

  // Main OAuth handler
  const handleOAuthReturn = async () => {
    if (!isOAuthReturn()) {
      console.log('Not an OAuth return, skipping handler');
      return;
    }

    console.log('OAuth return detected, processing authentication...');

    try {
      // Wait for Firebase to be properly initialized
      console.log('Waiting for Firebase initialization...');
      
      // First wait for the Firebase initialization function to be available
      let attempts = 0;
      while (!window.initializeFirebaseAuth && attempts < 50) {
        console.log(`Waiting for Firebase init function... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.initializeFirebaseAuth) {
        console.error('Firebase initialization function not available after 5 seconds');
        alert('Authentication failed: Firebase initialization function not loaded. Redirecting to homepage...');
        window.location.replace(window.location.origin);
        return;
      }

      // Now initialize Firebase properly
      let firebaseAuth;
      try {
        console.log('Initializing Firebase...');
        firebaseAuth = await window.initializeFirebaseAuth();
      } catch (initError) {
        console.error('Firebase initialization failed:', initError);
        alert(`Authentication failed: ${initError.message}. Redirecting to homepage...`);
        window.location.replace(window.location.origin);
        return;
      }

      if (!firebaseAuth) {
        console.error('Firebase auth not available after initialization');
        alert('Authentication failed: Firebase auth not initialized. Redirecting to homepage...');
        window.location.replace(window.location.origin);
        return;
      }

      console.log('Firebase auth initialized, checking for user...');

      // Import Firebase functions
      const { getRedirectResult, onAuthStateChanged } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

      // Method 1: Check redirect result immediately with enhanced error handling
      let user = null;
      try {
        console.log('Checking getRedirectResult...');
        const result = await getRedirectResult(firebaseAuth);
        console.log('getRedirectResult response:', result);
        
        if (result && result.user) {
          console.log('Found user via getRedirectResult:', result.user.email);
          user = result.user;
        } else if (result === null) {
          console.log('getRedirectResult returned null - no pending redirect operation');
        }
      } catch (error) {
        console.error('getRedirectResult failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Handle specific Firebase errors
        if (error.code === 'auth/unauthorized-domain') {
          alert('Authentication failed: Domain not authorized. Please contact support.');
          return;
        } else if (error.code === 'auth/auth-domain-config-error') {
          alert('Authentication failed: Domain configuration error. Please contact support.');
          return;
        }
      }

      // Method 2: If no user found, check current auth state
      if (!user) {
        console.log('No redirect result, checking current auth state...');
        user = firebaseAuth.currentUser;
        if (user) {
          console.log('Found current user:', user.email);
        }
      }

      // Method 3: Set up auth state listener as fallback
      if (!user) {
        console.log('Setting up auth state listener...');
        user = await new Promise((resolve) => {
          let timeout;
          const unsubscribe = onAuthStateChanged(firebaseAuth, (authUser) => {
            if (authUser) {
              console.log('Auth state changed to user:', authUser.email);
              clearTimeout(timeout);
              unsubscribe();
              resolve(authUser);
            }
          });

          timeout = setTimeout(() => {
            console.log('Auth state listener timeout');
            unsubscribe();
            resolve(null);
          }, 5000);
        });
      }

      if (user) {
        console.log('Authentication successful, syncing with backend...');
        
        // Show loading message
        document.body.innerHTML = `
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui;">
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 16px;">🔐 Completing Sign-In</div>
              <div style="color: #666;">Syncing your account...</div>
            </div>
          </div>
        `;

        // Sync with backend
        const backendUser = await window.syncFirebaseUserWithBackend(user, false);

        if (backendUser) {
          console.log('Backend sync successful, redirecting to dashboard...');
          
          // Track successful authentication
          if (window.trackAuthEvent) {
            window.trackAuthEvent('google', 'oauth_redirect_complete');
          }

          // Redirect to dashboard
          window.location.replace(window.location.origin + '/#dashboard');
        } else {
          console.error('Backend sync failed');
          alert('Authentication failed: Could not sync with backend. Please try again.');
          window.location.replace(window.location.origin);
        }
      } else {
        console.error('No user found after all methods');
        alert('Authentication failed: No user data received from Google. Please try again.');
        window.location.replace(window.location.origin);
      }

    } catch (error) {
      console.error('OAuth handler error:', error);
      alert(`Authentication failed: ${error.message}. Please try again.`);
      window.location.replace(window.location.origin);
    }
  };

  // Run immediately if this is an OAuth return
  if (isOAuthReturn()) {
    console.log('OAuth return detected on load, starting handler...');
    handleOAuthReturn();
  }

  // Also expose for manual triggering
  window.handleOAuthReturn = handleOAuthReturn;

  console.log('OAuth Redirect Handler ready');
})();