// React 18 Components for Cush Platform - Using Reference Design Scheme
const { useState, useEffect, createElement: e } = React;
const { createRoot } = ReactDOM;

// Homepage Hero Section - Based on Reference Design
function HeroSection() {
  return e('section', { 
    className: 'relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 min-h-screen flex items-center justify-center overflow-hidden'
  }, [
    // Background pattern overlay
    e('div', {
      key: 'pattern',
      className: 'absolute inset-0 opacity-10',
      style: {
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '30px 30px'
      }
    }),
    
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6 py-20 relative z-10'
    }, [
      e('div', {
        key: 'content',
        className: 'text-center max-w-4xl mx-auto'
      }, [
        // Logo/Brand
        e('div', {
          key: 'brand',
          className: 'mb-8'
        }, [
          e('div', {
            key: 'logo',
            className: 'w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-2xl transform hover:scale-105 transition-transform'
          }, 'C'),
          e('h1', {
            key: 'brand-name',
            className: 'text-2xl font-bold text-white'
          }, 'CUSH')
        ]),
        
        // Main headline
        e('h1', { 
          key: 'headline',
          className: 'text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight'
        }, [
          e('span', { key: 'line1', className: 'block' }, 'Your Gateway to'),
          e('span', { 
            key: 'line2', 
            className: 'block bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent'
          }, 'Global Success')
        ]),
        
        // Subtitle
        e('p', { 
          key: 'subtitle',
          className: 'text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed font-light'
        }, 'Empowering your immigration journey with AI-driven insights, expert guidance, and comprehensive financial solutions. Transform your dreams into reality with Cush.'),
        
        // Stats row
        e('div', {
          key: 'stats',
          className: 'grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto'
        }, [
          { number: '50K+', label: 'Success Stories', color: 'from-green-400 to-emerald-500' },
          { number: '180+', label: 'Countries', color: 'from-blue-400 to-cyan-500' },
          { number: '95%', label: 'Success Rate', color: 'from-purple-400 to-pink-500' },
          { number: '24/7', label: 'AI Support', color: 'from-orange-400 to-red-500' }
        ].map((stat, index) =>
          e('div', { key: index, className: 'text-center' }, [
            e('div', {
              key: 'number',
              className: `text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`
            }, stat.number),
            e('div', {
              key: 'label',
              className: 'text-blue-200 text-sm md:text-base font-medium'
            }, stat.label)
          ])
        )),
        
        // CTA Buttons
        e('div', {
          key: 'cta-buttons',
          className: 'flex flex-col sm:flex-row gap-4 justify-center items-center'
        }, [
          e('button', {
            key: 'primary',
            className: 'group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105',
            onClick: () => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
          }, [
            'Start Your Journey ',
            e('span', { key: 'arrow', className: 'inline-block transform group-hover:translate-x-1 transition-transform' }, '→')
          ]),
          e('button', {
            key: 'secondary',
            className: 'bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-full border border-white/30 transition-all duration-300 hover:border-white/50 hover:shadow-lg'
          }, 'Explore Features')
        ])
      ])
    ])
  ]);
}

