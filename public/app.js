// React 18 Components for Cush Platform
const { useState, useEffect, createElement: e } = React;
const { createRoot } = ReactDOM;

// Hero Section Component
function HeroSection() {
  return e('section', { 
    className: 'relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center overflow-hidden'
  }, 
    e('div', {
      key: 'bg-pattern',
      className: 'absolute inset-0 opacity-10',
      style: {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }
    }),

    e('div', { 
      key: 'content',
      className: 'container mx-auto px-6 text-center relative z-10'
    }, 
      e('div', {
        key: 'logo',
        className: 'mb-8 flex justify-center'
      }, 
        e('div', {
          key: 'logo-icon',
          className: 'w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl'
        }, 'C')
      ),

      e('h1', {
        key: 'headline',
        className: 'text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight'
      }, 
        e('span', { key: 'line1', className: 'block' }, 'Your Global Immigration'),
        e('span', { key: 'line2', className: 'block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent' }, 'Success Partner')
      ),

      e('p', {
        key: 'subtitle',
        className: 'text-xl md:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed'
      }, 'Navigate your immigration journey with AI-powered guidance, financial planning, community support, and expert mentorship - all in one comprehensive platform.'),

      e('div', {
        key: 'stats',
        className: 'bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-4xl mx-auto mb-12'
      }, 
        e('div', {
          key: 'stats-grid',
          className: 'grid grid-cols-2 lg:grid-cols-4 gap-6'
        }, 
          e('div', { key: 'stat1', className: 'text-center' }, 
            e('div', { key: 'number', className: 'text-3xl lg:text-4xl font-bold text-cyan-400 mb-2' }, '50K+'),
            e('div', { key: 'label', className: 'text-slate-300 text-sm lg:text-base' }, 'Success Stories')
          ),
          e('div', { key: 'stat2', className: 'text-center' }, 
            e('div', { key: 'number', className: 'text-3xl lg:text-4xl font-bold text-blue-400 mb-2' }, '180+'),
            e('div', { key: 'label', className: 'text-slate-300 text-sm lg:text-base' }, 'Countries Supported')
          ),
          e('div', { key: 'stat3', className: 'text-center' }, 
            e('div', { key: 'number', className: 'text-3xl lg:text-4xl font-bold text-purple-400 mb-2' }, '95%'),
            e('div', { key: 'label', className: 'text-slate-300 text-sm lg:text-base' }, 'Success Rate')
          ),
          e('div', { key: 'stat4', className: 'text-center' }, 
            e('div', { key: 'number', className: 'text-3xl lg:text-4xl font-bold text-green-400 mb-2' }, '24/7'),
            e('div', { key: 'label', className: 'text-slate-300 text-sm lg:text-base' }, 'AI Support')
          )
        )
      ),

      e('div', {
        key: 'cta-buttons',
        className: 'flex flex-col sm:flex-row gap-4 justify-center'
      }, 
        e('button', {
          key: 'get-started',
          className: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1',
          onClick: () => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
        }, 'Start Your Journey →'),
        e('button', {
          key: 'learn-more',
          className: 'bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl border border-white/30 transition-all duration-300 hover:border-white/50'
        }, 'Learn More')
      )
    )
  );
}

