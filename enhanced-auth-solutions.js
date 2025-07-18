/**
 * Enhanced Authentication Solutions for Firebase Web Application
 * Addresses: Sign-up button responsiveness, robust sign-out with redirection, 
 * and automatic session timeout on inactivity
 */

// =============================================================================
// 1. ROBUST SIGN-UP BUTTON HANDLER
// =============================================================================

/**
 * Enhanced Sign-Up Handler with comprehensive error handling and user feedback
 * Common issues addressed:
 * - Form validation blocking submission
 * - UI state management (loading, errors)
 * - Network timeouts and connectivity issues
 * - Firebase Auth errors with user-friendly messages
 * - Proper event handling and prevention of double submissions
 */

class EnhancedSignUpHandler {
  constructor(firebaseAuth) {
    this.auth = firebaseAuth;
    this.isSubmitting = false;
    this.timeoutId = null;
  }

  // Enhanced form validation with real-time feedback
  validateForm(formData) {
    const errors = {};
    
    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Required fields
    if (!formData.firstName?.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!formData.acceptTerms) errors.acceptTerms = 'You must accept the terms';

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Firebase error message mapping
  getFirebaseErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/invalid-credential': 'Invalid credentials. Please check your information.',
      'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
      'auth/unauthorized-domain': 'This domain is not authorized for Firebase Auth.',
      'auth/cancelled-popup-request': 'Another popup is already open. Please close it first.'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }

  // Enhanced sign-up handler with comprehensive error handling
  async handleSignUp(formData, updateUI) {
    // Prevent double submissions
    if (this.isSubmitting) {
      console.log('Sign-up already in progress');
      return;
    }

    try {
      this.isSubmitting = true;
      
      // Update UI to show loading state
      updateUI({
        loading: true,
        error: null,
        success: null
      });

      // Validate form
      const validation = this.validateForm(formData);
      if (!validation.isValid) {
        updateUI({
          loading: false,
          error: 'Please fix the form errors before submitting',
          fieldErrors: validation.errors
        });
        return;
      }

      // Set timeout for the operation (30 seconds)
      this.timeoutId = setTimeout(() => {
        throw new Error('Request timeout. Please try again.');
      }, 30000);

      // Import Firebase Auth methods
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        formData.email,
        formData.password
      );

      // Update user profile
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      // Clear timeout
      clearTimeout(this.timeoutId);

      // Sync with backend
      const syncResponse = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          acceptTerms: formData.acceptTerms,
          acceptPrivacy: formData.acceptPrivacy
        }),
      });

      if (!syncResponse.ok) {
        throw new Error('Failed to sync user with backend');
      }

      // Success feedback
      updateUI({
        loading: false,
        success: 'Account created successfully! Redirecting...',
        error: null
      });

      // Redirect after short delay
      setTimeout(() => {
        window.location.hash = 'dashboard';
      }, 1500);

    } catch (error) {
      console.error('Sign-up error:', error);
      
      // Clear timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Handle specific Firebase errors
      let errorMessage = this.getFirebaseErrorMessage(error.code);
      
      // Handle network errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      updateUI({
        loading: false,
        error: errorMessage,
        success: null
      });

    } finally {
      this.isSubmitting = false;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    }
  }

  // Google Sign-Up handler
  async handleGoogleSignUp(updateUI) {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      updateUI({ loading: true, error: null });

      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(this.auth, provider);
      
      // Sync with backend
      const syncResponse = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          firstName: result.user.displayName?.split(' ')[0] || '',
          lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          acceptTerms: true,
          acceptPrivacy: true
        })
      });

      if (!syncResponse.ok) {
        throw new Error('Failed to sync user with backend');
      }

      updateUI({
        loading: false,
        success: 'Successfully signed in with Google! Redirecting...'
      });

      setTimeout(() => {
        window.location.hash = 'dashboard';
      }, 1500);

    } catch (error) {
      console.error('Google sign-up error:', error);
      updateUI({
        loading: false,
        error: this.getFirebaseErrorMessage(error.code)
      });
    } finally {
      this.isSubmitting = false;
    }
  }
}

