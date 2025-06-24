// Simple React application entry point
const { useState, useEffect, createElement: e } = React;

// Homepage Hero Section
function HeroSection() {
  return e('section', {
    className: 'relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white py-20 overflow-hidden'
  },
    e('div', { className: 'absolute inset-0 opacity-30' }),
    e('div', { className: 'container mx-auto px-6 relative z-10' },
      e('div', { className: 'grid lg:grid-cols-2 gap-12 items-center' },
        e('div', { className: 'space-y-8' },
          e('div', { className: 'space-y-4' },
            e('h1', { className: 'text-5xl lg:text-6xl font-bold leading-tight' },
              'Simplify Your ',
              e('span', { className: 'bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent' },
                'Migration Journey'
              )
            ),
            e('p', { className: 'text-xl text-blue-100 leading-relaxed' },
              'Transform your global immigration experience with AI-powered guidance, financial planning, and expert community support.'
            )
          ),
          e('div', { className: 'flex flex-col sm:flex-row gap-4' },
            e('button', {
              className: 'bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg transition-colors',
              onClick: () => {
                const authSection = document.getElementById('auth-section');
                if (authSection) authSection.scrollIntoView({ behavior: 'smooth' });
              }
            }, 'Start Your Journey'),
            e('button', {
              className: 'border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-3 rounded-lg transition-colors'
            }, 'Watch Demo')
          )
        )
      )
    )
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    { icon: '🤖', title: 'AI-Powered Guidance', desc: 'Get personalized immigration advice from Imisi, our AI concierge trained on the latest immigration policies.' },
    { icon: '💰', title: 'Financial Planning', desc: 'Calculate immigration costs, plan your budget, and track expenses with integrated financial tools.' },
    { icon: '👥', title: 'Expert Mentorship', desc: 'Connect with immigration experts and successful immigrants who can guide you through your journey.' },
    { icon: '📄', title: 'Document Management', desc: 'Organize, track, and verify all your immigration documents with our secure digital vault.' },
    { icon: '🗺️', title: 'Local Job Discovery', desc: 'Find job opportunities in your target country with location-based job matching.' },
    { icon: '💳', title: 'Loan Referrals', desc: 'Access immigration loans and financing options through our trusted partner network.' }
  ];

  return e('section', { className: 'py-16 bg-white' },
    e('div', { className: 'container mx-auto px-6' },
      e('div', { className: 'text-center mb-12' },
        e('h2', { className: 'text-3xl lg:text-4xl font-bold text-gray-900 mb-4' },
          'Everything You Need for Immigration Success'
        ),
        e('p', { className: 'text-lg text-gray-600 max-w-3xl mx-auto' },
          'From AI-powered guidance to financial planning, we provide comprehensive tools and support for every step of your immigration journey'
        )
      ),
      e('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' },
        ...features.map((feature, index) =>
          e('div', {
            key: index,
            className: 'group hover:shadow-xl transition-all duration-300 border rounded-lg p-6 hover:-translate-y-1'
          },
            e('div', { className: 'w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300' },
              e('span', { className: 'text-2xl' }, feature.icon)
            ),
            e('h3', { className: 'text-xl font-bold text-gray-900 mb-3' }, feature.title),
            e('p', { className: 'text-gray-600 leading-relaxed' }, feature.desc)
          )
        )
      )
    )
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    { name: 'Sarah Chen', role: 'Software Engineer', country: 'Canada', content: 'Cush made my Express Entry application seamless. The AI guidance was incredibly accurate, and I received my PR in just 6 months!', journey: 'Nigeria → Canada' },
    { name: 'David Rodriguez', role: 'Healthcare Professional', country: 'Australia', content: 'The financial planning tools helped me budget perfectly for my move. The community support was invaluable during the entire process.', journey: 'Philippines → Australia' },
    { name: 'Amara Okonkwo', role: 'Business Analyst', country: 'UK', content: 'From document preparation to settlement planning, Cush guided me every step of the way. Now living my dream in London!', journey: 'Ghana → United Kingdom' }
  ];

  return e('section', { className: 'py-16 bg-gray-50' },
    e('div', { className: 'container mx-auto px-6' },
      e('div', { className: 'text-center mb-12' },
        e('h2', { className: 'text-3xl lg:text-4xl font-bold text-gray-900 mb-4' },
          'Success Stories From Our Community'
        ),
        e('p', { className: 'text-lg text-gray-600 max-w-2xl mx-auto' },
          'Join thousands who have successfully navigated their immigration journey with Cush'
        )
      ),
      e('div', { className: 'grid md:grid-cols-3 gap-6' },
        ...testimonials.map((testimonial, index) =>
          e('div', {
            key: index,
            className: 'bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow'
          },
            e('div', { className: 'flex items-center mb-4' },
              Array.from({ length: 5 }).map((_, i) =>
                e('span', { key: i, className: 'text-yellow-400' }, '⭐')
              )
            ),
            e('p', { className: 'text-gray-700 mb-4 italic' }, `"${testimonial.content}"`),
            e('div', { className: 'flex items-center gap-3' },
              e('div', { className: 'w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold' },
                testimonial.name.split(' ').map(n => n[0]).join('')
              ),
              e('div', null,
                e('h4', { className: 'font-semibold text-gray-900' }, testimonial.name),
                e('p', { className: 'text-sm text-gray-600' }, testimonial.role),
                e('p', { className: 'text-xs text-blue-600 font-medium' }, testimonial.journey)
              )
            )
          )
        )
      )
    )
  );
}

