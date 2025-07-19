// Authentication Fix Script - Enhanced Error Handling and Google Sign-Up Flow
// This script will be injected into the main app to fix authentication issues

(function() {
  console.log('Authentication fix script loaded');

  // Enhanced Firebase error message handler
  window.getEnhancedFirebaseErrorMessage = (error) => {
    console.log('Firebase error details:', error);
    
    if (!error || !error.code) {
      console.error('Unknown error:', error);
      return 'An unexpected error occurred. Please try again.';
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password (at least 8 characters).';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a few minutes before trying again.';
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

  // Enhanced Google Sign-Up handler - now redirects to new module
  window.enhancedGoogleSignUpForSignUp = async () => {
    console.log('Legacy Google Sign-Up redirecting to new module');
    
    // Use the new robust authentication module
    if (window.performGoogleSignIn) {
      return window.performGoogleSignIn('popup');
    } else {
      throw new Error('Authentication module not loaded. Please refresh the page.');
    }
  };
      });

      // Check if user already exists in our backend
      const checkUserResponse = await fetch(`/api/auth/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email
        }),
      });

      const userData = await checkUserResponse.json();
      
      if (userData.exists) {
        console.log('User already exists, showing sign-in message');
        
        // Track returning user Google attempt
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'existing_user_redirect');
        }
        
        // For existing users, sync and redirect to dashboard directly
        const syncResponse = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            firstName: user.displayName ? user.displayName.split(' ')[0] : '',
            lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
            isNewUser: false
          }),
        });

        if (syncResponse.ok) {
          window.showSuccessNotification('Welcome back! Redirecting to dashboard...');
          
          setTimeout(() => {
            window.location.hash = 'dashboard';
            window.dispatchEvent(new Event('hashchange'));
          }, 1500);
        } else {
          // Fallback to sign-in page if sync fails
          window.showSuccessNotification('Welcome back! Redirecting to sign-in page...');
          
          setTimeout(() => {
            window.location.hash = 'signin';
            setTimeout(() => {
              window.showInfoNotification('Now you can sign in to your account.');
            }, 500);
          }, 1500);
        }
        
      } else {
        console.log('New user, creating account');
        
        // New user, create account with Firebase user data
        const syncResponse = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            // Extract names from displayName if available
            firstName: user.displayName ? user.displayName.split(' ')[0] : '',
            lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
            isNewUser: true,
            signUpMethod: 'google'
          }),
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.error || 'Failed to create account');
        }
        
        console.log('New user account created successfully');
        
        // Track successful Google sign-up
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_up');
        }
        
        // Show account created success message
        window.showSuccessNotification('Account created successfully! Redirecting to dashboard...');
        
        // Redirect to dashboard directly for new users
        setTimeout(() => {
          window.location.hash = 'dashboard';
          window.dispatchEvent(new Event('hashchange'));
        }, 1500);
      }

    } catch (error) {
      console.error('Enhanced Google sign-up (Get Started) error:', error);
      
      let errorMessage = 'An error occurred during Google sign-up. Please try again.';
      
      if (error.code) {
        errorMessage = window.getEnhancedFirebaseErrorMessage(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error to user
      window.showErrorNotification(errorMessage);
      throw error;
    }
  };

  // Enhanced Google Sign-Up handler - now redirects to new module
  window.enhancedGoogleSignUp = async () => {
    console.log('Legacy Google Sign-Up redirecting to new module');
    
    // Use the new robust authentication module
    if (window.performGoogleSignIn) {
      return window.performGoogleSignIn('popup');
    } else {
      throw new Error('Authentication module not loaded. Please refresh the page.');
    }
  };
      
      console.log('Google sign-up successful:', {
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      });

      // Check if user already exists in our backend
      const checkUserResponse = await fetch(`/api/auth/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email
        }),
      });

      const userData = await checkUserResponse.json();
      
      if (userData.exists) {
        console.log('User already exists, proceeding with sign-in');
        // User exists, just sync and redirect
        await window.handleFirebaseUserDirectly(user);
      } else {
        console.log('New user, creating account');
        // New user, create account with Firebase user data
        const syncResponse = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            // Extract names from displayName if available
            firstName: user.displayName ? user.displayName.split(' ')[0] : '',
            lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
            isNewUser: true,
            signUpMethod: 'google'
          }),
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.error || 'Failed to create account');
        }
        
        console.log('New user account created successfully');
      }

      // Show success message
      window.showSuccessNotification('Successfully signed up with Google! Redirecting to dashboard...');
      
      // Force redirect to dashboard
      setTimeout(() => {
        window.location.hash = 'dashboard';
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Enhanced Google sign-up error:', error);
      
      let errorMessage = 'An error occurred during Google sign-up. Please try again.';
      
      if (error.code) {
        errorMessage = window.getEnhancedFirebaseErrorMessage(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error to user
      window.showErrorNotification(errorMessage);
      throw error;
    }
  };

  // Enhanced email sign-up handler
  window.enhancedEmailSignUp = async (formData) => {
    console.log('Enhanced email sign-up initiated');
    console.log('Form data received:', {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      address: formData.address,
      country: formData.country,
      phone: formData.phone,
      agreeToTerms: formData.agreeToTerms
    });
    
    try {
      // Validate form data
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        throw new Error('Please fill in all required fields.');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      if (!formData.agreeToTerms) {
        throw new Error('Please accept the Terms of Service and Privacy Policy.');
      }

      // Check if Firebase is initialized
      if (!window.firebaseAuth) {
        throw new Error('Firebase not initialized. Please refresh the page and try again.');
      }

      console.log('Creating Firebase user account for:', formData.email);
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const userCredential = await createUserWithEmailAndPassword(
        window.firebaseAuth, 
        formData.email, 
        formData.password
      );
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });
      
      const user = userCredential.user;
      console.log('Firebase user created successfully:', user.email);
      
      // Create user in our backend
      const syncResponse = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: `${formData.firstName} ${formData.lastName}`,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          firstName: formData.firstName || 'User',
          lastName: formData.lastName || '',
          address: formData.address || '',
          country: formData.country || '',
          phone: formData.phone || '',
          acceptTerms: formData.agreeToTerms || false,
          acceptPrivacy: formData.agreeToTerms || false,
          isNewUser: true,
          signUpMethod: 'email'
        }),
      });
      
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        console.error('Backend sync failed:', errorData);
        throw new Error(errorData.error || 'Failed to create account');
      }
      
      console.log('User account created successfully');
      
      // Track successful email sign-up
      if (window.trackAuthEvent) {
        window.trackAuthEvent('email', 'sign_up');
      }
      
      // Show success message
      window.showSuccessNotification('Account created successfully! Welcome to CushGlobal!');
      
      // Force redirect to dashboard
      setTimeout(() => {
        window.location.hash = 'dashboard';
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Enhanced email sign-up error:', error);
      
      let errorMessage = 'An error occurred during sign-up. Please try again.';
      
      if (error.code) {
        errorMessage = window.getEnhancedFirebaseErrorMessage(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Success notification helper
  window.showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
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

  // Info notification helper (blue)
  window.showInfoNotification = (message) => {
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

  console.log('Authentication fix script ready');
})();