/**
 * Firebase Initialization Coordinator
 * Single source of truth for Firebase initialization across all modules
 * Prevents race conditions and timeout discrepancies
 */
(function() {
  'use strict';

  console.log('Firebase Initialization Coordinator loading...');

  // Global state management
  window.firebaseInitState = {
    initialized: false,
    initializing: false,
    error: null,
    startTime: null,
    modules: []
  };

  // Single initialization promise that all modules must use
  let initializationPromise = null;
  let initializationResolve = null;
  let initializationReject = null;

  // Create the master initialization promise
  window.firebaseInitPromise = new Promise((resolve, reject) => {
    initializationResolve = resolve;
    initializationReject = reject;
  });

  // Master Firebase initialization function
  window.initializeFirebaseOnce = async () => {
    if (window.firebaseInitState.initialized) {
      console.log('Firebase already initialized, returning existing instance');
      return window.firebaseAuth;
    }

    if (window.firebaseInitState.initializing) {
      console.log('Firebase initialization in progress, waiting for completion...');
      return await window.firebaseInitPromise;
    }

    window.firebaseInitState.initializing = true;
    window.firebaseInitState.startTime = Date.now();
    
    console.log('Starting master Firebase initialization...');

    try {
      // Import Firebase modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js');

      // Firebase configuration - Production domain configuration for we-cush.com
      const firebaseConfig = {
        apiKey: "AIzaSyD06ZHGJlv-1g0WqfymtGkiHAHeX1O1UGI",
        authDomain: "we-cush.com",
        projectId: "cushportal",
        storageBucket: "cushportal.firebasestorage.app",
        messagingSenderId: "304174661302",
        appId: "1:304174661302:web:8bc1e5f413aae91336f017",
        measurementId: "G-VGYNJNCJ2F"
      };

      console.log('Initializing Firebase app with config:', firebaseConfig.projectId);
      
      // Initialize Firebase app
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      
      // Initialize Analytics (with error handling)
      let analytics = null;
      try {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized successfully');
      } catch (analyticsError) {
        console.warn('Firebase Analytics initialization failed:', analyticsError.message);
      }

      // Store global references
      window.firebaseApp = app;
      window.firebaseAuth = auth;
      window.firebaseAnalytics = analytics;

      // Update state
      window.firebaseInitState.initialized = true;
      window.firebaseInitState.initializing = false;
      const initTime = Date.now() - window.firebaseInitState.startTime;
      
      console.log(`Firebase initialization completed successfully in ${initTime}ms`);
      
      // Resolve the promise
      if (initializationResolve) {
        initializationResolve(auth);
      }

      return auth;

    } catch (error) {
      window.firebaseInitState.initializing = false;
      window.firebaseInitState.error = error;
      const initTime = Date.now() - window.firebaseInitState.startTime;
      
      console.error(`Firebase initialization failed after ${initTime}ms:`, error);
      
      // Reject the promise
      if (initializationReject) {
        initializationReject(new Error(`Firebase initialization failed after ${initTime}ms: ${error.message}`));
      }
      
      throw error;
    }
  };

  // Utility function for modules to wait for Firebase with custom timeout
  window.waitForFirebase = async (moduleName = 'unknown', timeoutMs = 20000) => {
    console.log(`Module "${moduleName}" waiting for Firebase initialization...`);
    
    window.firebaseInitState.modules.push({
      name: moduleName,
      requestTime: Date.now()
    });

    try {
      const result = await Promise.race([
        window.firebaseInitPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Firebase initialization timeout after ${timeoutMs}ms for module "${moduleName}"`)), timeoutMs)
        )
      ]);
      
      console.log(`Module "${moduleName}" received Firebase initialization successfully`);
      return result;
      
    } catch (error) {
      console.error(`Module "${moduleName}" Firebase wait failed:`, error.message);
      throw error;
    }
  };

  // Backward compatibility function
  window.initializeFirebaseAuth = window.waitForFirebase;

  console.log('Firebase Initialization Coordinator ready');
})();