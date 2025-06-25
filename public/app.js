// React 18 Components for Cush Platform - Based on Design Mockups
const { useState, useEffect, createElement: e } = React;
const { createRoot } = ReactDOM;

// Homepage Hero Section - Based on Design Mockup
function HeroSection() {
  return e('section', { 
    className: 'relative bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center'
  }, [
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6 py-20'
    }, [
      e('div', {
        key: 'grid',
        className: 'grid lg:grid-cols-2 gap-12 items-center'
      }, [
        // Left Content
        e('div', { key: 'content', className: 'text-center lg:text-left' }, [
          e('h1', { 
            key: 'title',
            className: 'text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight'
          }, [
            'Simplify Your ',
            e('span', { 
              key: 'highlight',
              className: 'text-blue-600'
            }, 'Migration Journey'),
            ' with Expert Guidance'
          ]),
          
          e('p', { 
            key: 'subtitle',
            className: 'text-xl text-gray-600 mb-8 leading-relaxed'
          }, 'Connect with immigration experts, access personalized guidance, and navigate your path to a new country with confidence and clarity.'),
          
          e('div', {
            key: 'buttons',
            className: 'flex flex-col sm:flex-row gap-4 justify-center lg:justify-start'
          }, [
            e('button', {
              key: 'primary',
              className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors shadow-lg',
              onClick: () => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
            }, 'Get Started Today'),
            e('button', {
              key: 'secondary',
              className: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 rounded-lg transition-colors'
            }, 'Learn More')
          ])
        ]),
        
        // Right Image/Illustration
        e('div', { key: 'image', className: 'flex justify-center' }, [
          e('div', {
            key: 'illustration',
            className: 'w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-2xl flex items-center justify-center shadow-2xl'
          }, [
            e('div', {
              key: 'placeholder',
              className: 'text-6xl text-blue-600'
            }, '🌍')
          ])
        ])
      ])
    ])
  ]);
}

// Features Section - Based on Design
function FeaturesSection() {
  const features = [
    {
      icon: '👨‍💼',
      title: 'Expert Consultations',
      description: 'Connect with certified immigration experts for personalized guidance and support throughout your journey.'
    },
    {
      icon: '📋',
      title: 'Document Management',
      description: 'Organize and track all your immigration documents in one secure, easy-to-access platform.'
    },
    {
      icon: '💰',
      title: 'Financial Planning',
      description: 'Plan your immigration budget with our comprehensive cost calculators and financial tools.'
    },
    {
      icon: '🌐',
      title: 'Global Coverage',
      description: 'Access immigration services for over 180+ countries with localized expertise and requirements.'
    },
    {
      icon: '🤖',
      title: 'AI-Powered Assistance',
      description: 'Get instant answers to your immigration questions with our intelligent AI assistant, Imisi 2.0.'
    },
    {
      icon: '🏆',
      title: 'Success Tracking',
      description: 'Monitor your application progress and celebrate milestones with our achievement system.'
    }
  ];

  return e('section', { className: 'py-20 bg-white' }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      e('div', { key: 'header', className: 'text-center mb-16' }, [
        e('h2', { 
          key: 'title',
          className: 'text-3xl lg:text-4xl font-bold text-gray-900 mb-4'
        }, 'Why Choose Cush?'),
        e('p', { 
          key: 'subtitle',
          className: 'text-xl text-gray-600 max-w-2xl mx-auto'
        }, 'Everything you need to make your immigration journey smooth and successful')
      ]),
      
      e('div', { 
        key: 'grid',
        className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-8'
      }, features.map((feature, index) =>
        e('div', {
          key: index,
          className: 'text-center p-6 rounded-xl hover:shadow-lg transition-shadow bg-gray-50 hover:bg-white border'
        }, [
          e('div', {
            key: 'icon',
            className: 'text-4xl mb-4'
          }, feature.icon),
          e('h3', {
            key: 'title',
            className: 'text-xl font-semibold text-gray-900 mb-3'
          }, feature.title),
          e('p', {
            key: 'desc',
            className: 'text-gray-600 leading-relaxed'
          }, feature.description)
        ])
      ))
    ])
  ]);
}