// Features Section Component
function FeaturesSection() {
  const features = [
    { icon: '🤖', title: 'AI-Powered Guidance', desc: 'Get personalized immigration advice from Imisi, our AI concierge trained on the latest immigration policies.' },
    { icon: '💰', title: 'Financial Planning', desc: 'Calculate immigration costs, plan your budget, and track expenses with integrated financial tools.' },
    { icon: '👥', title: 'Expert Mentorship', desc: 'Connect with immigration experts and successful immigrants who can guide you through your journey.' },
    { icon: '📄', title: 'Document Management', desc: 'Organize, track, and verify all your immigration documents with our secure digital vault.' },
    { icon: '🗺️', title: 'Local Job Discovery', desc: 'Find job opportunities in your target country with location-based job matching.' },
    { icon: '💳', title: 'Loan Referrals', desc: 'Access immigration loans and financing options through our trusted partner network.' }
  ];

  return e('section', { className: 'py-20 bg-white' }, 
    e('div', { key: 'container', className: 'container mx-auto px-6' }, 
      e('div', { key: 'header', className: 'text-center mb-16' }, 
        e('h2', { key: 'title', className: 'text-4xl lg:text-5xl font-bold text-gray-900 mb-6' },
          'Everything You Need for Immigration Success'
        ),
        e('p', { key: 'subtitle', className: 'text-xl text-gray-600 max-w-3xl mx-auto' },
          'From AI-powered guidance to financial planning, we provide comprehensive tools and support for every step of your immigration journey'
        )
      ),
      e('div', { key: 'grid', className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-8' },
        ...features.map((feature, index) =>
          e('div', {
            key: index,
            className: 'group hover:shadow-2xl transition-all duration-300 border rounded-xl p-8 hover:-translate-y-2 bg-white'
          }, 
            e('div', { key: 'icon', className: 'w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300' },
              e('span', { key: 'emoji', className: 'text-3xl' }, feature.icon)
            ),
            e('h3', { key: 'title', className: 'text-2xl font-bold text-gray-900 mb-4' }, feature.title),
            e('p', { key: 'desc', className: 'text-gray-600 leading-relaxed' }, feature.desc)
          )
        )
      )
    )
  );
}

// Testimonials Section Component
function TestimonialsSection() {
  return e('section', { className: 'py-20 bg-gray-50' }, 
    e('div', { key: 'container', className: 'container mx-auto px-6' }, 
      e('div', { key: 'header', className: 'text-center mb-16' }, 
        e('h2', { key: 'title', className: 'text-4xl lg:text-5xl font-bold text-gray-900 mb-6' },
          'Success Stories From Our Community'
        ),
        e('p', { key: 'subtitle', className: 'text-xl text-gray-600 max-w-2xl mx-auto' },
          'Join thousands who have successfully navigated their immigration journey with Cush'
        )
      ),
      e('div', { key: 'grid', className: 'grid md:grid-cols-3 gap-8' }, 
        e('div', { key: 'testimonial1', className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow' }, 
          e('div', { key: 'stars1', className: 'flex items-center mb-6' }, 
            ...Array.from({ length: 5 }).map((_, i) =>
              e('span', { key: i, className: 'text-yellow-400 text-xl' }, '⭐')
            )
          ),
          e('p', { key: 'quote1', className: 'text-gray-700 mb-6 italic text-lg' }, '"Cush made my Express Entry application seamless. The AI guidance was incredibly accurate, and I received my PR in just 6 months!"'),
          e('div', { key: 'profile1', className: 'flex items-center gap-4' }, 
            e('div', { key: 'avatar1', className: 'w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg' }, 'SC'),
            e('div', { key: 'info1' }, 
              e('h4', { key: 'name1', className: 'font-semibold text-gray-900 text-lg' }, 'Sarah Chen'),
              e('p', { key: 'role1', className: 'text-sm text-gray-600' }, 'Software Engineer'),
              e('p', { key: 'journey1', className: 'text-xs text-blue-600 font-medium' }, 'Nigeria → Canada')
            )
          )
        ),
        e('div', { key: 'testimonial2', className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow' }, 
          e('div', { key: 'stars2', className: 'flex items-center mb-6' }, 
            ...Array.from({ length: 5 }).map((_, i) =>
              e('span', { key: i, className: 'text-yellow-400 text-xl' }, '⭐')
            )
          ),
          e('p', { key: 'quote2', className: 'text-gray-700 mb-6 italic text-lg' }, '"The financial planning tools helped me budget perfectly for my move. The community support was invaluable during the entire process."'),
          e('div', { key: 'profile2', className: 'flex items-center gap-4' }, 
            e('div', { key: 'avatar2', className: 'w-14 h-14 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg' }, 'DR'),
            e('div', { key: 'info2' }, 
              e('h4', { key: 'name2', className: 'font-semibold text-gray-900 text-lg' }, 'David Rodriguez'),
              e('p', { key: 'role2', className: 'text-sm text-gray-600' }, 'Healthcare Professional'),
              e('p', { key: 'journey2', className: 'text-xs text-blue-600 font-medium' }, 'Philippines → Australia')
            )
          )
        ),
        e('div', { key: 'testimonial3', className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow' }, 
          e('div', { key: 'stars3', className: 'flex items-center mb-6' }, 
            ...Array.from({ length: 5 }).map((_, i) =>
              e('span', { key: i, className: 'text-yellow-400 text-xl' }, '⭐')
            )
          ),
          e('p', { key: 'quote3', className: 'text-gray-700 mb-6 italic text-lg' }, '"From document preparation to settlement planning, Cush guided me every step of the way. Now living my dream in London!"'),
          e('div', { key: 'profile3', className: 'flex items-center gap-4' }, 
            e('div', { key: 'avatar3', className: 'w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-lg' }, 'AO'),
            e('div', { key: 'info3' }, 
              e('h4', { key: 'name3', className: 'font-semibold text-gray-900 text-lg' }, 'Amara Okonkwo'),
              e('p', { key: 'role3', className: 'text-sm text-gray-600' }, 'Business Analyst'),
              e('p', { key: 'journey3', className: 'text-xs text-blue-600 font-medium' }, 'Ghana → United Kingdom')
            )
          )
        )
      )
    )
  );
}

// Community Preview Section
function CommunityPreview() {
  return e('section', { className: 'py-20 bg-gradient-to-br from-blue-50 to-purple-50' }, 
    e('div', { key: 'container', className: 'container mx-auto px-6' }, 
      e('div', { key: 'header', className: 'text-center mb-16' }, 
        e('h2', { key: 'title', className: 'text-4xl lg:text-5xl font-bold text-gray-900 mb-6' },
          'Join Our Global Community'
        ),
        e('p', { key: 'subtitle', className: 'text-xl text-gray-600 max-w-2xl mx-auto' },
          'Connect with fellow immigrants, share experiences, and get support from people who understand your journey'
        )
      ),
      e('div', { key: 'stats', className: 'grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12' }, 
        e('div', { key: 'stat1', className: 'text-center' }, 
          e('div', { key: 'icon1', className: 'w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4' },
            e('span', { key: 'emoji1', className: 'text-3xl' }, '👥')
          ),
          e('div', { key: 'value1', className: 'text-3xl font-bold text-gray-900' }, '50,000+'),
          e('div', { key: 'label1', className: 'text-gray-600' }, 'Active Members')
        ),
        e('div', { key: 'stat2', className: 'text-center' }, 
          e('div', { key: 'icon2', className: 'w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4' },
            e('span', { key: 'emoji2', className: 'text-3xl' }, '🌍')
          ),
          e('div', { key: 'value2', className: 'text-3xl font-bold text-gray-900' }, '180+'),
          e('div', { key: 'label2', className: 'text-gray-600' }, 'Countries Represented')
        ),
        e('div', { key: 'stat3', className: 'text-center' }, 
          e('div', { key: 'icon3', className: 'w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4' },
            e('span', { key: 'emoji3', className: 'text-3xl' }, '❤️')
          ),
          e('div', { key: 'value3', className: 'text-3xl font-bold text-gray-900' }, '12,500+'),
          e('div', { key: 'label3', className: 'text-gray-600' }, 'Success Stories')
        ),
        e('div', { key: 'stat4', className: 'text-center' }, 
          e('div', { key: 'icon4', className: 'w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4' },
            e('span', { key: 'emoji4', className: 'text-3xl' }, '💬')
          ),
          e('div', { key: 'value4', className: 'text-3xl font-bold text-gray-900' }, '25,000+'),
          e('div', { key: 'label4', className: 'text-gray-600' }, 'Monthly Discussions')
        )
      )
    )
  );
}

// Authentication Component
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
    className: 'py-24 bg-gradient-to-br from-slate-900 to-blue-900'
  }, 
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6'
    }, 
      e('div', { 
        key: 'content',
        className: 'max-w-md mx-auto'
      }, 
        e('div', { 
          key: 'header',
          className: 'text-center mb-8'
        }, 
          e('div', { 
            key: 'logo',
            className: 'w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6'
          }, 'C'),
          e('h2', { 
            key: 'title',
            className: 'text-3xl font-bold text-white mb-2'
          }, 'Welcome to Cush'),
          e('p', { 
            key: 'subtitle',
            className: 'text-slate-300'
          }, 'Sign in to access your personalized immigration dashboard')
        ),
        
        e('div', { 
          key: 'form-container',
          className: 'bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl'
        }, 
          e('form', {
            key: 'login-form',
            onSubmit: handleLogin,
            className: 'space-y-6'
          }, 
            e('div', { key: 'email-field' }, 
              e('label', { 
                key: 'email-label',
                className: 'block text-sm font-medium text-white mb-2'
              }, 'Email Address'),
              e('input', {
                key: 'email-input',
                type: 'email',
                value: loginForm.email,
                onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm',
                placeholder: 'Enter your email'
              })
            ),
            
            e('div', { key: 'password-field' }, 
              e('label', { 
                key: 'password-label',
                className: 'block text-sm font-medium text-white mb-2'
              }, 'Password'),
              e('input', {
                key: 'password-input',
                type: 'password',
                value: loginForm.password,
                onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm',
                placeholder: 'Enter your password'
              })
            ),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
              className: `w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none ${loading ? 'cursor-not-allowed' : ''}`
            }, loading ? 'Signing in...' : 'Sign In')
          ),
          
          testCredentials && e('div', {
            key: 'test-accounts',
            className: 'mt-8 pt-6 border-t border-white/20'
          }, 
            e('button', {
              key: 'toggle-test',
              onClick: () => setShowTestAccounts(!showTestAccounts),
              className: 'w-full text-sm text-slate-300 hover:text-white transition-colors'
            }, showTestAccounts ? 'Hide Test Accounts' : 'Show Test Accounts'),
            
            showTestAccounts && testCredentials.testAccounts && e('div', { 
              key: 'test-list',
              className: 'mt-4 space-y-2'
            }, ...testCredentials.testAccounts.map((account, index) =>
              e('button', {
                key: index,
                onClick: () => useTestAccount(account),
                className: 'block w-full p-3 text-left text-sm bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-all'
              }, `${account.email} (${account.role})`)
            ))
          )
        )
      )
    )
  );
}