// Services Section - Premium Design
function ServicesSection() {
  const services = [
    {
      icon: '🎯',
      title: 'Immigration Strategy',
      description: 'Personalized immigration pathways with AI-powered assessment and expert consultation.',
      gradient: 'from-blue-500 to-cyan-500',
      features: ['Eligibility Assessment', 'Document Checklist', 'Timeline Planning']
    },
    {
      icon: '💼',
      title: 'Financial Services',
      description: 'Comprehensive financial planning, loan referrals, and budget management tools.',
      gradient: 'from-green-500 to-emerald-500',
      features: ['Loan Applications', 'Budget Planning', 'Cost Estimation']
    },
    {
      icon: '🌐',
      title: 'Global Network',
      description: 'Connect with immigration experts, mentors, and communities worldwide.',
      gradient: 'from-purple-500 to-pink-500',
      features: ['Expert Matching', 'Community Forums', 'Mentorship Programs']
    },
    {
      icon: '🤖',
      title: 'AI Assistant',
      description: 'Meet Imisi 2.0 - your intelligent immigration companion available 24/7.',
      gradient: 'from-orange-500 to-red-500',
      features: ['Instant Answers', 'Document Analysis', 'Progress Tracking']
    }
  ];

  return e('section', { className: 'py-24 bg-gradient-to-b from-gray-50 to-white' }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      // Section header
      e('div', { key: 'header', className: 'text-center mb-20' }, [
        e('div', {
          key: 'badge',
          className: 'inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-4'
        }, [
          e('span', { key: 'dot', className: 'w-2 h-2 bg-blue-500 rounded-full mr-2' }),
          'Our Services'
        ]),
        e('h2', { 
          key: 'title',
          className: 'text-4xl md:text-5xl font-bold text-gray-900 mb-6'
        }, 'Everything You Need for Immigration Success'),
        e('p', { 
          key: 'subtitle',
          className: 'text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed'
        }, 'From initial planning to successful settlement, our comprehensive platform provides all the tools and support you need for your immigration journey.')
      ]),
      
      // Services grid
      e('div', { 
        key: 'grid',
        className: 'grid md:grid-cols-2 gap-8 max-w-6xl mx-auto'
      }, services.map((service, index) =>
        e('div', {
          key: index,
          className: 'group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2'
        }, [
          // Service icon
          e('div', {
            key: 'icon-container',
            className: `w-16 h-16 bg-gradient-to-r ${service.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`
          }, [
            e('span', { key: 'icon', className: 'text-3xl' }, service.icon)
          ]),
          
          // Service content
          e('h3', {
            key: 'title',
            className: 'text-2xl font-bold text-gray-900 mb-4'
          }, service.title),
          e('p', {
            key: 'description',
            className: 'text-gray-600 mb-6 leading-relaxed'
          }, service.description),
          
          // Features list
          e('ul', {
            key: 'features',
            className: 'space-y-2'
          }, service.features.map((feature, idx) =>
            e('li', {
              key: idx,
              className: 'flex items-center text-gray-700'
            }, [
              e('span', {
                key: 'check',
                className: 'w-2 h-2 bg-green-500 rounded-full mr-3'
              }),
              e('span', { key: 'text' }, feature)
            ])
          ))
        ])
      ))
    ])
  ]);
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer',
      country: 'Nigeria → Canada',
      image: 'SC',
      rating: 5,
      text: 'Cush transformed my immigration journey. The AI guidance was incredibly accurate, and I received my PR in just 6 months. The financial planning tools were a game-changer.',
      gradient: 'from-blue-500 to-purple-500'
    },
    {
      name: 'David Rodriguez',
      role: 'Healthcare Professional',
      country: 'Philippines → Australia',
      image: 'DR',
      rating: 5,
      text: 'The community support and expert mentorship made all the difference. I felt confident every step of the way, and the document management system kept me organized.',
      gradient: 'from-green-500 to-blue-500'
    },
    {
      name: 'Amara Okonkwo',
      role: 'Business Analyst',
      country: 'Ghana → United Kingdom',
      image: 'AO',
      rating: 5,
      text: 'From visa application to settlement planning, Cush provided comprehensive support. The AI assistant answered my questions instantly, saving me countless hours.',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  return e('section', { className: 'py-24 bg-gray-900' }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      // Section header
      e('div', { key: 'header', className: 'text-center mb-16' }, [
        e('h2', { 
          key: 'title',
          className: 'text-4xl md:text-5xl font-bold text-white mb-6'
        }, 'Success Stories That Inspire'),
        e('p', { 
          key: 'subtitle',
          className: 'text-xl text-gray-300 max-w-2xl mx-auto'
        }, 'Join thousands who have successfully navigated their immigration journey with Cush')
      ]),
      
      // Testimonials grid
      e('div', { 
        key: 'grid',
        className: 'grid md:grid-cols-3 gap-8 max-w-6xl mx-auto'
      }, testimonials.map((testimonial, index) =>
        e('div', {
          key: index,
          className: 'bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300'
        }, [
          // Rating stars
          e('div', {
            key: 'rating',
            className: 'flex items-center mb-6'
          }, Array.from({ length: testimonial.rating }).map((_, i) =>
            e('span', { key: i, className: 'text-yellow-400 text-xl mr-1' }, '⭐')
          )),
          
          // Testimonial text
          e('p', {
            key: 'text',
            className: 'text-gray-300 mb-8 leading-relaxed italic text-lg'
          }, `"${testimonial.text}"`),
          
          // Author info
          e('div', {
            key: 'author',
            className: 'flex items-center gap-4'
          }, [
            e('div', {
              key: 'avatar',
              className: `w-16 h-16 bg-gradient-to-r ${testimonial.gradient} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`
            }, testimonial.image),
            e('div', { key: 'info' }, [
              e('h4', {
                key: 'name',
                className: 'font-semibold text-white text-lg'
              }, testimonial.name),
              e('p', {
                key: 'role',
                className: 'text-gray-400 text-sm'
              }, testimonial.role),
              e('p', {
                key: 'journey',
                className: 'text-blue-400 text-sm font-medium'
              }, testimonial.country)
            ])
          ])
        ])
      ))
    ])
  ]);
}