// Statistics Section
function StatsSection() {
  const stats = [
    { number: '50,000+', label: 'Successful Applications' },
    { number: '180+', label: 'Countries Covered' },
    { number: '95%', label: 'Success Rate' },
    { number: '24/7', label: 'Expert Support' }
  ];

  return e('section', { className: 'py-20 bg-blue-600' }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      e('div', { 
        key: 'grid',
        className: 'grid grid-cols-2 lg:grid-cols-4 gap-8 text-center'
      }, stats.map((stat, index) =>
        e('div', { key: index, className: 'text-white' }, [
          e('div', {
            key: 'number',
            className: 'text-3xl lg:text-4xl font-bold mb-2'
          }, stat.number),
          e('div', {
            key: 'label',
            className: 'text-blue-100'
          }, stat.label)
        ])
      ))
    ])
  ]);
}

// Authentication Component - Based on Design
function AuthComponent() {
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const [testCredentials, setTestCredentials] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/test-credentials')
      .then(res => res.ok ? res.json() : null)
      .then(data => setTestCredentials(data))
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Login failed');
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const useTestAccount = (credentials) => {
    setLoginForm({ email: credentials.email, password: credentials.password });
  };

  return e('section', {
    id: 'auth-section',
    className: 'py-20 bg-gray-50'
  }, [
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6'
    }, [
      e('div', { 
        key: 'content',
        className: 'max-w-md mx-auto bg-white rounded-xl shadow-lg p-8'
      }, [
        e('div', { 
          key: 'header',
          className: 'text-center mb-8'
        }, [
          e('h2', { 
            key: 'title',
            className: 'text-2xl font-bold text-gray-900 mb-2'
          }, 'Welcome to Cush'),
          e('p', { 
            key: 'subtitle',
            className: 'text-gray-600'
          }, 'Sign in to access your immigration dashboard')
        ]),
        
        e('form', {
          key: 'login-form',
          onSubmit: handleLogin,
          className: 'space-y-6'
        }, [
          e('div', { key: 'email-field' }, [
            e('label', { 
              key: 'email-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Email Address'),
            e('input', {
              key: 'email-input',
              type: 'email',
              value: loginForm.email,
              onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              placeholder: 'Enter your email'
            })
          ]),
          
          e('div', { key: 'password-field' }, [
            e('label', { 
              key: 'password-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Password'),
            e('input', {
              key: 'password-input',
              type: 'password',
              value: loginForm.password,
              onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              placeholder: 'Enter your password'
            })
          ]),
          
          e('button', {
            key: 'submit-button',
            type: 'submit',
            disabled: loading,
            className: `w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors ${loading ? 'cursor-not-allowed' : ''}`
          }, loading ? 'Signing in...' : 'Sign In')
        ]),
        
        testCredentials && e('div', {
          key: 'test-accounts',
          className: 'mt-6 pt-6 border-t border-gray-200'
        }, [
          e('button', {
            key: 'toggle-test',
            onClick: () => setShowTestAccounts(!showTestAccounts),
            className: 'w-full text-sm text-blue-600 hover:text-blue-800 transition-colors'
          }, showTestAccounts ? 'Hide Test Accounts' : 'Show Test Accounts'),
          
          showTestAccounts && testCredentials.testAccounts && e('div', { 
            key: 'test-list',
            className: 'mt-4 space-y-2'
          }, testCredentials.testAccounts.map((account, index) =>
            e('button', {
              key: index,
              onClick: () => useTestAccount(account),
              className: 'block w-full p-3 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors'
            }, `${account.email} (${account.role})`)
          ))
        ])
      ])
    ])
  ]);
}