// Enhanced Dashboard Component
function EnhancedDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/analytics')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const demoData = {
    totalBalance: 26721.40,
    monthlyIncome: 8200.00,
    monthlyExpenses: 5800.00,
    savingsRate: 28.5,
    recentTransactions: [
      { id: 1, description: 'Salary Deposit', amount: 8200, type: 'income', category: 'Salary', date: new Date().toISOString() },
      { id: 2, description: 'Rent Payment', amount: -2800, type: 'expense', category: 'Housing', date: new Date().toISOString() },
      { id: 3, description: 'Groceries', amount: -180, type: 'expense', category: 'Food', date: new Date().toISOString() }
    ]
  };

  const data = dashboardData || demoData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return e('div', { 
      className: 'min-h-screen bg-gray-50 flex items-center justify-center'
    }, e('div', {
      className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'
    }));
  }

  return e('div', { 
    key: 'dashboard',
    className: 'p-6 max-w-7xl mx-auto'
  }, 
    e('div', { 
      key: 'header',
      className: 'mb-8'
    }, 
      e('h1', { 
        key: 'title',
        className: 'text-3xl font-bold text-gray-900 mb-2'
      }, 'Financial Dashboard'),
      e('p', { 
        key: 'subtitle',
        className: 'text-gray-600'
      }, 'Welcome back! Here\'s your financial overview')
    ),

    e('div', { 
      key: 'balance-cards',
      className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'
    }, 
      e('div', { 
        key: 'balance',
        className: 'bg-white p-6 rounded-lg shadow border'
      }, 
        e('h3', { 
          key: 'title',
          className: 'text-sm text-gray-500 mb-2'
        }, 'Total Balance'),
        e('p', { 
          key: 'amount',
          className: 'text-3xl font-bold text-gray-900'
        }, formatCurrency(data.totalBalance)),
        e('p', { 
          key: 'change',
          className: 'text-sm text-green-600 mt-1'
        }, '↗ +2.5% from last month')
      ),

      e('div', { 
        key: 'income',
        className: 'bg-green-50 p-6 rounded-lg shadow border border-green-200'
      }, 
        e('h3', { 
          key: 'title',
          className: 'text-sm text-green-600 mb-2'
        }, 'Monthly Income'),
        e('p', { 
          key: 'amount',
          className: 'text-3xl font-bold text-green-700'
        }, formatCurrency(data.monthlyIncome)),
        e('p', { 
          key: 'change',
          className: 'text-sm text-green-600 mt-1'
        }, '↗ +8.2% from last month')
      ),

      e('div', { 
        key: 'expenses',
        className: 'bg-red-50 p-6 rounded-lg shadow border border-red-200'
      }, 
        e('h3', { 
          key: 'title',
          className: 'text-sm text-red-600 mb-2'
        }, 'Monthly Expenses'),
        e('p', { 
          key: 'amount',
          className: 'text-3xl font-bold text-red-700'
        }, formatCurrency(data.monthlyExpenses)),
        e('p', { 
          key: 'change',
          className: 'text-sm text-red-600 mt-1'
        }, '↘ -3.1% from last month')
      ),

      e('div', { 
        key: 'savings',
        className: 'bg-purple-50 p-6 rounded-lg shadow border border-purple-200'
      }, 
        e('h3', { 
          key: 'title',
          className: 'text-sm text-purple-600 mb-2'
        }, 'Savings Rate'),
        e('p', { 
          key: 'amount',
          className: 'text-3xl font-bold text-purple-700'
        }, `${data.savingsRate}%`),
        e('p', { 
          key: 'status',
          className: 'text-sm text-green-600 mt-1'
        }, '🎯 Above target')
      )
    ),

    data.recentTransactions.length > 0 && e('div', { 
      key: 'transactions',
      className: 'bg-white p-6 rounded-lg shadow border'
    }, 
      e('h2', { 
        key: 'title',
        className: 'text-xl font-bold mb-4'
      }, 'Recent Transactions'),
      e('div', { key: 'transactions-list', className: 'space-y-3' },
        ...data.recentTransactions.slice(0, 5).map((transaction, i) => 
          e('div', { 
            key: i,
            className: 'flex justify-between items-center p-3 bg-gray-50 rounded-lg'
          }, 
            e('div', { key: 'info' }, 
              e('p', { 
                key: 'desc',
                className: 'font-semibold text-sm'
              }, transaction.description),
              e('p', { 
                key: 'meta',
                className: 'text-xs text-gray-500'
              }, `${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}`)
            ),
            e('div', { 
              key: 'amount',
              className: `font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`
            }, `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}`)
          )
        )
      )
    )
  );
}

