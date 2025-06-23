// Simple React application entry point
const { useState, useEffect, createElement: e } = React;

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
        React.createElement(EnhancedDashboard, { key: 'dashboard' }) :
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

// Mount the React application using React 18 API
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));