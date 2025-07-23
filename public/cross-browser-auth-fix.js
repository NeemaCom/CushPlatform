/**
 * Cross-Browser Authentication Fix
 * Addresses browser-specific authentication issues, particularly for Safari, Firefox, and Chrome with strict privacy settings
 */

(function() {
  'use strict';
  
  console.log('Cross-Browser Authentication Fix loaded');

  // Browser detection and compatibility setup
  window.browserCompatibilitySetup = () => {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    
    console.log('Browser compatibility setup:', {
      userAgent: userAgent.substring(0, 50) + '...',
      isSafari,
      isFirefox,
      isChrome,
      isMobile,
      isAndroid,
      isIOS
    });

    // Set browser-specific flags with mobile considerations
    window.browserInfo = {
      isSafari,
      isFirefox,
      isChrome,
      isMobile,
      isAndroid,
      isIOS,
      supportsPopups: !isSafari && !isMobile, // Safari and mobile often block popups more aggressively
      requiresRedirect: isSafari || isFirefox || isMobile, // These browsers and mobile work better with redirects
      hasStrictCookies: isSafari || isFirefox || isMobile // These browsers have stricter cookie policies
    };

    return window.browserInfo;
  };

  // Enhanced Google Sign-In with browser-specific optimizations
  window.performCrossBrowserGoogleSignIn = async () => {
    try {
      console.log('Starting cross-browser Google Sign-In...');
      
      // Set up browser compatibility
      const browserInfo = window.browserCompatibilitySetup();
      
      // Wait for Firebase with browser-specific timeout
      const timeout = browserInfo.isSafari ? 15000 : 30000; // Safari gets shorter timeout
      const auth = await window.waitForFirebase('cross-browser-signin', timeout);
      
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider, getRedirectResult } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Browser-specific custom parameters with mobile optimization
      if (browserInfo.isSafari || browserInfo.isFirefox || browserInfo.isMobile) {
        provider.setCustomParameters({
          prompt: 'select_account',
          access_type: 'online', // More compatible with strict browsers and mobile
          include_granted_scopes: 'true' // Better mobile compatibility
        });
      } else {
        provider.setCustomParameters({
          prompt: 'select_account'
        });
      }

      let result = null;
      
      // Try popup first for Chrome, redirect for Safari/Firefox
      if (browserInfo.supportsPopups && !browserInfo.requiresRedirect) {
        try {
          console.log('Attempting popup sign-in for compatible browser...');
          result = await signInWithPopup(auth, provider);
          console.log('Popup sign-in successful');
        } catch (popupError) {
          console.log('Popup failed, falling back to redirect:', popupError.code);
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request') {
            // Fallback to redirect
            console.log('Using redirect fallback for popup-blocked browser...');
            await signInWithRedirect(auth, provider);
            return; // signInWithRedirect doesn't return a result directly
          } else {
            throw popupError;
          }
        }
      } else {
        // Use redirect for Safari/Firefox or when popups are not supported
        console.log('Using redirect sign-in for browser compatibility...');
        await signInWithRedirect(auth, provider);
        return; // signInWithRedirect doesn't return a result directly
      }

      // Process the result if we got one from popup
      if (result && result.user) {
        console.log('Cross-browser sign-in successful:', result.user.email);
        
        // Track the sign-in
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_in_popup_cross_browser');
        }
        
        // Sync with backend
        if (window.syncFirebaseUserWithBackend) {
          const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
          
          if (backendUser) {
            // Show success notification
            if (window.showSuccessNotification) {
              window.showSuccessNotification(`Welcome back, ${result.user.displayName || result.user.email}!`);
            }
            
            // Redirect to dashboard
            setTimeout(() => {
              window.location.hash = '#dashboard';
            }, 1500);
            
            return result.user;
          }
        }
      }
      
    } catch (error) {
      console.error('Cross-browser sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Browser-specific error handling
      if (error.code === 'auth/unauthorized-domain') {
        alert('Authentication failed: This domain is not authorized for Google Sign-In. Please contact support.');
      } else if (error.code === 'auth/network-request-failed') {
        alert('Network error: Please check your internet connection and try again.');
      } else if (error.code === 'auth/internal-error') {
        alert('Authentication service temporarily unavailable. Please try again in a moment.');
      } else {
        // Generic error with browser-specific guidance
        const browserInfo = window.browserInfo || {};
        let errorMessage = 'Sign-in failed. ';
        
        if (browserInfo.isSafari) {
          errorMessage += 'Safari users: Please ensure cookies and JavaScript are enabled, and try again.';
        } else if (browserInfo.isFirefox) {
          errorMessage += 'Firefox users: Please check your privacy settings and try again.';
        } else if (browserInfo.isMobile || browserInfo.isAndroid) {
          errorMessage += 'Mobile users: Please ensure you have a stable internet connection and try again.';
        } else {
          errorMessage += 'Please try refreshing the page and signing in again.';
        }
        
        alert(errorMessage);
      }
      
      throw error;
    }
  };

  // Enhanced redirect result handling for cross-browser compatibility
  window.handleCrossBrowserRedirectResult = async () => {
    try {
      console.log('Checking for redirect result with cross-browser compatibility...');
      
      const auth = window.firebaseAuth;
      if (!auth) {
        console.log('Firebase auth not initialized for redirect check');
        return null;
      }

      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Browser-specific delays for redirect processing
      const browserInfo = window.browserInfo || window.browserCompatibilitySetup();
      const processingDelay = browserInfo.isSafari ? 3000 : 2000; // Safari needs more time
      
      console.log(`Waiting ${processingDelay}ms for browser to process redirect...`);
      await new Promise(resolve => setTimeout(resolve, processingDelay));
      
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('Cross-browser redirect result successful:', result.user.email);
        
        // Track successful redirect authentication
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_in_redirect_cross_browser');
        }
        
        return result;
      } else {
        console.log('No redirect result found');
        return null;
      }
      
    } catch (error) {
      console.error('Cross-browser redirect result error:', error);
      return null;
    }
  };

  // Enhanced Google Sign-Up Function with Cross-Browser Support
  window.enhancedGoogleSignUp = async () => {
    try {
      console.log('Enhanced Google Sign-Up started...');
      
      // Track the attempt
      if (window.trackButtonClick) {
        window.trackButtonClick('google_signup_enhanced', 'authentication');
      }
      
      // Use cross-browser compatible sign-in
      if (window.performCrossBrowserGoogleSignIn) {
        console.log('Using cross-browser compatible sign-up...');
        const user = await window.performCrossBrowserGoogleSignIn();
        
        if (user) {
          // Handle as sign-up (new user)
          const backendResult = await window.syncFirebaseUserWithBackend(user, true);
          
          if (backendResult && backendResult.success) {
            console.log('Enhanced Google sign-up completed successfully');
            
            // Show success notification
            if (window.showSuccessNotification) {
              window.showSuccessNotification(user.displayName || user.email.split('@')[0], 'signup');
            }
            
            // Redirect to sign-in page after account creation
            setTimeout(() => {
              window.location.hash = 'signin';
            }, 2500);
            
            return user;
          }
        }
      } else {
        // Fallback to regular sign-up if cross-browser not available
        console.log('Cross-browser not available, using fallback...');
        
        const auth = await window.waitForFirebase('enhanced-signup', 30000);
        const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = 
          await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });

        let result;
        try {
          console.log('Attempting popup sign-up...');
          result = await signInWithPopup(auth, provider);
        } catch (error) {
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            console.log('Popup blocked, using redirect...');
            await signInWithRedirect(auth, provider);
            return; // Page will redirect
          }
          throw error;
        }
        
        if (result && result.user) {
          const backendResult = await window.syncFirebaseUserWithBackend(result.user, true);
          
          if (backendResult && backendResult.success) {
            if (window.showSuccessNotification) {
              window.showSuccessNotification(result.user.displayName || result.user.email.split('@')[0], 'signup');
            }
            
            setTimeout(() => {
              window.location.hash = 'signin';
            }, 2500);
            
            return result.user;
          }
        }
      }
      
    } catch (error) {
      console.error('Enhanced Google sign-up error:', error);
      
      // Show user-friendly error message
      const browserInfo = window.browserInfo || {};
      let errorMessage = 'Unable to complete Google sign-up. ';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage += 'Pop-up was blocked. Please allow pop-ups for this site and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage += 'Sign-up was cancelled. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else if (browserInfo.isSafari) {
        errorMessage += 'Safari users: Please ensure cookies are enabled and try again.';
      } else if (browserInfo.isFirefox) {
        errorMessage += 'Firefox users: Please check your privacy settings and try again.';
      } else if (browserInfo.isMobile || browserInfo.isAndroid) {
        errorMessage += 'Mobile users: Please ensure you have a stable internet connection and try again.';
      } else {
        errorMessage += 'Please try again or use email sign-up instead.';
      }
      
      alert(errorMessage);
      throw error;
    }
  };

  // Initialize browser compatibility on load
  window.browserCompatibilitySetup();
  
  console.log('Cross-Browser Authentication Fix ready');
  console.log('Enhanced Google Sign-Up function available');
})();