// Modern Authentication Component
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
    className: 'py-24 bg-gradient-to-br from-blue-50 via-white to-purple-50'
  }, [
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6'
    }, [
      e('div', { 
        key: 'content',
        className: 'max-w-md mx-auto'
      }, [
        // Header
        e('div', { 
          key: 'header',
          className: 'text-center mb-8'
        }, [
          e('div', {
            key: 'logo',
            className: 'w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg'
          }, 'C'),
          e('h2', { 
            key: 'title',
            className: 'text-3xl font-bold text-gray-900 mb-2'
          }, 'Welcome Back'),
          e('p', { 
            key: 'subtitle',
            className: 'text-gray-600'
          }, 'Sign in to continue your immigration journey')
        ]),
        
        // Login form
        e('div', {
          key: 'form-container',
          className: 'bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20'
        }, [
          e('form', {
            key: 'login-form',
            onSubmit: handleLogin,
            className: 'space-y-6'
          }, [
            e('div', { key: 'email-field' }, [
              e('label', { 
                key: 'email-label',
                className: 'block text-sm font-semibold text-gray-700 mb-2'
              }, 'Email Address'),
              e('input', {
                key: 'email-input',
                type: 'email',
                value: loginForm.email,
                onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all',
                placeholder: 'Enter your email'
              })
            ]),
            
            e('div', { key: 'password-field' }, [
              e('label', { 
                key: 'password-label',
                className: 'block text-sm font-semibold text-gray-700 mb-2'
              }, 'Password'),
              e('input', {
                key: 'password-input',
                type: 'password',
                value: loginForm.password,
                onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all',
                placeholder: 'Enter your password'
              })
            ]),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
              className: `w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none ${loading ? 'cursor-not-allowed' : ''}`
            }, loading ? 'Signing in...' : 'Sign In')
          ]),
          
          // Test accounts
          testCredentials && e('div', {
            key: 'test-accounts',
            className: 'mt-6 pt-6 border-t border-gray-200'
          }, [
            e('button', {
              key: 'toggle-test',
              onClick: () => setShowTestAccounts(!showTestAccounts),
              className: 'w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors'
            }, showTestAccounts ? 'Hide Test Accounts' : 'Show Test Accounts'),
            
            showTestAccounts && testCredentials.testAccounts && e('div', { 
              key: 'test-list',
              className: 'mt-4 space-y-2'
            }, testCredentials.testAccounts.map((account, index) =>
              e('button', {
                key: index,
                onClick: () => useTestAccount(account),
                className: 'block w-full p-3 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:shadow-md'
              }, `${account.email} (${account.role})`)
            ))
          ])
        ])
      ])
    ])
  ]);
}