// Dashboard Component - Based on Mockup Design
function Dashboard({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sidebar items matching the mockup
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', active: true },
    { id: 'loans', label: 'Loans', icon: '💳' },
    { id: 'migration-services', label: 'Migration Services', icon: '🌍' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'recruitment', label: 'Recruitment', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'support', label: 'Support', icon: '💬' }
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return e('div', { className: 'min-h-screen bg-gray-50 flex' }, [
    // Sidebar
    e('aside', {
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    }, [
      // Logo Section
      e('div', {
        key: 'logo-section',
        className: 'flex items-center justify-between p-4 border-b'
      }, [
        e('div', { key: 'logo', className: 'flex items-center space-x-2' }, [
          e('div', {
            key: 'logo-icon',
            className: 'w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'
          }, 'C'),
          e('span', { key: 'logo-text', className: 'font-bold text-lg text-gray-900' }, 'Cush')
        ]),
        e('button', {
          key: 'close',
          className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
          onClick: () => setSidebarOpen(false)
        }, '✕')
      ]),

      // Navigation
      e('nav', { key: 'nav', className: 'flex-1 p-4 space-y-2' }, 
        sidebarItems.map(item => 
          e('button', {
            key: item.id,
            className: `w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
              activeTab === item.id 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                : 'hover:bg-gray-100 text-gray-700'
            }`,
            onClick: () => setActiveTab(item.id)
          }, [
            e('span', { key: 'icon', className: 'text-lg' }, item.icon),
            e('span', { key: 'label' }, item.label)
          ])
        )
      ),

      // User Section
      e('div', { key: 'user-section', className: 'p-4 border-t' }, [
        e('div', { key: 'user-info', className: 'flex items-center space-x-3 mb-4' }, [
          e('div', {
            key: 'avatar',
            className: 'w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold'
          }, user?.firstName?.[0] || 'U'),
          e('div', { key: 'info', className: 'flex-1 min-w-0' }, [
            e('p', {
              key: 'name',
              className: 'text-sm font-medium text-gray-900 truncate'
            }, `${user?.firstName || ''} ${user?.lastName || ''}`),
            e('p', {
              key: 'email',
              className: 'text-xs text-gray-500 truncate'
            }, user?.email || '')
          ])
        ]),
        e('button', {
          key: 'logout',
          onClick: handleLogout,
          className: 'w-full flex items-center space-x-2 p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
        }, [
          e('span', { key: 'icon' }, '🚪'),
          e('span', { key: 'text' }, 'Sign Out')
        ])
      ])
    ]),

    // Main Content
    e('div', { key: 'main', className: 'flex-1 lg:ml-0' }, [
      // Top Header
      e('header', {
        key: 'header',
        className: 'bg-white shadow-sm border-b'
      }, [
        e('div', { className: 'flex items-center justify-between px-6 py-4' }, [
          e('div', { key: 'left', className: 'flex items-center space-x-4' }, [
            e('button', {
              key: 'menu-toggle',
              className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
              onClick: () => setSidebarOpen(true)
            }, '☰'),
            e('h1', {
              key: 'title',
              className: 'text-xl font-semibold text-gray-900'
            }, 'Dashboard')
          ]),
          
          // Search Bar
          e('div', { key: 'search', className: 'hidden md:flex items-center' }, [
            e('div', { className: 'relative' }, [
              e('input', {
                key: 'search-input',
                type: 'text',
                placeholder: 'Search...',
                className: 'w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              }),
              e('div', {
                key: 'search-icon',
                className: 'absolute left-3 top-2.5 text-gray-400'
              }, '🔍')
            ])
          ]),
          
          e('div', { key: 'right', className: 'flex items-center space-x-4' }, [
            e('button', {
              key: 'notifications',
              className: 'relative p-2 rounded-md hover:bg-gray-100'
            }, [
              e('span', { key: 'bell' }, '🔔'),
              e('span', {
                key: 'badge',
                className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center'
              }, '3')
            ]),
            e('div', {
              key: 'user-avatar',
              className: 'w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm cursor-pointer'
            }, user?.firstName?.[0] || 'U')
          ])
        ])
      ]),

      // Dashboard Content
      e('main', {
        key: 'content',
        className: 'p-6'
      }, [
        // Balance Section
        e('div', {
          key: 'balance-section',
          className: 'bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6'
        }, [
          e('div', { key: 'balance-content', className: 'flex justify-between items-center' }, [
            e('div', { key: 'balance-info' }, [
              e('p', { key: 'label', className: 'text-blue-100 mb-1' }, 'Total Balance'),
              e('h2', { key: 'amount', className: 'text-4xl font-bold' }, '£1,320.00'),
              e('p', { key: 'change', className: 'text-blue-100 mt-2' }, '↗ +2.5% from last month')
            ]),
            e('div', { key: 'balance-chart', className: 'hidden md:block' }, [
              e('div', {
                key: 'chart-placeholder',
                className: 'w-48 h-24 bg-blue-500/30 rounded-lg flex items-center justify-center'
              }, 'Chart Area')
            ])
          ])
        ]),

        // Quick Actions
        e('div', {
          key: 'quick-actions',
          className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'
        }, [
          { icon: '💸', label: 'Send Money', color: 'bg-green-50 border-green-200 text-green-700' },
          { icon: '💰', label: 'Receive', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { icon: '📊', label: 'Analytics', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { icon: '⚙️', label: 'Settings', color: 'bg-gray-50 border-gray-200 text-gray-700' }
        ].map((action, index) =>
          e('button', {
            key: index,
            className: `p-4 rounded-lg border-2 ${action.color} hover:shadow-md transition-shadow text-center`
          }, [
            e('div', { key: 'icon', className: 'text-2xl mb-2' }, action.icon),
            e('div', { key: 'label', className: 'font-medium' }, action.label)
          ])
        )),

        // Transactions Table - Based on Mockup
        e('div', {
          key: 'transactions',
          className: 'bg-white rounded-xl shadow-sm border'
        }, [
          e('div', { key: 'table-header', className: 'p-6 border-b' }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Recent Transactions'),
            e('p', { key: 'subtitle', className: 'text-gray-600' }, 'Your latest financial activity')
          ]),
          
          e('div', { key: 'table-content', className: 'overflow-x-auto' }, [
            e('table', { key: 'table', className: 'w-full' }, [
              e('thead', { key: 'thead', className: 'bg-gray-50' }, [
                e('tr', { key: 'header-row' }, [
                  e('th', { key: 'date', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Date'),
                  e('th', { key: 'description', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Description'),
                  e('th', { key: 'amount', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Amount'),
                  e('th', { key: 'type', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Type'),
                  e('th', { key: 'status', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status')
                ])
              ]),
              e('tbody', { key: 'tbody', className: 'bg-white divide-y divide-gray-200' }, [
                // Sample transaction rows
                {
                  date: '2024-01-15',
                  description: 'Immigration Consultation Fee',
                  amount: '-£150.00',
                  type: 'Service',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800'
                },
                {
                  date: '2024-01-14',
                  description: 'Document Translation',
                  amount: '-£85.00',
                  type: 'Document',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800'
                },
                {
                  date: '2024-01-12',
                  description: 'Account Deposit',
                  amount: '+£500.00',
                  type: 'Deposit',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800'
                },
                {
                  date: '2024-01-10',
                  description: 'Visa Application Fee',
                  amount: '-£200.00',
                  type: 'Application',
                  status: 'Processing',
                  statusColor: 'bg-yellow-100 text-yellow-800'
                }
              ].map((transaction, index) =>
                e('tr', { key: index, className: 'hover:bg-gray-50' }, [
                  e('td', { key: 'date', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, transaction.date),
                  e('td', { key: 'desc', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, transaction.description),
                  e('td', { 
                    key: 'amount', 
                    className: `px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}`
                  }, transaction.amount),
                  e('td', { key: 'type', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' }, transaction.type),
                  e('td', { key: 'status', className: 'px-6 py-4 whitespace-nowrap' }, [
                    e('span', { 
                      key: 'status-badge',
                      className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.statusColor}`
                    }, transaction.status)
                  ])
                ])
              ))
            ])
          ])
        ])
      ])
    ])
  ]);
}

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
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
    return e('div', { 
      className: 'min-h-screen bg-gray-50 flex items-center justify-center'
    }, [
      e('div', {
        key: 'spinner',
        className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'
      })
    ]);
  }

  return user ? 
    e(Dashboard, { key: 'dashboard', user }) :
    e(Homepage, { key: 'homepage' });
}

// Homepage Component
function Homepage() {
  return e('div', { className: 'min-h-screen' }, [
    e(HeroSection, { key: 'hero' }),
    e(FeaturesSection, { key: 'features' }),
    e(StatsSection, { key: 'stats' }),
    e(AuthComponent, { key: 'auth' })
  ]);
}

// Mount the application
const root = createRoot(document.getElementById('root'));
root.render(e(App));