// Page Components
function LoansPage() {
  return e('div', { className: 'space-y-6' }, 
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Loans & Credit'),
    e('div', { 
      key: 'content',
      className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
    }, 
      e('div', {
        key: 'browse',
        className: 'bg-white p-6 rounded-lg shadow'
      }, 
        e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'Browse Loan Options'),
        e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Explore personalized loan offers from trusted partners'),
        e('button', { 
          key: 'btn',
          className: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
        }, 'View Offers')
      ),
      e('div', {
        key: 'my-loans',
        className: 'bg-white p-6 rounded-lg shadow'
      }, 
        e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'My Loans'),
        e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Track and manage your existing loans'),
        e('button', { 
          key: 'btn',
          className: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
        }, 'Manage Loans')
      )
    )
  );
}

function PayPage() {
  return e('div', { className: 'space-y-6' }, 
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Pay & Transfer'),
    e('div', { 
      key: 'balance',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg'
    }, 
      e('h3', { key: 'label', className: 'text-lg opacity-90' }, 'Available Balance'),
      e('p', { key: 'amount', className: 'text-3xl font-bold' }, '$26,721.40')
    ),
    e('div', { 
      key: 'actions',
      className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
    }, 
      e('button', {
        key: 'send',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, 
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '💸'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Send Money'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Transfer to friends & family')
      ),
      e('button', {
        key: 'request',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, 
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '💰'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Request Payment'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Request money from others')
      ),
      e('button', {
        key: 'bills',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, 
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '🧾'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Pay Bills'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Manage bill payments')
      )
    )
  );
}