// Dashboard Component - Enhanced Design
function Dashboard({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'loans', label: 'Loans', icon: '💳' },
    { id: 'migration', label: 'Migration Services', icon: '🌍' },
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
    // Enhanced Sidebar
    e('aside', {
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    }, [
      // Logo section
      e('div', {
        key: 'logo-section',
        className: 'flex items-center justify-between p-6 border-b border-gray-100'
      }, [
        e('div', { key: 'logo', className: 'flex items-center space-x-3' }, [
          e('div', {
            key: 'logo-icon',
            className: 'w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg'
          }, 'C'),
          e('span', { key: 'logo-text', className: 'font-bold text-xl text-gray-900' }, 'Cush')
        ]),
        e('button', {
          key: 'close',
          className: 'lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors',
          onClick: () => setSidebarOpen(false)
        }, '✕')
      ]),

      // Navigation
      e('nav', { key: 'nav', className: 'flex-1 p-4 space-y-1' }, 
        sidebarItems.map(item => 
          e('button', {
            key: item.id,
            className: `w-full flex items-center space-x-3 p-3 rounded-xl text-left transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border-l-4 border-blue-500' 
                : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
            }`,
            onClick: () => setActiveTab(item.id)
          }, [
            e('span', { key: 'icon', className: 'text-xl' }, item.icon),
            e('span', { key: 'label', className: 'font-medium' }, item.label)
          ])
        )
      ),

      // User section
      e('div', { key: 'user-section', className: 'p-6 border-t border-gray-100' }, [
        e('div', { key: 'user-info', className: 'flex items-center space-x-3 mb-4' }, [
          e('div', {
            key: 'avatar',
            className: 'w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg'
          }, user?.firstName?.[0] || 'U'),
          e('div', { key: 'info', className: 'flex-1 min-w-0' }, [
            e('p', {
              key: 'name',
              className: 'text-sm font-semibold text-gray-900 truncate'
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
          className: 'w-full flex items-center space-x-2 p-3 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200'
        }, [
          e('span', { key: 'icon', className: 'text-lg' }, '🚪'),
          e('span', { key: 'text', className: 'font-medium' }, 'Sign Out')
        ])
      ])
    ]),

    // Main content area
    e('div', { key: 'main', className: 'flex-1 lg:ml-0' }, [
      // Top header
      e('header', {
        key: 'header',
        className: 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100'
      }, [
        e('div', { className: 'flex items-center justify-between px-6 py-4' }, [
          e('div', { key: 'left', className: 'flex items-center space-x-4' }, [
            e('button', {
              key: 'menu-toggle',
              className: 'lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors',
              onClick: () => setSidebarOpen(true)
            }, '☰'),
            e('h1', {
              key: 'title',
              className: 'text-2xl font-bold text-gray-900'
            }, 'Dashboard')
          ]),
          
          // Search bar
          e('div', { key: 'search', className: 'hidden md:flex items-center' }, [
            e('div', { className: 'relative' }, [
              e('input', {
                key: 'search-input',
                type: 'text',
                placeholder: 'Search...',
                className: 'w-96 pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all'
              }),
              e('div', {
                key: 'search-icon',
                className: 'absolute left-4 top-3.5 text-gray-400 text-lg'
              }, '🔍')
            ])
          ]),
          
          e('div', { key: 'right', className: 'flex items-center space-x-4' }, [
            e('button', {
              key: 'notifications',
              className: 'relative p-3 rounded-xl hover:bg-gray-100 transition-colors'
            }, [
              e('span', { key: 'bell', className: 'text-xl' }, '🔔'),
              e('span', {
                key: 'badge',
                className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold'
              }, '3')
            ]),
            e('div', {
              key: 'user-avatar',
              className: 'w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-lg'
            }, user?.firstName?.[0] || 'U')
          ])
        ])
      ]),

      // Dashboard content
      e('main', {
        key: 'content',
        className: 'p-6'
      }, [
        // Balance section with enhanced design
        e('div', {
          key: 'balance-section',
          className: 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-8 text-white mb-8 shadow-2xl'
        }, [
          e('div', { key: 'balance-content', className: 'flex justify-between items-center' }, [
            e('div', { key: 'balance-info' }, [
              e('p', { key: 'label', className: 'text-blue-100 mb-2 font-medium' }, 'Total Balance'),
              e('h2', { key: 'amount', className: 'text-5xl font-bold mb-3' }, '£1,320.00'),
              e('div', { key: 'change', className: 'flex items-center space-x-2' }, [
                e('span', { key: 'arrow', className: 'text-green-400 text-lg' }, '↗'),
                e('span', { key: 'text', className: 'text-green-400 font-semibold' }, '+2.5% from last month')
              ])
            ]),
            e('div', { key: 'balance-visual', className: 'hidden md:block' }, [
              e('div', {
                key: 'chart-area',
                className: 'w-48 h-32 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 flex items-center justify-center'
              }, [
                e('span', { key: 'chart-text', className: 'text-white/60' }, 'Performance Chart')
              ])
            ])
          ])
        ]),

        // Quick actions with enhanced design
        e('div', {
          key: 'quick-actions',
          className: 'grid grid-cols-2 md:grid-cols-4 gap-6 mb-8'
        }, [
          { icon: '💸', label: 'Send Money', gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700' },
          { icon: '💰', label: 'Receive', gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
          { icon: '📊', label: 'Analytics', gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', text: 'text-purple-700' },
          { icon: '⚙️', label: 'Settings', gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700' }
        ].map((action, index) =>
          e('button', {
            key: index,
            className: `group p-6 ${action.bg} rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`
          }, [
            e('div', {
              key: 'icon',
              className: `w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-xl flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`
            }, action.icon),
            e('div', {
              key: 'label',
              className: `font-semibold ${action.text}`
            }, action.label)
          ])
        )),

        // Enhanced transactions table
        e('div', {
          key: 'transactions',
          className: 'bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden'
        }, [
          e('div', { key: 'table-header', className: 'p-6 border-b border-gray-100 bg-gray-50/50' }, [
            e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-1' }, 'Recent Transactions'),
            e('p', { key: 'subtitle', className: 'text-gray-600' }, 'Your latest financial activity and immigration-related expenses')
          ]),
          
          e('div', { key: 'table-content', className: 'overflow-x-auto' }, [
            e('table', { key: 'table', className: 'w-full' }, [
              e('thead', { key: 'thead', className: 'bg-gray-50' }, [
                e('tr', { key: 'header-row' }, [
                  e('th', { key: 'date', className: 'px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider' }, 'Date'),
                  e('th', { key: 'description', className: 'px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider' }, 'Description'),
                  e('th', { key: 'amount', className: 'px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider' }, 'Amount'),
                  e('th', { key: 'type', className: 'px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider' }, 'Category'),
                  e('th', { key: 'status', className: 'px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider' }, 'Status')
                ])
              ]),
              e('tbody', { key: 'tbody', className: 'bg-white divide-y divide-gray-100' }, [
                {
                  date: 'Jan 15, 2024',
                  description: 'Immigration Consultation Fee',
                  amount: '-£150.00',
                  type: 'Legal Services',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800',
                  amountColor: 'text-red-600'
                },
                {
                  date: 'Jan 14, 2024',
                  description: 'Document Translation',
                  amount: '-£85.00',
                  type: 'Documents',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800',
                  amountColor: 'text-red-600'
                },
                {
                  date: 'Jan 12, 2024',
                  description: 'Account Top-up',
                  amount: '+£500.00',
                  type: 'Deposit',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800',
                  amountColor: 'text-green-600'
                },
                {
                  date: 'Jan 10, 2024',
                  description: 'Visa Application Fee',
                  amount: '-£200.00',
                  type: 'Government',
                  status: 'Processing',
                  statusColor: 'bg-yellow-100 text-yellow-800',
                  amountColor: 'text-red-600'
                },
                {
                  date: 'Jan 8, 2024',
                  description: 'English Language Test',
                  amount: '-£180.00',
                  type: 'Testing',
                  status: 'Completed',
                  statusColor: 'bg-green-100 text-green-800',
                  amountColor: 'text-red-600'
                }
              ].map((transaction, index) =>
                e('tr', { key: index, className: 'hover:bg-gray-50 transition-colors' }, [
                  e('td', { key: 'date', className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900' }, transaction.date),
                  e('td', { key: 'desc', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, transaction.description),
                  e('td', { 
                    key: 'amount', 
                    className: `px-6 py-4 whitespace-nowrap text-sm font-bold ${transaction.amountColor}`
                  }, transaction.amount),
                  e('td', { key: 'type', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600' }, transaction.type),
                  e('td', { key: 'status', className: 'px-6 py-4 whitespace-nowrap' }, [
                    e('span', { 
                      key: 'status-badge',
                      className: `inline-flex px-3 py-1 text-xs font-semibold rounded-full ${transaction.statusColor}`
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
      className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center'
    }, [
      e('div', {
        key: 'loading',
        className: 'text-center'
      }, [
        e('div', {
          key: 'spinner',
          className: 'w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4'
        }),
        e('p', {
          key: 'text',
          className: 'text-gray-600 font-medium'
        }, 'Loading your dashboard...')
      ])
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
    e(ServicesSection, { key: 'services' }),
    e(TestimonialsSection, { key: 'testimonials' }),
    e(AuthComponent, { key: 'auth' })
  ]);
}

// Mount the application
const root = createRoot(document.getElementById('root'));
root.render(e(App));