// =============================================================================
// 2. ROBUST SIGN-OUT WITH REDIRECTION
// =============================================================================

/**
 * Enhanced Sign-Out Handler with comprehensive cleanup and guaranteed redirection
 * Features:
 * - Firebase auth sign-out
 * - Local storage cleanup
 * - Session cleanup via backend
 * - Cookie clearing
 * - Guaranteed redirection to homepage
 * - Error handling with fallback options
 */

class EnhancedSignOutHandler {
  constructor(firebaseAuth) {
    this.auth = firebaseAuth;
    this.isSigningOut = false;
  }

  // Clear all client-side data
  clearClientData() {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    } catch (error) {
      console.error('Error clearing client data:', error);
    }
  }

  // Backend session cleanup
  async clearBackendSession() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Backend logout failed:', response.status);
      }
    } catch (error) {
      console.error('Backend logout error:', error);
    }
  }

  // Firebase sign-out
  async firebaseSignOut() {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(this.auth);
      console.log('Firebase sign-out successful');
    } catch (error) {
      console.error('Firebase sign-out error:', error);
      // Continue with logout process even if Firebase fails
    }
  }

  // Guaranteed redirection with fallback
  performRedirection() {
    try {
      // Primary redirection method
      window.location.href = '/';
      
      // Fallback for single-page apps
      setTimeout(() => {
        if (window.location.hash !== '' && window.location.hash !== '#') {
          window.location.hash = '';
          window.location.reload();
        }
      }, 100);
      
      // Ultimate fallback
      setTimeout(() => {
        window.location.replace('/');
      }, 500);
      
    } catch (error) {
      console.error('Redirection error:', error);
      // Force reload as last resort
      window.location.reload();
    }
  }

  // Main sign-out handler
  async handleSignOut() {
    // Prevent multiple simultaneous sign-outs
    if (this.isSigningOut) {
      console.log('Sign-out already in progress');
      return;
    }

    try {
      this.isSigningOut = true;
      
      console.log('Starting sign-out process...');

      // Step 1: Firebase sign-out
      await this.firebaseSignOut();

      // Step 2: Backend session cleanup
      await this.clearBackendSession();

      // Step 3: Clear client-side data
      this.clearClientData();

      // Step 4: Guaranteed redirection
      this.performRedirection();

    } catch (error) {
      console.error('Sign-out process error:', error);
      
      // Even if there are errors, still try to redirect
      this.clearClientData();
      this.performRedirection();
      
    } finally {
      this.isSigningOut = false;
    }
  }
}

// =============================================================================
// 3. AUTOMATIC SESSION TIMEOUT ON INACTIVITY
// =============================================================================

/**
 * Automatic Session Timeout Handler
 * Features:
 * - Tracks user inactivity (mouse, keyboard, touch)
 * - Configurable timeout duration (default: 10 minutes)
 * - Warning notification before timeout
 * - Automatic sign-out on timeout
 * - Session extension on activity
 */

class InactivityTimeoutHandler {
  constructor(firebaseAuth, options = {}) {
    this.auth = firebaseAuth;
    this.signOutHandler = new EnhancedSignOutHandler(firebaseAuth);
    
    // Configuration
    this.timeoutDuration = options.timeoutDuration || 600000; // 10 minutes
    this.warningDuration = options.warningDuration || 120000; // 2 minutes before timeout
    this.checkInterval = options.checkInterval || 1000; // Check every second
    
    // State
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.warningId = null;
    this.intervalId = null;
    this.isActive = false;
    this.warningShown = false;
    
    // Activity events to track
    this.activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];
    