// Community Preview Section
function CommunityPreview() {
  const communityStats = [
    { label: 'Active Members', value: '50,000+', icon: '👥' },
    { label: 'Countries Represented', value: '180+', icon: '🌍' },
    { label: 'Success Stories', value: '12,500+', icon: '❤️' },
    { label: 'Monthly Discussions', value: '25,000+', icon: '💬' }
  ];

  return e('section', { className: 'py-16 bg-gradient-to-br from-blue-50 to-purple-50' },
    e('div', { className: 'container mx-auto px-6' },
      e('div', { className: 'text-center mb-12' },
        e('h2', { className: 'text-3xl lg:text-4xl font-bold text-gray-900 mb-4' },
          'Join Our Global Community'
        ),
        e('p', { className: 'text-lg text-gray-600 max-w-2xl mx-auto' },
          'Connect with fellow immigrants, share experiences, and get support from people who understand your journey'
        )
      ),
      e('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12' },
        ...communityStats.map((stat, index) =>
          e('div', { key: index, className: 'text-center' },
            e('div', { className: 'w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3' },
              e('span', { className: 'text-2xl' }, stat.icon)
            ),
            e('div', { className: 'text-2xl font-bold text-gray-900' }, stat.value),
            e('div', { className: 'text-sm text-gray-600' }, stat.label)
          )
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
    // Get test credentials for development
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

  return e('div', {
    style: {
      textAlign: 'center',
      padding: '3rem',
      maxWidth: '400px',
      margin: '0 auto'
    }
  }, [
    e('h2', {
      key: 'title',
      style: { color: '#1f2937', marginBottom: '0.5rem' }
    }, 'Sign in to Cush Platform'),
    
    e('p', {
      key: 'subtitle',
      style: { color: '#6b7280', marginBottom: '2rem' }
    }, 'Access your personalized financial dashboard'),

    // Login Form
    e('form', {
      key: 'login-form',
      onSubmit: handleLogin,
      style: { marginBottom: '2rem' }
    }, [
      e('div', {
        key: 'email-group',
        style: { marginBottom: '1rem', textAlign: 'left' }
      }, [
        e('label', {
          key: 'email-label',
          style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500' }
        }, 'Email'),
        e('input', {
          key: 'email-input',
          type: 'email',
          value: loginForm.email,
          onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }),
          required: true,
          style: {
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem'
          }
        })
      ]),
      
      e('div', {
        key: 'password-group',
        style: { marginBottom: '1.5rem', textAlign: 'left' }
      }, [
        e('label', {
          key: 'password-label',
          style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500' }
        }, 'Password'),
        e('input', {
          key: 'password-input',
          type: 'password',
          value: loginForm.password,
          onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
          required: true,
          style: {
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem'
          }
        })
      ]),
      
      e('button', {
        key: 'submit-btn',
        type: 'submit',
        disabled: loading,
        style: {
          width: '100%',
          backgroundColor: loading ? '#9ca3af' : '#3b82f6',
          color: 'white',
          padding: '0.75rem',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer'
        }
      }, loading ? 'Signing in...' : 'Sign In')
    ]),

    // Test Accounts Section
    testCredentials && e('div', {
      key: 'test-accounts',
      style: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '2rem'
      }
    }, [
      e('button', {
        key: 'toggle-test',
        onClick: () => setShowTestAccounts(!showTestAccounts),
        style: {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          padding: '0.5rem 1rem',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          cursor: 'pointer',
          marginBottom: '1rem'
        }
      }, showTestAccounts ? 'Hide Test Accounts' : 'Show Test Accounts'),
      
      showTestAccounts && e('div', {
        key: 'test-list',
        style: { textAlign: 'left' }
      }, [
        e('p', {
          key: 'test-note',
          style: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }
        }, 'Click on any test account to auto-fill the login form:'),
        
        e('div', {
          key: 'test-accounts-list',
          style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
        }, testCredentials.testAccounts.map((account, i) =>
          e('div', {
            key: i,
            onClick: () => useTestAccount(account),
            style: {
              padding: '1rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            },
            onMouseEnter: (e) => e.target.style.backgroundColor = '#f3f4f6',
            onMouseLeave: (e) => e.target.style.backgroundColor = '#f9fafb'
          }, [
            e('div', {
              key: 'account-header',
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }
            }, [
              e('strong', { key: 'email' }, account.email),
              e('span', {
                key: 'role',
                style: {
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: account.role === 'admin' ? '#dbeafe' : '#dcfce7',
                  color: account.role === 'admin' ? '#1e40af' : '#166534',
                  borderRadius: '0.25rem'
                }
              }, account.role)
            ]),
            e('p', {
              key: 'description',
              style: { fontSize: '0.875rem', color: '#6b7280', margin: 0 }
            }, account.description)
          ])
        ))
      ])
    ]),

    // Google OAuth option
    e('div', {
      key: 'oauth-divider',
      style: {
        borderTop: '1px solid #e5e7eb',
        paddingTop: '2rem',
        marginTop: '2rem'
      }
    }, [
      e('p', {
        key: 'or-text',
        style: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }
      }, 'Or continue with:'),
      
      e('button', {
        key: 'google-btn',
        onClick: () => window.location.href = '/api/auth/google',
        style: {
          backgroundColor: '#fff',
          color: '#374151',
          padding: '0.75rem 1.5rem',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          margin: '0 auto'
        }
      }, [
        e('span', { key: 'google-icon' }, '🔗'),
        e('span', { key: 'google-text' }, 'Sign in with Google')
      ])
    ])
  ]);
}

