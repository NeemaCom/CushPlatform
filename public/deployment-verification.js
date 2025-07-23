/**
 * DEPLOYMENT VERIFICATION TOOL
 * This file helps verify what version of Firebase initialization code is actually running
 * Execute this in browser console to get definitive proof of active code
 */

(function() {
  'use strict';
  
  console.log('=== FIREBASE DEPLOYMENT VERIFICATION ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // Check if the new coordinator is loaded
  console.log('1. Firebase Init Coordinator Status:');
  console.log('   - initializeFirebaseOnce available:', typeof window.initializeFirebaseOnce);
  console.log('   - waitForFirebase available:', typeof window.waitForFirebase);
  console.log('   - firebaseInitState:', window.firebaseInitState);
  
  // Check coordinator default timeout
  if (window.waitForFirebase) {
    console.log('2. Testing waitForFirebase default timeout:');
    const coordinatorSource = window.waitForFirebase.toString();
    const timeoutMatch = coordinatorSource.match(/timeoutMs\s*=\s*(\d+)/);
    console.log('   - Default timeout in code:', timeoutMatch ? timeoutMatch[1] + 'ms' : 'NOT FOUND');
  }
  
  // Check for old Firebase initialization functions
  console.log('3. Legacy Firebase Functions:');
  console.log('   - initializeFirebaseAuth available:', typeof window.initializeFirebaseAuth);
  
  // Check script sources
  console.log('4. Loaded Script Sources:');
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  scripts.forEach(script => {
    if (script.src.includes('firebase') || script.src.includes('auth') || script.src.includes('oauth')) {
      console.log('   -', script.src);
    }
  });
  
  // Check file timestamps in Sources tab
  console.log('5. IMPORTANT: Check browser Sources tab for these files:');
  console.log('   - /firebase-init-coordinator.js (should be 4882 bytes, modified Jul 23 21:09)');
  console.log('   - /oauth-redirect-handler.js (should be 8649 bytes, modified Jul 23 21:09)');
  
  // Test coordinator functionality
  console.log('6. Testing Coordinator Response:');
  if (window.waitForFirebase) {
    window.waitForFirebase('verification-test', 5000)
      .then(() => console.log('   ✅ Coordinator responded successfully'))
      .catch(err => console.log('   ❌ Coordinator error:', err.message));
  }
  
  console.log('=== END VERIFICATION ===');
  console.log('🔧 If old timeouts persist, clear browser cache and hard refresh (Ctrl+Shift+R)');
})();