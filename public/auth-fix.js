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
        await window.waitForFirebase('simple-google-signin', 10000);
      }
      
      // Import Firebase auth modules
      const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      // Create Google Auth provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Direct Firebase popup sign-in (default UI)
      console.log('Triggering Firebase default Google popup...');
      const result = await signInWithPopup(window.firebaseAuth, provider);
      
      if (result && result.user) {
        console.log('Google sign-in successful:', result.user.email);
        
        // Simple success notification
        window.showSuccessNotification(`Welcome ${result.user.displayName || result.user.email}!`);
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.hash = 'dashboard';
        }, 1000);
        
        return result;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // Show simple error message
      let errorMessage = window.getEnhancedFirebaseErrorMessage(error);
      window.showErrorNotification(errorMessage);
      
      throw error;
    }
  };

  // Alias for backward compatibility
  window.enhancedGoogleSignUp = window.simpleGoogleSignIn;
  window.enhancedGoogleSignUpForSignUp = window.simpleGoogleSignIn;

  // Success notification helper
  window.showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
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
    }, 4000);
  };

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