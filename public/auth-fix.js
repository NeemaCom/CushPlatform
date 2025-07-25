// Authentication Fix Module - Enhanced Google Sign-In/Sign-Up handlers
// Provides robust Google authentication integration with Firebase

(function() {
  console.log('Authentication Fix Module loading...');

  // Enhanced Firebase error message mapping
  window.getEnhancedFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead or use a different email.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/popup-blocked':
        return 'Pop-up blocked. Please allow pop-ups for this site and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Firebase authentication. Please contact support.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      case 'auth/account-exists-with-different-credential':
        return 'An account exists with the same email but different sign-in credentials. Please sign in using your original method.';
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different account.';
      default:
        console.error('Unhandled Firebase error:', error.code, error.message);
        return `Authentication failed: ${error.message || 'Please try again or contact support.'}`;
    }
  };

  // Simplified Google Sign-In/Sign-Up using Firebase default popup
  window.simpleGoogleSignIn = async () => {
    console.log('Starting simple Google Sign-In with default Firebase popup');
    
    try {
      // Wait for Firebase initialization if needed
      if (!window.firebaseAuth) {
        console.log('Waiting for Firebase initialization...');
        await window.waitForFirebase('simple-google-signin', 15000);
      }
      
      // Import Firebase auth modules
      const { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Create Google Auth provider optimized for custom domain
      const provider = new GoogleAuthProvider();
      provider.addScope('openid');
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        'prompt': 'select_account',
        'access_type': 'online',
        'include_granted_scopes': 'true'
      });
      
      // Primary: signInWithPopup (optimal for custom domain and browser policies)
      console.log('Triggering Firebase Google popup with custom domain optimization...');
      let result;
      
      try {
        // Set popup configuration for better compatibility with custom domain
        const popupOptions = {
          width: 500,
          height: 600,
          centerscreen: 1,
          chrome: 1,
          toolbar: 0,
          status: 0,
          resizable: 1,
          scrollbars: 1
        };
        
        result = await signInWithPopup(window.firebaseAuth, provider);
        console.log('✅ signInWithPopup successful with custom domain');
        
      } catch (popupError) {
        console.log('⚠️ Popup method failed, implementing redirect fallback:', popupError.code);
        
        // Enhanced error handling for third-party storage restrictions
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request' ||
            popupError.code === 'auth/network-request-failed') {
          // Use redirect method as fallback
          console.log('Using redirect method...');
          await signInWithRedirect(window.firebaseAuth, provider);
          return; // Page will redirect and come back
        }
        throw popupError;
      }
      
      if (result && result.user) {
        console.log('Google sign-in successful:', result.user.email);
        
        // This will be handled by the enhanced simpleGoogleSignIn wrapper above
        
        return result;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // Enhanced error handling for common issues
      let errorMessage;
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized. Please contact support.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/internal-error') {
        errorMessage = 'Authentication service error. Please try again in a moment.';
      } else {
        errorMessage = window.getEnhancedFirebaseErrorMessage(error);
      }
      
      window.showErrorNotification(errorMessage);
      throw error;
    }
  };

  // Backend sync function for Firebase users
  window.syncFirebaseUserWithBackend = async (firebaseUser, isNewUser = false) => {
    try {
      console.log('Syncing Firebase user with backend:', firebaseUser.email);
      
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        isNewUser: isNewUser
      };
      
      const response = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend sync failed:', response.status, errorText);
        throw new Error(`Backend sync failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Backend sync successful:', result);
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Backend sync error:', error);
      return { success: false, error: error.message };
    }
  };

  // Enhanced simpleGoogleSignIn with proper backend sync and redirect
  const originalSimpleGoogleSignIn = window.simpleGoogleSignIn;
  window.simpleGoogleSignIn = async () => {
    try {
      const result = await originalSimpleGoogleSignIn();
      
      if (result && result.user) {
        // Sync with backend
        const syncResult = await window.syncFirebaseUserWithBackend(result.user, false);
        
        if (syncResult.success) {
          // Show success notification with user name using enhanced notification system
          const backendUser = syncResult.user;
          let userName;
          
          if (backendUser && backendUser.firstName) {
            // Use backend user data first (has firstName/lastName)
            userName = backendUser.firstName + (backendUser.lastName ? ' ' + backendUser.lastName : '');
          } else if (result.user.displayName) {
            // Fall back to Firebase displayName
            userName = result.user.displayName;
          } else {
            // Final fallback to email prefix
            userName = result.user.email.split('@')[0];
          }
          
          console.log('Showing success notification for user:', userName);
          if (typeof window.showSuccessNotification === 'function') {
            window.showSuccessNotification(userName, 'login');
          }
          
          // Redirect to dashboard after 1.5 seconds
          setTimeout(() => {
            if (typeof window.navigate === 'function') {
              window.navigate('dashboard');
            } else {
              window.location.hash = 'dashboard';
            }
          }, 1500);
        } else {
          throw new Error('Failed to sync with backend');
        }
      }
      
      return result;
    } catch (error) {
      console.error('Enhanced Google sign-in failed:', error);
      window.showErrorNotification(error.message || 'Sign-in failed. Please try again.');
      throw error;
    }
  };

  // Removed custom function aliases - using only simpleGoogleSignIn for all Google authentication

  // Simple notification fallback (enhanced version loaded from success-notification.js)

  // Error notification helper
  window.showErrorNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  };

  console.log('Authentication Fix Module ready');
})();