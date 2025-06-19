// Simple React application entry point
const { useState, useEffect } = React;

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication status
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return React.createElement('div', { 
      style: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }, 'Loading Cush Platform...');
  }

  return React.createElement('div', {
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }
  }, [
    React.createElement('header', {
      key: 'header',
      style: {
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '1rem',
        marginBottom: '2rem'
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: {
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: 0
        }
      }, 'Cush - Global Immigration Services Platform'),
      React.createElement('p', {
        key: 'subtitle',
        style: {
          color: '#6b7280',
          margin: '0.5rem 0 0 0'
        }
      }, 'Intelligent, secure financial services with AI-powered assistance')
    ]),
    
    React.createElement('main', {
      key: 'main'
    }, [
      user ? 
        React.createElement('div', {
          key: 'dashboard',
          style: {
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }
        }, [
          React.createElement('h2', {
            key: 'welcome',
            style: { color: '#1f2937', marginTop: 0 }
          }, `Welcome back, ${user.firstName || user.username}!`),
          React.createElement('p', {
            key: 'status'
          }, 'Your dashboard is being prepared...')
        ]) :
        React.createElement('div', {
          key: 'auth',
          style: {
            textAlign: 'center',
            padding: '3rem'
          }
        }, [
          React.createElement('h2', {
            key: 'signin-title',
            style: { color: '#1f2937' }
          }, 'Sign in to your account'),
          React.createElement('p', {
            key: 'signin-desc',
            style: { color: '#6b7280', marginBottom: '2rem' }
          }, 'Access your personalized immigration services dashboard'),
          React.createElement('button', {
            key: 'signin-btn',
            style: {
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer'
            },
            onClick: () => window.location.href = '/api/auth/google'
          }, 'Sign in with Google')
        ])
    ])
  ]);
}

// Mount the React application
ReactDOM.render(React.createElement(App), document.getElementById('root'));