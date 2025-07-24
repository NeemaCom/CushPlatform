/**
 * FIREBASE TOKEN MANAGER
 * Handles ID token acquisition and attachment to all API requests
 * Fixes 401 authorization failures by ensuring proper token handling
 */

(function() {
  'use strict';
  
  console.log('🔑 Firebase Token Manager loading...');
  
  // Global token state
  window.tokenState = {
    currentToken: null,
    tokenExpiry: null,
    refreshing: false,
    lastRefresh: 0
  };
  
  // Get fresh Firebase ID token
  const getFirebaseIdToken = async (forceRefresh = false) => {
    try {
      // Wait for Firebase to be initialized
      if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
        // Silent return for unauthenticated users
        return null;
      }
      
      const user = window.firebaseAuth.currentUser;
      
      // Check if we have a cached token that's still valid
      const now = Date.now();
      if (!forceRefresh && window.tokenState.currentToken && window.tokenState.tokenExpiry > now + 60000) {
        console.log('🔄 Using cached Firebase ID token');
        return window.tokenState.currentToken;
      }
      
      console.log('🔄 Getting fresh Firebase ID token...');
      const token = await user.getIdToken(forceRefresh);
      
      // Parse token to get expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        window.tokenState.currentToken = token;
        window.tokenState.tokenExpiry = payload.exp * 1000; // Convert to milliseconds
        window.tokenState.lastRefresh = now;
        
        console.log('✅ Firebase ID token acquired successfully');
        return token;
      } catch (parseError) {
        console.error('❌ Failed to parse token payload:', parseError);
        return token; // Return token even if we can't parse expiry
      }
      
    } catch (error) {
      console.error('❌ Failed to get Firebase ID token:', error);
      
      // Clear cached token on error
      window.tokenState.currentToken = null;
      window.tokenState.tokenExpiry = null;
      
      return null;
    }
  };
  
  // Enhanced fetch wrapper that automatically adds Firebase ID token
  const authenticatedFetch = async (url, options = {}) => {
    console.log('🌐 Authenticated fetch to:', url);
    
    // Get fresh Firebase ID token
    const token = await getFirebaseIdToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add Authorization header if we have a token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Added Firebase ID token to request');
    } else {
      // Silent for unauthenticated users (normal for public pages)
    }
    
    // Make the request with enhanced options
    const enhancedOptions = {
      ...options,
      headers,
      credentials: 'include' // Keep cookies for session fallback
    };
    
    try {
      // Use original fetch to prevent infinite recursion
      const response = await originalFetch(url, enhancedOptions);
      
      // If we get 401, try refreshing token once
      if (response.status === 401 && token) {
        console.log('🔄 Got 401, attempting token refresh...');
        const refreshedToken = await getFirebaseIdToken(true);
        
        if (refreshedToken && refreshedToken !== token) {
          console.log('🔄 Retrying request with refreshed token...');
          enhancedOptions.headers['Authorization'] = `Bearer ${refreshedToken}`;
          return await originalFetch(url, enhancedOptions);
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Authenticated fetch error:', error);
      throw error;
    }
  };
  
  // Sync Firebase user with backend using ID token
  const syncFirebaseUserWithBackend = async (firebaseUser, isNewUser = false) => {
    console.log('🔄 Syncing Firebase user with backend...');
    
    try {
      const response = await authenticatedFetch('/api/auth/firebase-sync', {
        method: 'POST',
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          firstName: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : '',
          lastName: firebaseUser.displayName ? firebaseUser.displayName.split(' ').slice(1).join(' ') : '',
          isNewUser: isNewUser
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Firebase user sync successful');
        return result;
      } else {
        const errorText = await response.text();
        console.error('❌ Firebase user sync failed:', response.status, errorText);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Firebase user sync error:', error);
      return null;
    }
  };
  
  // Check backend authentication status with token
  const checkBackendAuth = async () => {
    console.log('🔍 Checking backend authentication status...');
    
    try {
      const response = await authenticatedFetch('/api/auth/me');
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Backend authentication verified:', userData.email);
        return userData;
      } else {
        console.log('❌ Backend authentication failed:', response.status);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Backend auth check error:', error);
      return null;
    }
  };
  
  // Override the global fetch for API calls to automatically include tokens
  const originalFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    // Only enhance API calls to our backend
    if (typeof url === 'string' && url.startsWith('/api/')) {
      console.log('🔄 Intercepting API call:', url);
      return authenticatedFetch(url, options);
    }
    
    // For all other requests, use original fetch
    return originalFetch(url, options);
  };
  
  // Expose key functions globally
  window.getFirebaseIdToken = getFirebaseIdToken;
  window.authenticatedFetch = authenticatedFetch;
  window.syncFirebaseUserWithBackend = syncFirebaseUserWithBackend;
  window.checkBackendAuth = checkBackendAuth;
  
  // Clear token state on signout
  window.addEventListener('firebase-signout', () => {
    console.log('🧹 Clearing token state on signout');
    window.tokenState.currentToken = null;
    window.tokenState.tokenExpiry = null;
  });
  
  console.log('✅ Firebase Token Manager ready');
})();