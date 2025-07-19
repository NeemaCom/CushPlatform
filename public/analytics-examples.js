// Firebase Analytics Implementation Examples for CushGlobal Platform
// This file demonstrates how to use the trackUserAction utility functions

(function() {
  'use strict';

  // Wait for Firebase Analytics to be ready
  function waitForAnalytics(callback) {
    const checkAnalytics = () => {
      if (window.firebaseAnalytics && window.trackUserAction) {
        callback();
      } else {
        setTimeout(checkAnalytics, 100);
      }
    };
    checkAnalytics();
  }

  // Example: Track button clicks
  function exampleButtonTracking() {
    // Track Get Started button clicks
    document.addEventListener('click', (event) => {
      if (event.target.textContent?.includes('Get Started')) {
        window.trackButtonClick('get_started', 'homepage_cta', {
          button_location: 'hero_section',
          user_type: 'visitor'
        });
      }
      
      // Track sidebar navigation clicks
      if (event.target.closest('.sidebar-item')) {
        const sidebarItem = event.target.closest('.sidebar-item');
        const itemName = sidebarItem.textContent?.trim();
        window.trackButtonClick('sidebar_navigation', 'dashboard', {
          destination: itemName,
          user_authenticated: true
        });
      }
      
      // Track loan application clicks
      if (event.target.textContent?.includes('Apply Now')) {
        window.trackButtonClick('apply_loan', 'loans_section', {
          loan_provider: event.target.dataset.provider || 'unknown',
          loan_type: event.target.dataset.loanType || 'personal'
        });
      }
    });
  }

  // Example: Track form submissions
  function exampleFormTracking() {
    // Track contact form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      
      if (form.id === 'contact-form') {
        window.trackFormSubmission('contact_form', 'customer_support', true, {
          inquiry_type: form.querySelector('[name="subject"]')?.value || 'general',
          user_type: window.user ? 'registered' : 'visitor'
        });
      }
      
      // Track newsletter signup
      if (form.classList.contains('newsletter-form')) {
        window.trackFormSubmission('newsletter_signup', 'marketing', true, {
          source: 'footer',
          user_authenticated: !!window.user
        });
      }
    });
  }

  // Example: Track feature usage
  function exampleFeatureTracking() {
    // Track AI chat usage
    if (window.trackFeatureUsage) {
      // Track when Imisi chat is opened
      document.addEventListener('click', (event) => {
        if (event.target.closest('.chat-head') || event.target.id === 'imisi-chat-button') {
          window.trackFeatureUsage('imisi_chat', 'open', {
            chat_source: 'chat_head',
            user_journey_step: 'discovery'
          });
        }
      });
      
      // Track loan filtering
      const loanFilters = document.querySelectorAll('.loan-filter');
      loanFilters.forEach(filter => {
        filter.addEventListener('change', (event) => {
          window.trackFeatureUsage('loan_filtering', 'filter_applied', {
            filter_type: event.target.name,
            filter_value: event.target.value,
            results_count: document.querySelectorAll('.loan-card').length
          });
        });
      });
    }
  }

  // Example: Track user engagement metrics
  function exampleEngagementTracking() {
    // Track time spent on page
    let pageStartTime = Date.now();
    let isPageVisible = true;
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isPageVisible) {
          const timeSpent = Date.now() - pageStartTime;
          window.trackUserAction('page_engagement', {
            event_type: 'time_on_page',
            duration_seconds: Math.round(timeSpent / 1000),
            page: window.location.hash.substring(1) || 'home'
          });
          isPageVisible = false;
        }
      } else {
        pageStartTime = Date.now();
        isPageVisible = true;
      }
    });
    
    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;
        
        // Track milestone scroll depths
        if ([25, 50, 75, 90].includes(scrollPercent)) {
          window.trackUserAction('scroll_depth', {
            depth_percent: scrollPercent,
            page: window.location.hash.substring(1) || 'home'
          });
        }
      }
    });
  }

  // Example: Track errors and exceptions
  function exampleErrorTracking() {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      window.trackError('javascript_error', event.message, {
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno
      });
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      window.trackError('promise_rejection', event.reason.toString(), {
        stack: event.reason.stack
      });
    });
    
    // Track network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          window.trackError('network_error', `HTTP ${response.status}`, {
            url: args[0],
            status: response.status,
            status_text: response.statusText
          });
        }
        return response;
      } catch (error) {
        window.trackError('fetch_error', error.message, {
          url: args[0]
        });
        throw error;
      }
    };
  }

  // Example: Track conversions and business metrics
  function exampleConversionTracking() {
    // Track user registration completion
    function trackRegistrationComplete(method) {
      window.trackConversion('user_registration', 0, 'USD', {
        registration_method: method,
        user_source: document.referrer || 'direct',
        registration_flow: 'standard'
      });
    }
    
    // Track loan application initiation
    function trackLoanApplicationStart(provider, amount) {
      window.trackConversion('loan_application_start', amount || 0, 'USD', {
        provider: provider,
        application_source: 'platform',
        user_journey_stage: 'application'
      });
    }
    
    // Track premium feature usage
    function trackPremiumFeatureAccess(featureName) {
      window.trackConversion('premium_feature_access', 0, 'USD', {
        feature_name: featureName,
        user_tier: window.user?.tier || 'free',
        access_method: 'dashboard'
      });
    }
    
    // Make functions available globally
    window.trackRegistrationComplete = trackRegistrationComplete;
    window.trackLoanApplicationStart = trackLoanApplicationStart;
    window.trackPremiumFeatureAccess = trackPremiumFeatureAccess;
  }

  // Example: Track user journey and funnel analysis
  function exampleJourneyTracking() {
    // Track user journey steps
    const journeySteps = {
      'landing': 'User lands on homepage',
      'explore': 'User explores features',
      'signup_start': 'User starts registration',
      'signup_complete': 'User completes registration',
      'first_login': 'User logs in for first time',
      'dashboard_visit': 'User visits dashboard',
      'feature_discovery': 'User discovers key features',
      'loan_browse': 'User browses loan options',
      'loan_apply': 'User applies for loan',
      'conversion': 'User completes desired action'
    };
    
    function trackJourneyStep(step, additionalData = {}) {
      window.trackUserAction('user_journey', {
        journey_step: step,
        step_description: journeySteps[step] || step,
        timestamp: new Date().toISOString(),
        session_id: window.sessionStorage.getItem('session_id') || 'unknown',
        ...additionalData
      });
    }
    
    // Make journey tracking available globally
    window.trackJourneyStep = trackJourneyStep;
  }

  // Initialize all tracking examples when analytics is ready
  waitForAnalytics(() => {
    console.log('Firebase Analytics ready - initializing example tracking');
    
    exampleButtonTracking();
    exampleFormTracking();
    exampleFeatureTracking();
    exampleEngagementTracking();
    exampleErrorTracking();
    exampleConversionTracking();
    exampleJourneyTracking();
    
    // Track analytics system initialization
    window.trackUserAction('analytics_initialized', {
      system: 'firebase_analytics',
      platform: 'web',
      measurement_id: 'G-VGYNJNCJ2F'
    });
    
    console.log('Analytics tracking examples initialized successfully');
  });

})();