// Enhanced Dashboard Component
function EnhancedDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/analytics?timeRange=${timeRange}`).then(res => res.ok ? res.json() : null),
      fetch('/api/financial-insights').then(res => res.ok ? res.json() : null)
    ]).then(([dashboard, insights]) => {
      setDashboardData(dashboard);
      setInsightsData(insights);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [timeRange]);

  if (loading) {
    return e('div', { 
      style: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontFamily: 'system-ui'
      }
    }, 'Loading financial analytics...');
  }

  const data = dashboardData || {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    recentTransactions: []
  };

  const insights = insightsData || {
    financialHealthScore: { score: 0, factors: [], recommendations: [] },
    insights: [],
    spendingPatterns: []
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return e('div', { style: { fontFamily: 'system-ui', padding: '1rem' } }, [
    // Header
    e('div', { key: 'header', style: { marginBottom: '2rem' } }, [
      e('h1', { 
        key: 'title', 
        style: { fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }
      }, 'Financial Dashboard'),
      e('div', { 
        key: 'controls',
        style: { display: 'flex', gap: '0.5rem', marginTop: '1rem' }
      }, [
        ['7d', '30d', '90d', '1y'].map(range => 
          e('button', {
            key: range,
            onClick: () => setTimeRange(range),
            style: {
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: timeRange === range ? '#3b82f6' : 'white',
              color: timeRange === range ? 'white' : '#374151',
              cursor: 'pointer'
            }
          }, range.toUpperCase())
        )
      ])
    ]),

    // Key Metrics
    e('div', { 
      key: 'metrics', 
      style: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }
    }, [
      e('div', { 
        key: 'balance',
        style: { 
          padding: '1.5rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }
      }, [
        e('h3', { 
          key: 'title',
          style: { margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.875rem' }
        }, 'Total Balance'),
        e('p', { 
          key: 'amount',
          style: { margin: '0', fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b' }
        }, formatCurrency(data.totalBalance)),
        e('p', { 
          key: 'change',
          style: { margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#059669' }
        }, '↗ +2.5% from last month')
      ]),

      e('div', { 
        key: 'income',
        style: { 
          padding: '1.5rem', 
          backgroundColor: '#f0fdf4', 
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0'
        }
      }, [
        e('h3', { 
          key: 'title',
          style: { margin: '0 0 0.5rem 0', color: '#16a34a', fontSize: '0.875rem' }
        }, 'Monthly Income'),
        e('p', { 
          key: 'amount',
          style: { margin: '0', fontSize: '1.875rem', fontWeight: 'bold', color: '#15803d' }
        }, formatCurrency(data.monthlyIncome)),
        e('p', { 
          key: 'change',
          style: { margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#059669' }
        }, '↗ +8.2% from last month')
      ]),

      e('div', { 
        key: 'expenses',
        style: { 
          padding: '1.5rem', 
          backgroundColor: '#fef2f2', 
          borderRadius: '0.5rem',
          border: '1px solid #fecaca'
        }
      }, [
        e('h3', { 
          key: 'title',
          style: { margin: '0 0 0.5rem 0', color: '#dc2626', fontSize: '0.875rem' }
        }, 'Monthly Expenses'),
        e('p', { 
          key: 'amount',
          style: { margin: '0', fontSize: '1.875rem', fontWeight: 'bold', color: '#b91c1c' }
        }, formatCurrency(data.monthlyExpenses)),
        e('p', { 
          key: 'change',
          style: { margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }
        }, '↘ -3.1% from last month')
      ]),

      e('div', { 
        key: 'savings',
        style: { 
          padding: '1.5rem', 
          backgroundColor: '#faf5ff', 
          borderRadius: '0.5rem',
          border: '1px solid #e9d5ff'
        }
      }, [
        e('h3', { 
          key: 'title',
          style: { margin: '0 0 0.5rem 0', color: '#9333ea', fontSize: '0.875rem' }
        }, 'Savings Rate'),
        e('p', { 
          key: 'amount',
          style: { margin: '0', fontSize: '1.875rem', fontWeight: 'bold', color: '#7c3aed' }
        }, `${data.savingsRate}%`),
        e('p', { 
          key: 'status',
          style: { margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#059669' }
        }, '🎯 Above target')
      ])
    ]),

    // Financial Health Score
    insights.financialHealthScore.score > 0 && e('div', { 
      key: 'health-score',
      style: { 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        marginBottom: '2rem'
      }
    }, [
      e('h2', { 
        key: 'title',
        style: { margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold' }
      }, 'Financial Health Score'),
      e('div', { 
        key: 'score-container',
        style: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }
      }, [
        e('div', { 
          key: 'score',
          style: { 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            backgroundColor: insights.financialHealthScore.score >= 80 ? '#dcfce7' : 
                           insights.financialHealthScore.score >= 60 ? '#fef3c7' : '#fee2e2',
            color: insights.financialHealthScore.score >= 80 ? '#166534' : 
                   insights.financialHealthScore.score >= 60 ? '#92400e' : '#991b1b'
          }
        }, insights.financialHealthScore.score),
        e('div', { key: 'factors', style: { flex: 1 } }, [
          e('h4', { 
            key: 'factors-title',
            style: { margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }
          }, 'Key Factors:'),
          e('ul', { 
            key: 'factors-list',
            style: { margin: 0, paddingLeft: '1rem', fontSize: '0.875rem', color: '#64748b' }
          }, insights.financialHealthScore.factors.map((factor, i) => 
            e('li', { key: i }, factor)
          ))
        ])
      ]),
      insights.financialHealthScore.recommendations.length > 0 && e('div', { 
        key: 'recommendations',
        style: { 
          padding: '1rem', 
          backgroundColor: '#eff6ff', 
          borderRadius: '0.375rem',
          border: '1px solid #bfdbfe'
        }
      }, [
        e('h4', { 
          key: 'rec-title',
          style: { margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#1e40af' }
        }, 'Recommendations:'),
        e('ul', { 
          key: 'rec-list',
          style: { margin: 0, paddingLeft: '1rem', fontSize: '0.875rem', color: '#1e40af' }
        }, insights.financialHealthScore.recommendations.map((rec, i) => 
          e('li', { key: i }, rec)
        ))
      ])
    ]),

    // AI Insights
    insights.insights.length > 0 && e('div', { 
      key: 'ai-insights',
      style: { 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        marginBottom: '2rem'
      }
    }, [
      e('h2', { 
        key: 'title',
        style: { margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold' }
      }, '💡 AI Financial Insights'),
      e('div', { key: 'insights-list', style: { display: 'flex', flexDirection: 'column', gap: '1rem' } },
        insights.insights.map((insight, i) => 
          e('div', { 
            key: i,
            style: { 
              padding: '1rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0'
            }
          }, [
            e('div', { 
              key: 'header',
              style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }
            }, [
              e('h4', { 
                key: 'title',
                style: { margin: 0, fontSize: '1rem', fontWeight: '600' }
              }, insight.title),
              e('span', { 
                key: 'impact',
                style: { 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  borderRadius: '0.25rem',
                  backgroundColor: insight.impact === 'high' ? '#fee2e2' : 
                                 insight.impact === 'medium' ? '#fef3c7' : '#f0f9ff',
                  color: insight.impact === 'high' ? '#991b1b' : 
                         insight.impact === 'medium' ? '#92400e' : '#1e40af'
                }
              }, `${insight.impact} impact`)
            ]),
            e('p', { 
              key: 'description',
              style: { margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748b' }
            }, insight.description),
            insight.suggestions && e('div', { 
              key: 'suggestions',
              style: { 
                padding: '0.75rem', 
                backgroundColor: 'white', 
                borderRadius: '0.25rem',
                border: '1px solid #e2e8f0'
              }
            }, [
              e('h5', { 
                key: 'sug-title',
                style: { margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }
              }, 'Suggested Actions:'),
              e('ul', { 
                key: 'sug-list',
                style: { margin: 0, paddingLeft: '1rem', fontSize: '0.875rem', color: '#64748b' }
              }, insight.suggestions.map((suggestion, j) => 
                e('li', { key: j }, suggestion)
              ))
            ])
          ])
        )
      )
    ]),

    // Recent Transactions
    data.recentTransactions.length > 0 && e('div', { 
      key: 'transactions',
      style: { 
        padding: '1.5rem', 
        backgroundColor: 'white', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }
    }, [
      e('h2', { 
        key: 'title',
        style: { margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold' }
      }, 'Recent Transactions'),
      e('div', { key: 'transactions-list', style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } },
        data.recentTransactions.slice(0, 5).map((transaction, i) => 
          e('div', { 
            key: i,
            style: { 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.75rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '0.375rem'
            }
          }, [
            e('div', { key: 'info' }, [
              e('p', { 
                key: 'desc',
                style: { margin: '0 0 0.25rem 0', fontWeight: '600', fontSize: '0.875rem' }
              }, transaction.description),
              e('p', { 
                key: 'meta',
                style: { margin: 0, fontSize: '0.75rem', color: '#64748b' }
              }, `${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}`)
            ]),
            e('div', { 
              key: 'amount',
              style: { 
                fontWeight: 'bold',
                color: transaction.type === 'income' ? '#059669' : '#dc2626'
              }
            }, `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}`)
          ])
        )
      )
    ])
  ]);
}

// Page Components for Navigation
function LoansPage() {
  return e('div', { className: 'space-y-6' }, [
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Loans & Credit'),
    e('div', { 
      key: 'content',
      className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
    }, [
      e('div', {
        key: 'browse',
        className: 'bg-white p-6 rounded-lg shadow'
      }, [
        e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'Browse Loan Options'),
        e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Explore personalized loan offers from trusted partners'),
        e('button', { 
          key: 'btn',
          className: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
        }, 'View Offers')
      ]),
      e('div', {
        key: 'my-loans',
        className: 'bg-white p-6 rounded-lg shadow'
      }, [
        e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'My Loans'),
        e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Track and manage your existing loans'),
        e('button', { 
          key: 'btn',
          className: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
        }, 'Manage Loans')
      ])
    ])
  ]);
}

function PayPage() {
  return e('div', { className: 'space-y-6' }, [
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Pay & Transfer'),
    e('div', { 
      key: 'balance',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg'
    }, [
      e('h3', { key: 'label', className: 'text-lg opacity-90' }, 'Available Balance'),
      e('p', { key: 'amount', className: 'text-3xl font-bold' }, '$26,721.40')
    ]),
    e('div', { 
      key: 'actions',
      className: 'grid grid-cols-1 md:grid-cols-3 gap-4'
    }, [
      e('button', {
        key: 'send',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, [
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '💸'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Send Money'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Transfer to friends & family')
      ]),
      e('button', {
        key: 'request',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, [
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '💰'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Request Payment'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Request money from others')
      ]),
      e('button', {
        key: 'bills',
        className: 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left'
      }, [
        e('div', { key: 'icon', className: 'text-2xl mb-2' }, '🧾'),
        e('h3', { key: 'title', className: 'font-semibold' }, 'Pay Bills'),
        e('p', { key: 'desc', className: 'text-gray-600 text-sm' }, 'Manage bill payments')
      ])
    ])
  ]);
}

function CommunityPage() {
  return e('div', { className: 'space-y-6' }, [
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Community Hub'),
    e('div', { 
      key: 'stats',
      className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'
    }, [
      e('div', { key: 'members', className: 'bg-white p-4 rounded-lg shadow text-center' }, [
        e('div', { key: 'number', className: 'text-2xl font-bold text-blue-600' }, '45K+'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Active Members')
      ]),
      e('div', { key: 'stories', className: 'bg-white p-4 rounded-lg shadow text-center' }, [
        e('div', { key: 'number', className: 'text-2xl font-bold text-green-600' }, '2.3K'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Success Stories')
      ]),
      e('div', { key: 'countries', className: 'bg-white p-4 rounded-lg shadow text-center' }, [
        e('div', { key: 'number', className: 'text-2xl font-bold text-purple-600' }, '156'),
        e('div', { key: 'label', className: 'text-gray-600' }, 'Countries Covered')
      ])
    ]),
    e('div', { 
      key: 'feed',
      className: 'bg-white p-6 rounded-lg shadow'
    }, [
      e('h3', { key: 'title', className: 'text-xl font-semibold mb-4' }, 'Community Feed'),
      e('p', { key: 'desc', className: 'text-gray-600 mb-4' }, 'Connect with fellow immigrants, share experiences, and get advice'),
      e('button', { 
        key: 'join',
        className: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
      }, 'Join Discussion')
    ])
  ]);
}

function ImisiPage() {
  return e('div', { className: 'space-y-6' }, [
    e('div', { 
      key: 'header',
      className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg'
    }, [
      e('h2', { key: 'title', className: 'text-2xl font-bold mb-2' }, '🤖 Imisi 2.0'),
      e('p', { key: 'subtitle', className: 'opacity-90' }, 'AI-Powered Immigration Assistant')
    ]),
    e('div', { 
      key: 'chat',
      className: 'bg-white rounded-lg shadow min-h-[500px] flex flex-col'
    }, [
      e('div', { 
        key: 'chat-header',
        className: 'p-4 border-b'
      }, [
        e('div', { key: 'status', className: 'flex items-center gap-2' }, [
          e('div', { key: 'avatar', className: 'w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm' }, '🤖'),
          e('div', { key: 'info' }, [
            e('div', { key: 'name', className: 'font-semibold' }, 'Imisi 2.0'),
            e('div', { key: 'status', className: 'text-sm text-green-600' }, '● Online')
          ])
        ])
      ]),
      e('div', { 
        key: 'chat-body',
        className: 'flex-1 p-4'
      }, [
        e('div', { key: 'welcome', className: 'bg-blue-50 p-4 rounded-lg mb-4' }, [
          e('p', { key: 'msg' }, 'Hi! I\'m Imisi 2.0, your AI immigration assistant. I can help you with visa requirements, document preparation, cost calculations, and more. How can I assist you today?')
        ])
      ]),
      e('div', { 
        key: 'chat-input',
        className: 'p-4 border-t'
      }, [
        e('div', { key: 'input-group', className: 'flex gap-2' }, [
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
        ])
      ])
    ])
  ]);
}

function LocalJobsPage() {
  return e('div', { className: 'space-y-6' }, [
    e('h2', { key: 'title', className: 'text-2xl font-bold' }, 'Local Job Opportunities'),
    e('div', { 
      key: 'search',
      className: 'bg-white p-4 rounded-lg shadow'
    }, [
      e('div', { key: 'search-form', className: 'flex gap-4' }, [
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
      ])
    ]),
    e('div', { 
      key: 'featured',
      className: 'grid grid-cols-1 md:grid-cols-2 gap-4'
    }, [
      e('div', { key: 'job1', className: 'bg-white p-4 rounded-lg shadow' }, [
        e('h3', { key: 'title', className: 'font-semibold text-lg' }, 'Software Developer'),
        e('p', { key: 'company', className: 'text-gray-600' }, 'TechCorp Inc. • Toronto, ON'),
        e('p', { key: 'salary', className: 'text-green-600 font-semibold' }, '$70,000 - $90,000'),
        e('div', { key: 'badges', className: 'mt-2' }, [
          e('span', { key: 'visa', className: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs' }, 'Visa Sponsor'),
          e('span', { key: 'remote', className: 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2' }, 'Remote OK')
        ])
      ]),
      e('div', { key: 'job2', className: 'bg-white p-4 rounded-lg shadow' }, [
        e('h3', { key: 'title', className: 'font-semibold text-lg' }, 'Marketing Coordinator'),
        e('p', { key: 'company', className: 'text-gray-600' }, 'Global Marketing • Vancouver, BC'),
        e('p', { key: 'salary', className: 'text-green-600 font-semibold' }, '$45,000 - $55,000'),
        e('div', { key: 'badges', className: 'mt-2' }, [
          e('span', { key: 'visa', className: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs' }, 'Visa Sponsor'),
          e('span', { key: 'entry', className: 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs ml-2' }, 'Entry Level')
        ])
      ])
    ])
  ]);
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

  return e('div', { className: 'min-h-screen bg-gray-50 flex' }, [
    // Mobile overlay
    isSidebarOpen && e('div', {
      key: 'overlay',
      className: 'fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden',
      onClick: () => setIsSidebarOpen(false)
    }),

    // Sidebar
    e('aside', {
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`,
      style: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }
    }, [
      // Header
      e('div', {
        key: 'header',
        className: 'flex items-center justify-between p-4 border-b'
      }, [
        e('div', { key: 'logo', className: 'flex items-center space-x-2' }, [
          e('div', {
            key: 'logo-icon',
            className: 'w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'
          }, 'C'),
          e('span', { key: 'logo-text', className: 'font-bold text-lg text-gray-900' }, 'Cush')
        ]),
        e('button', {
          key: 'close',
          className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
          onClick: () => setIsSidebarOpen(false)
        }, '✕')
      ]),

      // User Profile
      e('div', { key: 'profile', className: 'p-4 border-b' }, [
        e('div', { className: 'flex items-center space-x-3' }, [
          e('div', {
            key: 'avatar',
            className: 'w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold'
          }, `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`),
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
        ])
      ]),

      // Navigation
      e('nav', { key: 'nav', className: 'flex-1 p-4 space-y-2' }, 
        sidebarItems.map(item => 
          e('button', {
            key: item.id,
            className: `w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
              currentPage === item.id 
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                : 'hover:bg-gray-100 text-gray-700'
            }`,
            onClick: () => handleNavigation(item.id)
          }, [
            e('div', { key: 'content', className: 'flex items-center space-x-3' }, [
              e('span', { key: 'icon', className: 'text-lg' }, item.icon),
              e('span', { key: 'label' }, item.label)
            ]),
            item.badge && e('span', {
              key: 'badge',
              className: 'bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center'
            }, item.badge)
          ])
        )
      ),

      // Footer
      e('div', { key: 'footer', className: 'p-4 border-t space-y-2' }, [
        e('button', {
          key: 'settings',
          className: 'w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700'
        }, [
          e('span', { key: 'icon' }, '⚙️'),
          e('span', { key: 'text' }, 'Settings')
        ]),
        e('button', {
          key: 'logout',
          className: 'w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-red-50 text-red-600',
          onClick: handleLogout
        }, [
          e('span', { key: 'icon' }, '🚪'),
          e('span', { key: 'text' }, 'Sign Out')
        ])
      ])
    ]),

    // Main Content
    e('div', { key: 'main', className: 'flex-1 lg:ml-0' }, [
      // Top Bar
      e('header', {
        key: 'top-bar',
        className: 'bg-white shadow-sm border-b'
      }, [
        e('div', { className: 'flex items-center justify-between px-4 py-3' }, [
          e('div', { key: 'left', className: 'flex items-center space-x-4' }, [
            e('button', {
              key: 'menu',
              className: 'lg:hidden p-2 rounded-md hover:bg-gray-100',
              onClick: () => setIsSidebarOpen(true)
            }, '☰'),
            e('h1', {
              key: 'title',
              className: 'text-xl font-semibold text-gray-900'
            }, sidebarItems.find(item => currentPage === item.id)?.label || 'Dashboard')
          ]),
          e('div', { key: 'right', className: 'flex items-center space-x-3' }, [
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
              key: 'avatar',
              className: 'w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm cursor-pointer'
            }, `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`)
          ])
        ])
      ]),

      // Page Content
      e('main', {
        key: 'content',
        className: 'p-4 lg:p-6'
      }, renderPageContent())
    ])
  ]);
}

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

// New Homepage Component
function NewHomepage() {
  return e('div', { className: 'min-h-screen' }, [
    e(HeroSection, { key: 'hero' }),
    e(FeaturesSection, { key: 'features' }),
    e(TestimonialsSection, { key: 'testimonials' }),
    e(CommunityPreview, { key: 'community' }),
    e(AuthComponent, { key: 'auth' })
  ]);
}

// Mount the React application
ReactDOM.render(e(App), document.getElementById('root'));