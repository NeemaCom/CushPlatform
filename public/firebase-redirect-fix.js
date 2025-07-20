// Firebase Redirect Fix - Handle Firebase auth redirects properly
// This addresses the "No user data received from Google" issue

(function() {
  console.log('Firebase Redirect Fix loaded');

  // Check if this is a Firebase auth redirect page
  const checkFirebaseAuthRedirect = () => {
    const url = window.location.href;
    const isFirebaseAuthPage = url.includes('__/auth/handler') || 
                              url.includes('firebaseapp.com') ||
                              url.includes('apiKey=') && url.includes('authType=');
    
    console.log('Firebase auth redirect check:', { url, isFirebaseAuthPage });
    return isFirebaseAuthPage;
  };

  // Handle Firebase auth redirect
  const handleFirebaseAuthRedirect = async () => {
    if (!checkFirebaseAuthRedirect()) {
      console.log('Not a Firebase auth redirect, skipping...');
      return;
    }

    console.log('Firebase auth redirect detected, processing...');

    // Show loading screen
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="text-align: center; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
          <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
          <div style="font-size: 24px; margin-bottom: 16px; color: #333;">Completing Authentication</div>
          <div style="color: #666; font-size: 16px;">Processing your Google sign-in...</div>
          <div style="margin-top: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 2s linear infinite;"></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    try {
      // Wait for Firebase to be available
      let attempts = 0;
      while (!window.firebase && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.firebase) {
        throw new Error('Firebase not available after 10 seconds');
      }

      // Import Firebase auth
      const { getAuth, getRedirectResult } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

      const auth = getAuth();
      console.log('Firebase auth instance:', auth);

      // Get redirect result
      const result = await getRedirectResult(auth);
      console.log('Firebase redirect result:', result);

      if (result && result.user) {
        console.log('User authenticated via Firebase redirect:', result.user.email);
        
        // Redirect to our app with user data
        const userData = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          emailVerified: result.user.emailVerified
        };

        // Store user data temporarily
        sessionStorage.setItem('firebase_auth_result', JSON.stringify(userData));
        
        // Redirect back to the app
        const appUrl = new URL(window.location.origin);
        appUrl.hash = 'auth-complete';
        window.location.replace(appUrl.toString());
        
      } else {
        console.error('No user in redirect result');
        // Redirect back to sign-in with error
        const appUrl = new URL(window.location.origin);
        appUrl.hash = 'signin?error=no_user_data';
        window.location.replace(appUrl.toString());
      }
      
    } catch (error) {
      console.error('Firebase redirect processing failed:', error);
      // Redirect back to sign-in with error
      const appUrl = new URL(window.location.origin);
      appUrl.hash = 'signin?error=redirect_failed';
      window.location.replace(appUrl.toString());
    }
  };

  // Run immediately if this is a Firebase auth redirect
  if (checkFirebaseAuthRedirect()) {
    handleFirebaseAuthRedirect();
  }

  console.log('Firebase Redirect Fix ready');
})();