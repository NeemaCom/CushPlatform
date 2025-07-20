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

  // Enhanced Google Sign-Up handler for Get Started page
  window.enhancedGoogleSignUp = async () => {
    console.log('Starting Google Sign-Up from Get Started page');
    
    try {
      // Wait for Firebase initialization if needed
      if (!window.firebaseAuth) {
        await window.waitForFirebaseAuth();
      }
      
      // Use the robust Google authentication with popup
      if (window.performGoogleSignIn) {
        console.log('Using performGoogleSignIn for sign-up');
        const result = await window.performGoogleSignIn('popup');
        
        if (result && result.user) {
          console.log('Google sign-up successful:', result.user.email);
          
          // Show enhanced success notification for new sign-up
          if (window.showEnhancedSuccessNotification) {
            const displayName = result.user.displayName || result.user.email.split('@')[0];
            window.showEnhancedSuccessNotification(displayName, 'signup');
          }
          
          // Add delay before redirect to show notification
          setTimeout(() => {
            window.navigate('dashboard');
          }, 2000);
          
          return result;
        }
      } else {
        // Fallback to direct Firebase authentication
        console.log('Using direct Firebase auth for sign-up');
        
        const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await signInWithPopup(window.firebaseAuth.auth, provider);
        
        if (result && result.user) {
          console.log('Direct Google sign-up successful:', result.user.email);
          
          // Sync with backend
          const backendUser = await window.syncFirebaseUserWithBackend(result.user, false);
          
          if (backendUser) {
            // Show enhanced success notification
            if (window.showEnhancedSuccessNotification) {
              const displayName = result.user.displayName || result.user.email.split('@')[0];
              window.showEnhancedSuccessNotification(displayName, 'signup');
            }
            
            // Add delay before redirect
            setTimeout(() => {
              window.navigate('dashboard');
            }, 2000);
          }
          
          return result;
        }
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      
      // Show user-friendly error message
      if (window.showToastNotification) {
        let errorMessage = 'Sign-up failed. Please try again.';
        
        if (error.code === 'auth/popup-blocked') {
          errorMessage = 'Popup blocked. Please allow popups and try again.';
        } else if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign-up cancelled by user.';
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = 'Network error. Please check your connection.';
        }
        
        window.showToastNotification(errorMessage, 'error');
      }
      
      throw error;
    }
  };

  // Enhanced Google Sign-Up handler for signup page (redirects to main handler)
  window.enhancedGoogleSignUpForSignUp = async () => {
    console.log('Google Sign-Up for Sign-Up page - redirecting to main handler');
    
    // Use the main enhanced Google sign-up handler
    return window.enhancedGoogleSignUp();
  };

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