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
    
    // Check for redirect flags set during sign-in
    const hasRedirectFlag = sessionStorage.getItem('google_auth_redirect') === 'true';
    const redirectTimestamp = sessionStorage.getItem('auth_redirect_timestamp');
    const recentRedirect = redirectTimestamp && (Date.now() - parseInt(redirectTimestamp)) < 60000; // Within 1 minute
    
    // Check if referrer indicates Google OAuth
    const googleReferrer = document.referrer.includes('accounts.google.com') || 
                          document.referrer.includes('google.com/oauth') ||
                          document.referrer.includes('googleusercontent.com');
    
    const isRedirect = hasFirebaseAuthHandler || hasOAuthParams || (hasRedirectFlag && recentRedirect) || googleReferrer;
    
    console.log('OAuth check:', { 
      url, 
      hasFirebaseAuthHandler, 
      hasOAuthParams, 
      hasRedirectFlag,
      recentRedirect,
      googleReferrer,
      isRedirect,
      referrer: document.referrer 
    });
    
    return isRedirect;
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
      
      // Use the centralized Firebase initialization coordinator with cross-browser support
      let firebaseAuth;
      try {
        console.log('Using Firebase initialization coordinator in OAuth handler...');
        
        // Set up browser compatibility if available
        if (window.browserCompatibilitySetup) {
          window.browserCompatibilitySetup();
        }
        
        // Use browser-specific timeout
        const browserInfo = window.browserInfo || {};
        const timeout = browserInfo.isSafari ? 20000 : 30000; // Shorter timeout for Safari
        
        firebaseAuth = await window.waitForFirebase('oauth-redirect-handler', timeout);
        console.log('Firebase successfully initialized for OAuth handler');
      } catch (error) {
        console.error('Firebase initialization failed in OAuth handler:', error.message);
        
        // Browser-specific error messages
        const browserInfo = window.browserInfo || {};
        let errorMessage = 'Authentication failed: ' + error.message;
        
        if (browserInfo.isSafari) {
          errorMessage += '\n\nSafari users: Please ensure cookies are enabled and try again.';
        } else if (browserInfo.isFirefox) {
          errorMessage += '\n\nFirefox users: Please check your privacy settings.';
        }
        
        alert(errorMessage + ' Redirecting to homepage...');
        window.location.replace(window.location.origin);
        return;
      }

      // Verify Firebase auth is available
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

      // Method 1: Check redirect result with cross-browser compatibility
      let user = null;
      try {
        console.log('Checking getRedirectResult with cross-browser support...');
        
        // Use cross-browser redirect handler if available
        let result = null;
        if (window.handleCrossBrowserRedirectResult) {
          result = await window.handleCrossBrowserRedirectResult();
        } else {
          // Fallback to standard redirect result
          result = await getRedirectResult(firebaseAuth);
        }
        
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
        
        // Handle specific Firebase errors with cross-browser considerations
        if (error.code === 'auth/unauthorized-domain') {
          alert('Authentication failed: Domain not authorized. Please contact support.');
          return;
        } else if (error.code === 'auth/auth-domain-config-error') {
          alert('Authentication failed: Domain configuration error. Please contact support.');
          return;
        } else if (error.code === 'auth/network-request-failed') {
          const browserInfo = window.browserInfo || {};
          let message = 'Network error occurred during authentication.';
          if (browserInfo.isSafari || browserInfo.isFirefox) {
            message += ' This may be due to browser privacy settings blocking the request.';
          }
          alert(message + ' Please try again.');
          return;
        } else if (error.code === 'auth/internal-error') {
          alert('Authentication service temporarily unavailable. Please try again in a moment.');
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
            console.log('Auth state listener timeout - extending timeout to accommodate initialization');
            unsubscribe();
            resolve(null);
          }, 15000);
        });
      }

      if (user) {
        console.log('Authentication successful, syncing with backend...');
        
        // Clear redirect flags on success
        sessionStorage.removeItem('google_auth_redirect');
        sessionStorage.removeItem('auth_redirect_timestamp');
        
        // Show enhanced success notification first
        if (window.showEnhancedSuccessNotification) {
          const displayName = user.displayName || user.email.split('@')[0];
          window.showEnhancedSuccessNotification(displayName, 'login');
        }
        
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
          console.log('Backend sync successful, verifying session...');
          
          // Verify session is established by testing /api/auth/me
          let sessionVerified = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const meResponse = await fetch('/api/auth/me', {
                credentials: 'include'
              });
              if (meResponse.ok) {
                sessionVerified = true;
                console.log('Session verified successfully');
                break;
              }
              console.log(`Session verification attempt ${attempt + 1} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            } catch (error) {
              console.log(`Session verification attempt ${attempt + 1} error:`, error);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (!sessionVerified) {
            console.error('Session verification failed after 3 attempts');
            alert('Authentication completed but session verification failed. Please try signing in again.');
            window.location.replace(window.location.origin);
            return;
          }
          
          // Track successful authentication
          if (window.trackAuthEvent) {
            window.trackAuthEvent('google', 'oauth_redirect_complete');
          }

          // Add delay before redirect to show notification
          setTimeout(() => {
            window.location.replace(window.location.origin + '/#dashboard');
          }, 2000);
        } else {
          console.error('Backend sync failed');
          alert('Authentication failed: Could not sync with backend. Please try again.');
          window.location.replace(window.location.origin);
        }
      } else {
        console.error('No user found after all methods');
        
        // Clear redirect flags on failure
        sessionStorage.removeItem('google_auth_redirect');
        sessionStorage.removeItem('auth_redirect_timestamp');
        
        // More detailed error message
        const errorMsg = 'Authentication failed: Unable to receive user data from Google. This may be due to:\n' +
                        '• Pop-up was blocked or closed\n' +
                        '• Network connectivity issues\n' +
                        '• Browser settings blocking authentication\n\n' +
                        'Please try again or use email sign-in instead.';
        alert(errorMsg);
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