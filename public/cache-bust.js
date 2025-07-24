// Cache busting utility for Replit preview
(function() {
  'use strict';
  
  // Force hard refresh for Replit preview
  if (window.location.hostname.includes('replit.dev') || window.location.hostname.includes('replit.app')) {
    console.log('🔄 Replit preview detected - implementing cache busting');
    
    // Add timestamp to all script and link tags
    const addCacheBust = () => {
      const timestamp = Date.now();
      
      // Update stylesheets
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (!link.href.includes('?v=')) {
          link.href += `?v=${timestamp}`;
        }
      });
      
      // Force reload if content hasn't changed in 5 seconds
      setTimeout(() => {
        const rootElement = document.getElementById('root');
        if (rootElement && !rootElement.hasChildNodes()) {
          console.log('🔄 Content not loaded, forcing refresh');
          window.location.reload(true);
        }
      }, 5000);
    };
    
    // Run cache busting
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addCacheBust);
    } else {
      addCacheBust();
    }
    
    // Override fetch to add cache busting
    const originalFetch = window.fetch;
    window.fetch = function(resource, options = {}) {
      if (typeof resource === 'string' && !resource.includes('?v=')) {
        resource += (resource.includes('?') ? '&' : '?') + `v=${Date.now()}`;
      }
      return originalFetch(resource, options);
    };
  }
})();