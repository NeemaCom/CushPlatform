/**
 * UNIFIED AUTHENTICATION SYSTEM
 * Single source of truth for all OAuth and redirect handling
 * Replaces multiple conflicting auth systems
 */

(function() {
  'use strict';
  
  console.log('🔐 Unified Authentication System loading...');
  
  // Prevent multiple initialization
  if (window.unifiedAuthInitialized) {
    console.log('Unified auth already initialized, skipping...');
    return;
  }
  window.unifiedAuthInitialized = true;
  
  // Global state
  window.authState = {
    processing: false,
    initialized: false,
    user: null,
    lastCheck: 0
  };
  
  // Clear all auth flags on load to prevent conflicts
  const clearAllAuthFlags = () => {
    console.log('🧹 Clearing all authentication flags...');
    try {
      sessionStorage.removeItem('google_auth_redirect');
      sessionStorage.removeItem('auth_redirect_timestamp');
      sessionStorage.removeItem('firebase_auth_result');
      sessionStorage.removeItem('oauth_processing');
      localStorage.removeItem('firebase_auth_pending');
    } catch (error) {
      console.warn('Error clearing auth flags:', error);
    }
  };
  
  // Robust Firebase auth redirect detection
  const isRealFirebaseAuthRedirect = () => {
    const url = window.location.href;
    const hash = window.location.hash;
    
    // ONLY consider it a redirect if:
    // 1. URL contains Firebase auth handler path, OR
    // 2. URL contains specific authType=signInViaRedirect with apiKey
    // 3. AND we're NOT already on signin page with error params
    
    const hasFirebaseHandler = url.includes('__/auth/handler');
    const hasSpecificAuthParams = url.includes('authType=signInViaRedirect') && url.includes('apiKey=');
    const isSigninWithError = hash.includes('#signin?error=');
    
    // If we're on signin page with error, this is NOT a redirect
    if (isSigninWithError) {
      console.log('❌ Detected signin page with error, not processing as redirect');
      return false;
    }
    
    const isRedirect = hasFirebaseHandler || hasSpecificAuthParams;
    
    console.log('🔍 Firebase redirect detection:', {
      url: url.substring(0, 100) + '...',
      hasFirebaseHandler,
      hasSpecificAuthParams,
      isSigninWithError,
      isRedirect
    });
    
    return isRedirect;
  };
  
  // Process Firebase authentication redirect
  const processFirebaseRedirect = async () => {
    if (window.authState.processing) {
      console.log('⏳ Auth already processing, skipping...');
      return;
    }
    
    window.authState.processing = true;
    
    try {
      console.log('🔄 Processing Firebase authentication redirect...');
      
      // Show loading screen
      document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
            <div style="font-size: 24px; margin-bottom: 16px; color: #333;">Completing Authentication</div>
            <div style="color: #666; font-size: 16px;">Securely processing your sign-in...</div>
            <div style="margin-top: 20px;">
              <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 2s linear infinite;"></div>
            </div>
          </div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      `;
      
      // Wait for Firebase initialization
      const auth = await window.waitForFirebase('unified-auth-system', 30000);
      
      // Import Firebase functions
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Get redirect result with comprehensive error handling
      console.log('📥 Getting Firebase redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        console.log('✅ Authentication successful:', result.user.email);
        
        // Store user data for backend sync
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          emailVerified: result.user.emailVerified
        };
        
        // Sync with backend using token manager
        const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
        
        if (backendUser) {
          console.log('✅ Backend sync successful');
          
          // Show success notification
          if (window.showEnhancedSuccessNotification) {
            const displayName = result.user.displayName || result.user.email.split('@')[0];
            window.showEnhancedSuccessNotification(displayName, 'login');
          }
          
          // Verify session establishment with token
          let sessionVerified = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const userData = await window.checkBackendAuth();
              if (userData) {
                sessionVerified = true;
                console.log('✅ Session verified with token authentication');
                break;
              }
              console.log(`⏳ Session verification attempt ${attempt + 1} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.log(`❌ Session verification attempt ${attempt + 1} error:`, error);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (sessionVerified) {
            // Redirect to dashboard
            setTimeout(() => {
              window.location.replace(window.location.origin + '/#dashboard');
            }, 2000);
          } else {
            throw new Error('Session verification failed after 3 attempts');
          }
        } else {
          throw new Error('Backend sync failed');
        }
      } else {
        throw new Error('No user data received from Firebase redirect');
      }
      
    } catch (error) {
      console.error('❌ Firebase redirect processing failed:', error);
      
      // Clear any problematic state
      clearAllAuthFlags();
      
      // Show user-friendly error and redirect
      alert(`Authentication failed: ${error.message}. Redirecting to sign-in page.`);
      
      // Redirect to signin without error param to avoid loops
      setTimeout(() => {
        window.location.replace(window.location.origin + '/#signin');
      }, 1000);
    } finally {
      window.authState.processing = false;
    }
  };
  
  // Initialize unified auth system
  const initializeUnifiedAuth = async () => {
    if (window.authState.initialized) {
      return;
    }
    
    console.log('🚀 Initializing unified authentication system...');
    
    // Clear flags first
    clearAllAuthFlags();
    
    // Check if this is a Firebase auth redirect
    if (isRealFirebaseAuthRedirect()) {
      console.log('🔄 Firebase auth redirect detected, processing...');
      await processFirebaseRedirect();
      return;
    }
    
    // Set up auth state listener for the main app
    try {
      const auth = await window.waitForFirebase('unified-auth-main', 10000);
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      console.log('👂 Setting up unified auth state listener...');
      
      onAuthStateChanged(auth, async (user) => {
        const now = Date.now();
        
        // Throttle auth state changes to prevent loops
        if (now - window.authState.lastCheck < 1000) {
          console.log('⏳ Auth state change throttled');
          return;
        }
        window.authState.lastCheck = now;
        
        console.log('🔄 Auth state changed:', user ? user.email : 'null');
        
        if (user) {
          // User is signed in - update global state
          window.authState.user = user;
          
          // Update global setUser if available
          if (window.setUser) {
            window.setUser({
              id: user.uid,
              email: user.email,
              firstName: user.displayName ? user.displayName.split(' ')[0] : '',
              lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
              profilePicture: user.photoURL
            });
          }
        } else {
          // User is signed out
          window.authState.user = null;
          
          if (window.setUser) {
            window.setUser(null);
          }
          
          // If on protected route, redirect to home
          const hash = window.location.hash;
          const isProtectedRoute = hash.startsWith('#dashboard') || 
                                  hash.startsWith('#account') ||
                                  hash.startsWith('#loans') ||
                                  hash.startsWith('#community');
          
          if (isProtectedRoute) {
            console.log('🏠 Redirecting to home - user signed out from protected route');
            window.location.hash = '';
          }
        }
      });
      
      window.authState.initialized = true;
      console.log('✅ Unified authentication system ready');
      
    } catch (error) {
      console.error('❌ Failed to initialize unified auth system:', error);
    }
  };
  
  // Expose key functions
  window.clearAllAuthFlags = clearAllAuthFlags;
  window.isRealFirebaseAuthRedirect = isRealFirebaseAuthRedirect;
  
  // Initialize immediately
  initializeUnifiedAuth();
  
  console.log('🔐 Unified Authentication System loaded');
})();