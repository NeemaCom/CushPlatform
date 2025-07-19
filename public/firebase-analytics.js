// Firebase Analytics Utility Functions
// Track user actions and events throughout the CushGlobal platform

(function() {
  'use strict';

  /**
   * Track user actions with Firebase Analytics
   * @param {string} eventName - The name of the event to track
   * @param {Object} eventParams - Optional parameters for the event
   */
  window.trackUserAction = (eventName, eventParams = {}) => {
    if (!window.firebaseAnalytics) {
      console.warn('Firebase Analytics not initialized. Event not tracked:', eventName);
      return;
    }

    try {
      // Import logEvent from Firebase Analytics
      import('https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js')
        .then(({ logEvent }) => {
          // Add timestamp and page info to all events
          const enhancedParams = {
            ...eventParams,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
            page_path: window.location.pathname,
            page_hash: window.location.hash,
            user_agent: navigator.userAgent,
            platform: 'web'
          };

          logEvent(window.firebaseAnalytics, eventName, enhancedParams);
          console.log('Analytics event tracked:', eventName, enhancedParams);
        })
        .catch((error) => {
          console.warn('Failed to import logEvent:', error);
        });
    } catch (error) {
      console.warn('Error tracking user action:', error.message);
    }
  };

  /**
   * Track page views automatically
   * @param {string} pageName - Name of the page being viewed
   * @param {Object} additionalParams - Additional parameters
   */
  window.trackPageView = (pageName, additionalParams = {}) => {
    window.trackUserAction('page_view', {
      page_title: document.title,
      page_name: pageName,
      ...additionalParams
    });
  };

  /**
   * Track user authentication events
   * @param {string} method - Authentication method (email, google, etc.)
   * @param {string} action - Action type (sign_up, sign_in, sign_out)
   */
  window.trackAuthEvent = (method, action) => {
    window.trackUserAction(action, {
      method: method,
      category: 'authentication'
    });
  };

  /**
   * Track button clicks with context
   * @param {string} buttonName - Name/ID of the button
   * @param {string} context - Context where button was clicked
   * @param {Object} additionalParams - Additional parameters
   */
  window.trackButtonClick = (buttonName, context = '', additionalParams = {}) => {
    window.trackUserAction('button_click', {
      button_name: buttonName,
      context: context,
      category: 'user_interaction',
      ...additionalParams
    });
  };

  /**
   * Track form submissions
   * @param {string} formName - Name/ID of the form
   * @param {string} formType - Type of form (signup, contact, etc.)
   * @param {boolean} successful - Whether submission was successful
   */
  window.trackFormSubmission = (formName, formType, successful = true) => {
    window.trackUserAction('form_submit', {
      form_name: formName,
      form_type: formType,
      success: successful,
      category: 'form_interaction'
    });
  };

  /**
   * Track feature usage
   * @param {string} featureName - Name of the feature used
   * @param {string} action - Action performed with the feature
   * @param {Object} additionalParams - Additional parameters
   */
  window.trackFeatureUsage = (featureName, action, additionalParams = {}) => {
    window.trackUserAction('feature_usage', {
      feature_name: featureName,
      feature_action: action,
      category: 'feature_interaction',
      ...additionalParams
    });
  };

  /**
   * Track errors and exceptions
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   * @param {string} context - Context where error occurred
   */
  window.trackError = (errorType, errorMessage, context = '') => {
    window.trackUserAction('exception', {
      error_type: errorType,
      error_message: errorMessage,
      context: context,
      category: 'error',
      fatal: false
    });
  };

  /**
   * Track custom conversion events
   * @param {string} conversionType - Type of conversion
   * @param {number} value - Value of the conversion
   * @param {string} currency - Currency code
   */
  window.trackConversion = (conversionType, value = 0, currency = 'USD') => {
    window.trackUserAction('conversion', {
      conversion_type: conversionType,
      value: value,
      currency: currency,
      category: 'conversion'
    });
  };

  console.log('Firebase Analytics utilities loaded');
})();