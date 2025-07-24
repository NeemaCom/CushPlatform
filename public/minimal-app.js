// Minimal React App - Emergency Recovery Version
console.log('🚀 Loading minimal app...');

// Wait for React to load, then render immediately
function initMinimalApp() {
  if (!window.React || !window.ReactDOM) {
    console.log('⏳ Waiting for React...');
    setTimeout(initMinimalApp, 100);
    return;
  }

  console.log('✅ React loaded, creating minimal app');
  
  const { createElement: h, useState } = React;
  const { createRoot } = ReactDOM;

  // Simple functional component
  function MinimalApp() {
    const [user, setUser] = useState(null);
    
    return h('div', {
      style: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
        color: 'white',
        fontFamily: 'system-ui',
        padding: '2rem'
      }
    }, [
      h('div', {
        key: 'header',
        style: {
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }
      }, [
        h('div', {
          key: 'logo',
          style: {
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
            fontSize: '2rem',
            fontWeight: 'bold'
          }
        }, 'C'),
        h('h1', {
          key: 'title',
          style: {
            fontSize: '3rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }
        }, 'CUSH'),
        h('p', {
          key: 'subtitle',
          style: {
            fontSize: '1.25rem',
            marginBottom: '3rem',
            opacity: 0.9
          }
        }, 'Your Gateway to Global Immigration Services'),
        h('div', {
          key: 'auth-section',
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            maxWidth: '400px',
            margin: '0 auto'
          }
        }, [
          user ? [
            h('h2', { key: 'welcome' }, `Welcome, ${user.email}!`),
            h('p', { key: 'status', style: { marginBottom: '1rem' } }, 'Application is loading...'),
            h('button', {
              key: 'signout',
              onClick: () => setUser(null),
              style: {
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }
            }, 'Sign Out')
          ] : [
            h('h2', { key: 'signin-title', style: { marginBottom: '1rem' } }, 'Sign In'),
            h('button', {
              key: 'demo-signin',
              onClick: () => setUser({ email: 'demo@cush.com', role: 'user' }),
              style: {
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#1d4ed8',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '1rem',
                width: '100%'
              }
            }, 'Demo Account'),
            h('p', {
              key: 'demo-info',
              style: {
                fontSize: '0.875rem',
                opacity: 0.8
              }
            }, 'Click to access demo account')
          ]
        ])
      ])
    ]);
  }

  // Mount the app
  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('📦 Mounting minimal app...');
    const root = createRoot(rootElement);
    root.render(h(MinimalApp));
    console.log('✅ Minimal app mounted successfully');
  } else {
    console.error('❌ Root element not found');
  }
}

// Start initialization
document.addEventListener('DOMContentLoaded', initMinimalApp);