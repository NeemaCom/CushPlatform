/**
 * FIREBASE REDIRECT HANDLER
 * Ensures getRedirectResult() is called immediately on page load
 * Routes users to dashboard after successful authentication
 */

(function() {
  'use strict';
  
  console.log('🔄 Firebase Redirect Handler loading...');
  
  // Track if we've already processed a redirect
  let redirectProcessed = false;
  
  // Process redirect result as soon as Firebase is available
  const processRedirectResult = async () => {
    if (redirectProcessed) {
      console.log('Redirect already processed, skipping...');
      return;
    }
    
    try {
      console.log('🔍 Checking for Firebase redirect result...');
      
      // Wait for Firebase to be available
      const auth = await window.waitForFirebase('redirect-handler', 15000);
      if (!auth) {
        console.warn('Firebase not available for redirect processing');
        return;
      }
      
      // Import Firebase functions
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Get redirect result
      console.log('📥 Calling getRedirectResult()...');
      const result = await getRedirectResult(auth);
      
      redirectProcessed = true;
      
      if (result && result.user) {
        console.log('✅ REDIRECT RESULT FOUND - User authenticated:', result.user.email);
        
        // Show loading message
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 10000; display: flex; justify-content: center; align-items: center;">
            <div style="text-align: center; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
              <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
              <div style="font-size: 24px; margin-bottom: 16px; color: #333;">Sign-in Successful!</div>
              <div style="color: #666; font-size: 16px;">Redirecting to your dashboard...</div>
            </div>
          </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Sync with backend
        if (window.syncFirebaseUserWithBackend) {
          console.log('🔄 Syncing Firebase user with backend...');
          const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
          
          if (backendUser) {
            console.log('✅ Backend sync successful');
            
            // Update global state
            if (window.setUser) {
              window.setUser(backendUser);
            }
            
            // Navigate to dashboard after a brief delay
            setTimeout(() => {
              console.log('🎯 NAVIGATING TO DASHBOARD after redirect authentication');
              window.location.href = window.location.origin + '/#dashboard';
            }, 2000);
            
            return;
          }
        }
        
        // Fallback: just navigate to dashboard
        setTimeout(() => {
          console.log('🎯 FALLBACK: Navigating to dashboard');
          window.location.href = window.location.origin + '/#dashboard';
        }, 2000);
        
      } else {
        console.log('📭 No redirect result found');
      }
      
    } catch (error) {
      console.error('❌ Redirect result processing error:', error);
      redirectProcessed = true; // Mark as processed to prevent retry loops
    }
  };
  
  // Process immediately when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processRedirectResult);
  } else {
    // DOM already loaded, process immediately
    processRedirectResult();
  }
  
  // Also process when Firebase coordinator is ready
  if (window.initializeFirebaseOnce) {
    window.initializeFirebaseOnce().then(() => {
      if (!redirectProcessed) {
        processRedirectResult();
      }
    });
  }
  
  console.log('🔄 Firebase Redirect Handler loaded');
})();