function CommunityPage() {
  return e('div', { className: 'space-y-6' }, 
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Community Hub'),
    e('div', { 
      key: 'stats',
      className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'
    }, 
      e('div', { key: 'members', className: 'bg-white p-4 rounded-lg shadow text-center' }, 
        e('div', { key: 'number', className: 'text-2xl font-bold text-blue-600' }, '45K+'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Active Members')
      ),
      e('div', { key: 'stories', className: 'bg-white p-4 rounded-lg shadow text-center' }, 
        e('div', { key: 'number', className: 'text-2xl font-bold text-green-600' }, '2.3K'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Success Stories')
      ),
      e('div', { key: 'countries', className: 'bg-white p-4 rounded-lg shadow text-center' }, 
        e('div', { key: 'number', className: 'text-2xl font-bold text-purple-600' }, '156'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Countries Covered')
      )
    ),
    e('div', { 
      key: 'feed',
      className: 'bg-white p-6 rounded-lg shadow'
    }, 
      e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'Community Feed'),
      e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Connect with fellow immigrants, share experiences, and get advice'),
      e('button', { 
        key: 'join',
        className: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
      }, 'Join Discussion')
    )
  );
}

function ImisiPage() {
  return e('div', { className: 'space-y-6' }, 
    e('div', { 
      key: 'header',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg'
    }, 
      e('h2', { key: 'title', className: 'text-2xl font-bold mb-2' }, '🤖 Imisi 2.0'),
      e('p', { key: 'subtitle', className: 'opacity-90' }, 'AI-Powered Immigration Assistant')
    ),
    e('div', { 
      key: 'chat',
      className: 'bg-white rounded-lg shadow min-h-[500px] flex flex-col'
    }, 
      e('div', { 
        key: 'chat-header',
        className: 'p-4 border-b'
      }, 
        e('div', { key: 'status', className: 'flex items-center gap-2' }, 
          e('div', { key: 'avatar', className: 'w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm' }, '🤖'),
          e('div', { key: 'info' }, 
            e('div', { key: 'name', className: 'font-semibold' }, 'Imisi 2.0'),
            e('div', { key: 'status', className: 'text-sm text-green-600' }, '● Online')
          )
        )
      ),
      e('div', { 
        key: 'chat-body',
        className: 'flex-1 p-4'
      }, 
        e('div', { key: 'welcome', className: 'bg-blue-50 p-4 rounded-lg mb-4' }, 
          e('p', { key: 'msg' }, 'Hi! I\'m Imisi 2.0, your AI immigration assistant. I can help you with visa requirements, document preparation, cost calculations, and more. How can I assist you today?')
        )
      ),
      e('div', { 
        key: 'chat-input',
        className: 'p-4 border-t'
      }, 
        e('div', { key: 'input-group', className: 'flex gap-2' }, 
          e('input', {
            key: 'input',
            type: 'text',
            placeholder: 'Ask Imisi anything about immigration...',
            className: 'flex-1 p-2 border rounded-lg'
          }),
          e('button', {
            key: 'send',
            className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
          }, 'Send')
        )
      )
    )
  );
}

function LocalJobsPage() {
  return e('div', { className: 'space-y-6' }, 
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Local Job Opportunities'),
    e('div', { 
      key: 'search',
      className: 'bg-white p-4 rounded-lg shadow'
    }, 
      e('div', { key: 'search-form', className: 'flex gap-4' }, 
        e('input', {
          key: 'job-search',
          type: 'text',
          placeholder: 'Job title, company...',
          className: 'flex-1 p-2 border rounded'
        }),
        e('input', {
          key: 'location',
          type: 'text',
          placeholder: 'Location',
          className: 'w-48 p-2 border rounded'
        }),
        e('button', {
          key: 'search-btn',
          className: 'bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700'
        }, 'Search')
      )
    ),
    e('div', { 
      key: 'featured',
      className: 'grid grid-cols-1 md:grid-cols-2 gap-4'
    }, 
      e('div', { key: 'job1', className: 'bg-white p-4 rounded-lg shadow' }, 
        e('h3', { key: 'title', className: 'font-semibold text-lg' }, 'Software Developer'),
        e('p', { key: 'company', className: 'text-gray-600' }, 'TechCorp Inc. • Toronto, ON'),
        e('p', { key: 'salary', className: 'text-green-600 font-semibold' }, '$70,000 - $90,000'),
        e('div', { key: 'badges', className: 'mt-2' }, 
          e('span', { key: 'visa', className: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs' }, 'Visa Sponsor'),
          e('span', { key: 'remote', className: 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2' }, 'Remote OK')
        )
      ),
      e('div', { key: 'job2', className: 'bg-white p-4 rounded-lg shadow' }, 
        e('h3', { key: 'title', className: 'font-semibold text-lg' }, 'Marketing Coordinator'),
        e('p', { key: 'company', className: 'text-gray-600' }, 'Global Marketing • Vancouver, BC'),
        e('p', { key: 'salary', className: 'text-green-600 font-semibold' }, '$45,000 - $55,000'),
        e('div', { key: 'badges', className: 'mt-2' }, 
          e('span', { key: 'visa', className: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs' }, 'Visa Sponsor'),
          e('span', { key: 'entry', className: 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs ml-2' }, 'Entry Level')
        )
      )
    )
  );
}

// Main Dashboard with Sidebar Navigation
function MainDashboard({ user }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'loans', label: 'Loans', icon: '💳' },
    { id: 'pay', label: 'Pay', icon: '💰' },
    { id: 'community', label: 'Community', icon: '👥', badge: 3 },
    { id: 'imisi', label: 'Imisi 2.0', icon: '🤖' },
    { id: 'jobs', label: 'Local Jobs', icon: '📍', badge: 12 },
  ];

  const handleNavigation = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'loans': return e(LoansPage, { key: 'loans' });
      case 'pay': return e(PayPage, { key: 'pay' });
      case 'community': return e(CommunityPage, { key: 'community' });
      case 'imisi': return e(ImisiPage, { key: 'imisi' });
      case 'jobs': return e(LocalJobsPage, { key: 'jobs' });
      default: return e(EnhancedDashboard, { key: 'dashboard' });
    }
  };

  return e('div', { className: 'min-h-screen bg-gray-50 flex' }, 
    isSidebarOpen && e('div', {
      key: 'overlay',
      className: 'fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden',
      onClick: () => setIsSidebarOpen(false)
    }),

    e('aside', {
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    }, 
      e('div', {
        key: 'header',
        className: 'flex items-center justify-between p-4 border-b'
      }, 
        e('div', { key: 'logo', className: 'flex items-center space-x-2' }, 
          e('div', {
            key: 'logo-icon',
            className: 'w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'
          }, 'C'),
          e('span', { key: 'logo-text', className: 'font-bold text-lg text-gray-900' }, 'Cush')
        ),
        e('button', {
          key: 'close',
          className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
          onClick: () => setIsSidebarOpen(false)
        }, '✕')
      ),

      e('div', { key: 'profile', className: 'p-4 border-b' }, 
        e('div', { className: 'flex items-center space-x-3' }, 
          e('div', {
            key: 'avatar',
            className: 'w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold'
          }, `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`),
          e('div', { key: 'info', className: 'flex-1 min-w-0' }, 
            e('p', {
              key: 'name',
              className: 'text-sm font-medium text-gray-900 truncate'
            }, `${user?.firstName || ''} ${user?.lastName || ''}`),
            e('p', {
              key: 'email',
              className: 'text-xs text-gray-500 truncate'
            }, user?.email || '')
          )
        )
      ),

      e('nav', { key: 'nav', className: 'flex-1 p-4 space-y-2' }, 
        ...sidebarItems.map(item => 
          e('button', {
            key: item.id,
            className: `w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
              currentPage === item.id 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                : 'hover:bg-gray-100 text-gray-700'
            }`,
            onClick: () => handleNavigation(item.id)
          }, 
            e('div', { key: 'content', className: 'flex items-center space-x-3' }, 
              e('span', { key: 'icon', className: 'text-lg' }, item.icon),
              e('span', { key: 'label' }, item.label)
            ),
            item.badge && e('span', {
              key: 'badge',
              className: 'bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center'
            }, item.badge)
          )
        )
      ),

      e('div', { key: 'footer', className: 'p-4 border-t space-y-2' }, 
        e('button', {
          key: 'logout',
          onClick: handleLogout,
          className: 'w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors'
        }, 
          e('span', { key: 'icon' }, '🚪'),
          e('span', { key: 'text' }, 'Sign Out')
        )
      )
    ),

    e('div', { key: 'main', className: 'flex-1 lg:ml-0' }, 
      e('header', {
        key: 'top-bar',
        className: 'bg-white shadow-sm border-b'
      }, 
        e('div', { className: 'flex items-center justify-between px-4 py-3' }, 
          e('div', { key: 'left', className: 'flex items-center space-x-4' }, 
            e('button', {
              key: 'menu',
              className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
              onClick: () => setIsSidebarOpen(true)
            }, '☰'),
            e('h1', {
              key: 'title',
              className: 'text-xl font-semibold text-gray-900'
            }, sidebarItems.find(item => currentPage === item.id)?.label || 'Dashboard')
          ),
          e('div', { key: 'right', className: 'flex items-center space-x-3' }, 
            e('button', {
              key: 'notifications',
              className: 'relative p-2 rounded-md hover:bg-gray-100'
            }, 
              e('span', { key: 'bell' }, '🔔'),
              e('span', {
                key: 'badge',
                className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center'
              }, '3')
            ),
            e('div', {
              key: 'avatar',
              className: 'w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm cursor-pointer'
            }, `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`)
          )
        )
      ),

      e('main', {
        key: 'content',
        className: 'p-4 lg:p-6'
      }, renderPageContent())
    )
  );
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
    }, e('div', {
      className: 'animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'
    }));
  }

  return user ? 
    e(MainDashboard, { key: 'dashboard', user }) :
    e(NewHomepage, { key: 'homepage' });
}

// Homepage Component
function NewHomepage() {
  return e('div', { className: 'min-h-screen' }, 
    e(HeroSection, { key: 'hero' }),
    e(FeaturesSection, { key: 'features' }),
    e(TestimonialsSection, { key: 'testimonials' }),
    e(CommunityPreview, { key: 'community' }),
    e(AuthComponent, { key: 'auth' })
  );
}

// Mount the application
const root = createRoot(document.getElementById('root'));
root.render(e(App));