    this.init();
  }

  // Initialize the timeout handler
  init() {
    this.bindActivityListeners();
    this.startInactivityTimer();
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    });
  }

  // Bind activity event listeners
  bindActivityListeners() {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), true);
    });
  }

  // Handle user activity
  handleActivity() {
    this.lastActivity = Date.now();
    
    // Clear warning if shown
    if (this.warningShown) {
      this.clearWarning();
    }
    
    // Reset timeout
    this.resetTimeout();
  }

  // Reset the inactivity timeout
  resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.warningId) {
      clearTimeout(this.warningId);
    }
    
    this.startInactivityTimer();
  }

  // Start the inactivity timer
  startInactivityTimer() {
    // Set warning timer
    this.warningId = setTimeout(() => {
      this.showWarning();
    }, this.timeoutDuration - this.warningDuration);
    
    // Set timeout timer
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutDuration);
  }

  // Show inactivity warning
  showWarning() {
    if (this.warningShown) return;
    
    this.warningShown = true;
    
    // Create warning notification
    const warningDiv = document.createElement('div');
    warningDiv.id = 'inactivity-warning';
    warningDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 300px;
      ">
        <div style="color: #92400e; font-weight: bold; margin-bottom: 8px;">
          Session Timeout Warning
        </div>
        <div style="color: #92400e; font-size: 14px; margin-bottom: 12px;">
          You will be signed out in 2 minutes due to inactivity.
        </div>
        <button id="extend-session" style="
          background: #f59e0b;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">
          Stay Signed In
        </button>
      </div>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Handle extend session button
    document.getElementById('extend-session').addEventListener('click', () => {
      this.handleActivity();
    });
  }

  // Clear warning notification
  clearWarning() {
    const warningDiv = document.getElementById('inactivity-warning');
    if (warningDiv) {
      warningDiv.remove();
    }
    this.warningShown = false;
  }

  // Handle timeout
  async handleTimeout() {
    console.log('Session timeout due to inactivity');
    
    // Clear warning
    this.clearWarning();
    
    // Show timeout notification
    this.showTimeoutNotification();
    
    // Sign out user
    await this.signOutHandler.handleSignOut();
  }

  // Show timeout notification
  showTimeoutNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        z-index: 10001;
        text-align: center;
      ">
        <div style="color: #374151; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
          Session Expired
        </div>
        <div style="color: #6b7280; font-size: 14px;">
          You have been signed out due to inactivity.
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Start monitoring (when user is authenticated)
  startMonitoring() {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.resetTimeout();
  }

  // Stop monitoring (when user is not authenticated)
  stopMonitoring() {
    this.isActive = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.warningId) {
      clearTimeout(this.warningId);
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.clearWarning();
  }

  // Clean up event listeners
  destroy() {
    this.stopMonitoring();
    
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity.bind(this), true);
    });
  }
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example implementation in your main app
class AuthManager {
  constructor() {
    this.auth = null;
    this.signUpHandler = null;
    this.signOutHandler = null;
    this.inactivityHandler = null;
  }

  async init() {
    // Initialize Firebase Auth
    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    const firebaseConfig = {
      apiKey: "your-api-key",
      authDomain: "portal.we-cush.com",
      projectId: "your-project-id",
      // ... other config
    };
    
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
    
    // Initialize handlers
    this.signUpHandler = new EnhancedSignUpHandler(this.auth);
    this.signOutHandler = new EnhancedSignOutHandler(this.auth);
    this.inactivityHandler = new InactivityTimeoutHandler(this.auth, {
      timeoutDuration: 600000, // 10 minutes
      warningDuration: 120000  // 2 minutes warning
    });
  }

  // Sign up with email/password
  async signUp(formData, updateUI) {
    await this.signUpHandler.handleSignUp(formData, updateUI);
  }

  // Sign up with Google
  async signUpWithGoogle(updateUI) {
    await this.signUpHandler.handleGoogleSignUp(updateUI);
  }

  // Sign out
  async signOut() {
    await this.signOutHandler.handleSignOut();
  }
}

// Export for use in your application
export {
  EnhancedSignUpHandler,
  EnhancedSignOutHandler,
  InactivityTimeoutHandler,
  AuthManager
};