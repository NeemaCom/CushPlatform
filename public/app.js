// React 18 Components for Cush Platform - Fixed Syntax
const { useState, useEffect, createElement: e } = React;
const { createRoot } = ReactDOM;

// Chart.js Configuration
Chart.register(
  Chart.ArcElement,
  Chart.BarElement,
  Chart.CategoryScale,
  Chart.LinearScale,
  Chart.PointElement,
  Chart.LineElement,
  Chart.Title,
  Chart.Tooltip,
  Chart.Legend,
  Chart.Filler
);

// Interactive Chart Component
function InteractiveChart({ type = 'line', data, options = {}, className = '' }) {
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const ctx = chartRef.current.getContext('2d');
    
    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Default options
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      },
      scales: type !== 'doughnut' && type !== 'pie' ? {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      } : undefined,
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type,
      data,
      options: { ...defaultOptions, ...options }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type, options]);

  return e('div', {
    className: `relative ${className}`,
    style: { height: '400px' }
  }, [
    e('canvas', {
      key: 'chart-canvas',
      ref: chartRef,
      className: 'w-full h-full'
    })
  ]);
}

// Navigation Header Component
function NavigationHeader({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return e('nav', {
    className: 'absolute top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20'
  }, [
    e('div', {
      key: 'nav-container',
      className: 'container mx-auto px-6 py-4'
    }, [
      e('div', {
        key: 'nav-content',
        className: 'flex items-center justify-between'
      }, [
        // Logo
        e('button', {
          key: 'logo',
          onClick: () => {
            if (typeof window.navigate === 'function') {
              window.navigate('home');
            } else {
              window.location.hash = 'home';
            }
          },
          className: 'flex items-center hover:opacity-80 transition-opacity'
        }, [
          e('img', {
            key: 'logo-image',
            src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
            alt: 'Cush Logo',
            className: 'h-8 w-auto'
          })
        ]),

        // Desktop Navigation
        e('div', {
          key: 'desktop-nav',
          className: 'hidden md:flex items-center gap-8'
        }, [
          e('button', {
            key: 'about-link',
            onClick: () => scrollToSection('about-section'),
            className: 'text-white/90 hover:text-white font-medium transition-colors'
          }, 'About Us'),
          e('button', {
            key: 'mentors-link',
            onClick: () => navigate('mentors'),
            className: 'text-white/90 hover:text-white font-medium transition-colors'
          }, 'Find Mentors'),
          e('button', {
            key: 'contact-link',
            onClick: () => scrollToSection('contact-section'),
            className: 'text-white/90 hover:text-white font-medium transition-colors'
          }, 'Contact'),
          e('div', {
            key: 'auth-buttons',
            className: 'flex items-center gap-3 ml-4'
          }, user ? [
            e('div', {
              key: 'user-info',
              className: 'flex items-center gap-3'
            }, [
              e('span', {
                key: 'welcome',
                className: 'text-white/90 font-medium'
              }, `Welcome, ${user.firstName || user.username}!`),
              e('button', {
                key: 'dashboard-btn',
                onClick: () => {
                  if (typeof window.navigate === 'function') {
                    window.navigate('dashboard');
                  } else {
                    window.location.hash = 'dashboard';
                  }
                },
                className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl'
              }, 'Dashboard')
            ])
          ] : [
            e('button', {
              key: 'sign-in',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signin');
                } else {
                  window.location.hash = 'signin';
                }
              },
              className: 'text-white/90 hover:text-white font-medium px-4 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all'
            }, 'Sign In'),
            e('button', {
              key: 'get-started',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signup');
                } else {
                  window.location.hash = 'signup';
                }
              },
              className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl'
            }, 'Get Started')
          ])
        ]),

        // Mobile Menu Button
        e('button', {
          key: 'mobile-menu-btn',
          onClick: () => setIsMenuOpen(!isMenuOpen),
          className: 'md:hidden text-white p-2'
        }, [
          e('svg', {
            key: 'menu-icon',
            className: 'w-6 h-6',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          }, [
            e('path', {
              key: 'menu-path',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'
            })
          ])
        ])
      ]),

      // Mobile Menu
      isMenuOpen && e('div', {
        key: 'mobile-menu',
        className: 'md:hidden mt-4 py-4 border-t border-white/20'
      }, [
        e('div', {
          key: 'mobile-links',
          className: 'flex flex-col gap-4'
        }, [
          e('button', {
            key: 'mobile-about',
            onClick: () => scrollToSection('about-section'),
            className: 'text-white/90 hover:text-white font-medium text-left'
          }, 'About Us'),
          e('button', {
            key: 'mobile-contact',
            onClick: () => scrollToSection('contact-section'),
            className: 'text-white/90 hover:text-white font-medium text-left'
          }, 'Contact'),
          e('div', {
            key: 'mobile-auth',
            className: 'flex flex-col gap-2 mt-2'
          }, [
            e('button', {
              key: 'mobile-sign-in',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signin');
                } else {
                  window.location.hash = 'signin';
                }
              },
              className: 'text-white/90 hover:text-white font-medium px-4 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all text-center'
            }, 'Sign In'),
            e('button', {
              key: 'mobile-get-started',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signup');
                } else {
                  window.location.hash = 'signup';
                }
              },
              className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg text-center'
            }, 'Get Started')
          ])
        ])
      ])
    ])
  ]);
}

// Homepage Hero Section - Based on Reference Design
function HeroSection({ user }) {
  return e('section', { 
    className: 'relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 min-h-screen flex items-center justify-center overflow-hidden'
  }, [
    // Navigation Header
    e(NavigationHeader, { key: 'navigation', user }),
    
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
      className: 'container mx-auto px-4 sm:px-6 py-16 sm:py-20 relative z-10'
    }, [
      e('div', {
        key: 'content',
        className: 'text-center max-w-4xl mx-auto'
      }, [
        // Hero Content
        e('div', {
          key: 'hero-content',
          className: 'mb-8'
        }, [
          e('div', {
            key: 'hero-badge',
            className: 'inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6'
          }, [
            e('span', { key: 'dot', className: 'w-2 h-2 bg-green-400 rounded-full mr-2' }),
            'Trusted by 50,000+ immigrants worldwide'
          ])
        ]),
        
        // Main headline
        e('h1', { 
          key: 'headline',
          className: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 sm:mb-8 leading-tight'
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
          user ? 
            e('button', {
              key: 'dashboard',
              className: 'group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('dashboard');
                } else {
                  window.location.hash = 'dashboard';
                }
              }
            }, [
              'Go to Dashboard ',
              e('span', { key: 'arrow', className: 'inline-block transform group-hover:translate-x-1 transition-transform' }, '→')
            ]) :
            e('button', {
              key: 'primary',
              className: 'group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signin');
                } else {
                  window.location.hash = 'signin';
                }
              }
            }, [
              'Start Your Journey ',
              e('span', { key: 'arrow', className: 'inline-block transform group-hover:translate-x-1 transition-transform' }, '→')
            ]),
          e('button', {
            key: 'secondary',
            className: 'bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-full border border-white/30 transition-all duration-300 hover:border-white/50 hover:shadow-lg',
            onClick: () => scrollToSection('services-section')
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

  return e('section', { 
    id: 'services-section',
    className: 'py-24 bg-gradient-to-b from-gray-50 to-white' 
  }, [
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

// Meet Our Mentors Section
function MentorCarouselSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch('/api/mentors');
        if (response.ok) {
          const data = await response.json();
          setMentors(data);
        }
      } catch (error) {
        console.error('Error fetching mentors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (mentors.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % mentors.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [mentors.length]);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % mentors.length);
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + mentors.length) % mentors.length);
  };

  if (isLoading) {
    return e('section', {
      className: 'py-24 bg-gradient-to-b from-gray-900 to-gray-800'
    }, [
      e('div', { key: 'loading', className: 'text-center text-white' }, [
        e('div', { key: 'spinner', className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto' })
      ])
    ]);
  }

  if (mentors.length === 0) {
    return null;
  }

  return e('section', {
    className: 'py-24 bg-gradient-to-b from-gray-900 to-gray-800'
  }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      // Header
      e('div', { key: 'header', className: 'text-center mb-16' }, [
        e('div', {
          key: 'badge',
          className: 'inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-6'
        }, [
          e('span', { key: 'dot', className: 'w-2 h-2 bg-blue-500 rounded-full mr-2' }),
          'Expert Mentors'
        ]),
        e('h2', { 
          key: 'title',
          className: 'text-4xl md:text-5xl font-bold text-white mb-6'
        }, 'Meet Our Mentors'),
        e('p', { 
          key: 'subtitle',
          className: 'text-xl text-gray-300 max-w-2xl mx-auto'
        }, 'Connect with experienced immigration experts who have successfully navigated their own journeys')
      ]),

      // Carousel Container
      e('div', { key: 'carousel-container', className: 'relative max-w-6xl mx-auto' }, [
        // Carousel Track
        e('div', { 
          key: 'carousel-track',
          className: 'overflow-hidden rounded-2xl'
        }, [
          e('div', {
            key: 'carousel-wrapper',
            className: 'flex transition-transform duration-500 ease-in-out',
            style: { transform: `translateX(-${currentIndex * 100}%)` }
          }, mentors.map((mentor, index) =>
            e('div', {
              key: mentor.id,
              className: 'w-full flex-shrink-0 px-4'
            }, [
              e('div', {
                key: 'mentor-card',
                className: 'bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300'
              }, [
                // Mentor Content
                e('div', {
                  key: 'mentor-content',
                  className: 'flex flex-col md:flex-row items-center gap-8'
                }, [
                  // Mentor Image
                  e('div', {
                    key: 'mentor-image',
                    className: 'flex-shrink-0'
                  }, [
                    mentor.profilePicture ? 
                      e('img', {
                        key: 'mentor-photo',
                        src: mentor.profilePicture,
                        alt: `${mentor.firstName} ${mentor.lastName}`,
                        className: 'w-32 h-32 rounded-full object-cover border-4 border-blue-400 shadow-lg'
                      }) :
                      e('div', {
                        key: 'mentor-avatar',
                        className: 'w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg'
                      }, `${mentor.firstName?.[0] || ''}${mentor.lastName?.[0] || ''}`)
                  ]),
                  
                  // Mentor Info
                  e('div', {
                    key: 'mentor-info',
                    className: 'flex-1 text-center md:text-left'
                  }, [
                    // Name and Title
                    e('h3', {
                      key: 'mentor-name',
                      className: 'text-2xl font-bold text-white mb-2'
                    }, `${mentor.firstName || ''} ${mentor.lastName || ''}`),
                    e('p', {
                      key: 'mentor-specialty',
                      className: 'text-blue-400 font-medium mb-4'
                    }, mentor.specialty?.charAt(0).toUpperCase() + mentor.specialty?.slice(1) + ' Expert'),
                    
                    // Bio
                    e('p', {
                      key: 'mentor-bio',
                      className: 'text-gray-300 mb-6 leading-relaxed'
                    }, mentor.bio || 'Experienced immigration mentor ready to guide you through your journey.'),
                    
                    // Experience and Languages
                    e('div', {
                      key: 'mentor-details',
                      className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'
                    }, [
                      e('div', { key: 'experience' }, [
                        e('p', {
                          key: 'exp-label',
                          className: 'text-sm text-gray-400 mb-1'
                        }, 'Experience'),
                        e('p', {
                          key: 'exp-value',
                          className: 'text-white font-medium'
                        }, mentor.experience || 'Immigration Expert')
                      ]),
                      e('div', { key: 'languages' }, [
                        e('p', {
                          key: 'lang-label',
                          className: 'text-sm text-gray-400 mb-1'
                        }, 'Languages'),
                        e('p', {
                          key: 'lang-value',
                          className: 'text-white font-medium'
                        }, mentor.languages?.join(', ') || 'English')
                      ])
                    ]),
                    
                    // Action Button
                    e('button', {
                      key: 'book-session',
                      className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl',
                      onClick: () => {
                        // Navigate to mentor booking
                        window.location.hash = 'community';
                      }
                    }, 'Book a Session')
                  ])
                ])
              ])
            ])
          ))
        ]),
        
        // Navigation Arrows
        mentors.length > 1 && e('div', { key: 'navigation' }, [
          e('button', {
            key: 'prev-btn',
            onClick: prevSlide,
            className: 'absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg'
          }, [
            e('span', { key: 'prev-icon', className: 'text-white text-xl' }, '←')
          ]),
          e('button', {
            key: 'next-btn',
            onClick: nextSlide,
            className: 'absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 shadow-lg'
          }, [
            e('span', { key: 'next-icon', className: 'text-white text-xl' }, '→')
          ])
        ])
      ]),
      
      // Carousel Indicators
      mentors.length > 1 && e('div', {
        key: 'indicators',
        className: 'flex justify-center mt-8 gap-2'
      }, mentors.map((_, index) =>
        e('button', {
          key: index,
          onClick: () => setCurrentIndex(index),
          className: `w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentIndex ? 'bg-blue-500 scale-125' : 'bg-gray-400 hover:bg-gray-300'
          }`
        })
      ))
    ])
  ]);
}

// About Us Section
function AboutUsSection() {
  const stats = [
    { number: '50,000+', label: 'Successful Migrations', icon: '🎯' },
    { number: '180+', label: 'Countries Served', icon: '🌍' },
    { number: '95%', label: 'Success Rate', icon: '📈' },
    { number: '24/7', label: 'AI Support', icon: '🤖' }
  ];

  const values = [
    {
      title: 'Innovation',
      description: 'Leveraging cutting-edge AI technology to simplify complex immigration processes.',
      icon: '💡',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Integrity',
      description: 'Transparent, honest guidance with no hidden fees or false promises.',
      icon: '🤝',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Inclusivity',
      description: 'Supporting immigrants from all backgrounds with culturally sensitive assistance.',
      icon: '🌈',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  return e('section', {
    id: 'about-section',
    className: 'py-24 bg-gradient-to-b from-white to-blue-50'
  }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      // Header
      e('div', { key: 'header', className: 'text-center mb-16' }, [
        e('div', {
          key: 'badge',
          className: 'inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-6'
        }, [
          e('span', { key: 'dot', className: 'w-2 h-2 bg-blue-500 rounded-full mr-2' }),
          'About Cush'
        ]),
        e('h2', {
          key: 'title',
          className: 'text-4xl md:text-5xl font-bold text-gray-900 mb-6'
        }, 'Empowering Global Dreams'),
        e('p', {
          key: 'subtitle',
          className: 'text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed'
        }, 'Founded by immigrants for immigrants, Cush combines advanced AI technology with human expertise to make global mobility accessible, affordable, and achievable for everyone.')
      ]),

      // Stats
      e('div', {
        key: 'stats',
        className: 'grid grid-cols-2 md:grid-cols-4 gap-8 mb-20'
      }, stats.map((stat, index) =>
        e('div', {
          key: index,
          className: 'text-center bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow'
        }, [
          e('div', { key: 'icon', className: 'text-4xl mb-3' }, stat.icon),
          e('div', { key: 'number', className: 'text-3xl font-bold text-gray-900 mb-2' }, stat.number),
          e('div', { key: 'label', className: 'text-gray-600 font-medium' }, stat.label)
        ])
      )),

      // Mission Statement
      e('div', {
        key: 'mission',
        className: 'bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center mb-20'
      }, [
        e('h3', {
          key: 'mission-title',
          className: 'text-3xl font-bold mb-6'
        }, 'Our Mission'),
        e('p', {
          key: 'mission-text',
          className: 'text-xl leading-relaxed max-w-4xl mx-auto'
        }, 'To democratize global mobility by providing intelligent, comprehensive, and personalized immigration solutions that turn dreams of living abroad into reality, regardless of background or circumstance.')
      ]),

      // Values
      e('div', { key: 'values' }, [
        e('h3', {
          key: 'values-title',
          className: 'text-3xl font-bold text-gray-900 text-center mb-12'
        }, 'Our Core Values'),
        e('div', {
          key: 'values-grid',
          className: 'grid md:grid-cols-3 gap-8'
        }, values.map((value, index) =>
          e('div', {
            key: index,
            className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2'
          }, [
            e('div', {
              key: 'value-icon',
              className: `w-16 h-16 bg-gradient-to-r ${value.gradient} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg`
            }, value.icon),
            e('h4', {
              key: 'value-title',
              className: 'text-xl font-bold text-gray-900 mb-4'
            }, value.title),
            e('p', {
              key: 'value-desc',
              className: 'text-gray-600 leading-relaxed'
            }, value.description)
          ])
        ))
      ])
    ])
  ]);
}

// Contact Section
function ContactSection() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      alert('Thank you for your message! We\'ll get back to you within 24 hours.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

  const contactMethods = [
    {
      title: 'Email Support',
      description: 'Get personalized assistance from our expert team',
      contact: 'support@cush.com',
      icon: '📧',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Live Chat',
      description: 'Chat with Imisi 2.0 AI or request human assistance',
      contact: 'Available 24/7',
      icon: '💬',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Phone Support',
      description: 'Speak directly with our immigration experts',
      contact: '+1 (555) 123-CUSH',
      icon: '📞',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const socialMediaHandles = [
    {
      platform: 'TikTok',
      handle: '@wearecush',
      icon: '🎵',
      color: 'from-pink-500 to-rose-500',
      url: 'https://tiktok.com/@wearecush'
    },
    {
      platform: 'LinkedIn',
      handle: '@wearecush',
      icon: '💼',
      color: 'from-blue-600 to-blue-700',
      url: 'https://linkedin.com/company/wearecush'
    },
    {
      platform: 'Instagram',
      handle: '@wearecush',
      icon: '📸',
      color: 'from-pink-500 to-purple-600',
      url: 'https://instagram.com/wearecush'
    }
  ];

  return e('section', {
    id: 'contact-section',
    className: 'py-24 bg-gray-900'
  }, [
    e('div', { key: 'container', className: 'container mx-auto px-6' }, [
      // Header
      e('div', { key: 'header', className: 'text-center mb-16' }, [
        e('h2', {
          key: 'title',
          className: 'text-4xl md:text-5xl font-bold text-white mb-6'
        }, 'Get in Touch'),
        e('p', {
          key: 'subtitle',
          className: 'text-xl text-gray-300 max-w-2xl mx-auto'
        }, 'Have questions about your immigration journey? Our team of experts is here to help you every step of the way.')
      ]),

      e('div', {
        key: 'content',
        className: 'grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto'
      }, [
        // Contact Methods
        e('div', { key: 'contact-methods' }, [
          e('h3', {
            key: 'methods-title',
            className: 'text-2xl font-bold text-white mb-8'
          }, 'Contact Methods'),
          e('div', {
            key: 'methods-grid',
            className: 'space-y-6 mb-12'
          }, contactMethods.map((method, index) =>
            e('div', {
              key: index,
              className: 'bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all'
            }, [
              e('div', {
                key: 'method-header',
                className: 'flex items-center gap-4 mb-4'
              }, [
                e('div', {
                  key: 'method-icon',
                  className: `w-12 h-12 bg-gradient-to-r ${method.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`
                }, method.icon),
                e('div', { key: 'method-info' }, [
                  e('h4', {
                    key: 'method-title',
                    className: 'text-lg font-semibold text-white'
                  }, method.title),
                  e('p', {
                    key: 'method-desc',
                    className: 'text-gray-300 text-sm'
                  }, method.description)
                ])
              ]),
              e('p', {
                key: 'method-contact',
                className: 'text-blue-400 font-medium pl-16'
              }, method.contact)
            ])
          )),
          
          // Social Media Section
          e('div', { key: 'social-media' }, [
            e('h3', {
              key: 'social-title',
              className: 'text-lg font-bold text-white mb-4'
            }, 'Follow Us'),
            e('div', {
              key: 'social-grid',
              className: 'flex flex-wrap gap-2'
            }, socialMediaHandles.map((social, index) =>
              e('a', {
                key: index,
                href: social.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer flex items-center gap-2'
              }, [
                e('div', {
                  key: 'social-icon',
                  className: `w-6 h-6 bg-gradient-to-r ${social.color} rounded flex items-center justify-center text-sm shadow-lg`
                }, social.icon),
                e('span', {
                  key: 'social-handle',
                  className: 'text-white text-sm font-medium'
                }, social.handle)
              ])
            ))
          ])
        ]),

        // Contact Form
        e('div', { key: 'contact-form' }, [
          e('h3', {
            key: 'form-title',
            className: 'text-2xl font-bold text-white mb-8'
          }, 'Send us a Message'),
          e('form', {
            key: 'form',
            onSubmit: handleSubmit,
            className: 'space-y-6'
          }, [
            e('div', {
              key: 'name-email-row',
              className: 'grid md:grid-cols-2 gap-4'
            }, [
              e('div', { key: 'name-field' }, [
                e('label', {
                  key: 'name-label',
                  className: 'block text-sm font-medium text-gray-300 mb-2'
                }, 'Full Name'),
                e('input', {
                  key: 'name-input',
                  type: 'text',
                  value: contactForm.name,
                  onChange: (e) => setContactForm({ ...contactForm, name: e.target.value }),
                  required: true,
                  className: 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm',
                  placeholder: 'Enter your full name'
                })
              ]),
              e('div', { key: 'email-field' }, [
                e('label', {
                  key: 'email-label',
                  className: 'block text-sm font-medium text-gray-300 mb-2'
                }, 'Email Address'),
                e('input', {
                  key: 'email-input',
                  type: 'email',
                  value: contactForm.email,
                  onChange: (e) => setContactForm({ ...contactForm, email: e.target.value }),
                  required: true,
                  className: 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm',
                  placeholder: 'Enter your email'
                })
              ])
            ]),
            e('div', { key: 'subject-field' }, [
              e('label', {
                key: 'subject-label',
                className: 'block text-sm font-medium text-gray-300 mb-2'
              }, 'Subject'),
              e('input', {
                key: 'subject-input',
                type: 'text',
                value: contactForm.subject,
                onChange: (e) => setContactForm({ ...contactForm, subject: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm',
                placeholder: 'What can we help you with?'
              })
            ]),
            e('div', { key: 'message-field' }, [
              e('label', {
                key: 'message-label',
                className: 'block text-sm font-medium text-gray-300 mb-2'
              }, 'Message'),
              e('textarea', {
                key: 'message-input',
                value: contactForm.message,
                onChange: (e) => setContactForm({ ...contactForm, message: e.target.value }),
                required: true,
                rows: 5,
                className: 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm resize-none',
                placeholder: 'Tell us more about your immigration goals and how we can help...'
              })
            ]),
            e('button', {
              key: 'submit-btn',
              type: 'submit',
              disabled: isSubmitting,
              className: `w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl ${isSubmitting ? 'cursor-not-allowed' : ''}`
            }, isSubmitting ? 'Sending...' : 'Send Message')
          ])
        ])
      ])
    ])
  ]);
}

// Modern Sign In Page with Firebase Authentication
function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    address: '', 
    country: '', 
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testCredentials, setTestCredentials] = useState(null);
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  const [authError, setAuthError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  // Client-side validation function
  const validateCredentials = (email, password) => {
    const errors = {};
    
    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    return errors;
  };

  useEffect(() => {
    // Check for OAuth errors in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const details = urlParams.get('details');
    
    if (error === 'oauth_failed') {
      setOauthError(details || 'Google sign-in failed. Please try again.');
      // Clear the error from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    fetch('/api/test-credentials')
      .then(res => res.ok ? res.json() : null)
      .then(data => setTestCredentials(data))
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('handleLogin called');
    
    // Track login attempt
    if (window.trackFormSubmission) {
      window.trackFormSubmission('login_form', 'authentication', false);
    }
    
    setLoading(true);
    setAuthError('');
    setValidationErrors({});
    setSuccessMessage('');
    
    // Client-side validation
    const errors = validateCredentials(loginForm.email, loginForm.password);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }
    
    // Check if this is a test account that should use backend auth
    const isTestAccount = loginForm.email.includes('@cush.com');
    
    if (isTestAccount) {
      // Use backend authentication for test accounts
      try {
        console.log('Using backend authentication for test account:', loginForm.email);
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: loginForm.email,
            password: loginForm.password
          }),
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Backend login successful:', userData.email);
          
          // Set user in global state
          setUser(userData);
          
          // Track successful email sign-in
          if (window.trackAuthEvent) {
            window.trackAuthEvent('email', 'sign_in');
          }
          
          // Show success message briefly
          setSuccessMessage('Successfully signed in!');
          
          // Force redirect to dashboard after successful login
          console.log('Login successful, redirecting to dashboard');
          setTimeout(() => {
            window.location.hash = 'dashboard';
          }, 1000);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Login failed');
        }
      } catch (error) {
        console.error('Backend login error:', error);
        setAuthError(error.message || 'Authentication failed');
      }
    } else {
      // Use Firebase authentication for regular accounts
      try {
        // Wait for Firebase to be initialized
        if (!window.firebaseAuth) {
          console.log('Waiting for Firebase to initialize...');
          await new Promise((resolve) => {
            const checkFirebase = () => {
              if (window.firebaseAuth) {
                console.log('Firebase is ready');
                resolve();
              } else {
                setTimeout(checkFirebase, 100);
              }
            };
            checkFirebase();
          });
        }
        
        console.log('Attempting to sign in with Firebase:', loginForm.email);
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const userCredential = await signInWithEmailAndPassword(
          window.firebaseAuth, 
          loginForm.email, 
          loginForm.password
        );
        
        // Get the user info
        const user = userCredential.user;
        console.log('Firebase login successful:', user.email);
        
        // Track successful Firebase sign-in
        if (window.trackAuthEvent) {
          window.trackAuthEvent('email', 'firebase_sign_in');
        }
        
        // Create/update user in our backend
        const syncResponse = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          }),
        });
        
        if (syncResponse.ok) {
          // Show success message and redirect
          setAuthError('');
          setSuccessMessage('✅ Successfully signed in! Welcome back to CushGlobal!');
          
          // Force redirect to dashboard after successful login
          console.log('Login successful, redirecting to dashboard');
          setTimeout(() => {
            window.location.hash = 'dashboard';
            window.location.reload(); // Force reload to ensure proper state
          }, 1500);
        } else {
          const errorData = await syncResponse.json();
          throw new Error(errorData.error || 'Failed to sync user with backend');
        }
      } catch (error) {
        console.error('Firebase login error:', error);
        setAuthError(window.getEnhancedFirebaseErrorMessage ? window.getEnhancedFirebaseErrorMessage(error) : (error.message || 'An error occurred during sign-up.'));
      }
    }
    
    setLoading(false);
  };

  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      // Modern Firebase error codes (with email enumeration protection)
      case 'auth/invalid-credential':
      case 'INVALID_LOGIN_CREDENTIALS':
        return 'Invalid email or password. Please check your credentials and try again.';
      
      // Legacy error codes (when enumeration protection is disabled)
      case 'auth/user-not-found':
        return 'No account found with this email address. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      
      // Account creation errors
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      
      // Email and format errors
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/invalid-action-code':
        return 'Invalid or expired verification code.';
      case 'auth/expired-action-code':
        return 'Verification code has expired. Please request a new one.';
      
      // Rate limiting and network errors
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      
      // Account status errors
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      
      // OAuth and social sign-in errors
      case 'auth/account-exists-with-different-credential':
        return 'An account with this email already exists with a different sign-in method.';
      case 'auth/credential-already-in-use':
        return 'This credential is already associated with a different account.';
      
      // Default fallback
      default:
        console.error('Unknown Firebase error:', error);
        return 'Authentication failed. Please try again or contact support.';
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    console.log('Enhanced handleSignUp called');
    setLoading(true);
    setAuthError('');
    setSignupSuccess('');
    
    try {
      // Use the enhanced email sign-up function
      await window.enhancedEmailSignUp({
        email: signupForm.email,
        password: signupForm.password,
        confirmPassword: signupForm.confirmPassword,
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        address: signupForm.address,
        country: signupForm.country,
        phone: signupForm.phone,
        agreeToTerms: signupForm.agreeToTerms
      });
      
      // Success - the enhanced function handles success messaging and redirect
    } catch (error) {
      console.error('Enhanced signup error:', error);
      setAuthError(error.message || 'An error occurred during sign-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const useTestAccount = (credentials) => {
    setLoginForm({ email: credentials.email, password: credentials.password });
  };

  const showPrivacyPolicy = () => {
    setShowPrivacyModal(true);
  };

  const showTermsOfService = () => {
    setShowTermsModal(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      await sendPasswordResetEmail(window.firebaseAuth, resetEmail);
      
      setResetSuccess('Password reset instructions have been sent to your email.');
      setResetEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setResetError(getFirebaseErrorMessage(error));
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Simple wrapper to call the default Firebase popup
    setLoading(true);
    setAuthError('');
    
    try {
      await window.simpleGoogleSignIn();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setAuthError(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return e('div', {
    className: 'min-h-screen bg-gray-50 flex'
  }, [
    // Left side - Image and Branding (inspired by Vesti design)
    e('div', {
      key: 'left-side',
      className: 'hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 relative overflow-hidden'
    }, [
      // Background image overlay
      e('div', {
        key: 'image-overlay',
        className: 'absolute inset-0 bg-black/40'
      }),
      
      // User image (using the smiling person from assets)
      e('div', {
        key: 'user-image',
        className: 'absolute inset-0 flex items-center justify-center opacity-30'
      }, [
        e('img', {
          key: 'person-img',
          src: '/attached_assets/guy smiling2_1751497479944.jpg',
          alt: 'Happy User',
          className: 'w-full h-full object-cover'
        })
      ]),

      // Content overlay
      e('div', {
        key: 'content-overlay',
        className: 'relative z-10 flex flex-col justify-between p-12 text-white'
      }, [
        // Logo
        e('div', {
          key: 'logo',
          className: 'flex items-center'
        }, [
          e('img', {
            key: 'logo-img',
            src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
            alt: 'Cush Logo',
            className: 'h-10 w-auto'
          })
        ]),

        // Main content
        e('div', {
          key: 'main-content',
          className: 'flex-1 flex flex-col justify-center'
        }, [
          // Stats cards (inspired by Vesti)
          e('div', {
            key: 'stats-section',
            className: 'mb-8'
          }, [
            e('div', {
              key: 'savings-card',
              className: 'bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-4 border border-white/20'
            }, [
              e('div', {
                key: 'total-savings',
                className: 'text-sm text-blue-200 mb-2'
              }, 'GLOBAL OPPORTUNITIES'),
              e('div', {
                key: 'amount',
                className: 'text-3xl font-bold text-white mb-1'
              }, '2,500+'),
              e('div', {
                key: 'description',
                className: 'text-blue-100 text-sm'
              }, 'Immigration pathways available')
            ]),
            
            e('div', {
              key: 'flex-card',
              className: 'bg-green-600/80 backdrop-blur-lg rounded-2xl p-4 border border-green-400/20'
            }, [
              e('div', {
                key: 'flex-label',
                className: 'text-sm text-green-100 mb-1'
              }, 'SUCCESS RATE'),
              e('div', {
                key: 'flex-amount',
                className: 'text-2xl font-bold text-white'
              }, '94%'),
              e('div', {
                key: 'flex-desc',
                className: 'text-green-100 text-xs'
              }, 'Successful relocations')
            ])
          ]),

          e('h1', {
            key: 'title',
            className: 'text-4xl font-bold mb-4'
          }, 'Your Global Future Starts Here'),
          
          e('p', {
            key: 'subtitle',
            className: 'text-xl text-blue-100 leading-relaxed'
          }, 'Join thousands who\'ve successfully relocated with our AI-powered immigration platform and financial services.')
        ]),

        // Footer text
        e('div', {
          key: 'footer-text',
          className: 'text-sm text-blue-200'
        }, 'Trusted by immigrants worldwide for seamless relocation')
      ])
    ]),

    // Right side - Auth Form
    e('div', {
      key: 'right-side',
      className: 'w-full lg:w-1/2 flex items-center justify-center p-8'
    }, [
      e('div', {
        key: 'form-container',
        className: 'w-full max-w-md'
      }, [
        // Mobile logo
        e('div', {
          key: 'mobile-logo',
          className: 'lg:hidden text-center mb-8'
        }, [
          e('img', {
            key: 'mobile-logo-img',
            src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
            alt: 'Cush Logo',
            className: 'h-8 w-auto mx-auto mb-4'
          }),
          e('button', {
            key: 'back-home',
            onClick: () => {
              if (typeof window.navigate === 'function') {
                window.navigate('home');
              } else {
                window.location.hash = 'home';
              }
            },
            className: 'text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors'
          }, '← Back to Home')
        ]),

        // Form Header
        e('div', {
          key: 'form-header',
          className: 'text-center mb-8'
        }, [
          e('h2', {
            key: 'form-title',
            className: 'text-3xl font-bold text-gray-900 mb-2'
          }, isSignUp ? "Let's Get You Started" : 'Welcome Back'),
          
          e('p', {
            key: 'form-subtitle',
            className: 'text-gray-600'
          }, isSignUp 
            ? 'Input your details and let\'s help you unlock your global potential.'
            : 'Sign in to continue your immigration journey'
          )
        ]),

        // OAuth Error Alert
        oauthError && e('div', {
          key: 'oauth-error',
          className: 'mb-6 p-4 bg-red-50 border border-red-200 rounded-xl'
        }, [
          e('div', {
            key: 'error-content',
            className: 'flex items-start gap-3'
          }, [
            e('div', {
              key: 'error-icon',
              className: 'w-5 h-5 text-red-500 mt-0.5'
            }, '⚠️'),
            e('div', {
              key: 'error-message',
              className: 'flex-1'
            }, [
              e('h3', {
                key: 'error-title',
                className: 'text-sm font-semibold text-red-800 mb-1'
              }, 'Google Sign-in Failed'),
              e('p', {
                key: 'error-text',
                className: 'text-sm text-red-600'
              }, oauthError),
              e('p', {
                key: 'error-help',
                className: 'text-xs text-red-500 mt-1'
              }, 'Please try again or use email/password login.')
            ]),
            e('button', {
              key: 'dismiss-error',
              onClick: () => setOauthError(null),
              className: 'text-red-400 hover:text-red-600 transition-colors'
            }, '×')
          ])
        ]),

        // Auth Error Alert
        authError && e('div', {
          key: 'auth-error',
          className: 'mb-6 p-4 bg-red-50 border border-red-200 rounded-xl'
        }, [
          e('div', {
            key: 'error-content',
            className: 'flex items-start gap-3'
          }, [
            e('div', {
              key: 'error-icon',
              className: 'w-5 h-5 text-red-500 mt-0.5'
            }, '⚠️'),
            e('div', {
              key: 'error-message',
              className: 'flex-1'
            }, [
              e('h3', {
                key: 'error-title',
                className: 'text-sm font-semibold text-red-800 mb-1'
              }, 'Authentication Error'),
              e('p', {
                key: 'error-text',
                className: 'text-sm text-red-600 mb-2'
              }, authError),
              authError.includes('Invalid email or password') && e('p', {
                key: 'error-help',
                className: 'text-xs text-red-500'
              }, [
                'Don\'t have an account? ',
                e('button', {
                  key: 'signup-link',
                  onClick: () => {
                    setAuthError('');
                    setIsSignUp(true);
                  },
                  className: 'underline hover:text-red-700 font-medium'
                }, 'Create one here')
              ])
            ]),
            e('button', {
              key: 'dismiss-error',
              onClick: () => setAuthError(''),
              className: 'text-red-400 hover:text-red-600 transition-colors'
            }, '×')
          ])
        ]),

        // Success Message
        successMessage && e('div', {
          key: 'success-message',
          className: 'mb-6 p-4 bg-green-50 border border-green-200 rounded-xl'
        }, [
          e('div', {
            key: 'success-content',
            className: 'flex items-center gap-3'
          }, [
            e('div', {
              key: 'success-icon',
              className: 'w-5 h-5 text-green-500'
            }, '✓'),
            e('span', {
              key: 'success-text',
              className: 'text-green-800 font-medium'
            }, successMessage)
          ])
        ]),

        // Signup Success Message
        signupSuccess && e('div', {
          key: 'signup-success',
          className: 'mb-6 p-4 bg-green-50 border border-green-200 rounded-xl'
        }, [
          e('div', {
            key: 'success-content',
            className: 'flex items-center gap-3'
          }, [
            e('div', {
              key: 'success-icon',
              className: 'w-5 h-5 text-green-500'
            }, '✓'),
            e('p', {
              key: 'success-text',
              className: 'text-sm text-green-600 font-medium'
            }, signupSuccess)
          ])
        ]),

        // Auth Form
        !isSignUp ? (
          // Sign In Form
          e('form', {
            key: 'signin-form',
            onSubmit: handleLogin,
            className: 'space-y-6'
          }, [
            e('div', { key: 'email-field' }, [
              e('input', {
                key: 'email-input',
                type: 'email',
                value: loginForm.email,
                onChange: (e) => setLoginForm({ ...loginForm, email: e.target.value }),
                required: true,
                className: `w-full px-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                  validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`,
                placeholder: 'ajitd@gmail.com'
              }),
              validationErrors.email && e('p', {
                key: 'email-error',
                className: 'mt-2 text-sm text-red-600'
              }, validationErrors.email)
            ]),
            
            e('div', { key: 'password-field' }, [
              e('input', {
                key: 'password-input',
                type: 'password',
                value: loginForm.password,
                onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
                required: true,
                className: `w-full px-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                  validationErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`,
                placeholder: 'Enter your password'
              }),
              validationErrors.password && e('p', {
                key: 'password-error',
                className: 'mt-2 text-sm text-red-600'
              }, validationErrors.password)
            ]),

            e('div', {
              key: 'forgot-password',
              className: 'text-left'
            }, [
              e('button', {
                key: 'forgot-link',
                type: 'button',
                onClick: () => setShowForgotPassword(true),
                className: 'text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors'
              }, 'Forgot Password? Reset here')
            ]),

            // Google Sign In Button
            e('div', {
              key: 'google-signin-section',
              className: 'space-y-4'
            }, [
              e('div', {
                key: 'divider',
                className: 'relative flex items-center'
              }, [
                e('div', {
                  key: 'divider-line',
                  className: 'flex-grow border-t border-gray-300'
                }),
                e('span', {
                  key: 'divider-text',
                  className: 'flex-shrink mx-4 text-gray-600 text-sm'
                }, 'or continue with'),
                e('div', {
                  key: 'divider-line-2',
                  className: 'flex-grow border-t border-gray-300'
                })
              ]),

              e('button', {
                key: 'google-signin-button',
                type: 'button',
                onClick: () => window.simpleGoogleSignIn(),
                disabled: loading,
                className: 'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 border-2 border-blue-500 hover:border-blue-600'
              }, [
                e('svg', {
                  key: 'google-icon',
                  className: 'w-5 h-5',
                  viewBox: '0 0 24 24'
                }, [
                  e('path', {
                    key: 'google-path',
                    fill: 'currentColor',
                    d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  }),
                  e('path', {
                    key: 'google-path2', 
                    fill: 'currentColor',
                    d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  }),
                  e('path', {
                    key: 'google-path3',
                    fill: 'currentColor', 
                    d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  }),
                  e('path', {
                    key: 'google-path4',
                    fill: 'currentColor',
                    d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  })
                ]),
                e('span', { key: 'google-text' }, 'Sign in with Google')
              ]),
              

            ]),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
              onClick: (e) => {
                console.log('Sign in button clicked');
                // Let form submission handle it
              },
              className: `w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${loading ? 'cursor-not-allowed' : ''}`
            }, loading ? 'Signing in...' : 'Continue'),

            e('div', {
              key: 'signup-link',
              className: 'text-center pt-4'
            }, [
              e('p', {
                key: 'signup-text',
                className: 'text-gray-600 text-sm'
              }, [
                "Are you new here? ",
                e('button', {
                  key: 'signup-button',
                  type: 'button',
                  onClick: () => window.navigate('signup'),
                  className: 'text-blue-600 font-medium hover:underline transition-all'
                }, 'Create account')
              ])
            ])
          ])
        ) : (
          // Sign Up Form
          e('form', {
            key: 'signup-form',
            onSubmit: handleSignUp,
            className: 'space-y-4'
          }, [
            // Name fields
            e('div', { key: 'name-fields', className: 'grid grid-cols-2 gap-4' }, [
              e('input', {
                key: 'firstname-input',
                type: 'text',
                value: signupForm.firstName,
                onChange: (e) => setSignupForm({ ...signupForm, firstName: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
                placeholder: 'Daniel'
              }),
              e('input', {
                key: 'lastname-input',
                type: 'text',
                value: signupForm.lastName,
                onChange: (e) => setSignupForm({ ...signupForm, lastName: e.target.value }),
                required: true,
                className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
                placeholder: 'Ajibola'
              })
            ]),

            // Info note
            e('div', {
              key: 'info-note',
              className: 'flex items-start gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg'
            }, [
              e('div', {
                key: 'info-icon',
                className: 'w-4 h-4 bg-green-500 rounded-full flex-shrink-0 mt-0.5'
              }),
              e('span', {
                key: 'info-text'
              }, 'Full Name should be exactly how it is written on your ID')
            ]),

            e('input', {
              key: 'email-input',
              type: 'email',
              value: signupForm.email,
              onChange: (e) => setSignupForm({ ...signupForm, email: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
              placeholder: 'johndoe@gmail.com'
            }),

            e('input', {
              key: 'address-input',
              type: 'text',
              value: signupForm.address,
              onChange: (e) => setSignupForm({ ...signupForm, address: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
              placeholder: 'Enter your Residential Address'
            }),

            // Country and Phone
            e('div', { key: 'country-phone', className: 'flex gap-3' }, [
              e('select', {
                key: 'country-select',
                value: signupForm.country,
                onChange: (e) => setSignupForm({ ...signupForm, country: e.target.value }),
                required: true,
                className: 'flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white'
              }, [
                e('option', { key: 'select-country', value: '' }, 'Select Country'),
                e('option', { key: 'ng', value: 'NG' }, '🇳🇬 Nigeria'),
                e('option', { key: 'ca', value: 'CA' }, '🇨🇦 Canada'),
                e('option', { key: 'us', value: 'US' }, '🇺🇸 United States'),
                e('option', { key: 'uk', value: 'UK' }, '🇬🇧 United Kingdom'),
                e('option', { key: 'au', value: 'AU' }, '🇦🇺 Australia'),
              ]),

              e('div', { key: 'phone-container', className: 'flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent' }, [
                e('div', { key: 'flag', className: 'pl-4 pr-2 text-gray-700 font-medium' }, '🇳🇬 +234'),
                e('input', {
                  key: 'phone-input',
                  type: 'tel',
                  value: signupForm.phone,
                  onChange: (e) => setSignupForm({ ...signupForm, phone: e.target.value }),
                  required: true,
                  className: 'flex-1 py-3 pr-4 border-0 focus:outline-none text-gray-900 placeholder-gray-500',
                  placeholder: '8012345678'
                })
              ])
            ]),

            e('input', {
              key: 'password-input',
              type: 'password',
              value: signupForm.password,
              onChange: (e) => setSignupForm({ ...signupForm, password: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
              placeholder: 'Create password'
            }),

            e('input', {
              key: 'confirm-password-input',
              type: 'password',
              value: signupForm.confirmPassword,
              onChange: (e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value }),
              required: true,
              className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
              placeholder: 'Confirm password'
            }),

            // Privacy Policy and Terms of Use Checkbox
            e('div', {
              key: 'legal-agreement',
              className: 'flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200'
            }, [
              e('input', {
                key: 'legal-checkbox',
                type: 'checkbox',
                id: 'legal-agreement',
                checked: signupForm.agreeToTerms || false,
                onChange: (e) => setSignupForm({ ...signupForm, agreeToTerms: e.target.checked }),
                required: true,
                className: 'mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2'
              }),
              e('label', {
                key: 'legal-label',
                htmlFor: 'legal-agreement',
                className: 'text-sm text-gray-700 leading-relaxed'
              }, [
                'I agree to the ',
                e('a', {
                  key: 'privacy-link',
                  href: '#',
                  onClick: (e) => {
                    e.preventDefault();
                    window.navigate('privacy');
                  },
                  className: 'text-blue-600 hover:text-blue-800 underline font-medium'
                }, 'Privacy Policy'),
                ' and ',
                e('a', {
                  key: 'terms-link',
                  href: '#',
                  onClick: (e) => {
                    e.preventDefault();
                    window.navigate('terms');
                  },
                  className: 'text-blue-600 hover:text-blue-800 underline font-medium'
                }, 'Terms of Service'),
                '. I understand that by creating an account, I consent to the collection and use of my information as described in these documents.'
              ])
            ]),

            // Google Sign Up Button
            e('div', {
              key: 'google-signup-section',
              className: 'space-y-4'
            }, [
              e('div', {
                key: 'divider',
                className: 'relative flex items-center'
              }, [
                e('div', {
                  key: 'divider-line',
                  className: 'flex-grow border-t border-gray-300'
                }),
                e('span', {
                  key: 'divider-text',
                  className: 'flex-shrink mx-4 text-gray-600 text-sm'
                }, 'or continue with'),
                e('div', {
                  key: 'divider-line-2',
                  className: 'flex-grow border-t border-gray-300'
                })
              ]),

              e('button', {
                key: 'google-signup-button',
                type: 'button',
                onClick: () => window.enhancedGoogleSignUp(),
                className: 'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 border-2 border-blue-500 hover:border-blue-600',
                disabled: loading
              }, [
                e('svg', {
                  key: 'google-icon',
                  className: 'w-5 h-5',
                  viewBox: '0 0 24 24'
                }, [
                  e('path', {
                    key: 'google-path',
                    fill: 'currentColor',
                    d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  }),
                  e('path', {
                    key: 'google-path2', 
                    fill: 'currentColor',
                    d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  }),
                  e('path', {
                    key: 'google-path3',
                    fill: 'currentColor', 
                    d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  }),
                  e('path', {
                    key: 'google-path4',
                    fill: 'currentColor',
                    d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  })
                ]),
                e('span', { key: 'google-text' }, 'Sign up with Google')
              ])
            ]),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading || !signupForm.agreeToTerms,
              onClick: (e) => {
                console.log('Create account button clicked');
                // Let form submission handle it
              },
              className: `w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${loading || !signupForm.agreeToTerms ? 'cursor-not-allowed opacity-60' : ''}`
            }, loading ? 'Creating Account...' : 'Create Account'),

            e('div', {
              key: 'signin-link',
              className: 'text-center pt-4'
            }, [
              e('p', {
                key: 'signin-text',
                className: 'text-gray-600 text-sm'
              }, [
                "Already have an account? ",
                e('button', {
                  key: 'signin-button',
                  type: 'button',
                  onClick: () => setIsSignUp(false),
                  className: 'text-blue-600 font-medium hover:underline transition-all'
                }, 'Sign in')
              ])
            ])
          ])
        ),
        
        // Test accounts (only for sign in)
        !isSignUp && testCredentials && e('div', {
          key: 'test-accounts',
          className: 'mt-8 pt-6 border-t border-gray-200'
        }, [
          e('button', {
            key: 'toggle-test',
            onClick: () => setShowTestAccounts(!showTestAccounts),
            className: 'w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors mb-4'
          }, showTestAccounts ? 'Hide Demo Accounts' : 'Use Demo Account'),
          
          showTestAccounts && testCredentials.testAccounts && e('div', { 
            key: 'test-list',
            className: 'space-y-2'
          }, testCredentials.testAccounts.map((account, index) =>
            e('button', {
              key: index,
              onClick: () => useTestAccount(account),
              className: 'block w-full p-3 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:shadow-md'
            }, [
              e('div', { key: 'email', className: 'font-medium text-gray-900' }, account.email),
              e('div', { key: 'role', className: 'text-gray-600 text-xs mt-1' }, `${account.role} - ${account.description}`)
            ])
          ))
        ])
      ]),

      // Privacy Policy Modal
      showPrivacyModal && e('div', {
        key: 'privacy-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowPrivacyModal(false);
          }
        }
      }, [
        e('div', {
          key: 'privacy-content',
          className: 'bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          e('div', {
            key: 'privacy-header',
            className: 'p-6 border-b border-gray-200'
          }, [
            e('div', {
              key: 'privacy-header-content',
              className: 'flex justify-between items-center'
            }, [
              e('h2', {
                key: 'privacy-title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Privacy Policy'),
              e('button', {
                key: 'close-privacy',
                onClick: () => setShowPrivacyModal(false),
                className: 'text-gray-400 hover:text-gray-600 text-2xl font-bold'
              }, '×')
            ])
          ]),
          e('div', {
            key: 'privacy-body',
            className: 'p-6'
          }, [
            e('div', {
              key: 'privacy-content-text',
              className: 'prose prose-blue max-w-none'
            }, [
              e('p', {
                key: 'effective-date',
                className: 'text-sm text-gray-600 mb-4'
              }, 'Effective Date: January 1, 2025'),
              
              e('h3', {
                key: 'section-1-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '1. Information We Collect'),
              
              e('p', {
                key: 'section-1-content',
                className: 'text-gray-700 mb-4'
              }, 'We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This may include your name, email address, phone number, address, and other contact information.'),
              
              e('h3', {
                key: 'section-2-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '2. How We Use Your Information'),
              
              e('p', {
                key: 'section-2-content',
                className: 'text-gray-700 mb-4'
              }, 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and promotional offers.'),
              
              e('h3', {
                key: 'section-3-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '3. Information Sharing'),
              
              e('p', {
                key: 'section-3-content',
                className: 'text-gray-700 mb-4'
              }, 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this Privacy Policy or as required by law.'),
              
              e('h3', {
                key: 'section-4-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '4. Data Security'),
              
              e('p', {
                key: 'section-4-content',
                className: 'text-gray-700 mb-4'
              }, 'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.'),
              
              e('h3', {
                key: 'section-5-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '5. Your Rights'),
              
              e('p', {
                key: 'section-5-content',
                className: 'text-gray-700 mb-4'
              }, 'You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us. To exercise these rights, please contact us at privacy@cush.com.'),
              
              e('h3', {
                key: 'section-6-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '6. Contact Us'),
              
              e('p', {
                key: 'section-6-content',
                className: 'text-gray-700 mb-4'
              }, 'If you have any questions about this Privacy Policy, please contact us at privacy@cush.com or through our customer support channels.')
            ])
          ])
        ])
      ]),

      // Terms of Service Modal
      showTermsModal && e('div', {
        key: 'terms-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowTermsModal(false);
          }
        }
      }, [
        e('div', {
          key: 'terms-content',
          className: 'bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          e('div', {
            key: 'terms-header',
            className: 'p-6 border-b border-gray-200'
          }, [
            e('div', {
              key: 'terms-header-content',
              className: 'flex justify-between items-center'
            }, [
              e('h2', {
                key: 'terms-title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Terms of Service'),
              e('button', {
                key: 'close-terms',
                onClick: () => setShowTermsModal(false),
                className: 'text-gray-400 hover:text-gray-600 text-2xl font-bold'
              }, '×')
            ])
          ]),
          e('div', {
            key: 'terms-body',
            className: 'p-6'
          }, [
            e('div', {
              key: 'terms-content-text',
              className: 'prose prose-blue max-w-none'
            }, [
              e('p', {
                key: 'terms-effective-date',
                className: 'text-sm text-gray-600 mb-4'
              }, 'Effective Date: January 1, 2025'),
              
              e('h3', {
                key: 'terms-section-1-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '1. Acceptance of Terms'),
              
              e('p', {
                key: 'terms-section-1-content',
                className: 'text-gray-700 mb-4'
              }, 'By accessing and using the Cush platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'),
              
              e('h3', {
                key: 'terms-section-2-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '2. Description of Service'),
              
              e('p', {
                key: 'terms-section-2-content',
                className: 'text-gray-700 mb-4'
              }, 'Cush provides a comprehensive immigration and financial services platform that includes AI-powered migration assistance, community features, financial analytics, and expert consultations.'),
              
              e('h3', {
                key: 'terms-section-3-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '3. User Account'),
              
              e('p', {
                key: 'terms-section-3-content',
                className: 'text-gray-700 mb-4'
              }, 'You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.'),
              
              e('h3', {
                key: 'terms-section-4-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '4. Prohibited Uses'),
              
              e('p', {
                key: 'terms-section-4-content',
                className: 'text-gray-700 mb-4'
              }, 'You may not use our service for any illegal or unauthorized purpose nor may you, in the use of the service, violate any laws in your jurisdiction including but not limited to copyright laws.'),
              
              e('h3', {
                key: 'terms-section-5-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '5. Service Modifications'),
              
              e('p', {
                key: 'terms-section-5-content',
                className: 'text-gray-700 mb-4'
              }, 'We reserve the right to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the service.'),
              
              e('h3', {
                key: 'terms-section-6-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '6. Disclaimer'),
              
              e('p', {
                key: 'terms-section-6-content',
                className: 'text-gray-700 mb-4'
              }, 'The information on this platform is provided on an "as is" basis. We disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.'),
              
              e('h3', {
                key: 'terms-section-7-title',
                className: 'text-lg font-semibold text-gray-900 mb-3'
              }, '7. Contact Information'),
              
              e('p', {
                key: 'terms-section-7-content',
                className: 'text-gray-700 mb-4'
              }, 'Questions about the Terms of Service should be sent to us at legal@cush.com or through our customer support channels.')
            ])
          ])
        ])
      ]),

      // Forgot Password Modal
      showForgotPassword && e('div', {
        key: 'forgot-password-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowForgotPassword(false);
            setResetError('');
            setResetSuccess('');
          }
        }
      }, [
        e('div', {
          key: 'modal-content',
          className: 'bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative'
        }, [
          e('button', {
            key: 'close-button',
            onClick: () => {
              setShowForgotPassword(false);
              setResetError('');
              setResetSuccess('');
            },
            className: 'absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl'
          }, '×'),
          
          e('div', {
            key: 'modal-header',
            className: 'text-center mb-8'
          }, [
            e('h2', {
              key: 'modal-title',
              className: 'text-2xl font-bold text-gray-900 mb-2'
            }, 'Reset Your Password'),
            e('p', {
              key: 'modal-subtitle',
              className: 'text-gray-600'
            }, 'Enter your email address and we\'ll send you a link to reset your password.')
          ]),
          
          e('form', {
            key: 'reset-form',
            onSubmit: handlePasswordReset,
            className: 'space-y-6'
          }, [
            e('div', {
              key: 'email-field',
              className: 'space-y-2'
            }, [
              e('label', {
                key: 'email-label',
                className: 'block text-sm font-medium text-gray-700'
              }, 'Email Address'),
              e('input', {
                key: 'email-input',
                type: 'email',
                value: resetEmail,
                onChange: (e) => setResetEmail(e.target.value),
                required: true,
                className: 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                placeholder: 'Enter your email address'
              })
            ]),
            
            resetError && e('div', {
              key: 'error-message',
              className: 'text-red-600 text-sm bg-red-50 p-3 rounded-lg'
            }, resetError),
            
            resetSuccess && e('div', {
              key: 'success-message',
              className: 'text-green-600 text-sm bg-green-50 p-3 rounded-lg'
            }, resetSuccess),
            
            e('div', {
              key: 'form-actions',
              className: 'flex gap-3'
            }, [
              e('button', {
                key: 'cancel-button',
                type: 'button',
                onClick: () => {
                  setShowForgotPassword(false);
                  setResetError('');
                  setResetSuccess('');
                },
                className: 'flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors'
              }, 'Cancel'),
              e('button', {
                key: 'submit-button',
                type: 'submit',
                disabled: resetLoading,
                className: 'flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-xl transition-colors'
              }, resetLoading ? 'Sending...' : 'Send Reset Link')
            ])
          ])
        ])
      ])
    ])
  ]);
}

// Modern Authentication Component (simplified for homepage)
function AuthComponent() {
  return e('section', {
    id: 'auth-section',
    className: 'py-24 bg-gradient-to-br from-blue-50 via-white to-purple-50'
  }, [
    e('div', { 
      key: 'container',
      className: 'container mx-auto px-6 text-center'
    }, [
      e('div', { 
        key: 'content',
        className: 'max-w-3xl mx-auto'
      }, [
        // Header
        e('div', { 
          key: 'header',
          className: 'mb-12'
        }, [
          e('h2', { 
            key: 'title',
            className: 'text-4xl md:text-5xl font-bold text-gray-900 mb-6'
          }, 'Ready to Begin?'),
          e('p', { 
            key: 'subtitle',
            className: 'text-xl text-gray-600 leading-relaxed'
          }, 'Join thousands of successful immigrants who have transformed their dreams into reality with Cush.')
        ]),

        // CTA Buttons
        e('div', {
          key: 'cta-buttons',
          className: 'flex flex-col sm:flex-row gap-4 justify-center items-center mb-12'
        }, [
          e('button', {
            key: 'get-started',
            onClick: () => {
              if (typeof window.navigate === 'function') {
                window.navigate('signup');
              } else {
                window.location.hash = 'signup';
              }
            },
            className: 'bg-blue-600 hover:bg-blue-700 text-white font-bold px-12 py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1'
          }, 'Get Started Now'),
          e('button', {
            key: 'sign-in',
            onClick: () => {
              if (typeof window.navigate === 'function') {
                window.navigate('signin');
              } else {
                window.location.hash = 'signin';
              }
            },
            className: 'border-2 border-white/60 text-white hover:bg-white/10 hover:border-white font-semibold px-12 py-4 rounded-xl transition-all duration-300'
          }, 'Sign In')
        ]),

        // Trust indicators
        e('div', {
          key: 'trust-indicators',
          className: 'grid grid-cols-2 md:grid-cols-4 gap-8 text-center'
        }, [
          { icon: '🔒', text: 'Bank-level Security' },
          { icon: '🌟', text: '5-Star Support' },
          { icon: '⚡', text: 'Instant Processing' },
          { icon: '✓', text: '99% Success Rate' }
        ].map((item, index) =>
          e('div', {
            key: index,
            className: 'flex flex-col items-center'
          }, [
            e('div', { key: 'icon', className: 'text-3xl mb-2' }, item.icon),
            e('p', { key: 'text', className: 'text-sm font-medium text-gray-700' }, item.text)
          ])
        ))
      ])
    ])
  ]);
}

// Simple Dashboard Component to avoid syntax errors
function Dashboard({ user, isInstalled, deferredPrompt, installPWA }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  


  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      if (response.ok) {
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user || !user.id) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      
      // Authenticate with user ID
      socket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'notification':
            // New notification received
            setNotifications(prev => [data.data, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              const notificationOptions = {
                body: data.data.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: data.data.type,
                requireInteraction: data.data.priority === 'critical',
                silent: false
              };
              
              // Add action buttons for actionable notifications
              if (data.data.actionRequired && data.data.actionUrl) {
                notificationOptions.actions = [{
                  action: 'open',
                  title: data.data.actionText || 'Take Action'
                }];
              }
              
              const notification = new Notification(data.data.title, notificationOptions);
              
              // Handle notification actions
              notification.onclick = () => {
                window.focus();
                if (data.data.actionUrl) {
                  window.location.hash = data.data.actionUrl.replace('/', '');
                }
                notification.close();
              };
              
              // Auto-close non-critical notifications
              if (data.data.priority !== 'critical') {
                setTimeout(() => notification.close(), 8000);
              }
            }
            break;
            
          case 'unread_count':
            // Update unread count
            setUnreadCount(data.data.count);
            break;
            
          case 'notification_list':
            // Update full notification list
            setNotifications(data.data);
            break;
            
          case 'authenticated':
            console.log('WebSocket authenticated successfully');
            break;
            
          case 'error':
            console.error('WebSocket error:', data.message);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      socket.close();
    };
  }, [user]);

  // Load dashboard data and notifications on component mount
  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    loadUnreadCount();
    
    // Refresh notifications every 30 seconds (fallback to polling)
    const interval = setInterval(() => {
      if (!wsConnected) {
        loadNotifications();
        loadUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [wsConnected]);

  const handleLogout = async () => {
    try {
      // Clear Firebase authentication first
      if (window.firebaseAuth) {
        try {
          const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          await signOut(window.firebaseAuth);
        } catch (firebaseError) {
          console.error('Firebase logout error:', firebaseError);
        }
      }
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      if (typeof window !== 'undefined') {
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Call backend logout endpoint
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Clear user state
      setUser(null);
      
      // Force redirect to homepage
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even on error
      setUser(null);
      window.location.href = '/';
    }
  };

  // Modern Sidebar Navigation Items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', view: 'dashboard' },
    { id: 'loans', label: 'Loans', icon: '💰', view: 'loans' },
    { id: 'railsr-pay', label: 'Cush Pay', icon: '💳', view: 'railsr-pay' },
    { id: 'credit-passport', label: 'Credit Passport', icon: '🛂', view: 'credit-passport' },
    { id: 'imisi', label: 'Imisi AI', icon: '🤖', view: 'imisi' },
    { id: 'community', label: 'Community', icon: '🌍', view: 'community' },
    { id: 'bookings', label: 'My Bookings', icon: '📅', view: 'bookings' },
    { id: 'jobs', label: 'Local Jobs', icon: '💼', view: 'jobs' },
    { id: 'analytics', label: 'Analytics', icon: '📈', view: 'analytics' },
    { id: 'reports', label: 'Reports', icon: '📋', view: 'reports' },
    { id: 'help', label: 'Help & Support', icon: '❓', view: 'help' }
  ];

  // Account section items
  const accountItems = [
    { id: 'settings', label: 'Settings', icon: '⚙️', view: 'account' }
  ];

  return e('div', { className: 'bg-gray-50 flex min-h-screen' }, [
    // Custom CSS for sidebar enhancements
    e('style', { key: 'sidebar-styles' }, `
      .sidebar-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .sidebar-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(156, 163, 175, 0.3);
        border-radius: 2px;
      }
      .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(156, 163, 175, 0.5);
      }
      .nav-item-shadow {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      }
      .nav-item-shadow:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      }
      .active-nav-item {
        box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
      }
      .gradient-border {
        position: relative;
        overflow: hidden;
      }
      .gradient-border::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
        border-radius: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .gradient-border:hover::before {
        opacity: 1;
      }
    `),
    // Left Sidebar
    e('div', { 
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-72 sm:w-64 bg-white/95 backdrop-blur-sm shadow-xl border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:bg-white lg:backdrop-blur-none flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
    }, [
      // Sidebar Header
      e('div', { 
        key: 'sidebar-header',
        className: 'flex items-center justify-between px-6 py-5 border-b border-gray-100'
      }, [
        e('div', {
          key: 'logo-section',
          className: 'flex items-center gap-3'
        }, [
          e('div', {
            key: 'logo-circle',
            className: 'w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg'
          }, [
            e('span', {
              key: 'logo-text',
              className: 'text-white font-bold text-lg'
            }, 'C')
          ]),
          e('span', {
            key: 'brand-name',
            className: 'font-bold text-xl text-gray-900 tracking-tight'
          }, 'Cush')
        ]),
        // Mobile close button
        e('button', {
          key: 'close-sidebar',
          onClick: () => setSidebarOpen(false),
          className: 'lg:hidden text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors'
        }, '✕')
      ]),

      // User Profile Section
      e('div', {
        key: 'user-profile',
        className: 'px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100'
      }, [
        e('div', { 
          key: 'user-avatar',
          className: 'flex items-center gap-4'
        }, [
          e('div', {
            key: 'avatar-circle',
            className: 'w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-100'
          }, [
            user.profilePicture ? 
              e('img', {
                key: 'user-image',
                src: user.profilePicture,
                alt: 'User Avatar',
                className: 'w-10 h-10 rounded-lg object-cover'
              }) :
              e('div', {
                key: 'user-initials',
                className: 'w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-white font-bold text-sm'
              }, `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`)
          ]),
          e('div', { key: 'user-info' }, [
            e('div', {
              key: 'user-name',
              className: 'font-semibold text-sm text-gray-900'
            }, `${user?.firstName || 'User'} ${user?.lastName || ''}`),
            e('div', {
              key: 'user-status',
              className: 'text-xs text-gray-500 mt-0.5'
            }, 'Welcome back!')
          ])
        ])
      ]),

      // Navigation Menu - Allow natural content flow
      e('nav', { 
        key: 'navigation',
        className: 'flex-1 px-4 py-6 space-y-2 overflow-y-auto sidebar-scrollbar'
      }, [
        // Main navigation items
        sidebarItems.map(item => 
          e('button', {
            key: item.id,
            onClick: () => {
              setCurrentView(item.view);
              setSidebarOpen(false); // Close sidebar on mobile after selection
            },
            className: `group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden gradient-border ${
              currentView === item.view 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white active-nav-item scale-[1.02]' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 nav-item-shadow hover:scale-[1.01]'
            }`
          }, [
            e('span', { 
              key: 'icon', 
              className: `text-xl flex-shrink-0 transition-transform duration-200 ${
                currentView === item.view ? 'scale-110' : 'group-hover:scale-110'
              }`
            }, item.icon),
            e('span', { 
              key: 'label', 
              className: 'font-medium text-sm tracking-wide' 
            }, item.label),
            // Active indicator
            currentView === item.view && e('div', {
              key: 'active-indicator',
              className: 'absolute right-0 top-0 bottom-0 w-1 bg-white/30 rounded-l-full'
            })
          ])
        ),
        
        // Account section
        e('div', { key: 'account-section', className: 'mt-8 pt-6 border-t border-gray-100' }, [
          e('div', { key: 'account-header', className: 'px-4 pb-3' }, [
            e('span', { className: 'text-xs font-semibold text-gray-400 uppercase tracking-wider' }, 'Account')
          ]),
          accountItems.map(item => 
            e('button', {
              key: item.id,
              onClick: () => {
                setCurrentView(item.view);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              },
              className: `group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden gradient-border ${
                currentView === item.view 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white active-nav-item scale-[1.02]' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 nav-item-shadow hover:scale-[1.01]'
              }`
            }, [
              e('span', { 
                key: 'icon', 
                className: `text-xl flex-shrink-0 transition-transform duration-200 ${
                  currentView === item.view ? 'scale-110' : 'group-hover:scale-110'
                }`
              }, item.icon),
              e('span', { 
                key: 'label', 
                className: 'font-medium text-sm tracking-wide' 
              }, item.label),
              // Active indicator
              currentView === item.view && e('div', {
                key: 'active-indicator',
                className: 'absolute right-0 top-0 bottom-0 w-1 bg-white/30 rounded-l-full'
              })
            ])
          )
        ])
      ]),

      // Admin Panel & Logout - Fixed at bottom
      e('div', {
        key: 'sidebar-footer',
        className: 'px-4 py-4 border-t border-gray-100 space-y-2 flex-shrink-0'
      }, [
        // Show admin panel for admin users
        ...(user && user.role === 'admin' ? [
          e('button', {
            key: 'admin-panel',
            onClick: () => {
              setCurrentView('admin');
              setSidebarOpen(false);
            },
            className: 'group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden text-purple-600 hover:bg-purple-50 nav-item-shadow hover:scale-[1.01] gradient-border'
          }, [
            e('span', { 
              key: 'admin-icon', 
              className: 'text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110' 
            }, '🛡️'),
            e('span', { 
              key: 'admin-label', 
              className: 'font-medium text-sm tracking-wide' 
            }, 'Admin Panel')
          ])
        ] : []),
        e('button', {
          key: 'logout-btn',
          onClick: handleLogout,
          className: 'group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden text-red-600 hover:bg-red-50 nav-item-shadow hover:scale-[1.01] gradient-border'
        }, [
          e('span', { 
            key: 'logout-icon', 
            className: 'text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110' 
          }, '🚪'),
          e('span', { 
            key: 'logout-label', 
            className: 'font-medium text-sm tracking-wide' 
          }, 'Sign Out')
        ])
      ])
    ]),

    // Mobile Sidebar Overlay
    sidebarOpen && e('div', {
      key: 'sidebar-overlay',
      className: 'fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden',
      onClick: () => setSidebarOpen(false)
    }),

    // Main Content Area
    e('div', { 
      key: 'main-content',
      className: 'flex-1 lg:ml-0 flex flex-col min-h-screen w-full'
    }, [
      // Top Header Bar
      e('header', {
        key: 'header',
        className: 'bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30'
      }, [
        e('div', { 
          key: 'header-content',
          className: 'flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4'
        }, [
          e('div', {
            key: 'header-left',
            className: 'flex items-center gap-3 sm:gap-4'
          }, [
            // Mobile hamburger menu
            e('button', {
              key: 'mobile-menu',
              onClick: () => setSidebarOpen(!sidebarOpen),
              className: 'lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100'
            }, '☰'),
            e('h1', {
              key: 'page-title',
              className: 'text-lg sm:text-xl lg:text-2xl font-bold text-gray-900'
            }, currentView === 'dashboard' ? 'Dashboard' : 
               currentView === 'community' ? 'Community Hub' :
               currentView === 'bookings' ? 'My Bookings' :
               currentView === 'loans' ? 'Loans' :
               currentView === 'railsr-pay' ? 'Cush Pay' :
               currentView === 'credit-passport' ? 'Credit Passport' :
               currentView === 'imisi' ? 'Imisi AI Assistant' :
               currentView === 'jobs' ? 'Local Jobs' :
               currentView === 'admin' ? 'Admin Panel' :
               currentView === 'account' ? 'Account Settings' : 'Dashboard')
          ]),
          
          // Header Actions
          e('div', {
            key: 'header-actions',
            className: 'flex items-center gap-2 sm:gap-3 lg:gap-4'
          }, [
            e('div', {
              key: 'search-box',
              className: 'relative hidden md:block'
            }, [
              e('input', {
                key: 'search-input',
                type: 'text',
                placeholder: 'Search...',
                className: 'pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 lg:w-64'
              }),
              e('span', {
                key: 'search-icon',
                className: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              }, '🔍')
            ]),
            // PWA Install Button - Enhanced detection
            (() => {
              const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
              const isIOSStandalone = window.navigator.standalone === true;
              const isInstalledFlag = localStorage.getItem('pwa-installed') === 'true';
              const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
              const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
              const isAppMode = window.chrome && window.chrome.app && window.chrome.app.isInstalled;
              
              const isPWAInstalled = isStandalone || isIOSStandalone || isInstalledFlag || 
                                   isMinimalUI || isFullscreen || isAppMode;
              
              // Only show install button if not installed and we have a deferred prompt
              return (!isPWAInstalled && deferredPrompt) && e('button', {
                key: 'pwa-install',
                onClick: installPWA,
                className: 'hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors',
                title: 'Install Cush App'
              }, [
                e('span', { key: 'install-icon' }, '📱'),
                e('span', { key: 'install-text' }, 'Install')
              ]);
            })(),
            // Notification Bell
            e('div', {
              key: 'notification-container',
              className: 'relative'
            }, [
              e('button', {
                key: 'notification-btn',
                onClick: () => setNotificationsPanelOpen(!notificationsPanelOpen),
                className: 'relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
              }, [
                e('span', { key: 'bell-icon', className: 'text-xl' }, '🔔'),
                unreadCount > 0 && e('span', {
                  key: 'notification-badge',
                  className: `absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                    notifications.some(n => !n.read && n.priority === 'critical') ? 'bg-red-600 animate-pulse' : 
                    notifications.some(n => !n.read && n.priority === 'high') ? 'bg-orange-500' : 
                    'bg-blue-500'
                  }`
                }, unreadCount.toString()),
                // WebSocket connection indicator
                e('div', {
                  key: 'ws-indicator',
                  className: `absolute top-0 right-0 w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`,
                  title: wsConnected ? 'Real-time updates enabled' : 'Fallback to polling'
                })
              ]),
              
              // Notifications Panel
              notificationsPanelOpen && e('div', {
                key: 'notifications-panel',
                className: 'absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-w-screen-sm'
              }, [
                e('div', { 
                  key: 'panel-header',
                  className: 'px-4 py-3 border-b border-gray-200 flex items-center justify-between'
                }, [
                  e('h3', { key: 'panel-title', className: 'font-semibold text-gray-900' }, 'Notifications'),
                  e('button', {
                    key: 'close-panel',
                    onClick: () => setNotificationsPanelOpen(false),
                    className: 'text-gray-500 hover:text-gray-700'
                  }, '✕')
                ]),
                
                e('div', { 
                  key: 'notifications-list',
                  className: 'max-h-96 overflow-y-auto'
                }, [
                  notifications.length === 0 ? 
                    e('div', { 
                      key: 'no-notifications',
                      className: 'p-8 text-center text-gray-500'
                    }, 'No notifications yet') :
                    notifications.map((notification, index) => {
                      const getPriorityColor = (priority) => {
                        switch(priority) {
                          case 'critical': return 'border-l-red-500 bg-red-50';
                          case 'high': return 'border-l-orange-500 bg-orange-50';
                          case 'medium': return 'border-l-blue-500 bg-blue-50';
                          case 'low': return 'border-l-gray-500 bg-gray-50';
                          default: return 'border-l-gray-500 bg-gray-50';
                        }
                      };
                      
                      const getTypeIcon = (type) => {
                        switch(type) {
                          case 'loan': return '💰';
                          case 'payment': return '💳';
                          case 'security': return '🔐';
                          case 'credit': return '📊';
                          case 'investment': return '📈';
                          case 'migration': return '🌍';
                          case 'community': return '👥';
                          case 'achievement': return '🏆';
                          case 'financial': return '💹';
                          default: return '🔔';
                        }
                      };
                      
                      const priorityBadge = notification.priority === 'critical' ? 
                        e('span', { key: 'priority-badge', className: 'px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full' }, 'URGENT') :
                        notification.priority === 'high' ? 
                        e('span', { key: 'priority-badge', className: 'px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full' }, 'HIGH') :
                        null;
                      
                      return e('div', {
                        key: `notification-${notification.id}-${index}`,
                        className: `p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${!notification.read ? 'font-medium' : ''}`,
                        onClick: () => markAsRead(notification.id)
                      }, [
                        e('div', { key: 'notification-content', className: 'flex items-start gap-3' }, [
                          e('div', { key: 'notification-icon', className: 'text-xl flex-shrink-0' }, getTypeIcon(notification.type)),
                          e('div', { key: 'notification-text', className: 'flex-1 min-w-0' }, [
                            e('div', { key: 'notification-header', className: 'flex items-start justify-between gap-2 mb-1' }, [
                              e('h4', { key: 'notification-title', className: 'font-medium text-gray-900 text-sm flex-1' }, notification.title),
                              priorityBadge
                            ]),
                            e('p', { key: 'notification-message', className: 'text-gray-600 text-sm mt-1' }, notification.message),
                            e('div', { key: 'notification-footer', className: 'flex items-center justify-between mt-2' }, [
                              e('p', { key: 'notification-time', className: 'text-gray-400 text-xs' }, 
                                new Date(notification.createdAt).toLocaleString()),
                              notification.actionRequired && notification.actionUrl && 
                                e('button', {
                                  key: 'action-button',
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    window.location.hash = notification.actionUrl.replace('/', '');
                                  },
                                  className: 'px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors'
                                }, notification.actionText || 'Take Action')
                            ])
                          ])
                        ])
                      ]);
                    })
                ]),
                
                // Footer with actions
                notifications.length > 0 && e('div', {
                  key: 'panel-footer',
                  className: 'px-4 py-3 border-t border-gray-200 bg-gray-50'
                }, [
                  e('div', { key: 'footer-actions', className: 'flex items-center justify-between' }, [
                    e('button', {
                      key: 'test-alerts',
                      onClick: async () => {
                        try {
                          const response = await fetch('/api/notifications/test-critical-alerts', { method: 'POST' });
                          if (response.ok) {
                            loadNotifications();
                            loadUnreadCount();
                          }
                        } catch (error) {
                          console.error('Error creating test alerts:', error);
                        }
                      },
                      className: 'text-xs text-blue-600 hover:text-blue-800 font-medium'
                    }, 'Test Alerts'),
                    e('button', {
                      key: 'mark-all-read',
                      onClick: async () => {
                        try {
                          const response = await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
                          if (response.ok) {
                            loadNotifications();
                            loadUnreadCount();
                          }
                        } catch (error) {
                          console.error('Error marking all as read:', error);
                        }
                      },
                      className: 'text-xs text-gray-600 hover:text-gray-800 font-medium'
                    }, 'Mark All Read')
                  ])
                ])
              ])
            ]),
            
            e('button', {
              key: 'account-btn',
              onClick: () => setCurrentView('account'),
              className: 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base'
            }, 'Account')
          ])
        ])
      ]),

      // Dashboard Content
      e('main', {
        key: 'content',
        className: 'flex-1 p-4 sm:p-6 overflow-y-auto'
      }, [
        // Render different views based on currentView
        currentView === 'account' ? e(SettingsPage, { key: 'settings-page', user, onBack: () => setCurrentView('dashboard') }) : 
        currentView === 'admin' && user?.role === 'admin' ? e(AdminDashboard, { key: 'admin-dashboard', user, onBack: () => setCurrentView('dashboard') }) : 
        currentView === 'community' ? e(CommunityHub, { key: 'community-hub' }) :
        currentView === 'bookings' ? e(MyBookingsPage, { key: 'bookings-page', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'loans' ? e(LoansPage, { key: 'loans-page', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'railsr-pay' ? e(RailsrPayPage, { key: 'railsr-pay-page', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'credit-passport' ? e(CreditPassportPage, { key: 'credit-passport-page', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'help' ? e(HelpSupport, { key: 'help-support', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'mood-meter' ? e(FinancialMoodMeter, { key: 'mood-meter', onBack: () => setCurrentView('dashboard') }) :
        currentView === 'health-radar' ? e(FinancialHealthRadar, { key: 'health-radar', onBack: () => setCurrentView('dashboard') }) :
        // Modern Financial Dashboard
        e('div', { key: 'dashboard-content', className: 'space-y-4 sm:space-y-6 pb-8' }, [


          // Mobile-First Horizontal Carousel - Financial Overview Cards
          e('div', {
            key: 'overview-cards',
            className: 'mb-6 sm:mb-8'
          }, [
            // Carousel Container
            e('div', {
              key: 'carousel-container',
              className: 'overflow-x-auto scrollbar-hide'
            }, [
              e('div', {
                key: 'carousel-track',
                className: 'flex gap-4 pb-4 min-w-max'
              }, [
                // Total Balance Card with Trend
                e('div', {
                  key: 'total-balance',
                  className: 'bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-6 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 min-w-[280px] sm:min-w-[320px]'
                }, [
                  e('div', { key: 'balance-header', className: 'flex items-center justify-between mb-4' }, [
                    e('h3', { key: 'balance-title', className: 'text-blue-100 text-sm font-medium' }, 'Total Balance'),
                    e('div', { key: 'balance-icon', className: 'w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center' }, '💰')
                  ]),
                  e('div', { key: 'balance-amount', className: 'text-2xl sm:text-3xl font-bold mb-2' }, 
                    loading ? 'Loading...' : 
                    dashboardData ? `£${dashboardData.accounts.total.toFixed(2)}` : '£0.00'
                  ),
                  e('div', { key: 'balance-change', className: 'flex items-center text-blue-100 text-sm' }, [
                    e('span', { key: 'trend-icon', className: 'mr-1' }, '→'),
                    e('span', { key: 'trend-text' }, 'Start tracking your finances')
                  ]),
                  e('div', { key: 'balance-chart', className: 'mt-4' }, [
                    e('div', { key: 'mini-chart', className: 'h-2 bg-white/20 rounded-full overflow-hidden' }, [
                      e('div', { key: 'progress', className: 'h-full bg-white/40 rounded-full', style: { width: '65%' } })
                    ])
                  ])
                ]),
                
                // Enhanced Loans Card with Progress
                e('div', {
                  key: 'loans-card',
                  className: 'bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer min-w-[280px] sm:min-w-[320px]',
                  onClick: () => setCurrentView('loans')
                }, [
                  e('div', { key: 'loans-header', className: 'flex items-center justify-between mb-4' }, [
                    e('h3', { key: 'loans-title', className: 'text-gray-600 text-sm font-medium' }, 'Active Loans'),
                    e('div', { key: 'loans-icon', className: 'w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center' }, '💳')
                  ]),
                  e('div', { key: 'loans-amount', className: 'text-xl sm:text-2xl font-bold text-gray-900 mb-2' }, 
                    loading ? 'Loading...' : '£0.00'
                  ),
                  e('div', { key: 'loans-status', className: 'text-sm text-gray-500 mb-3' }, 'No active loans'),
                  e('div', { key: 'loan-progress', className: 'w-full bg-gray-200 rounded-full h-2 mb-2' }, [
                    e('div', { key: 'progress-bar', className: 'bg-orange-500 h-2 rounded-full transition-all duration-700', style: { width: '0%' } })
                  ]),
                  e('div', { key: 'progress-text', className: 'flex justify-between text-xs text-gray-500' }, [
                    e('span', { key: 'progress-left' }, '0% paid'),
                    e('span', { key: 'progress-right' }, 'Apply for a loan')
                  ])
                ]),
                
                // Enhanced Savings Card with Goal Progress
                e('div', {
                  key: 'savings-card',
                  className: 'bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 min-w-[280px] sm:min-w-[320px]'
                }, [
                  e('div', { key: 'savings-header', className: 'flex items-center justify-between mb-4' }, [
                    e('h3', { key: 'savings-title', className: 'text-gray-600 text-sm font-medium' }, 'Savings Goal'),
                    e('div', { key: 'savings-icon', className: 'w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center' }, '🎯')
                  ]),
                  e('div', { key: 'savings-amount', className: 'text-xl sm:text-2xl font-bold text-gray-900 mb-2' }, 
                    loading ? 'Loading...' : 
                    dashboardData ? `£${dashboardData.accounts.savings.toFixed(2)}` : '£0.00'
                  ),
                  e('div', { key: 'savings-target', className: 'text-sm text-gray-500 mb-3' }, 'Set a savings goal'),
                  e('div', { key: 'savings-progress', className: 'w-full bg-gray-200 rounded-full h-2 mb-2' }, [
                    e('div', { key: 'progress-bar', className: 'bg-green-500 h-2 rounded-full transition-all duration-700', style: { width: '0%' } })
                  ]),
                  e('div', { key: 'progress-text', className: 'flex justify-between text-xs text-gray-500' }, [
                    e('span', { key: 'progress-left' }, 'No goal set'),
                    e('span', { key: 'progress-right' }, 'Create your first goal')
                  ])
                ]),
                
                // Enhanced Investments Card with Performance
                e('div', {
                  key: 'investments-card',
                  className: 'bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 min-w-[280px] sm:min-w-[320px]'
                }, [
                  e('div', { key: 'investments-header', className: 'flex items-center justify-between mb-4' }, [
                    e('h3', { key: 'investments-title', className: 'text-gray-600 text-sm font-medium' }, 'Investments'),
                    e('div', { key: 'investments-icon', className: 'w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center' }, '📈')
                  ]),
                  e('div', { key: 'investments-amount', className: 'text-xl sm:text-2xl font-bold text-gray-900 mb-2' }, 
                    loading ? 'Loading...' : 
                    dashboardData ? `£${dashboardData.accounts.investment.toFixed(2)}` : '£0.00'
                  ),
                  e('div', { key: 'investments-change', className: 'flex items-center text-gray-600 text-sm mb-2' }, [
                    e('span', { key: 'trend-icon', className: 'mr-1' }, '→'),
                    e('span', { key: 'trend-text' }, 'Start investing')
                  ]),
                  e('div', { key: 'investment-chart', className: 'h-8 bg-gradient-to-r from-purple-200 to-purple-400 rounded-full flex items-center justify-end px-2' }, [
                    e('span', { key: 'chart-value', className: 'text-xs text-purple-800 font-medium' }, '+£924')
                  ])
                ])
              ])
            ])
          ]),

          // Quick Actions Section
          e('div', {
            key: 'quick-actions',
            className: 'mb-6 sm:mb-8'
          }, [
            e('h3', { key: 'actions-title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Quick Actions'),
            e('div', {
              key: 'actions-grid',
              className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4'
            }, [
              // Quick Action Buttons
              e('button', {
                key: 'action-loans',
                onClick: () => setCurrentView('loans'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-loans-icon', className: 'w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center' }, '💳'),
                e('span', { key: 'action-loans-text', className: 'text-xs font-medium text-gray-700' }, 'Apply Loan')
              ]),
              e('button', {
                key: 'action-community',
                onClick: () => setCurrentView('community'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-community-icon', className: 'w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center' }, '🌍'),
                e('span', { key: 'action-community-text', className: 'text-xs font-medium text-gray-700' }, 'Community')
              ]),
              e('button', {
                key: 'action-mood',
                onClick: () => setCurrentView('mood-meter'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-mood-icon', className: 'w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center' }, '😊'),
                e('span', { key: 'action-mood-text', className: 'text-xs font-medium text-gray-700' }, 'Mood Meter')
              ]),
              e('button', {
                key: 'action-health',
                onClick: () => setCurrentView('health-radar'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-health-icon', className: 'w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center' }, '💊'),
                e('span', { key: 'action-health-text', className: 'text-xs font-medium text-gray-700' }, 'Health Check')
              ]),
              e('button', {
                key: 'action-help',
                onClick: () => setCurrentView('help'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-help-icon', className: 'w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center' }, '❓'),
                e('span', { key: 'action-help-text', className: 'text-xs font-medium text-gray-700' }, 'Help')
              ]),
              e('button', {
                key: 'action-account',
                onClick: () => setCurrentView('account'),
                className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:bg-gray-50 flex flex-col items-center gap-2 min-h-[88px]'
              }, [
                e('div', { key: 'action-account-icon', className: 'w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center' }, '👤'),
                e('span', { key: 'action-account-text', className: 'text-xs font-medium text-gray-700' }, 'Account')
              ])
            ])
          ]),

          // Smart Recommendations Section
          e('div', {
            key: 'smart-recommendations',
            className: 'bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 mb-6 sm:mb-8'
          }, [
            e('h3', { key: 'recommendations-title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Smart Recommendations'),
            e('div', { key: 'recommendations-list', className: 'space-y-3' }, [
              e('div', { key: 'rec-1', className: 'p-3 bg-blue-50 rounded-lg' }, [
                e('div', { key: 'rec-1-header', className: 'flex items-center gap-2 mb-1' }, [
                  e('span', { key: 'rec-1-icon', className: 'text-blue-600' }, '💡'),
                  e('span', { key: 'rec-1-title', className: 'text-sm font-medium text-blue-900' }, 'Reduce Food Spending')
                ]),
                e('p', { key: 'rec-1-text', className: 'text-xs text-blue-700' }, 'You could save £85/month by cooking at home more often')
              ]),
              e('div', { key: 'rec-2', className: 'p-3 bg-green-50 rounded-lg' }, [
                e('div', { key: 'rec-2-header', className: 'flex items-center gap-2 mb-1' }, [
                  e('span', { key: 'rec-2-icon', className: 'text-green-600' }, '🎯'),
                  e('span', { key: 'rec-2-title', className: 'text-sm font-medium text-green-900' }, 'Increase Savings')
                ]),
                e('p', { key: 'rec-2-text', className: 'text-xs text-green-700' }, 'Set up automatic £200 monthly transfer to savings')
              ]),
              e('div', { key: 'rec-3', className: 'p-3 bg-purple-50 rounded-lg' }, [
                e('div', { key: 'rec-3-header', className: 'flex items-center gap-2 mb-1' }, [
                  e('span', { key: 'rec-3-icon', className: 'text-purple-600' }, '📈'),
                  e('span', { key: 'rec-3-title', className: 'text-sm font-medium text-purple-900' }, 'Investment Opportunity')
                ]),
                e('p', { key: 'rec-3-text', className: 'text-xs text-purple-700' }, 'Consider diversifying with index funds')
              ])
            ])
          ]),

          // Balance Trend Chart Section
          e('div', {
            key: 'balance-chart',
            className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 sm:mb-8'
          }, [
            e('h3', { key: 'chart-title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Balance Trend'),
            e('div', { key: 'chart-content', className: 'h-64 relative' }, [
              e('div', { key: 'chart-placeholder', className: 'h-full bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center' }, [
                e('div', { key: 'chart-visual', className: 'w-full h-full relative' }, [
                  // Simulated chart with SVG-like elements
                  e('div', { key: 'chart-line', className: 'absolute bottom-12 left-4 right-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full' }),
                  e('div', { key: 'chart-point-1', className: 'absolute bottom-8 left-8 w-3 h-3 bg-blue-500 rounded-full' }),
                  e('div', { key: 'chart-point-2', className: 'absolute bottom-16 left-1/3 w-3 h-3 bg-blue-500 rounded-full' }),
                  e('div', { key: 'chart-point-3', className: 'absolute bottom-20 left-2/3 w-3 h-3 bg-purple-500 rounded-full' }),
                  e('div', { key: 'chart-point-4', className: 'absolute bottom-12 right-8 w-3 h-3 bg-purple-500 rounded-full' }),
                  e('div', { key: 'chart-labels', className: 'absolute bottom-2 left-0 right-0 flex justify-between text-xs text-gray-500' }, [
                    e('span', { key: 'label-1' }, 'Jan'),
                    e('span', { key: 'label-2' }, 'Feb'),
                    e('span', { key: 'label-3' }, 'Mar'),
                    e('span', { key: 'label-4' }, 'Apr')
                  ])
                ])
              ])
            ])
          ]),

          // Financial Goals Section - Show only if user has goals
          dashboardData && dashboardData.financialGoals && dashboardData.financialGoals.length > 0 && e('div', {
            key: 'financial-goals',
            className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 sm:mb-8'
          }, [
            e('div', { key: 'goals-header', className: 'flex items-center justify-between mb-4' }, [
              e('h3', { key: 'goals-title', className: 'text-lg font-semibold text-gray-900' }, 'Financial Goals'),
              e('button', {
                key: 'add-goal',
                className: 'text-blue-600 hover:text-blue-800 text-sm font-medium'
              }, 'Add Goal →')
            ]),
            e('div', { key: 'goals-list', className: 'space-y-4' }, 
              dashboardData.financialGoals.map((goal, index) =>
                e('div', { key: `goal-${index}`, className: 'p-4 bg-blue-50 rounded-lg' }, [
                  e('div', { key: 'goal-header', className: 'flex items-center justify-between mb-2' }, [
                    e('h4', { key: 'goal-title', className: 'text-sm font-medium text-blue-900' }, goal.title),
                    e('span', { key: 'goal-progress', className: 'text-xs text-blue-700' }, `${goal.progress}% Complete`)
                  ]),
                  e('div', { key: 'goal-amounts', className: 'flex items-center justify-between text-sm text-blue-800 mb-2' }, [
                    e('span', { key: 'goal-current' }, `£${goal.currentAmount.toFixed(2)}`),
                    e('span', { key: 'goal-target' }, `£${goal.targetAmount.toFixed(2)}`)
                  ]),
                  e('div', { key: 'goal-bar', className: 'w-full bg-blue-200 rounded-full h-2' }, [
                    e('div', { key: 'goal-fill', className: 'bg-blue-600 h-2 rounded-full transition-all duration-700', style: { width: `${goal.progress}%` } })
                  ])
                ])
              )
            )
          ]),
            
          // Recent Transactions Section
          e('div', {
            key: 'recent-transactions',
            className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 sm:mb-8'
          }, [
            e('div', { key: 'transactions-header', className: 'flex items-center justify-between mb-4' }, [
              e('h3', { key: 'transactions-title', className: 'text-lg font-semibold text-gray-900' }, 'Recent Transactions'),
              e('button', {
                key: 'view-all',
                className: 'text-blue-600 hover:text-blue-800 text-sm font-medium'
              }, 'View All →')
            ]),
            e('div', { key: 'transactions-list', className: 'space-y-3' }, 
              !loading && dashboardData && dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0 ?
                dashboardData.recentTransactions.map((transaction, index) => {
                  const isPositive = transaction.amount > 0;
                  const icon = transaction.category === 'income' ? '💰' : 
                              transaction.category === 'food' ? '🍕' :
                              transaction.category === 'transport' ? '🚌' :
                              transaction.category === 'shopping' ? '🛍️' : '💳';
                  
                  return e('div', { 
                    key: `trans-${index}`, 
                    className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors' 
                  }, [
                    e('div', { key: 'trans-left', className: 'flex items-center gap-3' }, [
                      e('div', { key: 'trans-icon', className: `w-8 h-8 ${isPositive ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center` }, icon),
                      e('div', { key: 'trans-info' }, [
                        e('p', { key: 'trans-desc', className: 'text-sm font-medium text-gray-900' }, transaction.description),
                        e('p', { key: 'trans-time', className: 'text-xs text-gray-500' }, 
                          new Date(transaction.date).toLocaleDateString())
                      ])
                    ]),
                    e('div', { key: 'trans-right', className: 'text-right' }, [
                      e('p', { key: 'trans-amount', className: `text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}` }, 
                        `${isPositive ? '+' : ''}£${Math.abs(transaction.amount).toFixed(2)}`),
                      e('p', { key: 'trans-category', className: 'text-xs text-gray-500' }, transaction.category)
                    ])
                  ]);
                }) : [
                  e('div', { key: 'no-transactions', className: 'text-center py-8' }, [
                    e('div', { key: 'no-trans-icon', className: 'text-4xl mb-4' }, '📊'),
                    e('p', { key: 'no-trans-text', className: 'text-gray-500' }, 'No transactions yet'),
                    e('p', { key: 'no-trans-subtitle', className: 'text-sm text-gray-400' }, 'Your transaction history will appear here')
                  ])
                ]
            )
          ])
        ])
      ])
    ])
  ]);
}

// Credit Passport Component
const CreditPassportPage = ({ user, onBack }) => {
  const [creditStatus, setCreditStatus] = useState(null);
  const [creditProfile, setCreditProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNovaCreditLoading, setIsNovaCreditLoading] = useState(false);
  const [isAlternativeScoreLoading, setIsAlternativeScoreLoading] = useState(false);

  // Fetch credit passport status
  const fetchCreditStatus = async () => {
    try {
      const response = await fetch('/api/credit-passport/status', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch credit status');
      const data = await response.json();
      setCreditStatus(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch comprehensive credit profile
  const fetchCreditProfile = async () => {
    try {
      const response = await fetch('/api/credit-passport/profile', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch credit profile');
      const data = await response.json();
      setCreditProfile(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Initiate Nova Credit process
  const initiateNovaCreditProcess = async () => {
    setIsNovaCreditLoading(true);
    try {
      const response = await fetch('/api/credit-passport/nova-credit/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to initiate Nova Credit process');
      const data = await response.json();
      
      // Open Nova Credit redirect URL in new window
      window.open(data.redirectUrl, '_blank');
      
      // Refresh status after a short delay
      setTimeout(() => {
        fetchCreditStatus();
        fetchCreditProfile();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsNovaCreditLoading(false);
    }
  };

  // Calculate alternative data score
  const calculateAlternativeScore = async () => {
    setIsAlternativeScoreLoading(true);
    try {
      const response = await fetch('/api/credit-passport/lenddo-efl/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to calculate alternative score');
      const data = await response.json();
      
      // Refresh status and profile
      await fetchCreditStatus();
      await fetchCreditProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAlternativeScoreLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCreditStatus(), fetchCreditProfile()]);
      setIsLoading(false);
    };
    initializeData();
  }, []);

  if (isLoading) {
    return e('div', { className: 'flex items-center justify-center min-h-screen' }, [
      e('div', { className: 'text-center' }, [
        e('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4' }),
        e('p', { className: 'text-gray-600' }, 'Loading your Credit Passport...')
      ])
    ]);
  }

  if (error) {
    return e('div', { className: 'p-6 bg-red-50 border border-red-200 rounded-lg' }, [
      e('h3', { className: 'text-red-800 font-semibold mb-2' }, 'Error'),
      e('p', { className: 'text-red-600' }, error),
      e('button', {
        className: 'mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition',
        onClick: () => window.location.reload()
      }, 'Retry')
    ]);
  }

  const cushScore = creditProfile?.cushCreditScore?.cushCreditScore || 0;
  const scoreColor = cushScore >= 700 ? 'text-green-600' : 
                    cushScore >= 600 ? 'text-yellow-600' : 'text-red-600';

  return e('div', { className: 'space-y-6' }, [
    // Header Section
    e('div', { key: 'header', className: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg' }, [
      e('h1', { className: 'text-2xl font-bold mb-2' }, 'Cush Credit Passport'),
      e('p', { className: 'text-blue-100' }, 'Your comprehensive credit profile combining cross-border credit history, alternative data, and migration-specific factors.')
    ]),

    // Credit Score Overview
    e('div', { key: 'score-overview', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
      e('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6' }, [
        // Cush Credit Score
        e('div', { className: 'text-center' }, [
          e('h3', { className: 'text-lg font-semibold text-gray-800 mb-2' }, 'Cush Credit Score'),
          e('div', { className: `text-4xl font-bold ${scoreColor} mb-2` }, cushScore || 'N/A'),
          e('p', { className: 'text-sm text-gray-600' }, 'Range: 300-850')
        ]),
        
        // Nova Credit Score
        e('div', { className: 'text-center' }, [
          e('h3', { className: 'text-lg font-semibold text-gray-800 mb-2' }, 'Nova Credit Score'),
          e('div', { className: 'text-2xl font-bold text-gray-700 mb-2' }, creditStatus?.novaCreditScore || 'N/A'),
          e('p', { className: 'text-sm text-gray-600' }, 'Cross-border credit history')
        ]),
        
        // Alternative Data Score
        e('div', { className: 'text-center' }, [
          e('h3', { className: 'text-lg font-semibold text-gray-800 mb-2' }, 'Alternative Data Score'),
          e('div', { className: 'text-2xl font-bold text-gray-700 mb-2' }, creditStatus?.alternativeDataScore || 'N/A'),
          e('p', { className: 'text-sm text-gray-600' }, 'Employment & behavioral data')
        ])
      ])
    ]),

    // Action Cards
    e('div', { key: 'action-cards', className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
      // Nova Credit Card
      e('div', { className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
        e('div', { className: 'flex items-center mb-4' }, [
          e('div', { className: 'bg-blue-100 p-3 rounded-full mr-4' }, [
            e('span', { className: 'text-2xl' }, '🌍')
          ]),
          e('div', {}, [
            e('h3', { className: 'text-lg font-semibold text-gray-800' }, 'Nova Credit Verification'),
            e('p', { className: 'text-sm text-gray-600' }, 'Access your international credit history')
          ])
        ]),
        creditStatus?.status === 'not_started' ? 
          e('button', {
            className: 'w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50',
            onClick: initiateNovaCreditProcess,
            disabled: isNovaCreditLoading
          }, isNovaCreditLoading ? 'Initiating...' : 'Start Nova Credit Verification') :
          e('div', { className: 'text-center' }, [
            e('div', { className: 'text-green-600 font-semibold mb-2' }, `Status: ${creditStatus?.status || 'Unknown'}`),
            e('p', { className: 'text-sm text-gray-600' }, 'Verification completed')
          ])
      ]),

      // Alternative Data Card
      e('div', { className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
        e('div', { className: 'flex items-center mb-4' }, [
          e('div', { className: 'bg-green-100 p-3 rounded-full mr-4' }, [
            e('span', { className: 'text-2xl' }, '📊')
          ]),
          e('div', {}, [
            e('h3', { className: 'text-lg font-semibold text-gray-800' }, 'Alternative Data Scoring'),
            e('p', { className: 'text-sm text-gray-600' }, 'Employment and behavioral analysis')
          ])
        ]),
        creditStatus?.hasAlternativeData ? 
          e('div', { className: 'text-center' }, [
            e('div', { className: 'text-green-600 font-semibold mb-2' }, `Score: ${creditStatus?.alternativeDataScore || 'N/A'}`),
            e('p', { className: 'text-sm text-gray-600' }, 'Alternative data analyzed')
          ]) :
          e('button', {
            className: 'w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50',
            onClick: calculateAlternativeScore,
            disabled: isAlternativeScoreLoading
          }, isAlternativeScoreLoading ? 'Calculating...' : 'Calculate Alternative Score')
      ])
    ]),

    // Score Breakdown
    creditProfile?.cushCreditScore && e('div', { key: 'score-breakdown', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
      e('h3', { className: 'text-lg font-semibold text-gray-800 mb-4' }, 'Score Breakdown'),
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' }, [
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-blue-600' }, creditProfile.cushCreditScore.scoreBreakdown.crossBorderCreditHistory),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Cross-border Credit')
        ]),
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-green-600' }, creditProfile.cushCreditScore.scoreBreakdown.alternativeData),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Alternative Data')
        ]),
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-purple-600' }, creditProfile.cushCreditScore.scoreBreakdown.employmentStability),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Employment')
        ]),
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-yellow-600' }, creditProfile.cushCreditScore.scoreBreakdown.financialBehavior),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Financial Behavior')
        ]),
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-indigo-600' }, creditProfile.cushCreditScore.scoreBreakdown.migrationProfile),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Migration Profile')
        ]),
        e('div', { className: 'text-center p-4 bg-gray-50 rounded-lg' }, [
          e('div', { className: 'text-2xl font-bold text-pink-600' }, creditProfile.cushCreditScore.scoreBreakdown.platformEngagement),
          e('p', { className: 'text-sm text-gray-600 mt-1' }, 'Platform Engagement')
        ])
      ])
    ]),

    // Recommendations
    creditProfile?.cushCreditScore?.recommendations && e('div', { key: 'recommendations', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
      e('h3', { className: 'text-lg font-semibold text-gray-800 mb-4' }, 'Recommendations'),
      e('div', { className: 'space-y-3' }, creditProfile.cushCreditScore.recommendations.map((rec, index) =>
        e('div', { key: `rec-${index}`, className: 'flex items-start' }, [
          e('div', { className: 'flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 mr-3' }, [
            e('span', { className: 'text-blue-600 text-sm font-semibold' }, (index + 1).toString())
          ]),
          e('p', { className: 'text-gray-700' }, rec)
        ])
      ))
    ]),

    // Risk & Strength Factors
    creditProfile?.cushCreditScore && e('div', { key: 'factors', className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
      // Risk Factors
      e('div', { className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
        e('h3', { className: 'text-lg font-semibold text-red-600 mb-4' }, 'Risk Factors'),
        creditProfile.cushCreditScore.riskFactors.length > 0 ? 
          e('ul', { className: 'space-y-2' }, creditProfile.cushCreditScore.riskFactors.map((risk, index) =>
            e('li', { key: `risk-${index}`, className: 'flex items-start' }, [
              e('span', { className: 'text-red-500 mr-2' }, '⚠️'),
              e('span', { className: 'text-gray-700' }, risk)
            ])
          )) :
          e('p', { className: 'text-gray-500 italic' }, 'No significant risk factors identified.')
      ]),

      // Strength Factors
      e('div', { className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
        e('h3', { className: 'text-lg font-semibold text-green-600 mb-4' }, 'Strength Factors'),
        creditProfile.cushCreditScore.strengthFactors.length > 0 ? 
          e('ul', { className: 'space-y-2' }, creditProfile.cushCreditScore.strengthFactors.map((strength, index) =>
            e('li', { key: `strength-${index}`, className: 'flex items-start' }, [
              e('span', { className: 'text-green-500 mr-2' }, '✅'),
              e('span', { className: 'text-gray-700' }, strength)
            ])
          )) :
          e('p', { className: 'text-gray-500 italic' }, 'Building your credit strengths...')
      ])
    ])
  ]);
};

// Community Hub Component
function CommunityHub() {
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    topic: '',
    sessionType: 'video_call',
    notes: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // Sample data for insights until backend is connected
  const sampleInsights = [
    {
      id: 1,
      title: "Complete Guide to Canadian Express Entry",
      excerpt: "Everything you need to know about Canada's Express Entry immigration system, including CRS scores, documentation, and timeline.",
      category: "Immigration",
      readTime: 12,
      author: "Sarah Chen",
      authorRole: "Immigration Consultant",
      publishedAt: "2025-01-15",
      featuredImage: "/attached_assets/canada-express-entry.jpg",
      tags: ["Canada", "Express Entry", "Immigration"],
      content: `
# Complete Guide to Canadian Express Entry

The Express Entry system is Canada's primary immigration pathway for skilled workers. This comprehensive guide covers everything you need to know.

## Overview
Express Entry manages applications for three federal economic immigration programs:
- Federal Skilled Worker Program (FSWP)
- Canadian Experience Class (CEC)  
- Federal Skilled Trades Program (FSTP)

## Comprehensive Requirement Score (CRS)
The CRS is a points-based system used to assess and rank candidates. Maximum points: 1,200

### Core Factors (Maximum 600 points)
- Age (up to 110 points)
- Education (up to 150 points)
- Official language proficiency (up to 160 points)
- Second official language (up to 30 points)
- Canadian work experience (up to 80 points)
- Arranged employment (up to 200 points)

### Additional Factors (Maximum 600 points)
- Provincial nomination (600 points)
- French language skills (up to 50 points)
- Canadian education credential (up to 30 points)
- Arranged employment (up to 200 points)

## Step-by-Step Application Process

### 1. Prepare Your Documents
- Language test results (IELTS, CELPIP, TEF, TCF)
- Educational Credential Assessment (ECA)
- Work experience letters
- Passport and travel documents
- Police certificates
- Medical exams

### 2. Create Your Express Entry Profile
- Complete online profile
- Receive CRS score
- Enter Express Entry pool

### 3. Improve Your CRS Score
- Retake language tests for higher scores
- Gain additional work experience
- Obtain Provincial Nominee Program (PNP) nomination
- Learn French as second official language
- Get Canadian job offer with LMIA

### 4. Receive Invitation to Apply (ITA)
- ITAs issued during regular draws
- Usually every 2 weeks
- 60 days to submit complete application

### 5. Submit Complete Application
- Upload all required documents
- Pay processing fees ($1,325 CAD for principal applicant)
- Submit within 60-day deadline

## Timeline and Processing
- Express Entry profile: Immediate
- Wait for ITA: Varies by CRS score and draw frequency
- Application processing: 6 months after submission
- Total timeline: 6-12 months typically

## Tips for Success
1. **Language proficiency**: Aim for CLB 9+ in all four abilities
2. **Education**: Get your foreign credentials assessed early
3. **Work experience**: Ensure NOC codes match your duties
4. **Provincial nomination**: Research PNP programs for additional 600 points
5. **Documentation**: Start gathering documents early

## Common Mistakes to Avoid
- Incomplete work experience descriptions
- Insufficient language test scores
- Missing police certificates from all countries
- Incorrect NOC code selection
- Expired documents at time of submission

## Recent Updates (2025)
- New category-based selection starting
- Increased focus on French-speaking candidates
- Enhanced provincial nomination allocations
- Streamlined credential recognition process

## Next Steps
1. Take official language test
2. Get Educational Credential Assessment
3. Create Express Entry profile
4. Research Provincial Nominee Programs
5. Prepare supporting documents

For personalized guidance, book a consultation with our certified immigration consultants.
      `
    },
    {
      id: 2,
      title: "Australian Skilled Migration: Points Test Strategy",
      excerpt: "Master the Australian Points Test system and increase your chances of receiving an invitation for skilled migration.",
      category: "Immigration",
      readTime: 10,
      author: "Michael Thompson",
      authorRole: "Migration Agent",
      publishedAt: "2025-01-10",
      featuredImage: "/attached_assets/australia-skilled-migration.jpg",
      tags: ["Australia", "Skilled Migration", "Points Test"],
      content: `
# Australian Skilled Migration: Points Test Strategy

Australia's skilled migration program uses a points-based system to select candidates. This guide helps you maximize your points.

## Current Points Test Overview
Minimum requirement: 65 points
Competitive scores: 80+ points for most occupations

### Age Points
- 18-24 years: 25 points
- 25-32 years: 30 points  
- 33-39 years: 25 points
- 40-44 years: 15 points
- 45-49 years: 0 points

### English Language Points
- Competent English (IELTS 6.0): 0 points
- Proficient English (IELTS 7.0): 10 points
- Superior English (IELTS 8.0): 20 points

### Educational Qualifications
- Doctorate: 20 points
- Bachelor or Masters: 15 points
- Diploma or trade qualification: 10 points

### Work Experience (Outside Australia)
- 8+ years: 15 points
- 5-7 years: 10 points
- 3-4 years: 5 points

### Work Experience (In Australia)
- 8+ years: 20 points
- 5-7 years: 15 points
- 3-4 years: 10 points
- 1-2 years: 5 points

## Strategies to Increase Points

### 1. Improve English Scores
- Each band increase can add 10 points
- Consider multiple test attempts
- PTE Academic often easier than IELTS

### 2. Gain Australian Work Experience
- Even 1 year adds 5 points
- Consider working holiday visa
- Higher skilled positions preferred

### 3. Study in Australia
- Australian qualification: 5 points
- Regional study: additional 5 points
- STEM qualification: additional 5 points

### 4. Professional Year Programs
- Accounting, Engineering, IT: 5 points
- 44-week structured program
- Combines study and work experience

### 5. State/Territory Nomination
- Additional 5 points for subclass 190
- Pathway for lower-scoring candidates
- Research state-specific requirements

### 6. Partner Skills Assessment
- Partner has skilled occupation: 10 points
- Partner has competent English: 5 points
- Alternative: partner English study points

## Application Process

### Step 1: Skills Assessment
- Apply to relevant assessing authority
- Usually takes 6-12 weeks
- Required before EOI submission

### Step 2: Submit EOI
- Create SkillSelect profile
- Updated monthly with draws
- Valid for 2 years

### Step 3: Receive Invitation
- Based on points ranking
- 60 days to submit full application
- Cannot increase points after invitation

### Step 4: Lodge Visa Application
- Upload all documents
- Health and character checks
- Processing time: 5-9 months

## Recent Changes (2025)
- New occupation lists updated
- Increased focus on critical skills
- Enhanced regional migration incentives
- Streamlined assessment processes

## Top Tips
1. **Plan early**: Skills assessment takes time
2. **Monitor occupation ceilings**: Popular occupations fill quickly
3. **Consider regional options**: Lower competition, additional points
4. **Keep improving**: Continue gaining experience and qualifications
5. **Professional help**: Consider migration agent for complex cases

For detailed occupation-specific advice, consult with our registered migration agents.
      `
    },
    {
      id: 3,
      title: "UK Global Talent Visa: Complete Application Guide",
      excerpt: "Step-by-step guide to applying for the UK Global Talent visa for exceptional talent in tech, arts, sciences, and research.",
      category: "Immigration",
      readTime: 8,
      author: "Emma Williams",
      authorRole: "UK Immigration Specialist",
      publishedAt: "2025-01-08",
      featuredImage: "/attached_assets/uk-global-talent.jpg",
      tags: ["UK", "Global Talent", "Tech Visa"],
      content: `
# UK Global Talent Visa: Complete Application Guide

The Global Talent visa is for exceptional talent or promise in specific fields. This guide covers the complete application process.

## Eligible Fields
- Digital technology
- Arts and culture
- Sciences
- Engineering
- Humanities
- Medicine
- Social sciences

## Two Application Stages

### Stage 1: Endorsement
Must be endorsed by one of the approved endorsing bodies:

**Tech Nation** (Digital Technology)
- Exceptional talent or exceptional promise
- Evidence of recognition and impact
- Technical and business skills

**Royal Society** (Sciences)
- Fellowship or equivalent recognition
- Outstanding research contributions
- International recognition

**British Academy** (Humanities and Social Sciences)
- Leading academic or practitioner
- Significant publications or contributions
- International reputation

**Arts Council England** (Arts and Culture)
- Exceptional talent in arts/culture
- Recognition by peers
- Career progression evidence

### Stage 2: Visa Application
After endorsement approval:
- Complete visa application
- Provide biometric information
- Pay visa fees
- Await decision

## Application Requirements

### Mandatory Criteria (All Applicants)
1. Evidence of exceptional talent/promise
2. Recognition by endorsing body
3. English language requirement
4. Financial requirements (£945 maintenance funds)

### Additional Evidence by Field

**Digital Technology**
- Product leadership evidence
- Technical expertise demonstration
- Business/commercial success
- Innovation and impact examples

**Sciences**
- Research publications
- Citations and impact factor
- Grant funding secured
- International collaborations

**Arts and Culture**
- Portfolio of work
- Awards and recognition
- Media coverage
- Career progression

## Documents Checklist

### Personal Documents
- Valid passport
- Passport-style photographs
- English language certificate (if required)
- Bank statements (maintenance funds)

### Professional Documents
- CV/resume
- Letters of recommendation (3-4)
- Evidence of achievements
- Portfolio of work
- Media coverage
- Academic qualifications

### Supporting Evidence
- Awards and honors
- Speaking engagements
- Board positions
- Mentoring activities
- Salary/contract evidence

## Application Timeline

### Endorsement Stage
- Application preparation: 2-4 weeks
- Submission to review: 8-10 weeks
- Additional information requests: 2-4 weeks
- Total endorsement time: 3-4 months

### Visa Stage
- Application submission: 1 week
- Processing time: 3 weeks (standard)
- Priority service: 1 week (additional fee)
- Super priority: 1 working day (additional fee)

## Fee Structure

### Endorsement Fees
- Exceptional talent: £456
- Exceptional promise: £456

### Visa Fees
- 3 years: £623
- 5 years: £1,220
- Healthcare surcharge: £624 per year

### Priority Services
- Priority: £500
- Super priority: £1,000

## Benefits of Global Talent Visa

### Flexibility
- No job offer required
- Can work for any employer
- Can be self-employed
- Can change jobs freely

### Path to Settlement
- Eligible for settlement after:
  - 3 years (exceptional talent)
  - 5 years (exceptional promise)

### Family Inclusion
- Spouse/partner can apply
- Children under 18 included
- Dependents can work/study

## Top Application Tips

1. **Start early**: Gather evidence systematically
2. **Get strong endorsements**: 3-4 detailed letters
3. **Show impact**: Quantify achievements where possible
4. **Address all criteria**: Cover every requirement thoroughly
5. **Professional review**: Consider immigration lawyer review

## Common Rejection Reasons
- Insufficient evidence of recognition
- Weak letters of recommendation
- Missing documentation
- Failing to meet specific field criteria
- Poor organization of application

## Recent Updates (2025)
- Expanded digital technology criteria
- New fast-track options for some applicants
- Enhanced support for startups
- Streamlined renewal process

For personalized assessment and application support, book a consultation with our UK immigration specialists.
      `
    },
    {
      id: 4,
      title: "US Green Card Options: Family vs Employment Based",
      excerpt: "Compare family-based and employment-based green card pathways, including processing times, requirements, and strategies.",
      category: "Immigration",
      readTime: 15,
      author: "Robert Martinez",
      authorRole: "Immigration Attorney",
      publishedAt: "2025-01-05",
      featuredImage: "/attached_assets/us-green-card.jpg",
      tags: ["USA", "Green Card", "Immigration"],
      content: `
# US Green Card Options: Family vs Employment Based

Understanding the different pathways to US permanent residence is crucial for planning your immigration strategy.

## Family-Based Green Cards

### Immediate Relatives (No Waiting)
**US Citizens can sponsor:**
- Spouse
- Unmarried children under 21
- Parents (if USC is 21+)

**Benefits:**
- No numerical limits
- Fastest processing
- Can adjust status in US

### Family Preference Categories (Limited Annual Numbers)

**F1: Unmarried adult children of US citizens**
- Current wait: 7-15 years
- Includes children's spouses and children

**F2A: Spouses and unmarried children under 21 of LPRs**
- Current wait: 2-3 years
- 77% of F2 category

**F2B: Unmarried adult children of LPRs**
- Current wait: 5-8 years
- 23% of F2 category

**F3: Married children of US citizens**
- Current wait: 12-20 years
- Includes spouses and children

**F4: Siblings of US citizens**
- Current wait: 15-25 years
- USC must be 21+

## Employment-Based Green Cards

### EB-1: Priority Workers (No Labor Certification)
**EB-1A: Extraordinary Ability**
- No job offer required
- Self-petition allowed
- Evidence of national/international acclaim

**EB-1B: Outstanding Researchers/Professors**
- Job offer required
- 3+ years research/teaching experience
- International recognition

**EB-1C: Multinational Executives/Managers**
- Must work for qualifying company
- 1 year foreign management experience
- Continue in managerial role

### EB-2: Advanced Degree/Exceptional Ability
**Requirements:**
- Advanced degree OR bachelor's + 5 years experience
- Labor certification usually required
- Job offer required (except NIW)

**EB-2 NIW: National Interest Waiver**
- No job offer or labor cert required
- Self-petition allowed
- Must benefit US national interest

### EB-3: Skilled Workers/Professionals
**Categories:**
- Skilled workers (2+ years experience)
- Professionals (bachelor's degree)
- Other workers (unskilled)

**Requirements:**
- Labor certification required
- Job offer required
- Employer sponsorship

### EB-4: Special Immigrants
**Includes:**
- Religious workers
- Afghan/Iraqi translators
- International broadcasters
- Panama Canal employees

### EB-5: Investor Visas
**Requirements:**
- $800K investment (targeted areas)
- $1.05M investment (other areas)
- Create/preserve 10 US jobs
- At-risk investment

## Processing Times Comparison

### Family-Based
- Immediate relatives: 8-12 months
- F1: 7-15 years total
- F2A: 2-3 years total
- F2B: 5-8 years total
- F3: 12-20 years total
- F4: 15-25 years total

### Employment-Based
- EB-1: 8-12 months (no wait)
- EB-2: 1-3 years + priority date wait
- EB-3: 1-2 years + priority date wait
- EB-4: Varies by category
- EB-5: 18-24 months

## Strategy Considerations

### Choose Family-Based If:
- You have qualifying US citizen/LPR relatives
- Willing to wait for preference categories
- Don't meet employment requirements
- Want certainty of approval path

### Choose Employment-Based If:
- Have specialized skills/education
- Employer willing to sponsor
- Want potentially faster processing
- Don't have qualifying family

### Dual Strategy
Many applicants pursue both:
- File family petition for backup
- Pursue employment options simultaneously
- Use whichever becomes available first

## Cost Comparison

### Family-Based Costs
- I-130 petition: $535
- I-485 adjustment: $1,225
- Medical exam: $200-500
- Attorney fees: $2,000-5,000

### Employment-Based Costs
- Labor certification: $0-10,000
- I-140 petition: $700
- I-485 adjustment: $1,225
- Attorney fees: $5,000-15,000

## Tips for Success

### Family-Based
1. **Document relationship thoroughly**
2. **File as soon as eligible**
3. **Maintain status while waiting**
4. **Keep contact information updated**
5. **Prepare for interview**

### Employment-Based
1. **Build strong qualifications early**
2. **Choose employer carefully**
3. **Consider NIW if qualified**
4. **Maintain H-1B or other status**
5. **Plan for long process**

## Recent Changes (2025)
- Updated processing times
- New premium processing options
- Enhanced visa bulletin predictions
- Streamlined family reunification

## Common Mistakes
- Filing in wrong category
- Insufficient documentation
- Missing deadlines
- Status violations while waiting
- Poor attorney selection

For personalized immigration strategy, consult with our experienced immigration attorneys.
      `
    }
  ];

  const sampleMentors = [
    {
      id: 1,
      name: "Sarah Chen",
      specialty: "Canadian Immigration",
      experience: "8+ years",
      rating: 4.9,
      sessions: 150,
      languages: ["English", "Mandarin"],

      bio: "Certified Immigration Consultant with expertise in Express Entry, PNP programs, and family sponsorship.",
      availability: {
        timezone: "EST",
        weekdays: [
          { day: "Monday", startTime: "9:00 AM", endTime: "5:00 PM" },
          { day: "Wednesday", startTime: "9:00 AM", endTime: "5:00 PM" },
          { day: "Friday", startTime: "9:00 AM", endTime: "3:00 PM" }
        ]
      },
      profileImage: "/attached_assets/mentor1.jpg",
      certifications: ["RCIC", "CAPIC Member"],
      specialties: ["Express Entry", "Provincial Nominee Programs", "Family Sponsorship"]
    },
    {
      id: 2,
      name: "Michael Thompson",
      specialty: "Australian Migration",
      experience: "10+ years",
      rating: 4.8,
      sessions: 200,
      languages: ["English"],

      bio: "Registered Migration Agent specializing in skilled migration, business visas, and points optimization.",
      availability: {
        timezone: "AEST",
        weekdays: [
          { day: "Tuesday", startTime: "10:00 AM", endTime: "6:00 PM" },
          { day: "Thursday", startTime: "10:00 AM", endTime: "6:00 PM" },
          { day: "Saturday", startTime: "9:00 AM", endTime: "1:00 PM" }
        ]
      },
      profileImage: "/attached_assets/mentor2.jpg",
      certifications: ["MARA Registered", "Migration Institute Member"],
      specialties: ["Skilled Migration", "Business Visas", "Points Test Strategy"]
    },
    {
      id: 3,
      name: "Emma Williams",
      specialty: "UK Immigration",
      experience: "6+ years",
      rating: 4.9,
      sessions: 120,
      languages: ["English", "French"],

      bio: "UK Immigration Specialist with focus on Global Talent, Skilled Worker, and Student visas.",
      availability: {
        timezone: "GMT",
        weekdays: [
          { day: "Monday", startTime: "8:00 AM", endTime: "4:00 PM" },
          { day: "Wednesday", startTime: "8:00 AM", endTime: "4:00 PM" },
          { day: "Friday", startTime: "8:00 AM", endTime: "2:00 PM" }
        ]
      },
      profileImage: "/attached_assets/mentor3.jpg",
      certifications: ["OISC Level 3", "Immigration Law Practitioner"],
      specialties: ["Global Talent Visa", "Skilled Worker Visa", "Student Visas"]
    }
  ];

  useEffect(() => {
    // Load data
    const loadData = async () => {
      try {
        setInsights(sampleInsights);
        
        // Fetch real mentor data from API
        const mentorsResponse = await fetch('/api/mentors');
        if (mentorsResponse.ok) {
          const mentorsData = await mentorsResponse.json();
          setMentors(mentorsData);
        } else {
          // Fallback to sample data if API fails
          setMentors(sampleMentors);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to sample data if API fails
        setMentors(sampleMentors);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const renderInsightCard = (insight) => e('div', {
    key: `insight-${insight.id}`,
    className: 'bg-white rounded-xl p-4 sm:p-6 shadow-lg border hover:shadow-xl transition-shadow cursor-pointer w-full',
    onClick: () => setSelectedInsight(insight)
  }, [
    e('div', {
      key: 'insight-header',
      className: 'flex items-start gap-3 sm:gap-4 mb-4'
    }, [
      e('div', {
        key: 'insight-content',
        className: 'flex-1 min-w-0'
      }, [
        e('h3', {
          key: 'title',
          className: 'text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2'
        }, insight.title),
        e('p', {
          key: 'excerpt',
          className: 'text-gray-600 leading-relaxed mb-3 text-sm sm:text-base line-clamp-3'
        }, insight.excerpt),
        e('div', {
          key: 'meta',
          className: 'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500'
        }, [
          e('span', { key: 'author', className: 'font-medium' }, `By ${insight.author}`),
          e('span', { key: 'role' }, insight.authorRole),
          e('div', { key: 'time-date', className: 'flex items-center gap-2' }, [
            e('span', { key: 'read-time' }, `${insight.readTime} min read`),
            e('span', { key: 'date' }, new Date(insight.publishedAt).toLocaleDateString())
          ])
        ])
      ])
    ]),
    e('div', {
      key: 'tags',
      className: 'flex flex-wrap gap-1 sm:gap-2'
    }, insight.tags.slice(0, 3).map((tag, index) => 
      e('span', {
        key: `tag-${index}`,
        className: 'px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium'
      }, tag)
    ))
  ]);

  const renderMentorCard = (mentor) => e('div', {
    key: `mentor-${mentor.id}`,
    className: 'bg-white rounded-xl p-4 sm:p-6 shadow-lg border w-full'
  }, [
    e('div', {
      key: 'mentor-header',
      className: 'flex items-start gap-3 sm:gap-4 mb-4'
    }, [
      // Profile Picture or Avatar
      mentor.profilePicture ? 
        e('img', {
          key: 'mentor-image',
          src: mentor.profilePicture,
          alt: `${mentor.firstName} ${mentor.lastName}`,
          className: 'w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0'
        }) :
        e('div', {
          key: 'mentor-avatar',
          className: 'w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0'
        }, `${mentor.firstName?.[0] || ''}${mentor.lastName?.[0] || ''}`),
      e('div', {
        key: 'mentor-info',
        className: 'flex-1 min-w-0'
      }, [
        e('h3', {
          key: 'name',
          className: 'text-lg sm:text-xl font-bold text-gray-900 truncate'
        }, `${mentor.firstName || ''} ${mentor.lastName || ''}`),
        e('p', {
          key: 'specialty',
          className: 'text-blue-600 font-medium text-sm sm:text-base'
        }, mentor.specialty?.charAt(0).toUpperCase() + mentor.specialty?.slice(1) + ' Expert'),
        e('div', {
          key: 'stats',
          className: 'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600'
        }, [
          e('span', { key: 'experience', className: 'truncate' }, mentor.experience || 'Experienced Professional'),
          e('div', { key: 'rating-sessions', className: 'flex items-center gap-2 sm:gap-4' }, [
            e('span', { key: 'rating' }, `⭐ ${mentor.rating || '5.0'}`),
            e('span', { key: 'sessions' }, `${mentor.totalSessions || 0} sessions`)
          ])
        ])
      ])
    ]),
    e('p', {
      key: 'bio',
      className: 'text-gray-600 mb-4 text-sm sm:text-base line-clamp-3'
    }, mentor.bio),
    
    // Languages & Certifications
    mentor.languages && mentor.languages.length > 0 && e('div', {
      key: 'languages',
      className: 'flex flex-wrap gap-1 sm:gap-2 mb-3'
    }, mentor.languages.slice(0, 3).map((lang, index) =>
      e('span', {
        key: `lang-${index}`,
        className: 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm'
      }, lang)
    )),
    
    e('div', {
      key: 'actions',
      className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'
    }, [

      e('button', {
        key: 'book-btn',
        onClick: () => {
          setSelectedMentor(mentor);
          setShowBookingForm(true);
        },
        className: 'w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base'
      }, 'Book Session')
    ])
  ]);

  const renderInsightDetail = () => {
    if (!selectedInsight) return null;
    
    return e('div', {
      key: 'insight-detail',
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setSelectedInsight(null);
        }
      }
    }, [
      e('div', {
        key: 'modal',
        className: 'bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto'
      }, [
        e('div', {
          key: 'header',
          className: 'p-6 border-b'
        }, [
          e('div', {
            key: 'title-section',
            className: 'flex justify-between items-start mb-4'
          }, [
            e('h1', {
              key: 'title',
              className: 'text-3xl font-bold text-gray-900'
            }, selectedInsight.title),
            e('button', {
              key: 'close',
              onClick: () => setSelectedInsight(null),
              className: 'text-gray-400 hover:text-gray-600 text-2xl'
            }, '×')
          ]),
          e('div', {
            key: 'meta',
            className: 'flex items-center gap-4 text-sm text-gray-600'
          }, [
            e('span', { key: 'author' }, `By ${selectedInsight.author}`),
            e('span', { key: 'role' }, selectedInsight.authorRole),
            e('span', { key: 'read-time' }, `${selectedInsight.readTime} min read`),
            e('span', { key: 'date' }, new Date(selectedInsight.publishedAt).toLocaleDateString())
          ])
        ]),
        e('div', {
          key: 'content',
          className: 'p-6 prose max-w-none',
          dangerouslySetInnerHTML: { __html: selectedInsight.content.replace(/\n/g, '<br>').replace(/### /g, '<h3>').replace(/## /g, '<h2>').replace(/# /g, '<h1>') }
        })
      ])
    ]);
  };

  // Generate next 14 days for booking
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' })
      });
    }
    return dates;
  };

  // Generate time slots for a selected date
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      slots.push({
        startTime,
        endTime,
        label: `${startTime} - ${endTime}`,
        available: true
      });
    }
    return slots;
  };

  // Handle booking submission
  const handleBookingSubmit = async () => {
    if (!bookingData.date || !bookingData.startTime || !bookingData.topic.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setBookingLoading(true);
    
    try {
      const response = await fetch(`/api/mentors/${selectedMentor.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const result = await response.json();
        setShowBookingForm(false);
        setBookingData({
          date: '',
          startTime: '',
          endTime: '',
          topic: '',
          sessionType: 'video_call',
          notes: ''
        });
        alert('Session booked successfully! You will receive a confirmation email shortly.');
      } else {
        const error = await response.json();
        alert(`Booking failed: ${error.error || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Booking failed. Please check your connection and try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const renderBookingForm = () => {
    if (!showBookingForm || !selectedMentor) return null;

    const availableDates = generateAvailableDates();
    const timeSlots = generateTimeSlots();

    return e('div', {
      key: 'booking-modal',
      className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4',
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setShowBookingForm(false);
        }
      }
    }, [
      e('div', {
        key: 'booking-container',
        className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
      }, [
        // Header
        e('div', {
          key: 'booking-header',
          className: 'p-6 border-b border-gray-200'
        }, [
          e('div', {
            key: 'header-content',
            className: 'flex items-center justify-between'
          }, [
            e('div', { key: 'title-section' }, [
              e('h2', {
                key: 'title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Book Your Session'),
              e('p', {
                key: 'subtitle',
                className: 'text-gray-600 mt-1'
              }, `with ${selectedMentor.firstName} ${selectedMentor.lastName} - ${selectedMentor.specialty} Expert`)
            ]),
            e('button', {
              key: 'close-btn',
              onClick: () => setShowBookingForm(false),
              className: 'p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100'
            }, '✕')
          ])
        ]),

        // Form Content
        e('div', {
          key: 'booking-form',
          className: 'p-6'
        }, [
          e('div', {
            key: 'form-grid',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
          }, [
            // Date Selection
            e('div', { key: 'date-section' }, [
              e('h3', {
                key: 'date-title',
                className: 'text-lg font-semibold text-gray-900 mb-4'
              }, '📅 Select Date'),
              e('div', {
                key: 'date-grid',
                className: 'grid grid-cols-1 gap-2'
              }, availableDates.slice(0, 7).map(date =>
                e('button', {
                  key: `date-${date.value}`,
                  onClick: () => {
                    setBookingData(prev => ({ ...prev, date: date.value }));
                    setSelectedDate(date.value);
                  },
                  className: `p-3 text-left rounded-lg border transition-all ${
                    bookingData.date === date.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`
                }, [
                  e('div', {
                    key: 'date-label',
                    className: 'font-medium'
                  }, date.label),
                  e('div', {
                    key: 'day-name',
                    className: 'text-sm text-gray-500'
                  }, date.dayName)
                ])
              ))
            ]),

            // Time Selection
            e('div', { key: 'time-section' }, [
              e('h3', {
                key: 'time-title',
                className: 'text-lg font-semibold text-gray-900 mb-4'
              }, '🕐 Select Time'),
              e('div', {
                key: 'time-grid',
                className: 'grid grid-cols-2 gap-2'
              }, bookingData.date ? timeSlots.map(slot =>
                e('button', {
                  key: `time-${slot.startTime}`,
                  onClick: () => {
                    setBookingData(prev => ({ 
                      ...prev, 
                      startTime: slot.startTime,
                      endTime: slot.endTime
                    }));
                  },
                  disabled: !slot.available,
                  className: `p-2 text-sm rounded-lg border transition-all ${
                    bookingData.startTime === slot.startTime
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : slot.available
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`
                }, slot.label)
              ) : [
                e('div', {
                  key: 'select-date-first',
                  className: 'col-span-2 text-center py-8 text-gray-500'
                }, 'Please select a date first')
              ])
            ])
          ]),

          // Session Details
          e('div', {
            key: 'session-details',
            className: 'mt-6 space-y-4'
          }, [
            // Topic
            e('div', { key: 'topic-field' }, [
              e('label', {
                key: 'topic-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Session Topic *'),
              e('input', {
                key: 'topic-input',
                type: 'text',
                value: bookingData.topic,
                onChange: (e) => setBookingData(prev => ({ ...prev, topic: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                placeholder: 'e.g., Express Entry application guidance, UK visa questions...'
              })
            ]),

            // Session Type
            e('div', { key: 'session-type-field' }, [
              e('label', {
                key: 'session-type-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Session Type'),
              e('select', {
                key: 'session-type-select',
                value: bookingData.sessionType,
                onChange: (e) => setBookingData(prev => ({ ...prev, sessionType: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }, [
                e('option', { key: 'video-call', value: 'video_call' }, '📹 Video Call'),
                e('option', { key: 'phone-call', value: 'phone_call' }, '📞 Phone Call'),
                e('option', { key: 'chat', value: 'chat' }, '💬 Text Chat')
              ])
            ]),

            // Additional Notes
            e('div', { key: 'notes-field' }, [
              e('label', {
                key: 'notes-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Additional Notes (Optional)'),
              e('textarea', {
                key: 'notes-input',
                value: bookingData.notes,
                onChange: (e) => setBookingData(prev => ({ ...prev, notes: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                rows: 3,
                placeholder: 'Any specific questions or context you\'d like to share...'
              })
            ])
          ]),

          // Summary & Actions
          e('div', {
            key: 'booking-summary',
            className: 'mt-6 pt-6 border-t border-gray-200'
          }, [
            bookingData.date && bookingData.startTime && e('div', {
              key: 'session-summary',
              className: 'bg-blue-50 rounded-lg p-4 mb-4'
            }, [
              e('h4', {
                key: 'summary-title',
                className: 'font-semibold text-blue-900 mb-2'
              }, 'Session Summary'),
              e('div', {
                key: 'summary-details',
                className: 'text-sm text-blue-800 space-y-1'
              }, [
                e('p', { key: 'mentor-summary' }, `Mentor: ${selectedMentor.firstName} ${selectedMentor.lastName}`),
                e('p', { key: 'date-summary' }, `Date: ${new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`),
                e('p', { key: 'time-summary' }, `Time: ${bookingData.startTime} - ${bookingData.endTime}`),
                e('p', { key: 'type-summary' }, `Type: ${bookingData.sessionType.replace('_', ' ').toUpperCase()}`)
              ])
            ]),

            e('div', {
              key: 'actions',
              className: 'flex gap-3'
            }, [
              e('button', {
                key: 'cancel',
                onClick: () => setShowBookingForm(false),
                className: 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              }, 'Cancel'),
              e('button', {
                key: 'book',
                onClick: handleBookingSubmit,
                disabled: bookingLoading || !bookingData.date || !bookingData.startTime || !bookingData.topic.trim(),
                className: `flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium ${
                  bookingLoading ? 'opacity-75' : ''
                }`
              }, bookingLoading ? 'Booking...' : 'Book Session')
            ])
          ])
        ])
      ])
    ]);
  };

  if (loading) {
    return e('div', {
      className: 'flex items-center justify-center py-12'
    }, [
      e('div', {
        key: 'spinner',
        className: 'w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin'
      })
    ]);
  }

  return e('div', {
    className: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6'
  }, [
    // Header
    e('div', {
      key: 'header',
      className: 'mb-6 sm:mb-8'
    }, [
      e('div', {
        key: 'title-section',
        className: 'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4'
      }, [
        e('h1', {
          key: 'title',
          className: 'text-2xl sm:text-3xl font-bold text-gray-900'
        }, 'Community Hub'),
        e('div', {
          key: 'stats',
          className: 'flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600'
        }, [
          e('span', { key: 'insights-count' }, `${insights.length} Expert Insights`),
          e('span', { key: 'mentors-count' }, `${mentors.length} Certified Mentors`),
          e('span', { key: 'members-count' }, '2,500+ Community Members')
        ])
      ]),
      e('p', {
        key: 'description',
        className: 'text-gray-600 text-base sm:text-lg'
      }, 'Connect with experts, access curated insights, and join our global immigration community')
    ]),

    // Tab Navigation
    e('div', {
      key: 'tabs',
      className: 'flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 bg-gray-100 p-1 rounded-lg mb-6 sm:mb-8'
    }, [
      ['insights', 'Expert Insights', '📚'],
      ['mentors', 'Find Mentors', '👥'],
      ['events', 'Community Events', '📅']
    ].map(([key, label, icon]) =>
      e('button', {
        key: `tab-${key}`,
        onClick: () => setActiveTab(key),
        className: `flex-1 flex items-center justify-center gap-2 py-2 sm:py-3 px-3 sm:px-4 rounded-md font-medium transition-colors text-sm sm:text-base ${
          activeTab === key
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`
      }, [
        e('span', { key: 'icon', className: 'text-sm sm:text-base' }, icon),
        e('span', { key: 'label', className: 'whitespace-nowrap' }, label)
      ])
    )),

    // Content
    e('div', {
      key: 'content',
      className: 'w-full'
    }, [
      // Insights Tab
      activeTab === 'insights' && e('div', {
        key: 'insights-content'
      }, [
        e('div', {
          key: 'insights-grid',
          className: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'
        }, insights.map(renderInsightCard))
      ]),

      // Mentors Tab
      activeTab === 'mentors' && e('div', {
        key: 'mentors-content'
      }, [
        e('div', {
          key: 'mentors-grid',
          className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
        }, mentors.map(renderMentorCard))
      ]),

      // Events Tab
      activeTab === 'events' && e('div', {
        key: 'events-content',
        className: 'text-center py-12'
      }, [
        e('div', {
          key: 'events-placeholder',
          className: 'text-gray-500'
        }, [
          e('div', {
            key: 'icon',
            className: 'text-6xl mb-4'
          }, '📅'),
          e('h3', {
            key: 'title',
            className: 'text-xl font-medium mb-2'
          }, 'Community Events Coming Soon'),
          e('p', { key: 'desc' }, 'We\'re preparing exciting community events and webinars for you!')
        ])
      ])
    ]),

    // Modals
    renderInsightDetail(),
    renderBookingForm()
  ]);
}

// Main App Component with Enhanced Firebase Authentication
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Initialize Firebase and setup authentication
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Firebase using the centralized coordinator
        if (window.initializeFirebaseOnce) {
          const auth = await window.initializeFirebaseOnce();
          console.log('Firebase initialization completed in App component');
          
          // Set up auth state listener with the initialized auth instance
          const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          
          onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('Firebase auth state changed:', firebaseUser ? firebaseUser.email : 'null');
            
            if (firebaseUser) {
              // Try to sync with backend
              try {
                await handleFirebaseUser(firebaseUser);
              } catch (syncError) {
                console.error('Firebase sync error:', syncError);
                // Still check if user exists in backend
                checkBackendAuth();
              }
            } else {
              // No Firebase user, check backend directly
              checkBackendAuth();
            }
          });
          
          setFirebaseInitialized(true);
          
        } else {
          console.warn('Firebase coordinator not loaded, falling back to backend auth');
          checkBackendAuth();
        }
      } catch (error) {
        console.error('Firebase initialization failed in App component:', error);
        // Fallback to backend auth check
        checkBackendAuth();
      }
    };
    
    initializeApp();

    const handleFirebaseUser = async (firebaseUser) => {
      try {
        const response = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            firstName: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : '',
            lastName: firebaseUser.displayName ? firebaseUser.displayName.split(' ').slice(1).join(' ') : '',
            acceptTerms: true,
            acceptPrivacy: true,
            isNewUser: true
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsLoading(false);
          console.log('Firebase user synced successfully');
          
          // Force redirect to dashboard for authenticated users
          if (data.user && window.location.hash !== '#dashboard') {
            console.log('Forcing redirect to dashboard for authenticated user');
            window.location.hash = 'dashboard';
            window.dispatchEvent(new Event('hashchange'));
          }
        } else {
          console.error('Firebase sync failed:', response.status);
          checkBackendAuth();
        }
      } catch (error) {
        console.error('Firebase sync error:', error);
        checkBackendAuth();
      }
    };

    // Make setUser available globally for the auth fix module
    window.setUser = setUser;

    const checkBackendAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          
          // Force redirect to dashboard for authenticated users
          if (data && window.location.hash !== '#dashboard') {
            console.log('Backend auth check: Forcing redirect to dashboard for authenticated user');
            window.location.hash = 'dashboard';
            window.dispatchEvent(new Event('hashchange'));
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Backend auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

  }, []);

  // PWA Installation Logic
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    }

    // Enhanced check if app is already installed
    const checkInstallationStatus = () => {
      // Check multiple indicators of installation
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isInstalledFlag = localStorage.getItem('pwa-installed') === 'true';
      
      // Additional checks for different browsers and installation methods
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const hasRelatedApps = navigator.getInstalledRelatedApps && window.location.origin.includes('we-cush.com');
      
      // Chrome/Edge: Check if running in app mode
      const isAppMode = window.chrome && window.chrome.app && window.chrome.app.isInstalled;
      
      // Enhanced detection for PWA installation
      const isPWAInstalled = isStandalone || isIOSStandalone || isInstalledFlag || 
                            isMinimalUI || isFullscreen || isAppMode;
      
      if (isPWAInstalled) {
        console.log('App is already installed, hiding install prompt permanently');
        setIsInstalled(true);
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        // Ensure the flag is set for future sessions
        localStorage.setItem('pwa-installed', 'true');
        return true;
      }
      return false;
    };

    // Initial check
    if (checkInstallationStatus()) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('Before install prompt triggered');
      e.preventDefault();
      
      // Double-check installation status before showing prompt
      if (checkInstallationStatus()) {
        return;
      }
      
      // Check if user has dismissed the prompt recently
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
      if (dismissedTime) {
        const dismissedDate = new Date(dismissedTime);
        const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
        
        // Don't show prompt again for 24 hours after dismissal
        if (hoursSinceDismissed < 24) {
          console.log('Install prompt recently dismissed, waiting...');
          return;
        }
      }
      
      setDeferredPrompt(e);
      
      // Show install prompt after 3 seconds only if not installed
      setTimeout(() => {
        if (!isInstalled && !showInstallPrompt && !checkInstallationStatus()) {
          console.log('Showing install prompt');
          setShowInstallPrompt(true);
        }
      }, 3000);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      console.log('App installed successfully');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      // Store installation flag and timestamp
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-install-date', new Date().toISOString());
      // Clear any dismissed flags since app is now installed
      localStorage.removeItem('pwa-install-dismissed-time');
    };

    // For browsers that support PWA but don't fire beforeinstallprompt immediately
    const checkInstallability = () => {
      setTimeout(() => {
        // Check dismissal status before showing fallback prompt
        const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
        let recentlyDismissed = false;
        if (dismissedTime) {
          const dismissedDate = new Date(dismissedTime);
          const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
          recentlyDismissed = hoursSinceDismissed < 24;
        }
        
        if (!isInstalled && !deferredPrompt && !showInstallPrompt && !recentlyDismissed && !checkInstallationStatus()) {
          // Show fallback prompt for browsers that support PWA but don't fire the event
          console.log('Showing fallback install prompt');
          setShowInstallPrompt(true);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Periodic check for installation status (every 5 seconds)
    const installCheckInterval = setInterval(() => {
      if (checkInstallationStatus()) {
        clearInterval(installCheckInterval);
      }
    }, 5000);
    
    // Check for installability after a delay
    checkInstallability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (installCheckInterval) {
        clearInterval(installCheckInterval);
      }
    };
  }, []);

  // Enhanced Logout with comprehensive cleanup
  const handleLogout = async () => {
    // Prevent multiple simultaneous sign-outs
    if (window.isSigningOut) {
      console.log('Sign-out already in progress');
      return;
    }
    
    try {
      window.isSigningOut = true;
      console.log('Starting enhanced sign-out process...');
      
      // Track sign-out attempt
      if (window.trackAuthEvent) {
        window.trackAuthEvent('manual', 'sign_out');
      }
      
      // Step 1: Firebase sign-out
      if (window.firebaseAuth) {
        try {
          const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
          await signOut(window.firebaseAuth);
          console.log('Firebase sign-out successful');
        } catch (firebaseError) {
          console.error('Firebase sign-out error:', firebaseError);
        }
      }
      
      // Step 2: Backend session cleanup
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn('Backend logout failed:', response.status);
        }
      } catch (backendError) {
        console.error('Backend logout error:', backendError);
      }
      
      // Step 3: Clear client-side data
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        });
      } catch (clearError) {
        console.error('Error clearing client data:', clearError);
      }
      
      // Step 4: Clear user state
      setUser(null);
      
      // Step 5: Guaranteed redirection with multiple fallbacks
      try {
        window.location.href = '/';
        
        setTimeout(() => {
          if (window.location.hash !== '' && window.location.hash !== '#') {
            window.location.hash = '';
            window.location.reload();
          }
        }, 100);
        
        setTimeout(() => {
          window.location.replace('/');
        }, 500);
        
      } catch (redirectError) {
        console.error('Redirection error:', redirectError);
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Sign-out process error:', error);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } finally {
      window.isSigningOut = false;
    }
  };

  // Inactivity Timeout System (10 minutes)
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_DURATION = 600000; // 10 minutes
    const WARNING_DURATION = 120000; // 2 minutes warning
    
    let lastActivity = Date.now();
    let timeoutId = null;
    let warningId = null;
    let warningShown = false;
    
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];
    
    const clearWarning = () => {
      const warningDiv = document.getElementById('inactivity-warning');
      if (warningDiv) {
        warningDiv.remove();
      }
      warningShown = false;
    };
    
    const showWarning = () => {
      if (warningShown) return;
      
      warningShown = true;
      
      const warningDiv = document.createElement('div');
      warningDiv.id = 'inactivity-warning';
      warningDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 10000;
          max-width: 300px;
        ">
          <div style="color: #92400e; font-weight: bold; margin-bottom: 8px;">
            Session Timeout Warning
          </div>
          <div style="color: #92400e; font-size: 14px; margin-bottom: 12px;">
            You will be signed out in 2 minutes due to inactivity.
          </div>
          <button id="extend-session" style="
            background: #f59e0b;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">
            Stay Signed In
          </button>
        </div>
      `;
      
      document.body.appendChild(warningDiv);
      
      document.getElementById('extend-session').addEventListener('click', () => {
        handleActivity();
      });
    };
    
    const showTimeoutNotification = () => {
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 10001;
          text-align: center;
        ">
          <div style="color: #374151; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
            Session Expired
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            You have been signed out due to inactivity.
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    };
    
    const handleTimeout = async () => {
      console.log('Session timeout due to inactivity');
      clearWarning();
      showTimeoutNotification();
      await handleLogout();
    };
    
    const handleActivity = () => {
      lastActivity = Date.now();
      
      if (warningShown) {
        clearWarning();
      }
      
      resetTimeout();
    };
    
    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (warningId) {
        clearTimeout(warningId);
      }
      
      warningId = setTimeout(() => {
        showWarning();
      }, TIMEOUT_DURATION - WARNING_DURATION);
      
      timeoutId = setTimeout(() => {
        handleTimeout();
      }, TIMEOUT_DURATION);
    };
    
    // Bind activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    // Start initial timeout
    resetTimeout();
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (warningId) {
        clearTimeout(warningId);
      }
      
      clearWarning();
    };
  }, [user]);

  // Install PWA function
  const installPWA = async () => {
    if (deferredPrompt) {
      console.log('Triggering PWA install prompt');
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowInstallPrompt(false);
        setIsInstalled(true);
        // Store installation flag and timestamp
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('pwa-install-date', new Date().toISOString());
        // Clear any dismissed flags since app is now installed
        localStorage.removeItem('pwa-install-dismissed-time');
      } else {
        console.log('User dismissed the install prompt');
        // Store dismissal timestamp to prevent showing again for 24 hours
        localStorage.setItem('pwa-install-dismissed-time', new Date().toISOString());
      }
      
      setDeferredPrompt(null);
    } else {
      console.log('No deferred prompt available');
      // Store dismissal to prevent showing fallback prompt repeatedly
      localStorage.setItem('pwa-install-dismissed-time', new Date().toISOString());
      // For browsers that don't support beforeinstallprompt
      alert('To install this app:\n\n' +
            'Chrome/Edge: Click the menu button (⋮) then "Install Cush"\n' +
            'Firefox: Click the address bar install icon\n' +
            'Safari: Click Share button then "Add to Home Screen"');
    }
  };

  // Dismiss install prompt
  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Store dismissal timestamp to prevent showing again for 24 hours
    localStorage.setItem('pwa-install-dismissed-time', new Date().toISOString());
    console.log('PWA install prompt dismissed, will not show again for 24 hours');
  };

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

  const currentHash = window.location.hash;
  const shouldShowDashboard = user && (
    currentHash === '#dashboard' || 
    currentHash === '#' || 
    currentHash === '' || 
    currentHash === '#home' ||
    // If user is authenticated and no specific route is set, show dashboard
    (user && !currentHash.startsWith('#signin') && !currentHash.startsWith('#signup') && !currentHash.startsWith('#about') && !currentHash.startsWith('#mentors') && !currentHash.startsWith('#privacy') && !currentHash.startsWith('#terms'))
  );
  
  return e('div', { key: 'app-container' }, [
    // Show Dashboard for authenticated users unless on specific public pages
    shouldShowDashboard ? 
      e(Dashboard, { key: 'dashboard', user, isInstalled, deferredPrompt, installPWA }) :
      e(AppRouter, { key: 'router', user }),
    
    // Show Imisi chat for authenticated users only
    user && e(ImisiChatHead, { key: 'imisi-chat' }),
    
    // PWA Install Prompt - Enhanced detection to prevent intrusive prompts
    (() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      const isInstalledFlag = localStorage.getItem('pwa-installed') === 'true';
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isAppMode = window.chrome && window.chrome.app && window.chrome.app.isInstalled;
      
      const isPWAInstalled = isStandalone || isIOSStandalone || isInstalledFlag || 
                            isMinimalUI || isFullscreen || isAppMode;
      
      // Check if user dismissed recently (within 24 hours)
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');
      let recentlyDismissed = false;
      if (dismissedTime) {
        const dismissedDate = new Date(dismissedTime);
        const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
        recentlyDismissed = hoursSinceDismissed < 24;
      }
      
      // Only show if: app not installed, prompt enabled, not recently dismissed
      return (showInstallPrompt && !isPWAInstalled && !recentlyDismissed) && e('div', {
        key: 'pwa-install-prompt',
        className: 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 max-w-sm mx-auto md:mx-0'
      }, [
      e('div', {
        key: 'install-content',
        className: 'flex items-start gap-3'
      }, [
        e('div', {
          key: 'install-icon',
          className: 'flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center'
        }, [
          e('svg', {
            key: 'icon',
            className: 'w-4 h-4 sm:w-5 sm:h-5 text-blue-600',
            fill: 'currentColor',
            viewBox: '0 0 20 20'
          }, [
            e('path', {
              key: 'path',
              d: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z'
            })
          ])
        ]),
        e('div', {
          key: 'install-text',
          className: 'flex-1 min-w-0'
        }, [
          e('h3', {
            key: 'install-title',
            className: 'text-sm font-medium text-gray-900'
          }, 'Install Cush App'),
          e('p', {
            key: 'install-desc',
            className: 'text-xs sm:text-sm text-gray-500 mt-1'
          }, 'Get quick access to your immigration services directly from your home screen.')
        ])
      ]),
      e('div', {
        key: 'install-actions',
        className: 'flex gap-2 mt-3 sm:mt-4'
      }, [
        e('button', {
          key: 'install-btn',
          onClick: installPWA,
          className: 'flex-1 bg-blue-600 text-white text-xs sm:text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 transition-colors'
        }, 'Install'),
        e('button', {
          key: 'dismiss-btn',
          onClick: dismissInstallPrompt,
          className: 'flex-1 bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 transition-colors'
        }, 'Later')
      ])
    ])
  ]);
}

// Homepage Component
function Homepage({ user }) {
  return e('div', { className: 'min-h-screen' }, [
    e(HeroSection, { key: 'hero', user }),
    e(ServicesSection, { key: 'services' }),
    e(TestimonialsSection, { key: 'testimonials' }),
    e(MentorCarouselSection, { key: 'mentors' }),
    e(AboutUsSection, { key: 'about' }),
    e(ContactSection, { key: 'contact' }),
    !user && e(AuthComponent, { key: 'auth' }),
    
    // Footer with Legal Links and Compliance Information
    e('footer', {
      key: 'footer',
      className: 'bg-gray-50 border-t border-gray-200 py-12 mt-16'
    }, [
      e('div', {
        key: 'footer-container',
        className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      }, [
        // Compliance Information
        e('div', {
          key: 'compliance-section',
          className: 'mb-8 space-y-6'
        }, [
          e('div', {
            key: 'compliance-text',
            className: 'bg-white rounded-lg border border-gray-200 p-6 shadow-sm'
          }, [
            e('p', {
              key: 'compliance-para',
              className: 'text-gray-700 text-sm leading-relaxed mb-4'
            }, 'Cush simplifies financial transactions and support for global transitions, partnering with licensed financial institutions, money transmitters, and fintechs to ensure regulatory compliance. Our services, including loans and savings, are facilitated through these partnerships and licensed subsidiaries, adhering to all applicable laws. Cush holds key regulatory registrations with FinCEN (US), FINTRAC (Canada), and SCUML (Nigeria), demonstrating our commitment to integrity and combating financial crime globally.')
          ]),
          e('div', {
            key: 'disclaimer-text',
            className: 'bg-blue-50 rounded-lg border border-blue-200 p-6'
          }, [
            e('h3', {
              key: 'disclaimer-title',
              className: 'text-sm font-semibold text-blue-900 mb-3'
            }, 'Disclaimer'),
            e('p', {
              key: 'disclaimer-para',
              className: 'text-blue-800 text-sm leading-relaxed'
            }, 'Cush and its subsidiaries provide technology-driven solutions and value-added services for general use. We do not offer legal, tax, immigration, or personalized financial advisory services. Users should consult qualified professionals for specific advice. Service availability may vary by jurisdiction due to local regulatory and licensing requirements. Please refer to our Privacy Policy, Terms of Use, and Fee and Refund Agreement for detailed information.')
          ])
        ]),
        
        // Footer Links
        e('div', {
          key: 'footer-content',
          className: 'flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200'
        }, [
          e('div', {
            key: 'footer-brand',
            className: 'text-gray-600 text-sm'
          }, '© 2025 Cush. All rights reserved.'),
          e('div', {
            key: 'footer-links',
            className: 'flex items-center gap-6'
          }, [
            e('a', {
              key: 'privacy-footer-link',
              href: '#',
              onClick: (e) => {
                e.preventDefault();
                window.navigate('privacy');
              },
              className: 'text-gray-600 hover:text-blue-600 text-sm transition-colors'
            }, 'Privacy Policy'),
            e('a', {
              key: 'terms-footer-link',
              href: '#',
              onClick: (e) => {
                e.preventDefault();
                window.navigate('terms');
              },
              className: 'text-gray-600 hover:text-blue-600 text-sm transition-colors'
            }, 'Terms of Use'),
            e('a', {
              key: 'contact-footer-link',
              href: '#contact',
              className: 'text-gray-600 hover:text-blue-600 text-sm transition-colors'
            }, 'Contact Us')
          ])
        ])
      ])
    ])
  ]);
}

// Privacy Policy Page Component
function PrivacyPolicyPage() {
  return e('div', { className: 'min-h-screen bg-gray-50' }, [
    // Navigation Header
    e('nav', {
      key: 'nav',
      className: 'bg-white shadow-sm border-b border-gray-200'
    }, [
      e('div', {
        key: 'nav-container',
        className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      }, [
        e('div', {
          key: 'nav-content',
          className: 'flex items-center justify-between h-16'
        }, [
          e('div', {
            key: 'nav-left',
            className: 'flex items-center gap-4'
          }, [
            e('button', {
              key: 'back-btn',
              onClick: () => window.navigate('home'),
              className: 'text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2'
            }, ['← Back to Home']),
            e('h1', {
              key: 'page-title',
              className: 'text-xl font-semibold text-gray-900'
            }, 'Privacy Policy')
          ])
        ])
      ])
    ]),

    // Main Content
    e('main', {
      key: 'main',
      className: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
    }, [
      e('div', {
        key: 'content',
        className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8'
      }, [
        e('div', {
          key: 'header',
          className: 'text-center mb-8'
        }, [
          e('h1', {
            key: 'title',
            className: 'text-3xl font-bold text-gray-900 mb-2'
          }, 'Privacy Policy'),
          e('p', {
            key: 'subtitle',
            className: 'text-gray-600'
          }, 'Last updated: July 9, 2025')
        ]),

        e('div', {
          key: 'sections',
          className: 'prose prose-gray max-w-none'
        }, [
          e('section', {
            key: 'intro',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'intro-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Introduction'),
            e('p', {
              key: 'intro-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'At Cush, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our immigration services platform.'),
            e('p', {
              key: 'intro-text2',
              className: 'text-gray-700 leading-relaxed'
            }, 'By using our services, you agree to the collection and use of information in accordance with this policy.')
          ]),

          e('section', {
            key: 'information',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'info-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Information We Collect'),
            e('h3', {
              key: 'personal-title',
              className: 'text-xl font-medium text-gray-900 mb-3'
            }, 'Personal Information'),
            e('p', {
              key: 'personal-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'We collect information you provide directly to us, including:'),
            e('ul', {
              key: 'personal-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'item1' }, 'Name, email address, and contact information'),
              e('li', { key: 'item2' }, 'Immigration status and documentation'),
              e('li', { key: 'item3' }, 'Financial information for loan applications'),
              e('li', { key: 'item4' }, 'Communications and feedback you provide')
            ]),
            e('h3', {
              key: 'usage-title',
              className: 'text-xl font-medium text-gray-900 mb-3'
            }, 'Usage Information'),
            e('p', {
              key: 'usage-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'We automatically collect certain information about your use of our services, including device information, IP address, browser type, and usage patterns.')
          ]),

          e('section', {
            key: 'use',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'use-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'How We Use Your Information'),
            e('p', {
              key: 'use-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'We use the information we collect to:'),
            e('ul', {
              key: 'use-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'use1' }, 'Provide and improve our immigration services'),
              e('li', { key: 'use2' }, 'Process loan applications and financial services'),
              e('li', { key: 'use3' }, 'Communicate with you about our services'),
              e('li', { key: 'use4' }, 'Ensure security and prevent fraud'),
              e('li', { key: 'use5' }, 'Comply with legal obligations')
            ])
          ]),

          e('section', {
            key: 'sharing',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'sharing-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Information Sharing'),
            e('p', {
              key: 'sharing-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'We may share your information with:'),
            e('ul', {
              key: 'sharing-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'share1' }, 'Service providers who assist us in operating our platform'),
              e('li', { key: 'share2' }, 'Financial institutions for loan processing'),
              e('li', { key: 'share3' }, 'Government agencies as required by law'),
              e('li', { key: 'share4' }, 'Professional advisors and legal counsel')
            ])
          ]),

          e('section', {
            key: 'security',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'security-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Data Security'),
            e('p', {
              key: 'security-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.')
          ]),

          e('section', {
            key: 'rights',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'rights-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Your Rights'),
            e('p', {
              key: 'rights-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'You have the right to:'),
            e('ul', {
              key: 'rights-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'right1' }, 'Access and update your personal information'),
              e('li', { key: 'right2' }, 'Request deletion of your data'),
              e('li', { key: 'right3' }, 'Opt-out of marketing communications'),
              e('li', { key: 'right4' }, 'Data portability where applicable')
            ])
          ]),

          e('section', {
            key: 'contact',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'contact-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Contact Us'),
            e('p', {
              key: 'contact-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@cush.com or through our support system.')
          ])
        ])
      ])
    ])
  ]);
}

// Terms of Use Page Component
function TermsOfUsePage() {
  return e('div', { className: 'min-h-screen bg-gray-50' }, [
    // Navigation Header
    e('nav', {
      key: 'nav',
      className: 'bg-white shadow-sm border-b border-gray-200'
    }, [
      e('div', {
        key: 'nav-container',
        className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      }, [
        e('div', {
          key: 'nav-content',
          className: 'flex items-center justify-between h-16'
        }, [
          e('div', {
            key: 'nav-left',
            className: 'flex items-center gap-4'
          }, [
            e('button', {
              key: 'back-btn',
              onClick: () => window.navigate('home'),
              className: 'text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-2'
            }, ['← Back to Home']),
            e('h1', {
              key: 'page-title',
              className: 'text-xl font-semibold text-gray-900'
            }, 'Terms of Use')
          ])
        ])
      ])
    ]),

    // Main Content
    e('main', {
      key: 'main',
      className: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
    }, [
      e('div', {
        key: 'content',
        className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8'
      }, [
        e('div', {
          key: 'header',
          className: 'text-center mb-8'
        }, [
          e('h1', {
            key: 'title',
            className: 'text-3xl font-bold text-gray-900 mb-2'
          }, 'Terms of Use'),
          e('p', {
            key: 'subtitle',
            className: 'text-gray-600'
          }, 'Last updated: July 9, 2025')
        ]),

        e('div', {
          key: 'sections',
          className: 'prose prose-gray max-w-none'
        }, [
          e('section', {
            key: 'intro',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'intro-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Acceptance of Terms'),
            e('p', {
              key: 'intro-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'By accessing and using the Cush platform, you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.'),
            e('p', {
              key: 'intro-text2',
              className: 'text-gray-700 leading-relaxed'
            }, 'These terms may be updated from time to time, and continued use of the platform constitutes acceptance of any changes.')
          ]),

          e('section', {
            key: 'services',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'services-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Description of Services'),
            e('p', {
              key: 'services-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'Cush provides immigration services including:'),
            e('ul', {
              key: 'services-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'service1' }, 'Immigration consultation and guidance'),
              e('li', { key: 'service2' }, 'Financial services and loan referrals'),
              e('li', { key: 'service3' }, 'Community support and networking'),
              e('li', { key: 'service4' }, 'AI-powered immigration assistance (Imisi)'),
              e('li', { key: 'service5' }, 'Job discovery and placement services')
            ])
          ]),

          e('section', {
            key: 'user-responsibilities',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'user-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'User Responsibilities'),
            e('p', {
              key: 'user-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'As a user of our platform, you agree to:'),
            e('ul', {
              key: 'user-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'resp1' }, 'Provide accurate and complete information'),
              e('li', { key: 'resp2' }, 'Maintain the security of your account credentials'),
              e('li', { key: 'resp3' }, 'Use the platform only for lawful purposes'),
              e('li', { key: 'resp4' }, 'Respect the rights and privacy of other users'),
              e('li', { key: 'resp5' }, 'Comply with all applicable laws and regulations')
            ])
          ]),

          e('section', {
            key: 'prohibited',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'prohibited-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Prohibited Activities'),
            e('p', {
              key: 'prohibited-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'You may not:'),
            e('ul', {
              key: 'prohibited-list',
              className: 'list-disc list-inside text-gray-700 mb-4 space-y-2'
            }, [
              e('li', { key: 'prob1' }, 'Use the platform for illegal activities'),
              e('li', { key: 'prob2' }, 'Interfere with the platform\'s operation'),
              e('li', { key: 'prob3' }, 'Attempt to gain unauthorized access to systems'),
              e('li', { key: 'prob4' }, 'Upload malicious content or viruses'),
              e('li', { key: 'prob5' }, 'Violate intellectual property rights')
            ])
          ]),

          e('section', {
            key: 'limitations',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'limitations-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Limitations of Liability'),
            e('p', {
              key: 'limitations-text',
              className: 'text-gray-700 leading-relaxed mb-4'
            }, 'Cush provides services on an "as is" basis. We make no warranties about the accuracy, completeness, or reliability of our services. To the maximum extent permitted by law, we disclaim all liability for any damages arising from your use of our platform.'),
            e('p', {
              key: 'limitations-text2',
              className: 'text-gray-700 leading-relaxed'
            }, 'Immigration laws and regulations are complex and subject to change. We recommend consulting with qualified legal professionals for specific immigration matters.')
          ]),

          e('section', {
            key: 'termination',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'termination-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Termination'),
            e('p', {
              key: 'termination-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'We reserve the right to terminate or suspend your account and access to our services at our sole discretion, without notice, for conduct that violates these Terms of Use or is harmful to other users, us, or third parties.')
          ]),

          e('section', {
            key: 'governing-law',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'law-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Governing Law'),
            e('p', {
              key: 'law-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'These Terms of Use are governed by and construed in accordance with applicable laws. Any disputes arising under these terms will be subject to the exclusive jurisdiction of the competent courts.')
          ]),

          e('section', {
            key: 'contact',
            className: 'mb-8'
          }, [
            e('h2', {
              key: 'contact-title',
              className: 'text-2xl font-semibold text-gray-900 mb-4'
            }, 'Contact Information'),
            e('p', {
              key: 'contact-text',
              className: 'text-gray-700 leading-relaxed'
            }, 'If you have any questions about these Terms of Use, please contact us at legal@cush.com or through our support system.')
          ])
        ])
      ])
    ])
  ]);
}

// Main App Router Component
function AppRouter({ user }) {
  // Handle auth completion from Firebase redirect first
  if (window.location.hash === '#auth-complete') {
    const handleAuthCompletion = async () => {
      const authData = sessionStorage.getItem('firebase_auth_result');
      if (authData) {
        try {
          const userData = JSON.parse(authData);
          sessionStorage.removeItem('firebase_auth_result');
          
          console.log('Processing Firebase auth completion:', userData.email);
          
          // Sync with backend
          const backendUser = await window.syncFirebaseUserWithBackend(userData, false);
          
          if (backendUser) {
            console.log('Auth completion successful, redirecting to dashboard');
            
            // Show enhanced success notification
            if (window.showEnhancedSuccessNotification) {
              const displayName = userData.displayName || `${userData.email.split('@')[0]}`;
              window.showEnhancedSuccessNotification(displayName, 'login');
            }
            
            // Add delay before redirect to show notification
            setTimeout(() => {
              window.location.hash = 'dashboard';
              window.dispatchEvent(new Event('hashchange'));
            }, 2000);
            return;
          }
        } catch (error) {
          console.error('Auth completion failed:', error);
        }
      }
      // If auth completion failed, redirect to signin
      window.location.hash = 'signin';
      window.dispatchEvent(new Event('hashchange'));
    };
    
    handleAuthCompletion();
    
    // Return loading screen while processing
    return e('div', { 
      className: 'flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100' 
    }, [
      e('div', { key: 'loading', className: 'text-center p-8 bg-white rounded-lg shadow-lg' }, [
        e('div', { key: 'icon', className: 'text-6xl mb-4' }, '🔐'),
        e('h2', { key: 'title', className: 'text-2xl font-semibold mb-2' }, 'Completing Sign-In'),
        e('p', { key: 'subtitle', className: 'text-gray-600' }, 'Processing your authentication...')
      ])
    ]);
  }

  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash.substring(1) || 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const newRoute = window.location.hash.substring(1) || 'home';
      setCurrentRoute(newRoute);
      
      // Track page view with analytics
      if (window.trackPageView) {
        window.trackPageView(newRoute, {
          user_authenticated: user ? true : false,
          timestamp: new Date().toISOString()
        });
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    // Track initial page load
    const initialRoute = window.location.hash.substring(1) || 'home';
    if (window.trackPageView) {
      window.trackPageView(initialRoute, {
        user_authenticated: user ? true : false,
        is_initial_load: true
      });
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global navigate function with analytics tracking and auth support
  window.navigate = (route) => {
    // Track navigation event
    if (window.trackFeatureUsage) {
      window.trackFeatureUsage('navigation', 'page_change', {
        from_page: window.location.hash.substring(1) || 'home',
        to_page: route,
        navigation_method: 'function_call'
      });
    }
    
    // Use auth-aware navigation if available
    if (window.navigateWithAuthSupport) {
      window.navigateWithAuthSupport(route);
    } else {
      window.location.hash = route;
    }
    setCurrentRoute(route);
  };

  switch (currentRoute) {
    case 'signin':
      return e(SignInPage, { key: 'signin' });
    case 'signup':
      return e(SignUpPage, { key: 'signup' });
    case 'about':
      return e(AboutUsPage, { key: 'about' });
    case 'mentors':
      return e(MentorBookingPage, { key: 'mentors' });
    case 'privacy':
      return e(PrivacyPolicyPage, { key: 'privacy' });
    case 'terms':
      return e(TermsOfUsePage, { key: 'terms' });
    case 'dashboard':
      // Redirect to dashboard if user is authenticated
      if (user) {
        return e(Dashboard, { key: 'dashboard-from-router', user });
      }
      return e(Homepage, { key: 'homepage', user });
    case 'home':
    default:
      return e(Homepage, { key: 'homepage', user });
  }
}

// Comprehensive Admin Dashboard Component
function AdminDashboard({ user, onBack }) {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ role: '', verified: '' });
  const [loading, setLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [showAddMentor, setShowAddMentor] = useState(false);
  const [articles, setArticles] = useState([]);
  const [events, setEvents] = useState([]);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newMentor, setNewMentor] = useState({
    name: '',
    email: '',
    specialty: '',
    experience: '',
    bio: '',
    languages: '',
    certifications: '',
    profilePicture: '',
    availability: {
      timezone: 'EST',
      weekdays: []
    }
  });
  // Support management state
  const [supportTab, setSupportTab] = useState('tickets');
  const [supportStats, setSupportStats] = useState({});
  const [allTickets, setAllTickets] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [faqArticles, setFaqArticles] = useState([]);
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Handle profile picture upload
  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setNewMentor({ ...newMentor, profilePicture: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch dashboard statistics
  useEffect(() => {
    if (currentTab === 'overview') {
      fetchDashboardStats();
    } else if (currentTab === 'users') {
      fetchUsers();
    } else if (currentTab === 'mentors') {
      fetchMentors();
    } else if (currentTab === 'articles') {
      fetchArticles();
    } else if (currentTab === 'events') {
      fetchEvents();
    } else if (currentTab === 'activity') {
      fetchActivityLogs();
    } else if (currentTab === 'support') {
      fetchSupportData();
    }
  }, [currentTab, searchQuery, filters]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const stats = await response.json();
        setDashboardStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        ...(searchQuery && { search: searchQuery }),
        ...(filters.role && { role: filters.role }),
        ...(filters.verified && { verified: filters.verified })
      });

      const response = await fetch(`/api/admin/users/advanced?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/activity-logs');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentors');
      if (response.ok) {
        const data = await response.json();
        setMentors(data.mentors || []);
      }
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/articles');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      const [statsResponse, ticketsResponse, feedbackResponse, faqResponse] = await Promise.all([
        fetch('/api/admin/support/statistics'),
        fetch('/api/admin/support/tickets'),
        fetch('/api/admin/support/feedback'),
        fetch('/api/support/faq')
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setSupportStats(stats);
      }
      if (ticketsResponse.ok) {
        const tickets = await ticketsResponse.json();
        setAllTickets(tickets);
      }
      if (feedbackResponse.ok) {
        const feedback = await feedbackResponse.json();
        setAllFeedback(feedback);
      }
      if (faqResponse.ok) {
        const faqs = await faqResponse.json();
        setFaqArticles(faqs);
      }
    } catch (error) {
      console.error('Failed to fetch support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const replyToTicket = async (ticketId) => {
    const message = prompt('Enter your reply:');
    if (!message) return;
    
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        alert('Reply sent successfully!');
        fetchSupportData();
      } else {
        alert('Failed to send reply');
      }
    } catch (error) {
      alert('Failed to send reply');
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        alert('Ticket status updated successfully!');
        fetchSupportData();
      } else {
        alert('Failed to update ticket status');
      }
    } catch (error) {
      alert('Failed to update ticket status');
    }
  };

  const respondToFeedback = async (feedbackId) => {
    const notes = prompt('Enter admin notes:');
    if (!notes) return;
    
    try {
      const response = await fetch(`/api/admin/support/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed', adminNotes: notes })
      });
      
      if (response.ok) {
        alert('Feedback responded successfully!');
        fetchSupportData();
      } else {
        alert('Failed to respond to feedback');
      }
    } catch (error) {
      alert('Failed to respond to feedback');
    }
  };

  const updateFeedbackStatus = async (feedbackId, status) => {
    try {
      const response = await fetch(`/api/admin/support/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        alert('Feedback status updated successfully!');
        fetchSupportData();
      } else {
        alert('Failed to update feedback status');
      }
    } catch (error) {
      alert('Failed to update feedback status');
    }
  };

  const editFaqArticle = (articleId) => {
    const article = faqArticles.find(a => a.id === articleId);
    if (!article) return;
    
    const newTitle = prompt('Edit FAQ Title:', article.title || article.question);
    if (!newTitle) return;
    
    const newContent = prompt('Edit FAQ Content:', article.content || article.answer);
    if (!newContent) return;
    
    const category = prompt('Edit FAQ Category:', article.category || 'General');
    if (!category) return;
    
    updateFaqArticle(articleId, { title: newTitle, content: newContent, category });
  };

  const updateFaqArticle = async (articleId, data) => {
    try {
      const response = await fetch(`/api/support/faq/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        alert('FAQ article updated successfully!');
        fetchSupportData();
      } else {
        alert('Failed to update FAQ article');
      }
    } catch (error) {
      alert('Failed to update FAQ article');
    }
  };

  const addFaqArticle = async () => {
    const title = prompt('Enter FAQ Title:');
    if (!title) return;
    
    const content = prompt('Enter FAQ Content:');
    if (!content) return;
    
    const category = prompt('Enter FAQ Category:', 'General');
    if (!category) return;
    
    try {
      const response = await fetch('/api/support/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category })
      });
      
      if (response.ok) {
        alert('FAQ article added successfully!');
        fetchSupportData();
        setShowAddFaq(false);
      } else {
        alert('Failed to add FAQ article');
      }
    } catch (error) {
      alert('Failed to add FAQ article');
    }
  };

  const deleteFaqArticle = async (articleId) => {
    if (!confirm('Are you sure you want to delete this FAQ article?')) return;
    
    try {
      const response = await fetch(`/api/admin/support/faq/${articleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('FAQ article deleted successfully!');
        fetchSupportData();
      } else {
        alert('Failed to delete FAQ article');
      }
    } catch (error) {
      alert('Failed to delete FAQ article');
    }
  };

  const addMentor = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const mentorData = {
        ...newMentor,
        languages: newMentor.languages.split(',').map(lang => lang.trim()),
        certifications: newMentor.certifications.split(',').map(cert => cert.trim())
      };
      
      console.log('Sending mentor data:', mentorData);
      
      const response = await fetch('/api/admin/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mentorData)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        fetchMentors();
        setShowAddMentor(false);
        setNewMentor({
          name: '',
          email: '',
          specialty: '',
          experience: '',
          bio: '',
          languages: '',
          certifications: '',
          profilePicture: '',
          availability: {
            timezone: 'EST',
            weekdays: []
          }
        });
        alert('Mentor added successfully');
      } else {
        const error = await response.json();
        console.error('Mentor creation error:', error);
        alert(error.error || `Failed to add mentor: ${error.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Mentor creation network error:', error);
      alert('Failed to add mentor: Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteMentor = async (mentorId) => {
    if (!confirm('Are you sure you want to delete this mentor? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/mentors/${mentorId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMentors();
        alert('Mentor deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete mentor');
      }
    } catch (error) {
      alert('Failed to delete mentor');
    }
  };

  const deleteArticle = async (articleId) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchArticles();
        alert('Article deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete article');
      }
    } catch (error) {
      alert('Failed to delete article');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchEvents();
        alert('Event deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete event');
      }
    } catch (error) {
      alert('Failed to delete event');
    }
  };



  const toggleMentorStatus = async (mentorId, isActive) => {
    try {
      const response = await fetch(`/api/admin/mentors/${mentorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        fetchMentors();
        alert(`Mentor ${!isActive ? 'activated' : 'deactivated'} successfully`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update mentor status');
      }
    } catch (error) {
      alert('Failed to update mentor status');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
        alert('User deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        fetchUsers();
        alert(`User role updated to ${newRole}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update role');
      }
    } catch (error) {
      alert('Failed to update user role');
    }
  };

  const makeUserMentor = async (userId) => {
    const specialty = prompt('Enter mentor specialty (Professional/Career, Legal, Entrepreneurship, Tech Dev):');
    if (!specialty) return;

    const bio = prompt('Enter mentor bio:');
    if (!bio) return;

    const experience = prompt('Enter experience level:');
    if (!experience) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/make-mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty, bio, experience })
      });

      if (response.ok) {
        fetchUsers();
        alert('User converted to mentor successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to convert user to mentor');
      }
    } catch (error) {
      alert('Failed to convert user to mentor');
    }
  };

  const restrictUser = async (userId) => {
    const reason = prompt('Enter restriction reason:');
    if (!reason) return;

    const restrictionType = prompt('Enter restriction type (account_suspended, feature_limited, login_restricted, transaction_blocked):');
    if (!restrictionType) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictionType, reason })
      });

      if (response.ok) {
        alert('User restricted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to restrict user');
      }
    } catch (error) {
      alert('Failed to restrict user');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return e('div', { className: 'min-h-screen bg-gray-50' }, [
    // Header
    e('div', {
      key: 'header',
      className: 'bg-white shadow-sm border-b border-gray-200'
    }, [
      e('div', { className: 'flex items-center justify-between px-6 py-4' }, [
        e('div', { key: 'title-section', className: 'flex items-center gap-3' }, [
          e('button', {
            key: 'back-button',
            onClick: onBack,
            className: 'text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors'
          }, '← Back to Dashboard'),
          e('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900' }, 'Admin Panel'),
          e('span', { key: 'role-badge', className: 'bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full' }, 'Administrator')
        ]),
        e('div', { key: 'admin-info', className: 'text-sm text-gray-600' }, `Logged in as ${user.firstName} ${user.lastName}`)
      ])
    ]),

    // Tab Navigation
    e('div', {
      key: 'tab-nav',
      className: 'bg-white border-b border-gray-200'
    }, [
      e('div', { className: 'container mx-auto px-6' }, [
        e('nav', { className: 'flex space-x-8' }, [
          ['overview', 'Overview', '📊'],
          ['users', 'User Management', '👥'],
          ['mentors', 'Mentor Management', '👨‍🏫'],
          ['support', 'Support Management', '🎧'],
          ['articles', 'Articles', '📝'],
          ['events', 'Events', '🎯'],
          ['activity', 'Activity Logs', '📋']
        ].map(([tab, label, icon]) =>
          e('button', {
            key: tab,
            onClick: () => setCurrentTab(tab),
            className: `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              currentTab === tab 
                ? 'border-purple-500 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } transition-colors`
          }, [
            e('span', { key: 'icon' }, icon),
            label
          ])
        ))
      ])
    ]),

    // Content Area
    e('div', {
      key: 'content',
      className: 'container mx-auto px-6 py-8'
    }, [
      // Overview Tab
      currentTab === 'overview' && e('div', { key: 'overview-content' }, [
        // Platform Vital Signs
        e('div', {
          key: 'vital-stats',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'
        }, dashboardStats ? [
          {
            title: 'Total Users',
            value: dashboardStats.totalUsers.toLocaleString(),
            icon: '👥',
            color: 'blue'
          },
          {
            title: 'Administrators',
            value: dashboardStats.totalAdministrators.toLocaleString(),
            icon: '👨‍💼',
            color: 'purple'
          },
          {
            title: 'Mentors',
            value: dashboardStats.totalMentors.toLocaleString(),
            icon: '👨‍🏫',
            color: 'green'
          },
          {
            title: 'Monthly Active',
            value: dashboardStats.monthlyActiveUsers.toLocaleString(),
            icon: '📈',
            color: 'orange'
          },
          {
            title: 'Total Transactions',
            value: dashboardStats.totalTransactions.toLocaleString(),
            icon: '💳',
            color: 'indigo'
          },
          {
            title: 'Articles',
            value: dashboardStats.totalInsights.toLocaleString(),
            icon: '📝',
            color: 'teal'
          },
          {
            title: 'Events',
            value: dashboardStats.totalEvents.toLocaleString(),
            icon: '🎯',
            color: 'pink'
          },
          {
            title: 'Platform Balance',
            value: formatCurrency(parseFloat(dashboardStats.totalBalance)),
            icon: '💰',
            color: 'yellow'
          }
        ].map((stat, index) =>
          e('div', {
            key: `stat-${stat.title}-${index}`,
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow'
          }, [
            e('div', { key: 'header', className: 'flex items-center justify-between' }, [
              e('div', { key: 'title', className: 'text-sm font-medium text-gray-600' }, stat.title),
              e('span', { key: 'icon', className: 'text-2xl' }, stat.icon)
            ]),
            e('div', { key: 'value', className: 'mt-2 text-3xl font-bold text-gray-900' }, stat.value),
            e('div', { 
              key: 'indicator', 
              className: `mt-1 h-1 w-full rounded-full bg-${stat.color}-200`
            })
          ])
        ) : [
          e('div', {
            key: 'loading',
            className: 'col-span-4 text-center py-8 text-gray-500'
          }, loading ? 'Loading statistics...' : 'Failed to load statistics')
        ]),

        // Platform Health & Performance
        dashboardStats && e('div', {
          key: 'platform-health',
          className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'
        }, [
          // Platform Health Metrics
          e('div', {
            key: 'health-metrics',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Platform Health'),
            e('div', { key: 'health-stats', className: 'space-y-4' }, [
              e('div', { key: 'engagement', className: 'flex items-center justify-between' }, [
                e('span', { key: 'label', className: 'text-sm font-medium text-gray-600' }, 'Engagement Rate'),
                e('span', { key: 'value', className: 'text-sm font-bold text-green-600' }, `${dashboardStats.platformHealth.engagementRate}%`)
              ]),
              e('div', { key: 'growth', className: 'flex items-center justify-between' }, [
                e('span', { key: 'label', className: 'text-sm font-medium text-gray-600' }, 'User Growth (30d)'),
                e('span', { key: 'value', className: 'text-sm font-bold text-blue-600' }, `+${dashboardStats.recentSignups}`)
              ]),
              e('div', { key: 'volume', className: 'flex items-center justify-between' }, [
                e('span', { key: 'label', className: 'text-sm font-medium text-gray-600' }, 'Transaction Volume'),
                e('span', { key: 'value', className: 'text-sm font-bold text-purple-600' }, 
                  formatCurrency(dashboardStats.platformHealth.transactionVolume))
              ])
            ])
          ]),

          // Recent Activity
          e('div', {
            key: 'recent-activity',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Recent Activity'),
            e('div', { key: 'activity-list', className: 'space-y-3' }, [
              e('div', { key: 'recent-signups', className: 'flex items-center text-sm' }, [
                e('span', { key: 'icon', className: 'text-green-500 mr-2' }, '•'),
                e('span', { key: 'text' }, `${dashboardStats.recentSignups} new users in the last 30 days`)
              ]),
              e('div', { key: 'active-users', className: 'flex items-center text-sm' }, [
                e('span', { key: 'icon', className: 'text-blue-500 mr-2' }, '•'),
                e('span', { key: 'text' }, `${dashboardStats.monthlyActiveUsers} active users this month`)
              ]),
              e('div', { key: 'avg-transactions', className: 'flex items-center text-sm' }, [
                e('span', { key: 'icon', className: 'text-purple-500 mr-2' }, '•'),
                e('span', { key: 'text' }, `${dashboardStats.avgTransactionsPerUser} avg transactions per user`)
              ])
            ])
          ])
        ]),

        // Interactive Data Visualizations
        dashboardStats && dashboardStats.chartData && e('div', {
          key: 'data-visualizations',
          className: 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'
        }, [
          // User Growth Chart
          e('div', {
            key: 'user-growth-chart',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'User Growth Trend'),
            e(InteractiveChart, {
              key: 'chart',
              type: 'line',
              data: {
                labels: dashboardStats.chartData.userGrowth.map(d => d.month),
                datasets: [{
                  label: 'New Users',
                  data: dashboardStats.chartData.userGrowth.map(d => d.users),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              },
              options: {
                plugins: {
                  title: {
                    display: true,
                    text: 'Monthly User Registrations'
                  }
                }
              }
            })
          ]),

          // Transaction Volume Chart
          e('div', {
            key: 'transaction-volume-chart',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Transaction Volume'),
            e(InteractiveChart, {
              key: 'chart',
              type: 'bar',
              data: {
                labels: dashboardStats.chartData.transactionVolume.map(d => d.month),
                datasets: [{
                  label: 'Transaction Count',
                  data: dashboardStats.chartData.transactionVolume.map(d => d.count),
                  backgroundColor: 'rgba(16, 185, 129, 0.8)',
                  borderColor: 'rgb(16, 185, 129)',
                  borderWidth: 1
                }]
              },
              options: {
                plugins: {
                  title: {
                    display: true,
                    text: 'Monthly Transaction Activity'
                  }
                }
              }
            })
          ]),

          // Role Distribution Chart
          e('div', {
            key: 'role-distribution-chart',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'User Role Distribution'),
            e(InteractiveChart, {
              key: 'chart',
              type: 'doughnut',
              data: {
                labels: dashboardStats.chartData.roleDistribution.map(d => d.role.charAt(0).toUpperCase() + d.role.slice(1)),
                datasets: [{
                  data: dashboardStats.chartData.roleDistribution.map(d => d.count),
                  backgroundColor: [
                    'rgba(147, 51, 234, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                  ],
                  borderColor: [
                    'rgb(147, 51, 234)',
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)'
                  ],
                  borderWidth: 2
                }]
              },
              options: {
                plugins: {
                  title: {
                    display: true,
                    text: 'Platform User Types'
                  }
                }
              }
            })
          ]),

          // Daily Activity Chart
          e('div', {
            key: 'daily-activity-chart',
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Daily Activity Trends'),
            e(InteractiveChart, {
              key: 'chart',
              type: 'line',
              data: {
                labels: dashboardStats.chartData.activityTrends.map(d => d.day),
                datasets: [{
                  label: 'Daily Logins',
                  data: dashboardStats.chartData.activityTrends.map(d => d.logins),
                  borderColor: 'rgb(245, 158, 11)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  fill: true,
                  tension: 0.4
                }, {
                  label: 'Daily Transactions',
                  data: dashboardStats.chartData.activityTrends.map(d => d.transactions),
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              },
              options: {
                plugins: {
                  title: {
                    display: true,
                    text: 'Last 7 Days Activity'
                  }
                }
              }
            })
          ])
        ]),

        // Last Signed In Users
        dashboardStats && dashboardStats.lastSignedInUsers && dashboardStats.lastSignedInUsers.length > 0 && e('div', {
          key: 'last-signed-in',
          className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
        }, [
          e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Recently Signed In Users'),
          e('div', { key: 'users-list', className: 'overflow-x-auto' }, [
            e('table', { key: 'table', className: 'min-w-full divide-y divide-gray-200' }, [
              e('thead', { key: 'thead', className: 'bg-gray-50' }, [
                e('tr', { key: 'header-row' }, [
                  e('th', { key: 'name', className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Name'),
                  e('th', { key: 'email', className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Email'),
                  e('th', { key: 'role', className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Role'),
                  e('th', { key: 'last-login', className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Last Login')
                ])
              ]),
              e('tbody', { key: 'tbody', className: 'bg-white divide-y divide-gray-200' }, 
                dashboardStats.lastSignedInUsers.map((user, index) =>
                  e('tr', { key: `user-${user.id}`, className: 'hover:bg-gray-50' }, [
                    e('td', { key: 'name-cell', className: 'px-4 py-4 text-sm font-medium text-gray-900' }, 
                      `${user.firstName} ${user.lastName}`),
                    e('td', { key: 'email-cell', className: 'px-4 py-4 text-sm text-gray-500' }, user.email),
                    e('td', { key: 'role-cell', className: 'px-4 py-4' }, [
                      e('span', {
                        key: 'role-badge',
                        className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`
                      }, user.role)
                    ]),
                    e('td', { key: 'login-cell', className: 'px-4 py-4 text-sm text-gray-500' }, 
                      user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never')
                  ])
                )
              )
            ])
          ])
        ])
      ]),

      // Users Management Tab
      currentTab === 'users' && e('div', { key: 'users-content' }, [
        // Search and Filter Controls
        e('div', {
          key: 'controls',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'
        }, [
          e('div', { key: 'search-filters', className: 'flex flex-wrap gap-4' }, [
            e('input', {
              key: 'search-input',
              type: 'text',
              placeholder: 'Search users...',
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: 'flex-1 min-w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
            }),
            e('select', {
              key: 'role-filter',
              value: filters.role,
              onChange: (e) => setFilters({ ...filters, role: e.target.value }),
              className: 'px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
            }, [
              e('option', { key: 'all-roles', value: '' }, 'All Roles'),
              e('option', { key: 'admin', value: 'admin' }, 'Admin'),
              e('option', { key: 'customer', value: 'customer' }, 'Customer')
            ])
          ])
        ]),

        // Users Table
        e('div', {
          key: 'users-table',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'
        }, [
          e('div', { key: 'table-container', className: 'overflow-x-auto' }, [
            e('table', { key: 'table', className: 'min-w-full divide-y divide-gray-200' }, [
              // Table Header
              e('thead', { key: 'thead', className: 'bg-gray-50' }, [
                e('tr', { key: 'header-row' }, [
                  e('th', { key: 'name-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'User'),
                  e('th', { key: 'role-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Role'),
                  e('th', { key: 'status-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                  e('th', { key: 'created-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Created'),
                  e('th', { key: 'actions-header', className: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Actions')
                ])
              ]),

              // Table Body
              e('tbody', { key: 'tbody', className: 'bg-white divide-y divide-gray-200' }, 
                users.length > 0 ? users.map((userItem) =>
                  e('tr', {
                    key: userItem.id,
                    className: 'hover:bg-gray-50'
                  }, [
                    e('td', { key: 'user-info', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('div', { key: 'user-details' }, [
                        e('div', { key: 'name', className: 'text-sm font-medium text-gray-900' }, 
                          `${userItem.firstName} ${userItem.lastName}`),
                        e('div', { key: 'email', className: 'text-sm text-gray-500' }, userItem.email)
                      ])
                    ]),
                    e('td', { key: 'role-cell', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('span', {
                        key: 'role-badge',
                        className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userItem.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`
                      }, userItem.role)
                    ]),
                    e('td', { key: 'status-cell', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('span', {
                        key: 'status-badge',
                        className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userItem.isEmailVerified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`
                      }, userItem.isEmailVerified ? 'Verified' : 'Unverified')
                    ]),
                    e('td', { key: 'created-cell', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' }, 
                      formatDate(userItem.createdAt)),
                    e('td', { key: 'actions-cell', className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                      e('div', { key: 'action-buttons', className: 'flex items-center justify-end gap-2' }, [
                        e('button', {
                          key: 'toggle-role',
                          onClick: () => updateUserRole(userItem.id, userItem.role === 'admin' ? 'customer' : 'admin'),
                          className: 'text-blue-600 hover:text-blue-900 text-xs px-2 py-1 rounded hover:bg-blue-50'
                        }, userItem.role === 'admin' ? 'Make Customer' : 'Make Admin'),
                        userItem.role !== 'mentor' && e('button', {
                          key: 'make-mentor',
                          onClick: () => makeUserMentor(userItem.id),
                          className: 'text-green-600 hover:text-green-900 text-xs px-2 py-1 rounded hover:bg-green-50'
                        }, 'Make Mentor'),
                        e('button', {
                          key: 'restrict',
                          onClick: () => restrictUser(userItem.id),
                          className: 'text-yellow-600 hover:text-yellow-900 text-xs px-2 py-1 rounded hover:bg-yellow-50'
                        }, 'Restrict'),
                        userItem.id !== user.id && e('button', {
                          key: 'delete',
                          onClick: () => deleteUser(userItem.id),
                          className: 'text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded hover:bg-red-50'
                        }, 'Delete')
                      ])
                    ])
                  ])
                ) : [
                  e('tr', { key: 'no-users' }, [
                    e('td', { key: 'no-users-message', className: 'px-6 py-4 text-center text-gray-500', colSpan: '5' }, 
                      loading ? 'Loading users...' : 'No users found')
                  ])
                ]
              )
            ])
          ])
        ])
      ]),

      // Mentors Management Tab
      currentTab === 'mentors' && e('div', { key: 'mentors-content' }, [
        // Add Mentor Button
        e('div', {
          key: 'mentor-actions',
          className: 'flex justify-between items-center mb-6'
        }, [
          e('h2', {
            key: 'mentors-title',
            className: 'text-2xl font-bold text-gray-900'
          }, 'Mentor Management'),
          e('button', {
            key: 'add-mentor-btn',
            onClick: () => setShowAddMentor(true),
            className: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors'
          }, '+ Add Mentor')
        ]),

        // Mentors List
        e('div', {
          key: 'mentors-grid',
          className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
        }, mentors.length > 0 ? mentors.map((mentor) =>
          e('div', {
            key: `mentor-${mentor.id}`,
            className: 'bg-white rounded-xl p-6 shadow-lg border'
          }, [
            e('div', {
              key: 'mentor-header',
              className: 'flex items-start gap-4 mb-4'
            }, [
              e('div', {
                key: 'avatar',
                className: 'w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold'
              }, mentor.name ? mentor.name.split(' ').map(n => n[0]).join('') : 'M'),
              e('div', {
                key: 'mentor-info',
                className: 'flex-1'
              }, [
                e('h3', {
                  key: 'name',
                  className: 'text-xl font-bold text-gray-900'
                }, mentor.name),
                e('p', {
                  key: 'specialty',
                  className: 'text-blue-600 font-medium'
                }, mentor.specialty),
                e('div', {
                  key: 'stats',
                  className: 'flex items-center gap-4 mt-2 text-sm text-gray-600'
                }, [
                  e('span', { key: 'experience' }, mentor.experience),
                  e('span', { 
                    key: 'status',
                    className: mentor.isActive ? 'text-green-600' : 'text-red-600'
                  }, mentor.isActive ? 'Active' : 'Inactive')
                ])
              ])
            ]),
            e('p', {
              key: 'bio',
              className: 'text-gray-600 mb-4 line-clamp-3'
            }, mentor.bio),
            e('div', {
              key: 'languages',
              className: 'flex flex-wrap gap-2 mb-4'
            }, (mentor.languages || []).map((lang, index) =>
              e('span', {
                key: `lang-${index}`,
                className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm'
              }, lang)
            )),
            e('div', {
              key: 'actions',
              className: 'flex gap-2'
            }, [
              e('button', {
                key: 'toggle-status',
                onClick: () => toggleMentorStatus(mentor.id, mentor.isActive),
                className: `flex-1 px-3 py-2 rounded-lg transition-colors ${
                  mentor.isActive 
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`
              }, mentor.isActive ? 'Deactivate' : 'Activate'),
              e('button', {
                key: 'delete-mentor',
                onClick: () => deleteMentor(mentor.id),
                className: 'px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors'
              }, 'Delete')
            ])
          ])
        ) : [
          e('div', {
            key: 'no-mentors',
            className: 'col-span-full text-center py-12 text-gray-500'
          }, loading ? 'Loading mentors...' : 'No mentors found. Add your first mentor!')
        ])
      ]),

      // Support Management Tab
      currentTab === 'support' && e('div', { key: 'support-content' }, [
        // Support Statistics
        e('div', {
          key: 'support-stats',
          className: 'grid md:grid-cols-4 gap-6 mb-8'
        }, [
          e('div', { key: 'total-tickets', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
            e('div', { className: 'flex items-center justify-between' }, [
              e('div', {}, [
                e('p', { className: 'text-sm text-gray-600' }, 'Total Tickets'),
                e('p', { className: 'text-2xl font-bold text-gray-900' }, supportStats.totalTickets || 0)
              ]),
              e('div', { className: 'p-3 bg-blue-100 rounded-lg' }, [
                e('span', { className: 'text-2xl' }, '📋')
              ])
            ])
          ]),
          e('div', { key: 'pending-tickets', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
            e('div', { className: 'flex items-center justify-between' }, [
              e('div', {}, [
                e('p', { className: 'text-sm text-gray-600' }, 'Pending Tickets'),
                e('p', { className: 'text-2xl font-bold text-yellow-600' }, supportStats.pendingTickets || 0)
              ]),
              e('div', { className: 'p-3 bg-yellow-100 rounded-lg' }, [
                e('span', { className: 'text-2xl' }, '⏳')
              ])
            ])
          ]),
          e('div', { key: 'feedback-count', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
            e('div', { className: 'flex items-center justify-between' }, [
              e('div', {}, [
                e('p', { className: 'text-sm text-gray-600' }, 'Total Feedback'),
                e('p', { className: 'text-2xl font-bold text-green-600' }, supportStats.totalFeedback || 0)
              ]),
              e('div', { className: 'p-3 bg-green-100 rounded-lg' }, [
                e('span', { className: 'text-2xl' }, '💬')
              ])
            ])
          ]),
          e('div', { key: 'faq-articles', className: 'bg-white p-6 rounded-lg shadow-sm border' }, [
            e('div', { className: 'flex items-center justify-between' }, [
              e('div', {}, [
                e('p', { className: 'text-sm text-gray-600' }, 'FAQ Articles'),
                e('p', { className: 'text-2xl font-bold text-purple-600' }, supportStats.faqArticles || 0)
              ]),
              e('div', { className: 'p-3 bg-purple-100 rounded-lg' }, [
                e('span', { className: 'text-2xl' }, '❓')
              ])
            ])
          ])
        ]),

        // Support Tabs
        e('div', { className: 'bg-white rounded-lg shadow-sm border' }, [
          e('div', { className: 'border-b border-gray-200' }, [
            e('nav', { className: 'flex space-x-8 px-6' }, [
              e('button', {
                onClick: () => setSupportTab('tickets'),
                className: `py-4 px-2 border-b-2 font-medium text-sm ${
                  supportTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }, 'Support Tickets'),
              e('button', {
                onClick: () => setSupportTab('feedback'),
                className: `py-4 px-2 border-b-2 font-medium text-sm ${
                  supportTab === 'feedback'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }, 'User Feedback'),
              e('button', {
                onClick: () => setSupportTab('faq'),
                className: `py-4 px-2 border-b-2 font-medium text-sm ${
                  supportTab === 'faq'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }, 'FAQ Management')
            ])
          ]),

          e('div', { className: 'p-6' }, [
            // Support Tickets Tab
            supportTab === 'tickets' && e('div', { className: 'space-y-4' }, [
              allTickets.length > 0 ? allTickets.map((ticket) =>
                e('div', { key: ticket.id, className: 'bg-gray-50 border border-gray-200 rounded-lg p-4' }, [
                  e('div', { className: 'flex items-start justify-between' }, [
                    e('div', { className: 'flex-1' }, [
                      e('div', { className: 'flex items-center space-x-3 mb-2' }, [
                        e('h3', { className: 'font-semibold text-gray-900' }, ticket.subject || ticket.title),
                        e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                          ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }` }, ticket.status?.replace('_', ' ').toUpperCase()),
                        e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }` }, ticket.priority?.toUpperCase())
                      ]),
                      e('p', { className: 'text-gray-600 mb-3' }, ticket.description),
                      e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500' }, [
                        e('span', {}, `#${ticket.ticketNumber}`),
                        e('span', {}, ticket.category),
                        e('span', {}, `User ID: ${ticket.userId}`),
                        e('span', {}, new Date(ticket.createdAt).toLocaleDateString())
                      ])
                    ]),
                    e('div', { className: 'flex space-x-2' }, [
                      e('button', {
                        onClick: () => replyToTicket(ticket.id),
                        className: 'bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700'
                      }, 'Reply'),
                      e('button', {
                        onClick: () => updateTicketStatus(ticket.id, 'resolved'),
                        className: 'bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700'
                      }, 'Resolve')
                    ])
                  ])
                ])
              ) : e('div', { className: 'text-center py-8 text-gray-500' }, [
                e('span', { className: 'text-4xl mb-4 block' }, '📋'),
                e('p', {}, 'No support tickets found')
              ])
            ]),

            // User Feedback Tab
            supportTab === 'feedback' && e('div', { className: 'space-y-4' }, [
              allFeedback.length > 0 ? allFeedback.map((feedback) =>
                e('div', { key: feedback.id, className: 'bg-gray-50 border border-gray-200 rounded-lg p-4' }, [
                  e('div', { className: 'flex items-start justify-between' }, [
                    e('div', { className: 'flex-1' }, [
                      e('div', { className: 'flex items-center space-x-3 mb-2' }, [
                        e('h3', { className: 'font-semibold text-gray-900' }, feedback.title),
                        e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${
                          feedback.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          feedback.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                          feedback.status === 'implemented' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }` }, feedback.status?.toUpperCase()),
                        e('div', { className: 'flex items-center space-x-1' }, [
                          e('span', { className: 'text-yellow-400' }, '⭐'),
                          e('span', { className: 'text-sm' }, `${feedback.rating}/5`)
                        ])
                      ]),
                      e('p', { className: 'text-gray-600 mb-3' }, feedback.message || feedback.description),
                      e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500' }, [
                        e('span', {}, feedback.feedbackType?.replace('_', ' ').toUpperCase()),
                        e('span', {}, feedback.category),
                        e('span', {}, `User ID: ${feedback.userId}`),
                        e('span', {}, new Date(feedback.createdAt).toLocaleDateString())
                      ])
                    ]),
                    e('div', { className: 'flex space-x-2' }, [
                      e('button', {
                        onClick: () => respondToFeedback(feedback.id),
                        className: 'bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700'
                      }, 'Respond'),
                      e('button', {
                        onClick: () => updateFeedbackStatus(feedback.id, 'reviewed'),
                        className: 'bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700'
                      }, 'Mark Reviewed')
                    ])
                  ])
                ])
              ) : e('div', { className: 'text-center py-8 text-gray-500' }, [
                e('span', { className: 'text-4xl mb-4 block' }, '💬'),
                e('p', {}, 'No user feedback found')
              ])
            ]),

            // FAQ Management Tab
            supportTab === 'faq' && e('div', { className: 'space-y-4' }, [
              e('div', { className: 'flex justify-between items-center mb-6' }, [
                e('h3', { className: 'text-lg font-semibold text-gray-900' }, 'FAQ Articles'),
                e('button', {
                  onClick: () => addFaqArticle(),
                  className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'
                }, 'Add FAQ Article')
              ]),
              
              faqArticles.length > 0 ? faqArticles.map((article) =>
                e('div', { key: article.id, className: 'bg-gray-50 border border-gray-200 rounded-lg p-4' }, [
                  e('div', { className: 'flex items-start justify-between' }, [
                    e('div', { className: 'flex-1' }, [
                      e('h3', { className: 'font-semibold text-gray-900 mb-2' }, article.question || article.title),
                      e('p', { className: 'text-gray-600 mb-3' }, article.answer || article.content),
                      e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500' }, [
                        e('span', {}, article.category),
                        e('span', {}, `${article.viewCount || 0} views`),
                        e('span', {}, `${article.isHelpful || 0} helpful`),
                        e('span', {}, new Date(article.createdAt).toLocaleDateString())
                      ])
                    ]),
                    e('div', { className: 'flex space-x-2' }, [
                      e('button', {
                        onClick: () => editFaqArticle(article.id),
                        className: 'bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700'
                      }, 'Edit'),
                      e('button', {
                        onClick: () => deleteFaqArticle(article.id),
                        className: 'bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700'
                      }, 'Delete')
                    ])
                  ])
                ])
              ) : e('div', { className: 'text-center py-8 text-gray-500' }, [
                e('span', { className: 'text-4xl mb-4 block' }, '❓'),
                e('p', {}, 'No FAQ articles found')
              ])
            ])
          ])
        ])
      ]),

      // Add Mentor Modal
      showAddMentor && e('div', {
        key: 'add-mentor-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowAddMentor(false);
          }
        }
      }, [
        e('div', {
          key: 'modal-content',
          className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          e('div', {
            key: 'modal-header',
            className: 'p-6 border-b'
          }, [
            e('div', {
              key: 'header-content',
              className: 'flex justify-between items-center'
            }, [
              e('h2', {
                key: 'modal-title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Add New Mentor'),
              e('button', {
                key: 'close-modal',
                onClick: () => setShowAddMentor(false),
                className: 'text-gray-400 hover:text-gray-600 text-2xl'
              }, '×')
            ])
          ]),
          e('form', {
            key: 'add-mentor-form',
            onSubmit: addMentor,
            className: 'p-6 space-y-6'
          }, [
            e('div', {
              key: 'form-grid',
              className: 'grid md:grid-cols-2 gap-6'
            }, [
              e('div', { key: 'name-field' }, [
                e('label', {
                  key: 'name-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Full Name'),
                e('input', {
                  key: 'name-input',
                  type: 'text',
                  required: true,
                  value: newMentor.name,
                  onChange: (e) => setNewMentor({ ...newMentor, name: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                })
              ]),
              e('div', { key: 'email-field' }, [
                e('label', {
                  key: 'email-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Email'),
                e('input', {
                  key: 'email-input',
                  type: 'email',
                  required: true,
                  value: newMentor.email,
                  onChange: (e) => setNewMentor({ ...newMentor, email: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                })
              ]),
              e('div', { key: 'specialty-field' }, [
                e('label', {
                  key: 'specialty-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Specialty'),
                e('select', {
                  key: 'specialty-input',
                  required: true,
                  value: newMentor.specialty,
                  onChange: (e) => setNewMentor({ ...newMentor, specialty: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }, [
                  e('option', { key: 'default-specialty', value: '' }, 'Select Specialty'),
                  e('option', { key: 'professional', value: 'Professional/Career' }, 'Professional/Career'),
                  e('option', { key: 'legal', value: 'Legal' }, 'Legal'),
                  e('option', { key: 'entrepreneurship', value: 'Entrepreneurship' }, 'Entrepreneurship'),
                  e('option', { key: 'techdev', value: 'Tech Dev' }, 'Tech Dev')
                ])
              ]),
              e('div', { key: 'experience-field' }, [
                e('label', {
                  key: 'experience-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Experience'),
                e('input', {
                  key: 'experience-input',
                  type: 'text',
                  required: true,
                  placeholder: 'e.g., 5+ years',
                  value: newMentor.experience,
                  onChange: (e) => setNewMentor({ ...newMentor, experience: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                })
              ]),

              e('div', { key: 'languages-field' }, [
                e('label', {
                  key: 'languages-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Languages (comma-separated)'),
                e('input', {
                  key: 'languages-input',
                  type: 'text',
                  required: true,
                  placeholder: 'English, Spanish, French',
                  value: newMentor.languages,
                  onChange: (e) => setNewMentor({ ...newMentor, languages: e.target.value }),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                })
              ])
            ]),
            e('div', { key: 'profile-picture-field' }, [
              e('label', {
                key: 'profile-picture-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Profile Picture'),
              e('div', {
                key: 'profile-picture-container',
                className: 'flex items-center space-x-4'
              }, [
                newMentor.profilePicture && e('div', {
                  key: 'profile-preview',
                  className: 'w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300'
                }, [
                  e('img', {
                    key: 'preview-image',
                    src: newMentor.profilePicture,
                    alt: 'Profile preview',
                    className: 'w-full h-full object-cover'
                  })
                ]),
                e('input', {
                  key: 'profile-picture-input',
                  type: 'file',
                  accept: 'image/*',
                  onChange: handleProfilePictureUpload,
                  className: 'flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer'
                }),
                newMentor.profilePicture && e('button', {
                  key: 'remove-picture',
                  type: 'button',
                  onClick: () => setNewMentor({ ...newMentor, profilePicture: '' }),
                  className: 'px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50'
                }, 'Remove')
              ])
            ]),
            e('div', { key: 'bio-field' }, [
              e('label', {
                key: 'bio-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Bio'),
              e('textarea', {
                key: 'bio-input',
                required: true,
                rows: 4,
                value: newMentor.bio,
                onChange: (e) => setNewMentor({ ...newMentor, bio: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            ]),
            e('div', { key: 'certifications-field' }, [
              e('label', {
                key: 'certifications-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Certifications (comma-separated)'),
              e('input', {
                key: 'certifications-input',
                type: 'text',
                placeholder: 'RCIC, MARA, OISC Level 3',
                value: newMentor.certifications,
                onChange: (e) => setNewMentor({ ...newMentor, certifications: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            ]),
            e('div', {
              key: 'form-actions',
              className: 'flex gap-3 pt-4'
            }, [
              e('button', {
                key: 'cancel-btn',
                type: 'button',
                onClick: () => setShowAddMentor(false),
                className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors'
              }, 'Cancel'),
              e('button', {
                key: 'submit-btn',
                type: 'submit',
                disabled: loading,
                className: 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50'
              }, loading ? 'Adding...' : 'Add Mentor')
            ])
          ])
        ])
      ]),

      // Add Article Modal
      showAddArticle && e('div', {
        key: 'add-article-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowAddArticle(false);
          }
        }
      }, [
        e('div', {
          key: 'modal-content',
          className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          e('div', {
            key: 'modal-header',
            className: 'p-6 border-b'
          }, [
            e('div', {
              key: 'header-content',
              className: 'flex justify-between items-center'
            }, [
              e('h2', {
                key: 'modal-title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Create New Article'),
              e('button', {
                key: 'close-modal',
                onClick: () => setShowAddArticle(false),
                className: 'text-gray-400 hover:text-gray-600 text-2xl'
              }, '×')
            ])
          ]),
          e('form', {
            key: 'add-article-form',
            onSubmit: async (e) => {
              e.preventDefault();
              setLoading(true);
              
              const formData = new FormData(e.target);
              const articleData = {
                title: formData.get('title'),
                category: formData.get('category'),
                content: formData.get('content'),
                excerpt: formData.get('excerpt'),
                tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
                readTime: parseInt(formData.get('readTime')) || 5,
                isPublic: formData.get('isPublic') === 'on'
              };

              try {
                const response = await fetch('/api/admin/articles', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(articleData)
                });

                if (response.ok) {
                  setShowAddArticle(false);
                  fetchArticles();
                  alert('Article created successfully!');
                } else {
                  const error = await response.json();
                  alert(error.error || 'Failed to create article');
                }
              } catch (error) {
                alert('Failed to create article');
              } finally {
                setLoading(false);
              }
            },
            className: 'p-6 space-y-6'
          }, [
            e('div', { key: 'title-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Title'),
              e('input', {
                type: 'text',
                name: 'title',
                required: true,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'category-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Category'),
              e('select', {
                name: 'category',
                required: true,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }, [
                e('option', { value: '' }, 'Select a category'),
                e('option', { value: 'immigration' }, 'Immigration'),
                e('option', { value: 'financial' }, 'Financial'),
                e('option', { value: 'career' }, 'Career'),
                e('option', { value: 'education' }, 'Education'),
                e('option', { value: 'lifestyle' }, 'Lifestyle')
              ])
            ]),
            e('div', { key: 'excerpt-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Excerpt'),
              e('textarea', {
                name: 'excerpt',
                rows: 3,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'content-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Content'),
              e('textarea', {
                name: 'content',
                required: true,
                rows: 8,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'tags-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tags (comma-separated)'),
              e('input', {
                type: 'text',
                name: 'tags',
                placeholder: 'visa, canada, immigration',
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'read-time-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Read Time (minutes)'),
              e('input', {
                type: 'number',
                name: 'readTime',
                min: 1,
                max: 60,
                defaultValue: 5,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'public-field', className: 'flex items-center gap-2' }, [
              e('input', {
                type: 'checkbox',
                name: 'isPublic',
                defaultChecked: true,
                className: 'w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
              }),
              e('label', { className: 'text-sm font-medium text-gray-700' }, 'Make article public')
            ]),
            e('div', { key: 'form-actions', className: 'flex gap-3 pt-4' }, [
              e('button', {
                type: 'button',
                onClick: () => setShowAddArticle(false),
                className: 'flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors'
              }, 'Cancel'),
              e('button', {
                type: 'submit',
                disabled: loading,
                className: 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50'
              }, loading ? 'Creating...' : 'Create Article')
            ])
          ])
        ])
      ]),

      // Add Event Modal
      showAddEvent && e('div', {
        key: 'add-event-modal',
        className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
        onClick: (e) => {
          if (e.target === e.currentTarget) {
            setShowAddEvent(false);
          }
        }
      }, [
        e('div', {
          key: 'modal-content',
          className: 'bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          e('div', {
            key: 'modal-header',
            className: 'p-6 border-b'
          }, [
            e('div', {
              key: 'header-content',
              className: 'flex justify-between items-center'
            }, [
              e('h2', {
                key: 'modal-title',
                className: 'text-2xl font-bold text-gray-900'
              }, 'Create New Event'),
              e('button', {
                key: 'close-modal',
                onClick: () => setShowAddEvent(false),
                className: 'text-gray-400 hover:text-gray-600 text-2xl'
              }, '×')
            ])
          ]),
          e('form', {
            key: 'add-event-form',
            onSubmit: async (e) => {
              e.preventDefault();
              setLoading(true);
              
              const formData = new FormData(e.target);
              const eventData = {
                title: formData.get('title'),
                description: formData.get('description'),
                date: new Date(formData.get('date')),
                type: formData.get('type'),
                location: formData.get('location'),
                duration: parseInt(formData.get('duration')) || 60,
                maxParticipants: parseInt(formData.get('maxParticipants')) || 100,
                category: formData.get('category'),
                tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
                isPublic: formData.get('isPublic') === 'on'
              };

              try {
                const response = await fetch('/api/admin/events', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(eventData)
                });

                if (response.ok) {
                  setShowAddEvent(false);
                  fetchEvents();
                  alert('Event created successfully!');
                } else {
                  const error = await response.json();
                  alert(error.error || 'Failed to create event');
                }
              } catch (error) {
                alert('Failed to create event');
              } finally {
                setLoading(false);
              }
            },
            className: 'p-6 space-y-6'
          }, [
            e('div', { key: 'title-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Event Title'),
              e('input', {
                type: 'text',
                name: 'title',
                required: true,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'description-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Description'),
              e('textarea', {
                name: 'description',
                required: true,
                rows: 4,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'date-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Date & Time'),
              e('input', {
                type: 'datetime-local',
                name: 'date',
                required: true,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'type-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Event Type'),
              e('select', {
                name: 'type',
                defaultValue: 'webinar',
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              }, [
                e('option', { value: 'webinar' }, 'Webinar'),
                e('option', { value: 'workshop' }, 'Workshop'),
                e('option', { value: 'seminar' }, 'Seminar'),
                e('option', { value: 'networking' }, 'Networking'),
                e('option', { value: 'consultation' }, 'Consultation')
              ])
            ]),
            e('div', { key: 'location-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Location'),
              e('input', {
                type: 'text',
                name: 'location',
                defaultValue: 'Online',
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'duration-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Duration (minutes)'),
              e('input', {
                type: 'number',
                name: 'duration',
                min: 15,
                max: 480,
                defaultValue: 60,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'participants-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Max Participants'),
              e('input', {
                type: 'number',
                name: 'maxParticipants',
                min: 1,
                max: 1000,
                defaultValue: 100,
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'category-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Category'),
              e('select', {
                name: 'category',
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              }, [
                e('option', { value: '' }, 'Select a category'),
                e('option', { value: 'immigration' }, 'Immigration'),
                e('option', { value: 'financial' }, 'Financial'),
                e('option', { value: 'career' }, 'Career'),
                e('option', { value: 'education' }, 'Education'),
                e('option', { value: 'networking' }, 'Networking')
              ])
            ]),
            e('div', { key: 'tags-field' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tags (comma-separated)'),
              e('input', {
                type: 'text',
                name: 'tags',
                placeholder: 'visa, workshop, career',
                className: 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              })
            ]),
            e('div', { key: 'public-field', className: 'flex items-center gap-2' }, [
              e('input', {
                type: 'checkbox',
                name: 'isPublic',
                defaultChecked: true,
                className: 'w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500'
              }),
              e('label', { className: 'text-sm font-medium text-gray-700' }, 'Make event public')
            ]),
            e('div', { key: 'form-actions', className: 'flex gap-3 pt-4' }, [
              e('button', {
                type: 'button',
                onClick: () => setShowAddEvent(false),
                className: 'flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors'
              }, 'Cancel'),
              e('button', {
                type: 'submit',
                disabled: loading,
                className: 'flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50'
              }, loading ? 'Creating...' : 'Create Event')
            ])
          ])
        ])
      ]),

      // Articles Management Tab
      currentTab === 'articles' && e('div', { key: 'articles-content' }, [
        e('div', {
          key: 'articles-header',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'
        }, [
          e('div', { key: 'header-row', className: 'flex items-center justify-between' }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Article Management'),
            e('button', {
              key: 'add-article',
              onClick: () => setShowAddArticle(true),
              className: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors'
            }, '📝 Add Article')
          ])
        ]),

        // Articles List
        e('div', {
          key: 'articles-list',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'
        }, [
          articles.length > 0 ? articles.map((article) =>
            e('div', {
              key: article.id,
              className: 'p-6 border-b border-gray-200 hover:bg-gray-50'
            }, [
              e('div', { key: 'article-header', className: 'flex items-start justify-between mb-3' }, [
                e('div', { key: 'article-info' }, [
                  e('h4', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, article.title),
                  e('p', { key: 'category', className: 'text-sm text-gray-600 mt-1' }, article.category),
                  e('p', { key: 'excerpt', className: 'text-sm text-gray-700 mt-2' }, article.excerpt || 'No excerpt available')
                ]),
                e('div', { key: 'article-actions', className: 'flex gap-2' }, [
                  e('button', {
                    key: 'edit',
                    onClick: () => console.log('Edit article', article.id),
                    className: 'text-blue-600 hover:text-blue-900 text-sm px-2 py-1 rounded hover:bg-blue-50'
                  }, 'Edit'),
                  e('button', {
                    key: 'delete',
                    onClick: () => deleteArticle(article.id),
                    className: 'text-red-600 hover:text-red-900 text-sm px-2 py-1 rounded hover:bg-red-50'
                  }, 'Delete')
                ])
              ]),
              e('div', { key: 'article-meta', className: 'flex items-center gap-4 text-sm text-gray-500' }, [
                e('span', { key: 'author' }, `By: ${article.author || 'Admin'}`),
                e('span', { key: 'read-time' }, `${article.readTime || 5} min read`),
                e('span', { key: 'created' }, `Created: ${formatDate(article.createdAt)}`)
              ])
            ])
          ) : e('div', {
            key: 'no-articles',
            className: 'p-8 text-center text-gray-500'
          }, 'No articles found. Create your first article!')
        ])
      ]),

      // Events Management Tab
      currentTab === 'events' && e('div', { key: 'events-content' }, [
        e('div', {
          key: 'events-header',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'
        }, [
          e('div', { key: 'header-row', className: 'flex items-center justify-between' }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Event Management'),
            e('button', {
              key: 'add-event',
              onClick: () => setShowAddEvent(true),
              className: 'bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors'
            }, '🎯 Add Event')
          ])
        ]),

        // Events List
        e('div', {
          key: 'events-list',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'
        }, [
          events.length > 0 ? events.map((event) =>
            e('div', {
              key: event.id,
              className: 'p-6 border-b border-gray-200 hover:bg-gray-50'
            }, [
              e('div', { key: 'event-header', className: 'flex items-start justify-between mb-3' }, [
                e('div', { key: 'event-info' }, [
                  e('h4', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, event.title),
                  e('p', { key: 'type', className: 'text-sm text-gray-600 mt-1' }, event.type || 'Event'),
                  e('p', { key: 'description', className: 'text-sm text-gray-700 mt-2' }, event.description)
                ]),
                e('div', { key: 'event-actions', className: 'flex gap-2' }, [
                  e('button', {
                    key: 'edit',
                    onClick: () => console.log('Edit event', event.id),
                    className: 'text-blue-600 hover:text-blue-900 text-sm px-2 py-1 rounded hover:bg-blue-50'
                  }, 'Edit'),
                  e('button', {
                    key: 'delete',
                    onClick: () => deleteEvent(event.id),
                    className: 'text-red-600 hover:text-red-900 text-sm px-2 py-1 rounded hover:bg-red-50'
                  }, 'Delete')
                ])
              ]),
              e('div', { key: 'event-meta', className: 'flex items-center gap-4 text-sm text-gray-500' }, [
                e('span', { key: 'date' }, `Date: ${formatDate(event.date)}`),
                e('span', { key: 'duration' }, `Duration: ${event.duration || 60} min`),
                e('span', { key: 'participants' }, `Max: ${event.maxParticipants || 100} people`),
                e('span', { key: 'location' }, event.location || 'Online')
              ])
            ])
          ) : e('div', {
            key: 'no-events',
            className: 'p-8 text-center text-gray-500'
          }, 'No events found. Create your first event!')
        ])
      ]),

      // Activity Logs Tab
      currentTab === 'activity' && e('div', { key: 'activity-content' }, [
        e('div', {
          key: 'activity-logs',
          className: 'bg-white rounded-lg shadow-sm border border-gray-200'
        }, [
          e('div', { key: 'activity-header', className: 'px-6 py-4 border-b border-gray-200' }, [
            e('h3', { key: 'title', className: 'text-lg font-semibold text-gray-900' }, 'Admin Activity Logs')
          ]),
          e('div', { key: 'activity-list', className: 'divide-y divide-gray-200' }, 
            activityLogs.length > 0 ? activityLogs.map((log, index) =>
              e('div', { key: index, className: 'px-6 py-4' }, [
                e('div', { key: 'log-content', className: 'flex items-center justify-between' }, [
                  e('div', { key: 'log-details' }, [
                    e('div', { key: 'action', className: 'text-sm font-medium text-gray-900' }, log.action),
                    e('div', { key: 'details', className: 'text-sm text-gray-600' }, log.details || 'No additional details'),
                    e('div', { key: 'timestamp', className: 'text-xs text-gray-500' }, formatDate(log.createdAt))
                  ]),
                  e('div', { key: 'log-meta', className: 'text-right' }, [
                    e('div', { key: 'admin', className: 'text-sm text-gray-600' }, `Admin ID: ${log.userId}`)
                  ])
                ])
              ])
            ) : [
              e('div', { key: 'no-logs', className: 'px-6 py-8 text-center text-gray-500' }, 
                loading ? 'Loading activity logs...' : 'No activity logs found')
            ]
          )
        ])
      ])
    ])
  ]);
}

// Imisi Chat Head Component  
function ImisiChatHead() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userProgress, setUserProgress] = useState({
    currentStep: 'assessment',
    completedSteps: [],
    migrationGoal: null,
    financialProfile: null
  });

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasNewSuggestion(false);
    if (!isOpen) {
      setIsMinimized(false);
      // Show proactive welcome message
      if (messages.length === 0) {
        setTimeout(() => {
          addMessage('ai', "Hi! I'm Imisi 2.0, your AI migration concierge. I can help with visa pathways, financial planning, and settlement guidance. What's your migration goal?", {
            type: 'welcome',
            suggestions: ['Skilled Worker Visa', 'Student Visa', 'Family Reunification', 'Investment Migration']
          });
        }, 800);
      }
    }
  };

  const addMessage = (sender, content, metadata = {}) => {
    const newMessage = {
      id: Date.now(),
      sender,
      content,
      timestamp: new Date().toLocaleTimeString(),
      metadata
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-scroll to bottom after adding message
    setTimeout(() => {
      const messagesContainer = document.querySelector('[data-messages-container]');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 150);
  };

  const processAIResponse = async (userMessage) => {
    setIsTyping(true);
    
    try {
      // Simulate AI processing with contextual responses
      const response = await generateImisiResponse(userMessage, userProgress);
      
      setTimeout(() => {
        addMessage('ai', response.message, response.metadata);
        
        // Update user progress based on conversation
        if (response.progressUpdate) {
          setUserProgress(prev => ({
            ...prev,
            ...response.progressUpdate
          }));
        }
        
        setIsTyping(false);
        
        // Extra scroll after AI response for better conversation flow
        setTimeout(() => {
          const messagesContainer = document.querySelector('[data-messages-container]');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 200);
      }, 1000 + Math.random() * 1500); // Realistic response time
      
    } catch (error) {
      setTimeout(() => {
        addMessage('ai', "I'm having connectivity issues. Please try again or contact our human concierge for immediate assistance.", {
          type: 'error',
          actions: [{ label: 'Contact Human Expert', action: 'escalate' }]
        });
        setIsTyping(false);
      }, 1000);
    }
  };

  const generateImisiResponse = async (message, progress) => {
    const lowerMessage = message.toLowerCase();
    
    // Financial Planning Responses
    if (lowerMessage.includes('budget') || lowerMessage.includes('cost') || lowerMessage.includes('money')) {
      return {
        message: "I'll help you create a migration budget. Typical costs include visa fees ($500-$5000), flights ($800-$2500), initial settlement funds ($10k-$50k). Which destination country are you considering?",
        metadata: {
          type: 'financial_planning',
          suggestions: ['Canada', 'Australia', 'UK', 'Germany', 'New Zealand'],
          actions: [{ label: 'Create Budget Plan', action: 'budget_tool' }]
        },
        progressUpdate: { currentStep: 'financial_planning' }
      };
    }
    
    // Visa Pathway Assessment
    if (lowerMessage.includes('visa') || lowerMessage.includes('eligibility') || lowerMessage.includes('qualify')) {
      return {
        message: "Let me assess your visa options. I need to know: your education level, work experience years, age, English proficiency, and target country. This determines your best pathway.",
        metadata: {
          type: 'eligibility_assessment',
          suggestions: ['Bachelor + 5yrs exp', 'Master + 2yrs exp', 'PhD + any exp', 'Skilled trades'],
          actions: [{ label: 'Start Assessment', action: 'eligibility_form' }]
        },
        progressUpdate: { currentStep: 'eligibility_assessment' }
      };
    }
    
    // Country-Specific Information
    if (lowerMessage.includes('canada')) {
      return {
        message: "Canada offers Express Entry (6-12 months), Provincial Nominee Programs, and student pathways. Average settlement cost: CAD 25k-40k. Strong healthcare, education systems. Need CRS score 470+.",
        metadata: {
          type: 'country_info',
          suggestions: ['Calculate CRS Score', 'PNP Programs', 'Job Market Info', 'Settlement Guide'],
          actions: [{ label: 'Canada Pathway Guide', action: 'country_guide' }]
        }
      };
    }
    
    if (lowerMessage.includes('australia')) {
      return {
        message: "Australia's SkillSelect system requires skilled occupation + points test. Processing: 4-12 months. Settlement costs: AUD 30k-50k. Excellent job market, quality of life. Points threshold: 65+.",
        metadata: {
          type: 'country_info',
          suggestions: ['Check Skills List', 'Points Calculator', 'State Nomination', 'Cost Breakdown'],
          actions: [{ label: 'Australia Guide', action: 'country_guide' }]
        }
      };
    }
    
    // Document Preparation
    if (lowerMessage.includes('document') || lowerMessage.includes('paperwork') || lowerMessage.includes('application')) {
      return {
        message: "Document checklist varies by visa type. Common needs: passport, education credentials, work references, language tests, police clearances, medical exams. I'll create your personalized list.",
        metadata: {
          type: 'document_prep',
          suggestions: ['Educational Assessment', 'Language Tests', 'Police Clearance', 'Medical Exam'],
          actions: [{ label: 'Generate Checklist', action: 'document_checklist' }]
        },
        progressUpdate: { currentStep: 'document_preparation' }
      };
    }
    
    // Timeline and Process
    if (lowerMessage.includes('timeline') || lowerMessage.includes('how long') || lowerMessage.includes('process')) {
      return {
        message: "Migration timelines: Skilled visas 6-18 months, student visas 2-8 weeks, family visas 12-36 months. Factors: completeness, country demand, processing backlogs. I'll create your timeline.",
        metadata: {
          type: 'timeline_info',
          suggestions: ['Express Processing', 'Document Delays', 'Interview Prep', 'Decision Factors'],
          actions: [{ label: 'Personal Timeline', action: 'timeline_generator' }]
        }
      };
    }
    
    // Settlement and Integration
    if (lowerMessage.includes('settle') || lowerMessage.includes('arrival') || lowerMessage.includes('integration')) {
      return {
        message: "Post-arrival priorities: SIN/TFN, bank account, phone plan, housing, healthcare registration. First 30 days are crucial. I'll guide you through essential tasks step-by-step.",
        metadata: {
          type: 'settlement_guide',
          suggestions: ['Banking Setup', 'Housing Search', 'Healthcare Access', 'Job Hunting'],
          actions: [{ label: 'Settlement Checklist', action: 'settlement_plan' }]
        },
        progressUpdate: { currentStep: 'settlement_planning' }
      };
    }
    
    // Job Market and Career
    if (lowerMessage.includes('job') || lowerMessage.includes('career') || lowerMessage.includes('work')) {
      return {
        message: "Job markets vary by occupation and location. Key factors: credential recognition, networking, local experience, industry demand. I'll help assess opportunities in your field.",
        metadata: {
          type: 'career_guidance',
          suggestions: ['Credential Assessment', 'Job Market Analysis', 'Networking Tips', 'Resume Adaptation'],
          actions: [{ label: 'Career Assessment', action: 'career_analysis' }]
        }
      };
    }
    
    // Default/General Response
    return {
      message: "I'm here to help with migration planning! I can assist with visa eligibility, financial budgeting, document preparation, country comparisons, and settlement planning. What specific area interests you?",
      metadata: {
        type: 'general',
        suggestions: ['Visa Options', 'Budget Planning', 'Country Comparison', 'Document Help', 'Settlement Guide'],
        actions: [{ label: 'Migration Assessment', action: 'full_assessment' }]
      }
    };
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    addMessage('user', inputMessage);
    processAIResponse(inputMessage);
    setInputMessage('');
  };

  const handleSuggestionClick = (suggestion) => {
    addMessage('user', suggestion);
    processAIResponse(suggestion);
  };

  const handleActionClick = (action) => {
    switch (action.action) {
      case 'escalate':
        addMessage('ai', "Connecting you with a human migration expert. They'll contact you within 2 hours via your registered email or phone.", {
          type: 'escalation'
        });
        break;
      case 'budget_tool':
        addMessage('ai', "Opening budget calculator... Please provide: destination country, visa type, family size, and timeline. I'll calculate comprehensive costs including pre-departure and settlement funds.", {
          type: 'tool_launch'
        });
        break;
      case 'eligibility_form':
        addMessage('ai', "Starting eligibility assessment... I'll ask about education, work experience, language skills, age, and funds. Takes 3-5 minutes for preliminary results.", {
          type: 'assessment_start',
          suggestions: ['Begin Assessment', 'Quick Eligibility Check']
        });
        break;
      default:
        addMessage('ai', "This feature will be available soon. For now, I can provide detailed guidance through our conversation. What specific help do you need?", {
          type: 'feature_coming_soon'
        });
    }
  };

  const getProgressIndicator = () => {
    const steps = ['assessment', 'financial_planning', 'document_preparation', 'application', 'settlement_planning'];
    const currentIndex = steps.indexOf(userProgress.currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;
    
    return (
      e('div', {
        key: 'progress',
        className: 'px-4 py-2 border-b border-gray-200'
      }, [
        e('div', {
          key: 'progress-label',
          className: 'text-xs text-gray-600 mb-1'
        }, 'Migration Progress'),
        e('div', {
          key: 'progress-bar',
          className: 'w-full bg-gray-200 rounded-full h-1.5'
        }, [
          e('div', {
            key: 'progress-fill',
            className: 'bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300',
            style: { width: `${progress}%` }
          })
        ]),
        e('div', {
          key: 'progress-text',
          className: 'text-xs text-gray-500 mt-1'
        }, `Step ${currentIndex + 1}/5: ${userProgress.currentStep.replace('_', ' ')}`)
      ])
    );
  };

  return e('div', { key: 'imisi-chathead' }, [
    // Floating Chat Button
    e('div', {
      key: 'chat-button',
      className: 'fixed bottom-6 right-6 z-50'
    }, [
      e('button', {
        key: 'chat-btn',
        onClick: toggleChat,
        className: `relative w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group overflow-hidden ${
          isOpen ? 'scale-110' : 'hover:scale-105'
        } ${hasNewSuggestion ? 'animate-bounce' : ''} shadow-blue-500/50 hover:shadow-blue-500/70`
      }, [
        // Glowing Ring Effect
        e('div', {
          key: 'glow-ring',
          className: 'absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-75 animate-pulse scale-110 blur-sm'
        }),
        
        // Animated Background
        e('div', {
          key: 'bg',
          className: 'absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full'
        }),
        
        // Icon Container
        e('div', {
          key: 'icon-container',
          className: 'relative z-10 transition-transform duration-200'
        }, [
          isOpen ? 
            e('span', { key: 'close', className: 'text-white text-2xl' }, '✕') :
            e('div', { key: 'chat-icon', className: 'flex items-center justify-center' }, [
              e('img', {
                key: 'avatar',
                src: '/attached_assets/vecteezy_young-afro-man_14070616-removebg-preview_1752023632708.png',
                alt: 'Imisi AI Assistant',
                className: 'w-12 h-12 rounded-full object-cover border-2 border-white/20'
              })
            ])
        ]),
        
        // Pulse Animation
        e('div', {
          key: 'pulse',
          className: 'absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20'
        }),
        
        // Online Indicator
        e('div', {
          key: 'online',
          className: 'absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center shadow-lg'
        }, [
          e('div', {
            key: 'pulse-dot',
            className: 'w-2 h-2 bg-green-600 rounded-full animate-pulse'
          })
        ]),

        // AI Badge
        e('div', {
          key: 'ai-label',
          className: 'absolute -bottom-1 -left-1 bg-white rounded-full px-2 py-0.5 shadow-md'
        }, [
          e('span', {
            key: 'ai-text',
            className: 'text-xs font-bold text-blue-600'
          }, 'AI')
        ])
      ])
    ]),

    // Chat Interface
    isOpen && e('div', {
      key: 'chat-interface',
      className: `fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-12' : 'h-[min(600px,calc(100vh-8rem))]'
      } sm:w-96 w-[calc(100vw-3rem)]`
    }, [
      // Header
      e('div', {
        key: 'chat-header',
        className: 'p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl'
      }, [
        e('div', {
          key: 'header-content',
          className: 'flex items-center gap-3'
        }, [
          e('div', {
            key: 'avatar',
            className: 'w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30'
          }, [
            e('img', {
              key: 'avatar-img',
              src: '/attached_assets/vecteezy_young-afro-man_14070616-removebg-preview_1752023632708.png',
              alt: 'Imisi AI Assistant',
              className: 'w-8 h-8 rounded-full object-cover'
            })
          ]),
          e('div', { key: 'info', className: 'flex-1' }, [
            e('h3', {
              key: 'title',
              className: 'font-semibold text-lg'
            }, 'Imisi 2.0'),
            e('p', {
              key: 'subtitle',
              className: 'text-sm opacity-90'
            }, 'AI Migration Concierge')
          ]),
          e('div', {
            key: 'controls',
            className: 'flex items-center gap-2'
          }, [
            e('div', {
              key: 'status',
              className: 'flex items-center gap-1'
            }, [
              e('div', {
                key: 'status-dot',
                className: 'w-2 h-2 bg-green-400 rounded-full animate-pulse'
              }),
              e('span', {
                key: 'status-text',
                className: 'text-xs font-medium'
              }, 'Online')
            ]),
            e('button', {
              key: 'minimize',
              onClick: () => setIsMinimized(!isMinimized),
              className: 'w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors'
            }, [
              e('span', {
                key: 'min-icon',
                className: 'text-sm'
              }, isMinimized ? '🤖' : '−')
            ])
          ])
        ])
      ]),

      // Chat Content (when not minimized)
      !isMinimized && e('div', {
        key: 'chat-content',
        className: 'flex-1 flex flex-col'
      }, [
        // Progress Indicator
        getProgressIndicator(),
        
        // Messages Area
        e('div', {
          key: 'messages',
          className: 'flex-1 p-4 overflow-y-auto scroll-smooth',
          style: { maxHeight: '400px' },
          'data-messages-container': true
        }, [
          // Empty state
          messages.length === 0 && e('div', {
            key: 'empty-state',
            className: 'text-center text-gray-500 py-8 animate-fade-in'
          }, [
            e('div', {
              key: 'bot-avatar',
              className: 'w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-blue-200 hover:scale-105 transition-transform duration-300'
            }, [
              e('img', {
                key: 'avatar-img',
                src: '/attached_assets/vecteezy_young-afro-man_14070616-removebg-preview_1752023632708.png',
                alt: 'Imisi AI Assistant',
                className: 'w-12 h-12 rounded-full object-cover'
              })
            ]),
            e('p', {
              key: 'ready-text',
              className: 'text-sm mb-2 font-medium text-gray-700'
            }, "Ready to help with your migration journey!"),
            e('p', {
              key: 'tap-text',
              className: 'text-xs text-gray-500'
            }, 'Start a conversation to get personalized guidance')
          ]),
          
          // Message list
          ...messages.map((message, index) => 
            e('div', {
              key: message.id,
              className: `flex ${message.sender === 'user' ? 'justify-end' : 'justify-start items-start gap-2'} mb-4`
            }, [
              // AI Avatar for AI messages
              message.sender === 'ai' && e('div', {
                key: 'ai-avatar',
                className: 'w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-blue-200 flex-shrink-0 mt-1'
              }, [
                e('img', {
                  key: 'ai-avatar-img',
                  src: '/attached_assets/vecteezy_young-afro-man_14070616-removebg-preview_1752023632708.png',
                  alt: 'Imisi AI',
                  className: 'w-4 h-4 rounded-full object-cover'
                })
              ]),
              
              e('div', {
                key: 'message-bubble',
                className: `max-w-[75%] rounded-lg px-4 py-3 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm' 
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`
              }, [
                e('p', {
                  key: 'content',
                  className: 'text-sm leading-relaxed whitespace-pre-wrap'
                }, message.content),
                
                e('div', {
                  key: 'timestamp',
                  className: `text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`
                }, message.timestamp),
                
                // AI message suggestions and actions
                message.sender === 'ai' && message.metadata?.suggestions && e('div', {
                  key: 'suggestions',
                  className: 'mt-3 space-y-1'
                }, message.metadata.suggestions.map((suggestion, i) =>
                  e('button', {
                    key: i,
                    onClick: () => handleSuggestionClick(suggestion),
                    className: 'block w-full text-left text-xs bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded px-2 py-1 transition-all'
                  }, suggestion)
                )),
                
                message.sender === 'ai' && message.metadata?.actions && e('div', {
                  key: 'actions',
                  className: 'mt-3 space-y-1'
                }, message.metadata.actions.map((action, i) =>
                  e('button', {
                    key: i,
                    onClick: () => handleActionClick(action),
                    className: 'block text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded px-3 py-1 transition-all'
                  }, action.label)
                ))
              ])
            ])
          ),
          
          // Typing indicator
          isTyping && e('div', {
            key: 'typing',
            className: 'flex justify-start items-start gap-2 mb-4'
          }, [
            e('div', {
              key: 'typing-avatar',
              className: 'w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-blue-200 flex-shrink-0 mt-1'
            }, [
              e('img', {
                key: 'typing-avatar-img',
                src: '/attached_assets/vecteezy_young-afro-man_14070616-removebg-preview_1752023632708.png',
                alt: 'Imisi AI',
                className: 'w-4 h-4 rounded-full object-cover'
              })
            ]),
            e('div', {
              key: 'typing-bubble',
              className: 'bg-gray-100 rounded-lg rounded-bl-sm px-4 py-3'
            }, [
              e('div', {
                key: 'typing-animation',
                className: 'flex space-x-1'
              }, [
                e('div', { key: 'dot1', className: 'w-2 h-2 bg-gray-400 rounded-full animate-pulse' }),
                e('div', { key: 'dot2', className: 'w-2 h-2 bg-gray-400 rounded-full animate-pulse', style: { animationDelay: '0.2s' } }),
                e('div', { key: 'dot3', className: 'w-2 h-2 bg-gray-400 rounded-full animate-pulse', style: { animationDelay: '0.4s' } })
              ])
            ])
          ])
        ]),

        // Input Area
        e('div', {
          key: 'input-area',
          className: 'border-t bg-gray-50 p-4'
        }, [
          e('div', {
            key: 'input-form',
            className: 'flex gap-3'
          }, [
            e('input', {
              key: 'message-input',
              type: 'text',
              value: inputMessage,
              onChange: (e) => setInputMessage(e.target.value),
              onKeyPress: (e) => e.key === 'Enter' && handleSendMessage(),
              placeholder: 'Ask about visas, budgets, timelines...',
              disabled: isTyping,
              className: 'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 bg-white shadow-sm'
            }),
            e('button', {
              key: 'send-btn',
              onClick: handleSendMessage,
              disabled: !inputMessage.trim() || isTyping,
              className: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-5 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg'
            }, [
              e('span', { key: 'send-icon', className: 'text-sm font-medium' }, isTyping ? '⏳' : '→')
            ])
          ])
        ])
      ])
    ])
  ]);
}

// Enhanced Settings Page Component
function SettingsPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    nationality: user?.nationality || '',
    profilePicture: user?.profilePicture || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'File size must be less than 5MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select an image file');
      return;
    }
    
    setUploadingPicture(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        const response = await fetch('/api/profile/picture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ image: base64Data })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setProfileForm(prev => ({ ...prev, profilePicture: data.profilePicture }));
          showMessage('success', 'Profile picture updated successfully!');
        } else {
          showMessage('error', data.error || 'Failed to update profile picture');
        }
        
        setUploadingPicture(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      showMessage('error', 'Error uploading profile picture');
      setUploadingPicture(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showMessage('success', 'Profile updated successfully!');
        // Update user data in parent component would be ideal here
      } else {
        showMessage('error', data.error || 'Profile update failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      showMessage('error', 'New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showMessage('success', 'Password changed successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showMessage('error', data.error || 'Password change failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return e('div', { className: 'max-w-5xl mx-auto' }, [
    // Header
    e('div', {
      key: 'header',
      className: 'flex items-center justify-between mb-8'
    }, [
      e('div', { key: 'title-section' }, [
        e('button', {
          key: 'back-btn',
          onClick: onBack,
          className: 'text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2 transition-colors'
        }, ['← Back to Dashboard']),
        e('h1', {
          key: 'title',
          className: 'text-3xl font-bold text-gray-900'
        }, 'Settings'),
        e('p', {
          key: 'subtitle',
          className: 'text-gray-600 mt-2'
        }, 'Manage your account, security, and preferences')
      ])
    ]),

    // Message display
    message.text && e('div', {
      key: 'message',
      className: `mb-6 p-4 rounded-lg ${
        message.type === 'success' 
          ? 'bg-green-50 border border-green-200 text-green-800' 
          : 'bg-red-50 border border-red-200 text-red-800'
      }`
    }, message.text),

    // Tab Navigation
    e('div', {
      key: 'tabs',
      className: 'bg-white rounded-xl shadow-lg overflow-hidden'
    }, [
      e('div', {
        key: 'tab-headers',
        className: 'flex border-b border-gray-200'
      }, [
        e('button', {
          key: 'profile-tab',
          onClick: () => setActiveTab('profile'),
          className: `px-6 py-4 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`
        }, 'Profile Information'),
        e('button', {
          key: 'security-tab',
          onClick: () => setActiveTab('security'),
          className: `px-6 py-4 font-medium transition-colors ${
            activeTab === 'security'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`
        }, 'Security')
      ]),

      // Tab Content
      e('div', {
        key: 'tab-content',
        className: 'p-8'
      }, [
        // Profile Tab
        activeTab === 'profile' && e('form', {
          key: 'profile-form',
          onSubmit: handleProfileUpdate,
          className: 'space-y-6'
        }, [
          e('div', {
            key: 'form-header',
            className: 'pb-4 border-b border-gray-200'
          }, [
            e('h2', {
              key: 'form-title',
              className: 'text-xl font-semibold text-gray-900'
            }, 'Personal Information'),
            e('p', {
              key: 'form-desc',
              className: 'text-gray-600 mt-1'
            }, 'Update your personal details and contact information')
          ]),

          // Profile Picture Section
          e('div', {
            key: 'profile-picture-section',
            className: 'space-y-4'
          }, [
            e('h3', {
              key: 'picture-title',
              className: 'text-lg font-medium text-gray-900'
            }, 'Profile Picture'),
            e('div', {
              key: 'picture-upload',
              className: 'flex items-center space-x-6'
            }, [
              e('div', {
                key: 'current-picture',
                className: 'w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center'
              }, [
                profileForm.profilePicture ? 
                  e('img', {
                    key: 'profile-img',
                    src: profileForm.profilePicture,
                    alt: 'Profile Picture',
                    className: 'w-full h-full object-cover'
                  }) :
                  e('svg', {
                    key: 'default-avatar',
                    className: 'w-12 h-12 text-gray-400',
                    fill: 'currentColor',
                    viewBox: '0 0 24 24'
                  }, [
                    e('path', {
                      key: 'avatar-path',
                      d: 'M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z'
                    })
                  ])
              ]),
              e('div', {
                key: 'upload-actions',
                className: 'flex flex-col space-y-2'
              }, [
                e('label', {
                  key: 'upload-label',
                  className: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2'
                }, [
                  uploadingPicture ? 
                    e('span', { key: 'uploading' }, 'Uploading...') :
                    e('span', { key: 'upload-text' }, 'Upload New Picture'),
                  e('input', {
                    key: 'file-input',
                    type: 'file',
                    accept: 'image/*',
                    onChange: handleProfilePictureUpload,
                    className: 'hidden',
                    disabled: uploadingPicture
                  })
                ]),
                e('p', {
                  key: 'upload-info',
                  className: 'text-sm text-gray-500'
                }, 'JPG, PNG up to 5MB')
              ])
            ])
          ]),

          e('div', {
            key: 'name-fields',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
          }, [
            e('div', { key: 'first-name' }, [
              e('label', {
                key: 'first-name-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'First Name'),
              e('input', {
                key: 'first-name-input',
                type: 'text',
                value: profileForm.firstName,
                onChange: (e) => setProfileForm({ ...profileForm, firstName: e.target.value }),
                className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
                placeholder: 'Enter your first name'
              })
            ]),
            e('div', { key: 'last-name' }, [
              e('label', {
                key: 'last-name-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Last Name'),
              e('input', {
                key: 'last-name-input',
                type: 'text',
                value: profileForm.lastName,
                onChange: (e) => setProfileForm({ ...profileForm, lastName: e.target.value }),
                className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
                placeholder: 'Enter your last name'
              })
            ])
          ]),

          e('div', { key: 'email-field' }, [
            e('label', {
              key: 'email-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Email Address'),
            e('input', {
              key: 'email-input',
              type: 'email',
              value: profileForm.email,
              onChange: (e) => setProfileForm({ ...profileForm, email: e.target.value }),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              placeholder: 'Enter your email address'
            })
          ]),

          e('div', {
            key: 'contact-fields',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-6'
          }, [
            e('div', { key: 'phone' }, [
              e('label', {
                key: 'phone-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Phone Number'),
              e('input', {
                key: 'phone-input',
                type: 'tel',
                value: profileForm.phoneNumber,
                onChange: (e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value }),
                className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
                placeholder: 'Enter your phone number'
              })
            ]),
            e('div', { key: 'nationality' }, [
              e('label', {
                key: 'nationality-label',
                className: 'block text-sm font-medium text-gray-700 mb-2'
              }, 'Nationality'),
              e('input', {
                key: 'nationality-input',
                type: 'text',
                value: profileForm.nationality,
                onChange: (e) => setProfileForm({ ...profileForm, nationality: e.target.value }),
                className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
                placeholder: 'Enter your nationality'
              })
            ])
          ]),

          e('div', {
            key: 'profile-actions',
            className: 'pt-6 border-t border-gray-200'
          }, [
            e('button', {
              key: 'save-profile',
              type: 'submit',
              disabled: loading,
              className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none'
            }, loading ? 'Saving...' : 'Save Changes')
          ])
        ]),

        // Security Tab
        activeTab === 'security' && e('form', {
          key: 'security-form',
          onSubmit: handlePasswordChange,
          className: 'space-y-6'
        }, [
          e('div', {
            key: 'security-header',
            className: 'pb-4 border-b border-gray-200'
          }, [
            e('h2', {
              key: 'security-title',
              className: 'text-xl font-semibold text-gray-900'
            }, 'Change Password'),
            e('p', {
              key: 'security-desc',
              className: 'text-gray-600 mt-1'
            }, 'Update your password to keep your account secure')
          ]),

          e('div', { key: 'current-password' }, [
            e('label', {
              key: 'current-password-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Current Password'),
            e('input', {
              key: 'current-password-input',
              type: 'password',
              value: passwordForm.currentPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value }),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              placeholder: 'Enter your current password',
              required: true
            })
          ]),

          e('div', { key: 'new-password' }, [
            e('label', {
              key: 'new-password-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'New Password'),
            e('input', {
              key: 'new-password-input',
              type: 'password',
              value: passwordForm.newPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value }),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              placeholder: 'Enter your new password',
              required: true
            }),
            e('p', {
              key: 'password-help',
              className: 'text-sm text-gray-500 mt-1'
            }, 'Password must be at least 8 characters long')
          ]),

          e('div', { key: 'confirm-password' }, [
            e('label', {
              key: 'confirm-password-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Confirm New Password'),
            e('input', {
              key: 'confirm-password-input',
              type: 'password',
              value: passwordForm.confirmPassword,
              onChange: (e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }),
              className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              placeholder: 'Confirm your new password',
              required: true
            })
          ]),

          e('div', {
            key: 'security-actions',
            className: 'pt-6 border-t border-gray-200'
          }, [
            e('button', {
              key: 'change-password',
              type: 'submit',
              disabled: loading,
              className: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none'
            }, loading ? 'Changing Password...' : 'Change Password')
          ])
        ])
      ])
    ])
  ]);
}

// About Us Page Component
function AboutUsPage() {
  return e('div', { className: 'min-h-screen bg-white' }, [
    // Navigation Header
    e('header', {
      key: 'nav',
      className: 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-lg'
    }, [
      e('div', {
        key: 'nav-container',
        className: 'container mx-auto px-6 py-4'
      }, [
        e('div', {
          key: 'nav-content',
          className: 'flex items-center justify-between'
        }, [
          e('button', {
            key: 'logo',
            onClick: () => navigate('home'),
            className: 'flex items-center hover:opacity-80 transition-opacity'
          }, [
            e('img', {
              key: 'logo-image',
              src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
              alt: 'Cush Logo',
              className: 'h-8 w-auto'
            })
          ]),
          e('button', {
            key: 'back-home',
            onClick: () => navigate('home'),
            className: 'text-white/90 hover:text-white font-medium transition-colors'
          }, '← Back to Home')
        ])
      ])
    ]),

    // Hero Section
    e('section', {
      key: 'hero',
      className: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-20'
    }, [
      e('div', {
        key: 'hero-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'hero-content',
          className: 'max-w-4xl mx-auto text-center'
        }, [
          e('h1', {
            key: 'title',
            className: 'text-5xl md:text-6xl font-bold mb-6'
          }, 'About Us'),
          e('p', {
            key: 'subtitle',
            className: 'text-xl md:text-2xl text-blue-100 leading-relaxed'
          }, 'Empowering global immigration journeys through innovation, expertise, and unwavering support.')
        ])
      ])
    ]),

    // Our Story Section
    e('section', {
      key: 'story',
      className: 'py-20 bg-white'
    }, [
      e('div', {
        key: 'story-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'story-content',
          className: 'max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'
        }, [
          e('div', { key: 'story-text' }, [
            e('h2', {
              key: 'story-title',
              className: 'text-4xl font-bold text-gray-900 mb-6'
            }, 'Our Story'),
            e('p', {
              key: 'story-p1',
              className: 'text-lg text-gray-600 mb-6 leading-relaxed'
            }, 'Founded with a vision to democratize global mobility, Cush emerged from the personal experiences of immigrants who understood the challenges of navigating complex immigration systems.'),
            e('p', {
              key: 'story-p2',
              className: 'text-lg text-gray-600 mb-6 leading-relaxed'
            }, 'What started as a solution to help one family has grown into a comprehensive platform serving thousands of immigrants worldwide, providing the tools, resources, and support needed to turn immigration dreams into reality.'),
            e('div', {
              key: 'story-stats',
              className: 'grid grid-cols-2 gap-6 mt-8'
            }, [
              e('div', { key: 'stat1', className: 'text-center' }, [
                e('div', {
                  key: 'number1',
                  className: 'text-3xl font-bold text-blue-600'
                }, '50,000+'),
                e('div', {
                  key: 'label1',
                  className: 'text-gray-600 font-medium'
                }, 'Immigrants Served')
              ]),
              e('div', { key: 'stat2', className: 'text-center' }, [
                e('div', {
                  key: 'number2',
                  className: 'text-3xl font-bold text-blue-600'
                }, '95%'),
                e('div', {
                  key: 'label2',
                  className: 'text-gray-600 font-medium'
                }, 'Success Rate')
              ])
            ])
          ]),
          e('div', {
            key: 'story-image',
            className: 'relative'
          }, [
            e('img', {
              key: 'about-image',
              src: '/attached_assets/about us_1751499874141.jpg',
              alt: 'About Us',
              className: 'w-full h-96 object-cover rounded-2xl shadow-2xl'
            }),
            e('div', {
              key: 'image-overlay',
              className: 'absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent rounded-2xl'
            })
          ])
        ])
      ])
    ]),

    // Our Mission Section
    e('section', {
      key: 'mission',
      className: 'py-20 bg-gradient-to-br from-blue-50 to-indigo-50'
    }, [
      e('div', {
        key: 'mission-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'mission-content',
          className: 'max-w-4xl mx-auto text-center'
        }, [
          e('h2', {
            key: 'mission-title',
            className: 'text-4xl font-bold text-gray-900 mb-8'
          }, 'Our Mission'),
          e('p', {
            key: 'mission-text',
            className: 'text-xl text-gray-600 leading-relaxed mb-12'
          }, 'To transform the immigration experience by providing innovative technology, expert guidance, and comprehensive support that empowers individuals and families to achieve their global mobility goals with confidence and success.'),
          
          // Mission pillars
          e('div', {
            key: 'pillars',
            className: 'grid grid-cols-1 md:grid-cols-3 gap-8'
          }, [
            e('div', {
              key: 'pillar1',
              className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', {
                key: 'icon1',
                className: 'w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4'
              }, '🎯'),
              e('h3', {
                key: 'pillar1-title',
                className: 'text-xl font-bold text-gray-900 mb-3'
              }, 'Innovation'),
              e('p', {
                key: 'pillar1-text',
                className: 'text-gray-600'
              }, 'Leveraging cutting-edge technology to simplify complex immigration processes.')
            ]),
            e('div', {
              key: 'pillar2',
              className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', {
                key: 'icon2',
                className: 'w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4'
              }, '🤝'),
              e('h3', {
                key: 'pillar2-title',
                className: 'text-xl font-bold text-gray-900 mb-3'
              }, 'Support'),
              e('p', {
                key: 'pillar2-text',
                className: 'text-gray-600'
              }, 'Providing personalized guidance every step of your immigration journey.')
            ]),
            e('div', {
              key: 'pillar3',
              className: 'bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', {
                key: 'icon3',
                className: 'w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4'
              }, '✨'),
              e('h3', {
                key: 'pillar3-title',
                className: 'text-xl font-bold text-gray-900 mb-3'
              }, 'Excellence'),
              e('p', {
                key: 'pillar3-text',
                className: 'text-gray-600'
              }, 'Delivering exceptional results through expertise and dedication.')
            ])
          ])
        ])
      ])
    ]),

    // Meet Our Team Section
    e('section', {
      key: 'team',
      className: 'py-20 bg-white'
    }, [
      e('div', {
        key: 'team-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'team-header',
          className: 'text-center mb-16'
        }, [
          e('h2', {
            key: 'team-title',
            className: 'text-4xl font-bold text-gray-900 mb-4'
          }, 'Meet Our Team'),
          e('p', {
            key: 'team-subtitle',
            className: 'text-xl text-gray-600'
          }, 'Dedicated professionals committed to your success')
        ]),
        
        e('div', {
          key: 'team-grid',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
        }, [
          // Team member 1
          e('div', {
            key: 'member1',
            className: 'text-center group'
          }, [
            e('div', {
              key: 'member1-image',
              className: 'relative mb-4'
            }, [
              e('img', {
                key: 'member1-photo',
                src: '/attached_assets/guy smiling2_1751497479944.jpg',
                alt: 'Team Member',
                className: 'w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-xl transition-shadow'
              }),
              e('div', {
                key: 'member1-overlay',
                className: 'absolute inset-0 bg-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
              })
            ]),
            e('h3', {
              key: 'member1-name',
              className: 'text-xl font-bold text-gray-900 mb-1'
            }, 'Michael Chen'),
            e('p', {
              key: 'member1-role',
              className: 'text-blue-600 font-medium mb-2'
            }, 'CEO & Founder'),
            e('p', {
              key: 'member1-bio',
              className: 'text-sm text-gray-600'
            }, 'Immigration law expert with 15+ years experience')
          ]),

          // Team member 2
          e('div', {
            key: 'member2',
            className: 'text-center group'
          }, [
            e('div', {
              key: 'member2-image',
              className: 'relative mb-4'
            }, [
              e('img', {
                key: 'member2-photo',
                src: '/attached_assets/lady smiling_1751497479945.jpg',
                alt: 'Team Member',
                className: 'w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-xl transition-shadow'
              }),
              e('div', {
                key: 'member2-overlay',
                className: 'absolute inset-0 bg-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
              })
            ]),
            e('h3', {
              key: 'member2-name',
              className: 'text-xl font-bold text-gray-900 mb-1'
            }, 'Sarah Williams'),
            e('p', {
              key: 'member2-role',
              className: 'text-blue-600 font-medium mb-2'
            }, 'Head of Technology'),
            e('p', {
              key: 'member2-bio',
              className: 'text-sm text-gray-600'
            }, 'AI and platform development specialist')
          ]),

          // Team member 3
          e('div', {
            key: 'member3',
            className: 'text-center group'
          }, [
            e('div', {
              key: 'member3-image',
              className: 'relative mb-4'
            }, [
              e('img', {
                key: 'member3-photo',
                src: '/attached_assets/test22_1751497479947.jpg',
                alt: 'Team Member',
                className: 'w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-xl transition-shadow'
              }),
              e('div', {
                key: 'member3-overlay',
                className: 'absolute inset-0 bg-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
              })
            ]),
            e('h3', {
              key: 'member3-name',
              className: 'text-xl font-bold text-gray-900 mb-1'
            }, 'David Rodriguez'),
            e('p', {
              key: 'member3-role',
              className: 'text-blue-600 font-medium mb-2'
            }, 'Immigration Consultant'),
            e('p', {
              key: 'member3-bio',
              className: 'text-sm text-gray-600'
            }, 'Specializes in skilled worker programs')
          ]),

          // Team member 4
          e('div', {
            key: 'member4',
            className: 'text-center group'
          }, [
            e('div', {
              key: 'member4-image',
              className: 'relative mb-4'
            }, [
              e('img', {
                key: 'member4-photo',
                src: '/attached_assets/test23_1751497479946.jpg',
                alt: 'Team Member',
                className: 'w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-xl transition-shadow'
              }),
              e('div', {
                key: 'member4-overlay',
                className: 'absolute inset-0 bg-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
              })
            ]),
            e('h3', {
              key: 'member4-name',
              className: 'text-xl font-bold text-gray-900 mb-1'
            }, 'Lisa Thompson'),
            e('p', {
              key: 'member4-role',
              className: 'text-blue-600 font-medium mb-2'
            }, 'Customer Success Manager'),
            e('p', {
              key: 'member4-bio',
              className: 'text-sm text-gray-600'
            }, 'Ensures exceptional client experiences')
          ])
        ])
      ])
    ]),

    // CTA Section
    e('section', {
      key: 'cta',
      className: 'py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white'
    }, [
      e('div', {
        key: 'cta-container',
        className: 'container mx-auto px-6 text-center'
      }, [
        e('h2', {
          key: 'cta-title',
          className: 'text-4xl font-bold mb-6'
        }, 'Ready to Start Your Journey?'),
        e('p', {
          key: 'cta-text',
          className: 'text-xl text-blue-100 mb-8 max-w-2xl mx-auto'
        }, 'Join thousands of successful immigrants who have trusted Cush to guide their path to a new life.'),
        e('div', {
          key: 'cta-buttons',
          className: 'flex flex-col sm:flex-row gap-4 justify-center'
        }, [
          e('button', {
            key: 'get-started',
            onClick: () => {
              if (typeof window.navigate === 'function') {
                window.navigate('signup');
              } else {
                window.location.hash = 'signup';
              }
            },
            className: 'bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl'
          }, 'Get Started Today'),
          e('button', {
            key: 'find-mentors',
            onClick: () => {
              if (typeof window.navigate === 'function') {
                window.navigate('mentors');
              } else {
                window.location.hash = 'mentors';
              }
            },
            className: 'border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-all duration-300'
          }, 'Find a Mentor')
        ])
      ])
    ])
  ]);
}

// Mentor Booking Page Component
function MentorBookingPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const mentors = [
    {
      id: 1,
      name: 'Dr. Emily Carter',
      specialty: 'Canada Immigration',
      rating: 4.9,
      reviews: 127,

      experience: '12 years',
      languages: ['English', 'French'],
      bio: 'Specialized in Express Entry, Provincial Nominee Programs, and skilled worker visas for Canada.',
      image: '/attached_assets/lady smiling_1751497479945.jpg',
      availableSlots: ['Jan 15, 2:00 PM', 'Jan 16, 10:00 AM', 'Jan 17, 3:00 PM']
    },
    {
      id: 2,
      name: 'Michael Chen',
      specialty: 'Australia Immigration',
      rating: 4.8,
      reviews: 89,

      experience: '10 years',
      languages: ['English', 'Mandarin'],
      bio: 'Expert in Australian skilled migration, business visas, and family reunion programs.',
      image: '/attached_assets/guy smiling2_1751497479944.jpg',
      availableSlots: ['Jan 15, 1:00 PM', 'Jan 16, 9:00 AM', 'Jan 18, 2:00 PM']
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      specialty: 'UK Immigration',
      rating: 4.9,
      reviews: 156,

      experience: '15 years',
      languages: ['English', 'Spanish'],
      bio: 'Specializes in UK work visas, investor visas, and British citizenship applications.',
      image: '/attached_assets/test23_1751497479946.jpg',
      availableSlots: ['Jan 15, 4:00 PM', 'Jan 17, 11:00 AM', 'Jan 18, 1:00 PM']
    },
    {
      id: 4,
      name: 'David Rodriguez',
      specialty: 'US Immigration',
      rating: 4.7,
      reviews: 203,

      experience: '18 years',
      languages: ['English', 'Spanish'],
      bio: 'Expert in H-1B, EB-5, family-based immigration, and naturalization processes.',
      image: '/attached_assets/test22_1751497479947.jpg',
      availableSlots: ['Jan 16, 3:00 PM', 'Jan 17, 9:00 AM', 'Jan 19, 2:00 PM']
    }
  ];

  const specialties = ['all', 'Canada Immigration', 'Australia Immigration', 'UK Immigration', 'US Immigration'];

  const filteredMentors = selectedSpecialty === 'all' 
    ? mentors 
    : mentors.filter(mentor => mentor.specialty === selectedSpecialty);

  return e('div', { className: 'min-h-screen bg-gray-50' }, [
    // Navigation Header
    e('header', {
      key: 'nav',
      className: 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 shadow-lg'
    }, [
      e('div', {
        key: 'nav-container',
        className: 'container mx-auto px-6 py-4'
      }, [
        e('div', {
          key: 'nav-content',
          className: 'flex items-center justify-between'
        }, [
          e('button', {
            key: 'logo',
            onClick: () => navigate('home'),
            className: 'flex items-center hover:opacity-80 transition-opacity'
          }, [
            e('img', {
              key: 'logo-image',
              src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
              alt: 'Cush Logo',
              className: 'h-8 w-auto'
            })
          ]),
          e('button', {
            key: 'back-home',
            onClick: () => navigate('home'),
            className: 'text-white/90 hover:text-white font-medium transition-colors'
          }, '← Back to Home')
        ])
      ])
    ]),

    // Hero Section
    e('section', {
      key: 'hero',
      className: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-16'
    }, [
      e('div', {
        key: 'hero-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'hero-content',
          className: 'max-w-4xl mx-auto text-center'
        }, [
          e('h1', {
            key: 'title',
            className: 'text-4xl md:text-5xl font-bold mb-6'
          }, 'Expert Immigration Mentors'),
          e('p', {
            key: 'subtitle',
            className: 'text-xl text-blue-100 leading-relaxed'
          }, 'Connect with certified immigration experts for personalized guidance on your journey.')
        ])
      ])
    ]),

    // Filter Section
    e('section', {
      key: 'filters',
      className: 'py-8 bg-white border-b'
    }, [
      e('div', {
        key: 'filter-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'filter-content',
          className: 'flex flex-wrap gap-4 justify-center'
        }, [
          e('span', {
            key: 'filter-label',
            className: 'text-gray-700 font-medium my-2'
          }, 'Filter by specialty:'),
          ...specialties.map(specialty =>
            e('button', {
              key: specialty,
              onClick: () => setSelectedSpecialty(specialty),
              className: `px-4 py-2 rounded-full font-medium transition-all ${
                selectedSpecialty === specialty
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }, specialty === 'all' ? 'All Specialties' : specialty)
          )
        ])
      ])
    ]),

    // Mentors Grid
    e('section', {
      key: 'mentors',
      className: 'py-12'
    }, [
      e('div', {
        key: 'mentors-container',
        className: 'container mx-auto px-6'
      }, [
        e('div', {
          key: 'mentors-grid',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
        }, filteredMentors.map(mentor =>
          e('div', {
            key: mentor.id,
            className: 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6'
          }, [
            e('div', {
              key: 'mentor-header',
              className: 'text-center mb-6'
            }, [
              e('img', {
                key: 'mentor-image',
                src: mentor.image,
                alt: mentor.name,
                className: 'w-24 h-24 rounded-full mx-auto mb-4 object-cover'
              }),
              e('h3', {
                key: 'mentor-name',
                className: 'text-xl font-bold text-gray-900 mb-1'
              }, mentor.name),
              e('p', {
                key: 'mentor-specialty',
                className: 'text-blue-600 font-medium mb-2'
              }, mentor.specialty),
              e('div', {
                key: 'mentor-rating',
                className: 'flex items-center justify-center gap-2 mb-3'
              }, [
                e('span', { key: 'stars', className: 'text-yellow-400' }, '★★★★★'),
                e('span', { key: 'rating', className: 'text-gray-600 text-sm' }, `${mentor.rating} (${mentor.reviews} reviews)`)
              ])
            ]),

            e('div', {
              key: 'mentor-details',
              className: 'space-y-3 mb-6'
            }, [
              e('div', {
                key: 'experience',
                className: 'flex justify-between'
              }, [
                e('span', { key: 'exp-label', className: 'text-gray-600' }, 'Experience:'),
                e('span', { key: 'exp-value', className: 'font-medium' }, mentor.experience)
              ]),

              e('div', {
                key: 'languages',
                className: 'flex justify-between'
              }, [
                e('span', { key: 'lang-label', className: 'text-gray-600' }, 'Languages:'),
                e('span', { key: 'lang-value', className: 'font-medium' }, mentor.languages.join(', '))
              ])
            ]),

            e('p', {
              key: 'mentor-bio',
              className: 'text-gray-600 text-sm mb-6 leading-relaxed'
            }, mentor.bio),

            e('button', {
              key: 'book-button',
              onClick: () => {
                setSelectedMentor(mentor);
                setShowBookingForm(true);
              },
              className: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors'
            }, 'Book Consultation')
          ])
        ))
      ])
    ]),

    // Booking Modal
    showBookingForm && selectedMentor && e('div', {
      key: 'booking-modal',
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    }, [
      e('div', {
        key: 'modal-content',
        className: 'bg-white rounded-xl max-w-md w-full p-6'
      }, [
        e('div', {
          key: 'modal-header',
          className: 'flex justify-between items-center mb-6'
        }, [
          e('h3', {
            key: 'modal-title',
            className: 'text-xl font-bold text-gray-900'
          }, `Book with ${selectedMentor.name}`),
          e('button', {
            key: 'close-button',
            onClick: () => setShowBookingForm(false),
            className: 'text-gray-400 hover:text-gray-600'
          }, '×')
        ]),

        e('img', {
          key: 'modal-image',
          src: '/attached_assets/clarity session_1751499874142.jpg',
          alt: 'Consultation booking',
          className: 'w-full h-32 object-cover rounded-lg mb-4'
        }),

        e('div', {
          key: 'booking-form',
          className: 'space-y-4'
        }, [
          e('div', { key: 'date-selection' }, [
            e('label', {
              key: 'date-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Select Date & Time:'),
            e('select', {
              key: 'date-select',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }, [
              e('option', { key: 'placeholder', value: '' }, 'Choose available slot'),
              ...selectedMentor.availableSlots.map((slot, index) =>
                e('option', { key: index, value: slot }, slot)
              )
            ])
          ]),

          e('div', { key: 'topic-selection' }, [
            e('label', {
              key: 'topic-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Consultation Topic:'),
            e('textarea', {
              key: 'topic-input',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              rows: 3,
              placeholder: 'Briefly describe what you\'d like to discuss...'
            })
          ]),

          e('div', {
            key: 'booking-actions',
            className: 'flex gap-3 pt-4'
          }, [
            e('button', {
              key: 'cancel',
              onClick: () => setShowBookingForm(false),
              className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors'
            }, 'Cancel'),
            e('button', {
              key: 'confirm',
              onClick: () => {
                setShowBookingForm(false);
                alert('Consultation booked successfully! You will receive a confirmation email shortly.');
              },
              className: 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors'
            }, 'Book Session')
          ])
        ])
      ])
    ])
  ]);
}

// Financial Mood Meter Component
function FinancialMoodMeter({ onBack }) {
  const [moodData, setMoodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMoodData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/financial-mood');
      if (!response.ok) {
        throw new Error('Failed to analyze financial mood');
      }
      const data = await response.json();
      setMoodData(data);
    } catch (error) {
      console.error('Mood analysis error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoodData();
  }, []);

  const getMoodEmoji = (score) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😟';
    return '😰';
  };

  const getMoodGradient = (color) => {
    switch (color?.toLowerCase()) {
      case '#10b981': return 'from-green-400 to-green-600';
      case '#f59e0b': return 'from-yellow-400 to-yellow-600';
      case '#ef4444': return 'from-red-400 to-red-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  if (loading) {
    return e('div', { className: 'min-h-screen bg-gray-50 p-6' }, [
      e('div', { key: 'header', className: 'mb-6' }, [
        e('button', {
          key: 'back',
          onClick: onBack,
          className: 'flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4'
        }, [
          e('span', { key: 'arrow' }, '←'),
          e('span', { key: 'text' }, 'Back to Dashboard')
        ]),
        e('h1', { key: 'title', className: 'text-3xl font-bold text-gray-900' }, 'Financial Mood Meter'),
        e('p', { key: 'subtitle', className: 'text-gray-600' }, 'AI-powered analysis of your financial wellness')
      ]),
      e('div', { key: 'loading', className: 'bg-white rounded-xl p-8 shadow-lg' }, [
        e('div', { key: 'spinner', className: 'flex items-center justify-center py-12' }, [
          e('div', { key: 'icon', className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' }),
          e('span', { key: 'text', className: 'ml-3 text-gray-600' }, 'Analyzing your financial mood...')
        ])
      ])
    ]);
  }

  if (error) {
    return e('div', { className: 'min-h-screen bg-gray-50 p-6' }, [
      e('div', { key: 'header', className: 'mb-6' }, [
        e('button', {
          key: 'back',
          onClick: onBack,
          className: 'flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4'
        }, [
          e('span', { key: 'arrow' }, '←'),
          e('span', { key: 'text' }, 'Back to Dashboard')
        ]),
        e('h1', { key: 'title', className: 'text-3xl font-bold text-gray-900' }, 'Financial Mood Meter')
      ]),
      e('div', { key: 'error', className: 'bg-white rounded-xl p-8 shadow-lg text-center' }, [
        e('div', { key: 'icon', className: 'text-6xl mb-4' }, '⚠️'),
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-2' }, 'Analysis Unavailable'),
        e('p', { key: 'message', className: 'text-gray-600 mb-4' }, error),
        e('button', {
          key: 'retry',
          onClick: fetchMoodData,
          className: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg'
        }, 'Try Again')
      ])
    ]);
  }

  if (!moodData) return null;

  return e('div', { className: 'min-h-screen bg-gray-50 p-6' }, [
    e('div', { key: 'header', className: 'mb-6' }, [
      e('button', {
        key: 'back',
        onClick: onBack,
        className: 'flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4'
      }, [
        e('span', { key: 'arrow' }, '←'),
        e('span', { key: 'text' }, 'Back to Dashboard')
      ]),
      e('div', { key: 'title-section', className: 'flex items-center justify-between' }, [
        e('div', { key: 'title-text' }, [
          e('h1', { key: 'title', className: 'text-3xl font-bold text-gray-900' }, 'Financial Mood Meter'),
          e('p', { key: 'subtitle', className: 'text-gray-600' }, 'AI-powered analysis of your financial wellness')
        ]),
        e('button', {
          key: 'refresh',
          onClick: fetchMoodData,
          className: 'bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg'
        }, '🔄')
      ])
    ]),

    e('div', { key: 'content', className: 'max-w-4xl mx-auto' }, [
      // Mood Score Display
      e('div', { key: 'mood-score', className: 'bg-white rounded-xl p-8 shadow-lg mb-6 text-center' }, [
        e('div', {
          key: 'mood-circle',
          className: `inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getMoodGradient(moodData.moodColor)} shadow-lg mb-4`
        }, [
          e('div', { key: 'emoji', className: 'text-3xl' }, getMoodEmoji(moodData.moodScore))
        ]),
        e('h2', {
          key: 'mood-label',
          className: 'text-3xl font-bold mb-2',
          style: { color: moodData.moodColor }
        }, moodData.moodLabel),
        e('div', { key: 'score-info', className: 'flex items-center justify-center gap-2 mb-4' }, [
          e('span', { key: 'chart-icon' }, '📊'),
          e('span', { key: 'score-text', className: 'text-gray-600' }, `Score: ${moodData.moodScore}/10`)
        ]),
        e('div', { key: 'progress-bar', className: 'w-32 mx-auto bg-gray-200 rounded-full h-2' }, [
          e('div', {
            key: 'progress-fill',
            className: 'h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600',
            style: { width: `${moodData.moodScore * 10}%` }
          })
        ])
      ]),

      // Main Factors
      e('div', { key: 'main-factors', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '📈'),
          e('span', { key: 'text' }, 'Key Factors')
        ]),
        e('div', { key: 'factors', className: 'space-y-3' }, 
          moodData.mainFactors.map((factor, index) =>
            e('div', {
              key: index,
              className: 'flex items-start gap-3 p-3 bg-blue-50 rounded-lg'
            }, [
              e('div', { key: 'dot', className: 'w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0' }),
              e('span', { key: 'text', className: 'text-gray-700' }, factor)
            ])
          )
        )
      ]),

      // Celebration Points
      moodData.celebrationPoints?.length > 0 && e('div', { key: 'celebration', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '✨'),
          e('span', { key: 'text' }, 'Celebrate Your Progress')
        ]),
        e('div', { key: 'points', className: 'space-y-3' }, 
          moodData.celebrationPoints.map((point, index) =>
            e('div', {
              key: index,
              className: 'flex items-start gap-3 p-3 bg-green-50 rounded-lg'
            }, [
              e('span', { key: 'icon', className: 'text-green-500 mt-0.5' }, '✅'),
              e('span', { key: 'text', className: 'text-gray-700' }, point)
            ])
          )
        )
      ]),

      // Warning Signals
      moodData.warningSignals?.length > 0 && e('div', { key: 'warnings', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '⚠️'),
          e('span', { key: 'text' }, 'Areas for Attention')
        ]),
        e('div', { key: 'warnings-list', className: 'space-y-3' }, 
          moodData.warningSignals.map((warning, index) =>
            e('div', {
              key: index,
              className: 'flex items-start gap-3 p-3 bg-orange-50 rounded-lg'
            }, [
              e('span', { key: 'icon', className: 'text-orange-500 mt-0.5' }, '📉'),
              e('span', { key: 'text', className: 'text-gray-700' }, warning)
            ])
          )
        )
      ]),

      // Motivation Tips
      e('div', { key: 'motivation', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '💝'),
          e('span', { key: 'text' }, 'Motivation Boost')
        ]),
        e('div', { key: 'tips', className: 'space-y-3' }, 
          moodData.motivationTips.map((tip, index) =>
            e('div', {
              key: index,
              className: 'flex items-start gap-3 p-3 bg-pink-50 rounded-lg'
            }, [
              e('span', { key: 'icon', className: 'text-pink-500 mt-0.5' }, '💝'),
              e('span', { key: 'text', className: 'text-gray-700 italic' }, tip)
            ])
          )
        )
      ]),

      // Action Steps
      e('div', { key: 'actions', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '🎯'),
          e('span', { key: 'text' }, 'Action Steps')
        ]),
        e('div', { key: 'steps', className: 'space-y-3' }, 
          moodData.actionableSteps.map((step, index) =>
            e('div', {
              key: index,
              className: 'flex items-start gap-3 p-3 bg-purple-50 rounded-lg'
            }, [
              e('div', {
                key: 'number',
                className: 'w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0'
              }, String(index + 1)),
              e('span', { key: 'text', className: 'text-gray-700' }, step)
            ])
          )
        )
      ]),

      // AI Badge
      e('div', { key: 'ai-badge', className: 'text-center' }, [
        e('div', {
          key: 'badge',
          className: 'inline-flex items-center gap-2 px-4 py-2 border rounded-full text-sm',
          style: { borderColor: moodData.moodColor, color: moodData.moodColor }
        }, [
          e('span', { key: 'icon' }, '💡'),
          e('span', { key: 'text' }, 'Powered by AI Financial Analysis')
        ])
      ])
    ])
  ]);
}

// Financial Health Radar Component
function FinancialHealthRadar({ onBack }) {
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);

  useEffect(() => {
    fetch('/api/financial-health-radar')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRadarData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const renderRadarChart = () => {
    if (!radarData) return null;

    const center = 200;
    const maxRadius = 120;
    const metrics = Object.entries(radarData.metrics);
    const angleStep = (2 * Math.PI) / metrics.length;

    // Calculate points for the radar chart
    const dataPoints = metrics.map(([key, metric], index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const radius = (metric.score / 10) * maxRadius;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return { x, y, key, metric, angle: index * angleStep };
    });

    // Create grid circles
    const gridCircles = [2, 4, 6, 8, 10].map(value => {
      const radius = (value / 10) * maxRadius;
      return e('circle', {
        key: `grid-${value}`,
        cx: center,
        cy: center,
        r: radius,
        fill: 'none',
        stroke: '#e5e7eb',
        strokeWidth: 1,
        opacity: 0.5
      });
    });

    // Create grid lines
    const gridLines = metrics.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x2 = center + maxRadius * Math.cos(angle);
      const y2 = center + maxRadius * Math.sin(angle);
      return e('line', {
        key: `line-${index}`,
        x1: center,
        y1: center,
        x2,
        y2,
        stroke: '#e5e7eb',
        strokeWidth: 1,
        opacity: 0.5
      });
    });

    // Create the data polygon
    const polygonPoints = dataPoints.map(point => `${point.x},${point.y}`).join(' ');
    const dataPolygon = e('polygon', {
      key: 'data-polygon',
      points: polygonPoints,
      fill: radarData.overallColor,
      fillOpacity: 0.3,
      stroke: radarData.overallColor,
      strokeWidth: 2
    });

    // Create data points
    const dataCircles = dataPoints.map((point, index) => {
      const [key, metric] = metrics[index];
      return e('circle', {
        key: `point-${key}`,
        cx: point.x,
        cy: point.y,
        r: 4,
        fill: metric.color,
        stroke: 'white',
        strokeWidth: 2,
        onMouseEnter: () => setHoveredMetric({ key, metric, x: point.x, y: point.y }),
        onMouseLeave: () => setHoveredMetric(null),
        style: { cursor: 'pointer' }
      });
    });

    // Create labels
    const labels = metrics.map(([key, metric], index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelRadius = maxRadius + 30;
      const x = center + labelRadius * Math.cos(angle);
      const y = center + labelRadius * Math.sin(angle);
      
      const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      return e('text', {
        key: `label-${key}`,
        x,
        y,
        textAnchor: 'middle',
        dominantBaseline: 'middle',
        fontSize: 12,
        fill: '#374151',
        fontWeight: '500'
      }, displayName);
    });

    return e('svg', {
      width: 400,
      height: 400,
      className: 'mx-auto'
    }, [
      ...gridCircles,
      ...gridLines,
      dataPolygon,
      ...dataCircles,
      ...labels,
      
      // Tooltip
      hoveredMetric && e('g', { key: 'tooltip' }, [
        e('rect', {
          x: hoveredMetric.x - 50,
          y: hoveredMetric.y - 35,
          width: 100,
          height: 25,
          fill: 'rgba(0,0,0,0.8)',
          rx: 4
        }),
        e('text', {
          x: hoveredMetric.x,
          y: hoveredMetric.y - 20,
          textAnchor: 'middle',
          fill: 'white',
          fontSize: 12
        }, `${hoveredMetric.metric.score}/10`)
      ])
    ]);
  };

  if (loading) {
    return e('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6' }, [
      e('div', { key: 'loading', className: 'max-w-4xl mx-auto' }, [
        e('div', { className: 'bg-white rounded-xl p-8 shadow-lg text-center' }, [
          e('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4' }),
          e('p', { className: 'text-gray-600' }, 'Analyzing your financial health...')
        ])
      ])
    ]);
  }

  if (error) {
    return e('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6' }, [
      e('div', { key: 'error', className: 'max-w-4xl mx-auto' }, [
        e('div', { className: 'bg-white rounded-xl p-8 shadow-lg text-center' }, [
          e('div', { className: 'text-red-500 text-4xl mb-4' }, '⚠️'),
          e('h3', { className: 'text-xl font-bold text-gray-900 mb-2' }, 'Analysis Error'),
          e('p', { className: 'text-gray-600 mb-4' }, error),
          e('button', {
            className: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700',
            onClick: onBack
          }, 'Back to Dashboard')
        ])
      ])
    ]);
  }

  return e('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6' }, [
    // Header
    e('div', { key: 'header', className: 'max-w-6xl mx-auto mb-8' }, [
      e('div', { className: 'flex items-center justify-between mb-6' }, [
        e('div', { key: 'title-section' }, [
          e('h1', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Financial Health Radar'),
          e('p', { className: 'text-gray-600' }, 'Interactive visualization of your financial wellness metrics')
        ]),
        e('button', {
          key: 'back-btn',
          onClick: onBack,
          className: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        }, '← Back to Dashboard')
      ]),

      // Overall Score Card
      e('div', { className: 'bg-white rounded-xl p-6 shadow-lg mb-8' }, [
        e('div', { className: 'text-center' }, [
          e('div', {
            className: 'inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold text-white mb-4',
            style: { backgroundColor: radarData.overallColor }
          }, radarData.overallGrade),
          e('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, `Overall Score: ${radarData.overallScore}/10`),
          e('p', { className: 'text-gray-600' }, 'Your comprehensive financial health assessment')
        ])
      ])
    ]),

    // Main Content
    e('div', { key: 'main-content', className: 'max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8' }, [
      // Radar Chart
      e('div', { key: 'radar-section', className: 'bg-white rounded-xl p-6 shadow-lg' }, [
        e('h3', { className: 'text-xl font-bold text-gray-900 mb-6 text-center' }, 'Health Radar'),
        renderRadarChart()
      ]),

      // Metrics Breakdown
      e('div', { key: 'metrics-section', className: 'space-y-4' }, [
        e('h3', { className: 'text-xl font-bold text-gray-900 mb-4' }, 'Metrics Breakdown'),
        ...Object.entries(radarData.metrics).map(([key, metric]) => {
          const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return e('div', {
            key,
            className: 'bg-white rounded-xl p-4 shadow-lg border-l-4',
            style: { borderLeftColor: metric.color }
          }, [
            e('div', { className: 'flex items-center justify-between mb-2' }, [
              e('h4', { className: 'font-semibold text-gray-900' }, displayName),
              e('span', {
                className: 'px-3 py-1 rounded-full text-sm font-medium text-white',
                style: { backgroundColor: metric.color }
              }, `${metric.score}/10`)
            ]),
            e('p', { className: 'text-sm text-gray-600 mb-2' }, metric.benchmark),
            e('div', { className: 'flex items-center gap-2' }, [
              e('div', { className: 'flex-1 bg-gray-200 rounded-full h-2' }, [
                e('div', {
                  className: 'h-2 rounded-full transition-all duration-500',
                  style: {
                    width: `${(metric.score / 10) * 100}%`,
                    backgroundColor: metric.color
                  }
                })
              ]),
              e('span', { className: 'text-sm font-medium text-gray-600' }, metric.label)
            ])
          ]);
        })
      ])
    ]),

    // Insights Section
    e('div', { key: 'insights', className: 'max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6' }, [
      // Strengths
      e('div', { key: 'strengths', className: 'bg-white rounded-xl p-6 shadow-lg' }, [
        e('h3', { className: 'text-lg font-bold text-green-700 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '💪'),
          e('span', { key: 'text' }, 'Strengths')
        ]),
        e('div', { className: 'space-y-2' }, 
          radarData.strengths.map((strength, index) =>
            e('div', {
              key: index,
              className: 'flex items-center gap-2 text-sm text-gray-700'
            }, [
              e('span', { key: 'check', className: 'text-green-500' }, '✓'),
              e('span', { key: 'text' }, strength)
            ])
          )
        )
      ]),

      // Recommendations
      e('div', { key: 'recommendations', className: 'bg-white rounded-xl p-6 shadow-lg' }, [
        e('h3', { className: 'text-lg font-bold text-blue-700 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '💡'),
          e('span', { key: 'text' }, 'Recommendations')
        ]),
        e('div', { className: 'space-y-3' }, 
          radarData.recommendations.map((rec, index) =>
            e('div', {
              key: index,
              className: 'p-3 bg-blue-50 rounded-lg border-l-2 border-blue-300'
            }, [
              e('p', { className: 'text-sm text-gray-700' }, rec)
            ])
          )
        )
      ]),

      // Areas for Improvement
      e('div', { key: 'improvements', className: 'bg-white rounded-xl p-6 shadow-lg' }, [
        e('h3', { className: 'text-lg font-bold text-orange-700 mb-4 flex items-center gap-2' }, [
          e('span', { key: 'icon' }, '🎯'),
          e('span', { key: 'text' }, 'Focus Areas')
        ]),
        e('div', { className: 'space-y-2' }, 
          radarData.improvements.map((improvement, index) =>
            e('div', {
              key: index,
              className: 'flex items-center gap-2 text-sm text-gray-700'
            }, [
              e('span', { key: 'arrow', className: 'text-orange-500' }, '→'),
              e('span', { key: 'text' }, improvement)
            ])
          )
        )
      ])
    ]),

    // AI Badge
    e('div', { key: 'ai-badge', className: 'max-w-6xl mx-auto mt-8 text-center' }, [
      e('div', {
        className: 'inline-flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-full text-sm text-blue-700 bg-blue-50'
      }, [
        e('span', { key: 'icon' }, '🤖'),
        e('span', { key: 'text' }, 'Powered by AI Financial Health Analysis')
      ])
    ])
  ]);
}

// Loans Page Component
function LoansPage({ user, onBack }) {
  const [currentStep, setCurrentStep] = React.useState('overview'); // overview, prequalify, providers, apply, favorites, drafts
  const [prequalData, setPrequalData] = React.useState(null);
  const [loanProviders, setLoanProviders] = React.useState([]);
  const [selectedProvider, setSelectedProvider] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedCountry, setSelectedCountry] = React.useState('UK');
  const [favorites, setFavorites] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [reviewProvider, setReviewProvider] = React.useState(null);
  const [prequalificationForm, setPrequalificationForm] = React.useState({
    employmentStatus: '',
    monthlyIncome: '',
    currency: 'GBP',
    employmentType: '',
    companyName: '',
    workExperience: '',
    creditScore: '',
    existingDebts: '',
    monthlyExpenses: '',
    residenceStatus: '',
    residenceCountry: 'UK',
    bankStatementMonths: '',
    collateralValue: '',
    guarantorAvailable: false,
    loanPurpose: '',
    preferredAmount: '',
    preferredTermMonths: ''
  });

  // Load loan providers and user data
  React.useEffect(() => {
    if (currentStep === 'providers' || currentStep === 'overview') {
      fetchLoanProviders();
    }
    if (currentStep === 'favorites') {
      loadFavorites();
    }
    if (currentStep === 'drafts') {
      loadDrafts();
    }
  }, [currentStep, selectedCountry]);

  const fetchLoanProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loans/providers-enhanced?country=${selectedCountry}`);
      if (response.ok) {
        const providers = await response.json();
        setLoanProviders(providers);
      }
    } catch (err) {
      setError('Failed to load loan providers');
    } finally {
      setLoading(false);
    }
  };

  // Load favorites
  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/loans/favorites');
      if (response.ok) {
        const favoritesData = await response.json();
        setFavorites(favoritesData);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Load drafts
  const loadDrafts = async () => {
    try {
      const response = await fetch('/api/loans/drafts');
      if (response.ok) {
        const draftsData = await response.json();
        setDrafts(draftsData);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  // Add to favorites
  const addToFavorites = async (providerId) => {
    try {
      const response = await fetch('/api/loans/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanProviderId: providerId })
      });
      if (response.ok) {
        // Update providers list
        setLoanProviders(prev => prev.map(p => 
          p.id === providerId ? { ...p, isFavorite: true } : p
        ));
        loadFavorites();
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (providerId) => {
    try {
      const response = await fetch(`/api/loans/favorites/${providerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Update providers list
        setLoanProviders(prev => prev.map(p => 
          p.id === providerId ? { ...p, isFavorite: false } : p
        ));
        loadFavorites();
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  // Save draft
  const saveDraft = async (providerId, draftData, stepCompleted) => {
    try {
      const response = await fetch('/api/loans/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanProviderId: providerId, draftData, stepCompleted })
      });
      if (response.ok) {
        loadDrafts();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Load draft
  const loadDraft = async (providerId) => {
    try {
      const response = await fetch(`/api/loans/drafts/${providerId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  };

  // Submit review
  const submitReview = async (reviewData) => {
    try {
      const response = await fetch('/api/loans/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (response.ok) {
        setShowReviewModal(false);
        setReviewProvider(null);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handlePrequalification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/loans/prequalify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prequalificationForm),
      });

      if (response.ok) {
        const result = await response.json();
        setPrequalData(result);
        setCurrentStep('providers');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Prequalification failed');
      }
    } catch (err) {
      setError('Failed to process prequalification');
    } finally {
      setLoading(false);
    }
  };

  const handleLoanApplication = async (provider) => {
    setLoading(true);
    setError('');

    try {
      const applicationData = {
        loanProviderId: provider.id,
        amount: prequalificationForm.preferredAmount,
        currency: prequalificationForm.currency,
        purpose: prequalificationForm.loanPurpose,
        applicationData: {
          prequalificationId: prequalData?.prequalification?.id,
          employmentInfo: {
            status: prequalificationForm.employmentStatus,
            type: prequalificationForm.employmentType,
            company: prequalificationForm.companyName,
            experience: prequalificationForm.workExperience,
            income: prequalificationForm.monthlyIncome
          }
        }
      };

      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (response.ok) {
        const application = await response.json();
        alert('Loan application submitted successfully!');
        setCurrentStep('overview');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Application failed');
      }
    } catch (err) {
      setError('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    return e('div', { key: 'overview', className: 'space-y-6' }, [
      // Header
      e('div', { key: 'header', className: 'text-center mb-8' }, [
        e('h1', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Loan Services'),
        e('p', { className: 'text-lg text-gray-600' }, 'Find the perfect loan for your needs with our AI-powered matching system')
      ]),

      // Country Selection
      e('div', { key: 'country-selection', className: 'bg-white rounded-xl p-6 shadow-lg mb-6' }, [
        e('h3', { className: 'text-xl font-semibold mb-4' }, 'Select Your Country'),
        e('div', { className: 'flex gap-4' }, [
          e('button', {
            key: 'uk',
            onClick: () => setSelectedCountry('UK'),
            className: `px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedCountry === 'UK' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`
          }, '🇬🇧 United Kingdom'),
          e('button', {
            key: 'nigeria',
            onClick: () => setSelectedCountry('Nigeria'),
            className: `px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedCountry === 'Nigeria' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`
          }, '🇳🇬 Nigeria')
        ])
      ]),

      // Quick Stats
      e('div', { key: 'stats', className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8' }, [
        e('div', { key: 'stat-1', className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl' }, [
          e('div', { className: 'text-2xl font-bold mb-2' }, loanProviders.length.toString()),
          e('div', { className: 'text-blue-100' }, 'Verified Lenders')
        ]),
        e('div', { key: 'stat-2', className: 'bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl' }, [
          e('div', { className: 'text-2xl font-bold mb-2' }, '95%'),
          e('div', { className: 'text-green-100' }, 'Approval Rate')
        ]),
        e('div', { key: 'stat-3', className: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl' }, [
          e('div', { className: 'text-2xl font-bold mb-2' }, '24h'),
          e('div', { className: 'text-purple-100' }, 'Average Processing')
        ])
      ]),

      // Action Buttons
      e('div', { key: 'actions', className: 'flex flex-col md:flex-row gap-4 justify-center' }, [
        e('button', {
          key: 'prequalify',
          onClick: () => setCurrentStep('prequalify'),
          className: 'bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2'
        }, [
          e('span', { key: 'icon' }, '✨'),
          e('span', { key: 'text' }, 'Start Prequalification')
        ]),
        e('button', {
          key: 'browse',
          onClick: () => setCurrentStep('providers'),
          className: 'bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2'
        }, [
          e('span', { key: 'icon' }, '🔍'),
          e('span', { key: 'text' }, 'Browse Lenders')
        ])
      ]),

      // Featured Providers
      loanProviders.length > 0 && e('div', { key: 'featured', className: 'mt-8' }, [
        e('h3', { className: 'text-2xl font-bold mb-6' }, 'Featured Lenders'),
        e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
          loanProviders.slice(0, 3).map(provider =>
            e('div', {
              key: provider.id,
              className: 'bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', { className: 'flex items-center gap-4 mb-4' }, [
                e('div', { className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' }, [
                  e('span', { className: 'text-blue-600 font-bold' }, provider.name.charAt(0))
                ]),
                e('div', {}, [
                  e('h4', { className: 'font-semibold text-lg' }, provider.name),
                  e('p', { className: 'text-sm text-gray-600' }, provider.type)
                ])
              ]),
              e('div', { className: 'space-y-2 mb-4' }, [
                e('div', { className: 'flex justify-between text-sm' }, [
                  e('span', { className: 'text-gray-600' }, 'Interest Rate:'),
                  e('span', { className: 'font-medium' }, `${provider.minInterestRate}% - ${provider.maxInterestRate}%`)
                ]),
                e('div', { className: 'flex justify-between text-sm' }, [
                  e('span', { className: 'text-gray-600' }, 'Amount Range:'),
                  e('span', { className: 'font-medium' }, `${provider.currency || 'GBP'} ${provider.minAmount} - ${provider.maxAmount}`)
                ])
              ]),
              e('div', { className: 'flex items-center gap-2 text-sm text-gray-600' }, [
                e('span', {}, '⭐'.repeat(Math.floor(Number(provider.rating)))),
                e('span', {}, `${provider.rating} (${provider.totalReviews} reviews)`)
              ])
            ])
          )
        )
      ])
    ]);
  };

  const renderPrequalification = () => {
    return e('div', { key: 'prequalification', className: 'max-w-4xl mx-auto' }, [
      e('div', { key: 'header', className: 'text-center mb-8' }, [
        e('h2', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Loan Prequalification'),
        e('p', { className: 'text-lg text-gray-600' }, 'Tell us about your financial situation to get matched with the best lenders')
      ]),

      error && e('div', { key: 'error', className: 'bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6' }, error),

      e('form', { key: 'form', onSubmit: handlePrequalification, className: 'bg-white rounded-xl p-8 shadow-lg' }, [
        // Employment Information
        e('div', { key: 'employment', className: 'mb-8' }, [
          e('h3', { className: 'text-xl font-semibold mb-4 text-gray-900' }, 'Employment Information'),
          e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
            e('div', { key: 'employment-status' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Employment Status'),
              e('select', {
                value: prequalificationForm.employmentStatus,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, employmentStatus: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                required: true
              }, [
                e('option', { value: '' }, 'Select employment status'),
                e('option', { value: 'employed' }, 'Employed'),
                e('option', { value: 'self_employed' }, 'Self-Employed'),
                e('option', { value: 'unemployed' }, 'Unemployed'),
                e('option', { value: 'retired' }, 'Retired'),
                e('option', { value: 'student' }, 'Student')
              ])
            ]),
            e('div', { key: 'employment-type' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Employment Type'),
              e('select', {
                value: prequalificationForm.employmentType,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, employmentType: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }, [
                e('option', { value: '' }, 'Select employment type'),
                e('option', { value: 'full_time' }, 'Full-time'),
                e('option', { value: 'part_time' }, 'Part-time'),
                e('option', { value: 'contract' }, 'Contract'),
                e('option', { value: 'self_employed' }, 'Self-employed')
              ])
            ])
          ])
        ]),

        // Financial Information
        e('div', { key: 'financial', className: 'mb-8' }, [
          e('h3', { className: 'text-xl font-semibold mb-4 text-gray-900' }, 'Financial Information'),
          e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
            e('div', { key: 'monthly-income' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Monthly Income'),
              e('input', {
                type: 'number',
                value: prequalificationForm.monthlyIncome,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, monthlyIncome: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                placeholder: selectedCountry === 'UK' ? '3000' : '200000',
                required: true
              })
            ]),
            e('div', { key: 'currency' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Currency'),
              e('select', {
                value: prequalificationForm.currency,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, currency: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }, [
                e('option', { value: 'GBP' }, 'GBP (£)'),
                e('option', { value: 'NGN' }, 'NGN (₦)'),
                e('option', { value: 'USD' }, 'USD ($)')
              ])
            ])
          ])
        ]),

        // Loan Requirements
        e('div', { key: 'loan-requirements', className: 'mb-8' }, [
          e('h3', { className: 'text-xl font-semibold mb-4 text-gray-900' }, 'Loan Requirements'),
          e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
            e('div', { key: 'preferred-amount' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Preferred Loan Amount'),
              e('input', {
                type: 'number',
                value: prequalificationForm.preferredAmount,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, preferredAmount: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                placeholder: selectedCountry === 'UK' ? '10000' : '500000',
                required: true
              })
            ]),
            e('div', { key: 'loan-purpose' }, [
              e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Loan Purpose'),
              e('select', {
                value: prequalificationForm.loanPurpose,
                onChange: (e) => setPrequalificationForm({...prequalificationForm, loanPurpose: e.target.value}),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                required: true
              }, [
                e('option', { value: '' }, 'Select loan purpose'),
                e('option', { value: 'business' }, 'Business'),
                e('option', { value: 'personal' }, 'Personal'),
                e('option', { value: 'education' }, 'Education'),
                e('option', { value: 'home' }, 'Home Purchase'),
                e('option', { value: 'debt_consolidation' }, 'Debt Consolidation'),
                e('option', { value: 'medical' }, 'Medical'),
                e('option', { value: 'emergency' }, 'Emergency')
              ])
            ])
          ])
        ]),

        // Buttons
        e('div', { key: 'buttons', className: 'flex gap-4 justify-end' }, [
          e('button', {
            key: 'back',
            type: 'button',
            onClick: () => setCurrentStep('overview'),
            className: 'px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
          }, 'Back'),
          e('button', {
            key: 'submit',
            type: 'submit',
            disabled: loading,
            className: 'px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors'
          }, loading ? 'Processing...' : 'Find Matching Lenders')
        ])
      ])
    ]);
  };

  const renderProviders = () => {
    const matchedProviders = prequalData?.matchedProviders || loanProviders;
    const score = prequalData?.score;

    return e('div', { key: 'providers', className: 'max-w-6xl mx-auto' }, [
      e('div', { key: 'header', className: 'text-center mb-8' }, [
        e('h2', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Matched Lenders'),
        score && e('div', { className: 'inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full' }, [
          e('span', { key: 'icon' }, '✅'),
          e('span', { key: 'text' }, `Your qualification score: ${score}/100`)
        ])
      ]),

      error && e('div', { key: 'error', className: 'bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6' }, error),

      e('div', { key: 'controls', className: 'flex justify-between items-center mb-6' }, [
        e('div', { className: 'flex items-center gap-4' }, [
          e('span', { className: 'text-gray-700 font-medium' }, `${matchedProviders.length} lenders found`),
          e('select', {
            value: selectedCountry,
            onChange: (e) => setSelectedCountry(e.target.value),
            className: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }, [
            e('option', { value: 'UK' }, 'United Kingdom'),
            e('option', { value: 'Nigeria' }, 'Nigeria')
          ])
        ]),
        e('button', {
          key: 'back',
          onClick: () => setCurrentStep('overview'),
          className: 'px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors'
        }, '← Back to Overview')
      ]),

      loading ? e('div', { key: 'loading', className: 'text-center py-12' }, [
        e('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4' }),
        e('p', { className: 'text-gray-600' }, 'Loading lenders...')
      ]) : e('div', { key: 'providers-grid', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
        matchedProviders.map(provider =>
          e('div', {
            key: provider.id,
            className: 'bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow'
          }, [
            // Provider Header
            e('div', { className: 'flex items-center gap-4 mb-4' }, [
              e('div', { className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' }, [
                e('span', { className: 'text-blue-600 font-bold text-lg' }, provider.name.charAt(0))
              ]),
              e('div', {}, [
                e('h4', { className: 'font-semibold text-lg' }, provider.name),
                e('p', { className: 'text-sm text-gray-600' }, provider.type),
                provider.isVerified && e('span', { className: 'inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full' }, [
                  e('span', { key: 'icon' }, '✓'),
                  e('span', { key: 'text' }, 'Verified')
                ])
              ])
            ]),

            // Provider Details
            e('div', { className: 'space-y-3 mb-4' }, [
              e('div', { className: 'flex justify-between text-sm' }, [
                e('span', { className: 'text-gray-600' }, 'Interest Rate:'),
                e('span', { className: 'font-medium text-green-600' }, `${provider.minInterestRate}% - ${provider.maxInterestRate}%`)
              ]),
              e('div', { className: 'flex justify-between text-sm' }, [
                e('span', { className: 'text-gray-600' }, 'Amount Range:'),
                e('span', { className: 'font-medium' }, `${provider.currencies?.[0] || 'GBP'} ${Number(provider.minAmount).toLocaleString()} - ${Number(provider.maxAmount).toLocaleString()}`)
              ]),
              e('div', { className: 'flex justify-between text-sm' }, [
                e('span', { className: 'text-gray-600' }, 'Processing Time:'),
                e('span', { className: 'font-medium text-blue-600' }, provider.processingTime)
              ])
            ]),

            // Rating
            e('div', { className: 'flex items-center gap-2 mb-4' }, [
              e('div', { className: 'flex items-center' }, [
                e('span', { className: 'text-yellow-400' }, '⭐'.repeat(Math.floor(Number(provider.rating)))),
                e('span', { className: 'text-gray-400' }, '⭐'.repeat(5 - Math.floor(Number(provider.rating))))
              ]),
              e('span', { className: 'text-sm text-gray-600' }, `${provider.rating} (${provider.totalReviews} reviews)`)
            ]),

            // Features
            provider.features && e('div', { className: 'mb-4' }, [
              e('div', { className: 'flex flex-wrap gap-2' },
                provider.features.slice(0, 3).map((feature, index) =>
                  e('span', {
                    key: index,
                    className: 'px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full'
                  }, feature)
                )
              )
            ]),

            // Action Buttons
            e('div', { className: 'flex gap-2' }, [
              e('button', {
                key: 'learn-more',
                onClick: () => setSelectedProvider(provider),
                className: 'flex-1 px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-sm'
              }, 'Learn More'),
              e('button', {
                key: 'favorite',
                onClick: () => provider.isFavorite ? removeFromFavorites(provider.id) : addToFavorites(provider.id),
                className: `px-4 py-2 border rounded-lg transition-colors text-sm ${
                  provider.isFavorite 
                    ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`
              }, provider.isFavorite ? '💔' : '❤️'),
              prequalData && e('button', {
                key: 'apply',
                onClick: () => handleLoanApplication(provider),
                disabled: loading,
                className: 'flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm'
              }, loading ? 'Applying...' : 'Apply Now')
            ])
          ])
        )
      )
    ]);
  };

  // Render favorites
  const renderFavorites = () => {
    return e('div', { key: 'favorites', className: 'max-w-6xl mx-auto' }, [
      e('div', { key: 'header', className: 'text-center mb-8' }, [
        e('h2', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Your Favorite Lenders'),
        e('p', { className: 'text-gray-600' }, 'Quickly access your saved lenders')
      ]),

      favorites.length === 0 ? 
        e('div', { key: 'empty', className: 'text-center py-12' }, [
          e('div', { className: 'text-gray-400 text-6xl mb-4' }, '❤️'),
          e('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, 'No Favorites Yet'),
          e('p', { className: 'text-gray-600 mb-6' }, 'Start adding lenders to your favorites for quick access'),
          e('button', {
            onClick: () => setCurrentStep('providers'),
            className: 'px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
          }, 'Browse Lenders')
        ]) :
        e('div', { key: 'favorites-grid', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
          favorites.map((provider, index) =>
            e('div', {
              key: `favorite-${provider.id}-${index}`,
              className: 'bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', { className: 'flex items-center gap-4 mb-4' }, [
                e('div', { className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' }, [
                  e('span', { className: 'text-blue-600 font-bold text-lg' }, provider.name.charAt(0))
                ]),
                e('div', {}, [
                  e('h4', { className: 'font-semibold text-lg' }, provider.name),
                  e('p', { className: 'text-sm text-gray-600' }, provider.type)
                ])
              ]),
              e('div', { className: 'space-y-2 mb-4' }, [
                e('div', { className: 'flex justify-between text-sm' }, [
                  e('span', { className: 'text-gray-600' }, 'Interest Rate:'),
                  e('span', { className: 'font-medium text-green-600' }, `${provider.minInterestRate}% - ${provider.maxInterestRate}%`)
                ])
              ]),
              e('div', { className: 'flex gap-2' }, [
                e('button', {
                  key: 'apply',
                  onClick: () => {
                    setSelectedProvider(provider);
                    setCurrentStep('apply');
                  },
                  className: 'flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium'
                }, 'Apply Now'),
                e('button', {
                  key: 'remove',
                  onClick: () => removeFromFavorites(provider.id),
                  className: 'px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors'
                }, '💔')
              ])
            ])
          )
        )
    ]);
  };

  // Render drafts
  const renderDrafts = () => {
    return e('div', { key: 'drafts', className: 'max-w-6xl mx-auto' }, [
      e('div', { key: 'header', className: 'text-center mb-8' }, [
        e('h2', { className: 'text-3xl font-bold text-gray-900 mb-2' }, 'Your Application Drafts'),
        e('p', { className: 'text-gray-600' }, 'Continue where you left off')
      ]),

      drafts.length === 0 ? 
        e('div', { key: 'empty', className: 'text-center py-12' }, [
          e('div', { className: 'text-gray-400 text-6xl mb-4' }, '📝'),
          e('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, 'No Drafts Yet'),
          e('p', { className: 'text-gray-600 mb-6' }, 'Your saved applications will appear here'),
          e('button', {
            onClick: () => setCurrentStep('providers'),
            className: 'px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
          }, 'Start an Application')
        ]) :
        e('div', { key: 'drafts-grid', className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          drafts.map((draft, index) =>
            e('div', {
              key: `draft-${draft.id}-${index}`,
              className: 'bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow'
            }, [
              e('div', { className: 'flex items-center justify-between mb-4' }, [
                e('h4', { className: 'font-semibold text-lg' }, `Draft Application`),
                e('span', { className: 'text-sm text-gray-500' }, `Step ${draft.stepCompleted}/4`)
              ]),
              e('div', { className: 'space-y-2 mb-4' }, [
                e('p', { className: 'text-sm text-gray-600' }, `Last updated: ${new Date(draft.updatedAt).toLocaleDateString()}`),
                e('div', { className: 'w-full bg-gray-200 rounded-full h-2' }, [
                  e('div', { 
                    className: 'bg-blue-500 h-2 rounded-full transition-all duration-300',
                    style: { width: `${(draft.stepCompleted / 4) * 100}%` }
                  })
                ])
              ]),
              e('div', { className: 'flex gap-2' }, [
                e('button', {
                  key: 'continue',
                  onClick: () => {
                    setCurrentStep('apply');
                  },
                  className: 'flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium'
                }, 'Continue'),
                e('button', {
                  key: 'delete',
                  onClick: () => {
                    if (confirm('Are you sure you want to delete this draft?')) {
                      fetch(`/api/loans/drafts/${draft.loanProviderId}`, { method: 'DELETE' })
                        .then(() => loadDrafts());
                    }
                  },
                  className: 'px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors'
                }, 'Delete')
              ])
            ])
          )
        )
    ]);
  };

  return e('div', { className: 'bg-gray-50' }, [
    // Header
    e('div', { key: 'header', className: 'bg-white border-b border-gray-200 px-6 py-4' }, [
      e('div', { className: 'flex items-center justify-between' }, [
        e('button', {
          key: 'back',
          onClick: onBack,
          className: 'flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors'
        }, [
          e('span', { key: 'icon' }, '←'),
          e('span', { key: 'text' }, 'Back to Dashboard')
        ]),
        e('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900' }, 'Loan Services')
      ])
    ]),

    // Content
    e('div', { key: 'content', className: 'p-6 pb-12' }, [
      currentStep === 'overview' && renderOverview(),
      currentStep === 'prequalify' && renderPrequalification(),
      currentStep === 'providers' && renderProviders(),
      currentStep === 'favorites' && renderFavorites(),
      currentStep === 'drafts' && renderDrafts()
    ])
  ]);
}

// Help & Support Page Component
function HelpSupport({ user, onBack }) {
  const [activeTab, setActiveTab] = React.useState('faq');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [showTicketForm, setShowTicketForm] = React.useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);
  const [expandedFaq, setExpandedFaq] = React.useState(null);
  const [faqData, setFaqData] = React.useState([]);
  const [ticketsData, setTicketsData] = React.useState([]);
  const [feedbackData, setFeedbackData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [ticketFormData, setTicketFormData] = React.useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  const [feedbackFormData, setFeedbackFormData] = React.useState({
    feedbackType: 'improvement',
    category: 'general',
    title: '',
    message: '',
    rating: 5,
    browserInfo: '',
    featureArea: ''
  });

  // Load data on component mount
  React.useEffect(() => {
    loadFaqData();
    loadTicketsData();
    loadFeedbackData();
  }, []);

  // Load data when search/filter changes
  React.useEffect(() => {
    if (activeTab === 'faq') {
      loadFaqData();
    }
  }, [searchTerm, selectedCategory, activeTab]);

  const loadFaqData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/support/faq?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFaqData(data);
      }
    } catch (error) {
      console.error('Failed to load FAQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketsData = async () => {
    try {
      const response = await fetch('/api/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTicketsData(data);
      }
    } catch (error) {
      console.error('Failed to load tickets data:', error);
    }
  };

  const loadFeedbackData = async () => {
    try {
      const response = await fetch('/api/support/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedbackData(data);
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketFormData)
      });
      if (response.ok) {
        setShowTicketForm(false);
        setTicketFormData({
          subject: '',
          description: '',
          category: '',
          priority: 'medium'
        });
        loadTicketsData();
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/support/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feedbackFormData,
          browserInfo: navigator.userAgent
        })
      });
      if (response.ok) {
        setShowFeedbackForm(false);
        setFeedbackFormData({
          feedbackType: 'improvement',
          category: 'general',
          title: '',
          message: '',
          rating: 5,
          browserInfo: '',
          featureArea: ''
        });
        loadFeedbackData();
      }
    } catch (error) {
      console.error('Failed to create feedback:', error);
    }
  };

  const handleFaqClick = async (article) => {
    setExpandedFaq(expandedFaq === article.id ? null : article.id);
    if (expandedFaq !== article.id) {
      try {
        await fetch(`/api/support/faq/${article.id}/view`, { method: 'PUT' });
      } catch (error) {
        console.error('Failed to increment view:', error);
      }
    }
  };

  const rateFaqArticle = async (articleId, isHelpful) => {
    try {
      await fetch(`/api/support/faq/${articleId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful })
      });
      loadFaqData();
    } catch (error) {
      console.error('Failed to rate article:', error);
    }
  };

  const categories = [
    { id: 'account', name: 'Account Management', icon: '👤' },
    { id: 'loans', name: 'Loans & Applications', icon: '📋' },
    { id: 'payments', name: 'Payments & Billing', icon: '💳' },
    { id: 'community', name: 'Community Features', icon: '🌍' },
    { id: 'technical', name: 'Technical Issues', icon: '⚙️' },
    { id: 'security', name: 'Security & Privacy', icon: '🔒' }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return e('div', { className: 'bg-gray-50' }, [
    // Header
    e('div', { key: 'header', className: 'bg-white shadow-sm border-b' }, [
      e('div', { className: 'max-w-7xl mx-auto px-4 py-6' }, [
        e('div', { className: 'flex items-center justify-between' }, [
          e('button', {
            key: 'back',
            onClick: onBack,
            className: 'flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors'
          }, [
            e('span', { key: 'icon' }, '←'),
            e('span', { key: 'text' }, 'Back to Dashboard')
          ]),
          e('div', { key: 'title-section', className: 'flex items-center space-x-3' }, [
            e('div', { key: 'icon', className: 'p-2 bg-blue-100 rounded-lg' }, [
              e('span', { key: 'emoji', className: 'text-2xl' }, '❓')
            ]),
            e('div', { key: 'text', className: '' }, [
              e('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900' }, 'Help & Support'),
              e('p', { key: 'subtitle', className: 'text-gray-600' }, 'Get help with your account and platform features')
            ])
          ]),
          e('div', { key: 'action-buttons', className: 'flex items-center space-x-3' }, [
            e('button', {
              key: 'create-ticket',
              onClick: () => setShowTicketForm(true),
              className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2'
            }, [
              e('span', { key: 'icon' }, '➕'),
              e('span', { key: 'text' }, 'Create Ticket')
            ]),
            e('button', {
              key: 'send-feedback',
              onClick: () => setShowFeedbackForm(true),
              className: 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2'
            }, [
              e('span', { key: 'icon' }, '💬'),
              e('span', { key: 'text' }, 'Send Feedback')
            ])
          ])
        ])
      ])
    ]),

    // Main Content
    e('div', { key: 'content', className: 'max-w-7xl mx-auto px-4 py-8 pb-12' }, [
      // Quick Actions
      e('div', { key: 'quick-actions', className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8' }, [
        e('div', { key: 'live-chat', className: 'bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer' }, [
          e('div', { key: 'chat-content', className: 'flex items-center space-x-4' }, [
            e('div', { key: 'chat-icon', className: 'p-3 bg-blue-100 rounded-lg' }, [
              e('span', { key: 'emoji', className: 'text-2xl' }, '💬')
            ]),
            e('div', { key: 'chat-text' }, [
              e('h3', { key: 'title', className: 'font-semibold text-gray-900' }, 'Live Chat'),
              e('p', { key: 'desc', className: 'text-sm text-gray-600' }, 'Get instant help from our support team')
            ])
          ])
        ]),
        e('div', { key: 'email-support', className: 'bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer' }, [
          e('div', { key: 'email-content', className: 'flex items-center space-x-4' }, [
            e('div', { key: 'email-icon', className: 'p-3 bg-green-100 rounded-lg' }, [
              e('span', { key: 'emoji', className: 'text-2xl' }, '📧')
            ]),
            e('div', { key: 'email-text' }, [
              e('h3', { key: 'title', className: 'font-semibold text-gray-900' }, 'Email Support'),
              e('p', { key: 'desc', className: 'text-sm text-gray-600' }, 'Send us an email for detailed assistance')
            ])
          ])
        ]),
        e('div', { key: 'phone-support', className: 'bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer' }, [
          e('div', { key: 'phone-content', className: 'flex items-center space-x-4' }, [
            e('div', { key: 'phone-icon', className: 'p-3 bg-purple-100 rounded-lg' }, [
              e('span', { key: 'emoji', className: 'text-2xl' }, '📞')
            ]),
            e('div', { key: 'phone-text' }, [
              e('h3', { key: 'title', className: 'font-semibold text-gray-900' }, 'Phone Support'),
              e('p', { key: 'desc', className: 'text-sm text-gray-600' }, 'Call us at +1 (555) 123-4567')
            ])
          ])
        ])
      ]),

      // Tabs
      e('div', { className: 'bg-white rounded-lg shadow-sm border' }, [
        e('div', { className: 'border-b' }, [
          e('nav', { className: 'flex space-x-8 px-6' }, [
            e('button', {
              onClick: () => setActiveTab('faq'),
              className: `py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'faq'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }, [
              e('div', { className: 'flex items-center space-x-2' }, [
                e('span', { key: 'icon' }, '📚'),
                e('span', { key: 'text' }, 'FAQ')
              ])
            ]),
            e('button', {
              onClick: () => setActiveTab('tickets'),
              className: `py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }, [
              e('div', { className: 'flex items-center space-x-2' }, [
                e('span', { key: 'icon' }, '📋'),
                e('span', { key: 'text' }, 'My Tickets'),
                ticketsData.length > 0 && e('span', { 
                  key: 'ticket-count',
                  className: 'bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs' 
                }, ticketsData.length)
              ])
            ]),
            e('button', {
              onClick: () => setActiveTab('feedback'),
              className: `py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'feedback'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }, [
              e('div', { className: 'flex items-center space-x-2' }, [
                e('span', { key: 'icon' }, '❤️'),
                e('span', { key: 'text' }, 'My Feedback')
              ])
            ])
          ])
        ]),

        e('div', { className: 'p-6' }, [
          // FAQ Tab
          activeTab === 'faq' && e('div', { className: 'space-y-6' }, [
            // Search and Filter
            e('div', { className: 'flex flex-col md:flex-row gap-4' }, [
              e('div', { className: 'relative flex-1' }, [
                e('span', { className: 'absolute left-3 top-3 text-gray-400' }, '🔍'),
                e('input', {
                  type: 'text',
                  placeholder: 'Search FAQ articles...',
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  className: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                })
              ]),
              e('select', {
                value: selectedCategory,
                onChange: (e) => setSelectedCategory(e.target.value),
                className: 'px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              }, [
                e('option', { value: '' }, 'All Categories'),
                ...categories.map(category => 
                  e('option', { key: category.id, value: category.id }, category.name)
                )
              ])
            ]),

            // FAQ Articles
            e('div', { className: 'space-y-4' }, [
              loading ? 
                e('div', { className: 'flex items-center justify-center py-8' }, [
                  e('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' })
                ]) :
                faqData.length > 0 ?
                  faqData.map((article) =>
                    e('div', { key: article.id, className: 'border border-gray-200 rounded-lg' }, [
                      e('button', {
                        onClick: () => handleFaqClick(article),
                        className: 'w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between'
                      }, [
                        e('div', { className: 'flex items-center space-x-3' }, [
                          e('div', { className: 'p-2 bg-blue-100 rounded-lg' }, [
                            e('span', { key: 'icon' }, 
                              categories.find(c => c.id === article.category)?.icon || '❓'
                            )
                          ]),
                          e('div', {}, [
                            e('h3', { className: 'font-medium text-gray-900' }, article.title),
                            e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500 mt-1' }, [
                              e('span', { key: `category-${article.id}` }, categories.find(c => c.id === article.category)?.name || 'General'),
                              e('span', { key: `views-${article.id}`, className: 'flex items-center space-x-1' }, [
                                e('span', { key: 'icon' }, '👁️'),
                                e('span', { key: 'count' }, `${article.views || 0} views`)
                              ])
                            ])
                          ])
                        ]),
                        e('span', { className: 'text-gray-400' }, 
                          expandedFaq === article.id ? '▲' : '▼'
                        )
                      ]),
                      
                      expandedFaq === article.id && e('div', { className: 'px-6 pb-4 border-t bg-gray-50' }, [
                        e('div', { className: 'py-4' }, [
                          e('div', { key: `content-${article.id}`, className: 'prose max-w-none text-gray-700' }, [
                            article.content
                          ]),
                          
                          e('div', { className: 'flex items-center justify-between mt-6 pt-4 border-t' }, [
                            e('div', { className: 'text-sm text-gray-500' }, 'Was this article helpful?'),
                            e('div', { className: 'flex items-center space-x-2' }, [
                              e('button', {
                                onClick: () => rateFaqArticle(article.id, true),
                                className: 'flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-green-50 text-green-600 transition-colors'
                              }, [
                                e('span', { key: 'icon' }, '👍'),
                                e('span', { key: 'text' }, 'Yes')
                              ]),
                              e('button', {
                                onClick: () => rateFaqArticle(article.id, false),
                                className: 'flex items-center space-x-1 px-3 py-1 rounded-lg hover:bg-red-50 text-red-600 transition-colors'
                              }, [
                                e('span', { key: 'icon' }, '👎'),
                                e('span', { key: 'text' }, 'No')
                              ])
                            ])
                          ])
                        ])
                      ])
                    ])
                  ) :
                  e('div', { className: 'text-center py-8 text-gray-500' }, [
                    e('span', { className: 'text-4xl mb-4 block' }, '❓'),
                    e('p', {}, 'No FAQ articles found'),
                    searchTerm && e('p', { className: 'text-sm mt-2' }, 'Try adjusting your search or browse all categories')
                  ])
            ])
          ]),

          // Tickets Tab
          activeTab === 'tickets' && e('div', { className: 'space-y-6' }, [
            ticketsData.length > 0 ?
              e('div', { className: 'space-y-4' }, 
                ticketsData.map((ticket) =>
                  e('div', { key: ticket.id, className: 'bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow' }, [
                    e('div', { className: 'flex items-start justify-between' }, [
                      e('div', { className: 'flex-1' }, [
                        e('div', { className: 'flex items-center space-x-3 mb-2' }, [
                          e('h3', { className: 'font-semibold text-gray-900' }, ticket.title),
                          e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}` }, 
                            ticket.status?.replace('_', ' ').toUpperCase()
                          ),
                          e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}` }, 
                            ticket.priority?.toUpperCase()
                          )
                        ]),
                        e('p', { className: 'text-gray-600 mb-3' }, ticket.description),
                        e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500' }, [
                          e('span', {}, `#${ticket.ticketNumber}`),
                          e('span', { className: 'flex items-center space-x-1' }, [
                            e('span', { key: 'icon' }, '⏰'),
                            e('span', { key: 'date' }, new Date(ticket.createdAt).toLocaleDateString())
                          ]),
                          e('span', {}, categories.find(c => c.id === ticket.category)?.name || ticket.category)
                        ])
                      ])
                    ])
                  ])
                )
              ) :
              e('div', { className: 'text-center py-8 text-gray-500' }, [
                e('span', { className: 'text-4xl mb-4 block' }, '📋'),
                e('p', {}, 'No support tickets yet'),
                e('p', { className: 'text-sm mt-2' }, 'Create your first support ticket to get help'),
                e('button', {
                  onClick: () => setShowTicketForm(true),
                  className: 'mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
                }, 'Create Ticket')
              ])
          ]),

          // Feedback Tab
          activeTab === 'feedback' && e('div', { className: 'space-y-6' }, [
            feedbackData.length > 0 ?
              e('div', { className: 'space-y-4' }, 
                feedbackData.map((feedback) =>
                  e('div', { key: feedback.id, className: 'bg-white border border-gray-200 rounded-lg p-6' }, [
                    e('div', { className: 'flex items-start justify-between mb-4' }, [
                      e('div', { className: 'flex-1' }, [
                        e('div', { className: 'flex items-center space-x-3 mb-2' }, [
                          e('h3', { className: 'font-semibold text-gray-900' }, feedback.title),
                          e('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}` }, 
                            feedback.status?.replace('_', ' ').toUpperCase()
                          )
                        ]),
                        e('p', { className: 'text-gray-600 mb-3' }, feedback.description),
                        e('div', { className: 'flex items-center space-x-4 text-sm text-gray-500' }, [
                          e('span', { className: 'flex items-center space-x-1' }, [
                            e('span', { key: 'icon' }, '⭐'),
                            e('span', { key: 'rating' }, `${feedback.rating}/5`)
                          ]),
                          e('span', { className: 'flex items-center space-x-1' }, [
                            e('span', { key: 'icon' }, '⏰'),
                            e('span', { key: 'date' }, new Date(feedback.createdAt).toLocaleDateString())
                          ]),
                          e('span', {}, feedback.type?.replace('_', ' ').toUpperCase())
                        ])
                      ])
                    ]),
                    feedback.adminNotes && e('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4' }, [
                      e('h4', { className: 'font-medium text-blue-900 mb-2' }, 'Admin Response'),
                      e('p', { className: 'text-blue-800' }, feedback.adminNotes)
                    ])
                  ])
                )
              ) :
              e('div', { className: 'text-center py-8 text-gray-500' }, [
                e('span', { className: 'text-4xl mb-4 block' }, '❤️'),
                e('p', {}, 'No feedback submitted yet'),
                e('p', { className: 'text-sm mt-2' }, 'Share your thoughts to help us improve'),
                e('button', {
                  onClick: () => setShowFeedbackForm(true),
                  className: 'mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors'
                }, 'Send Feedback')
              ])
          ])
        ])
      ])
    ]),

    // Create Ticket Modal
    showTicketForm && e('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50' }, [
      e('div', { className: 'bg-white rounded-lg shadow-xl w-full max-w-md' }, [
        e('div', { className: 'flex items-center justify-between p-6 border-b' }, [
          e('h2', { className: 'text-lg font-semibold' }, 'Create Support Ticket'),
          e('button', {
            onClick: () => setShowTicketForm(false),
            className: 'text-gray-400 hover:text-gray-600'
          }, '✕')
        ]),
        
        e('form', { onSubmit: handleTicketSubmit, className: 'p-6 space-y-4' }, [
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Subject'),
            e('input', {
              type: 'text',
              value: ticketFormData.subject,
              onChange: (e) => setTicketFormData({ ...ticketFormData, subject: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              required: true
            })
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Category'),
            e('select', {
              value: ticketFormData.category,
              onChange: (e) => setTicketFormData({ ...ticketFormData, category: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              required: true
            }, [
              e('option', { value: '' }, 'Select a category'),
              ...categories.map(category => 
                e('option', { key: category.id, value: category.id }, category.name)
              )
            ])
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Priority'),
            e('select', {
              value: ticketFormData.priority,
              onChange: (e) => setTicketFormData({ ...ticketFormData, priority: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            }, [
              e('option', { value: 'low' }, 'Low'),
              e('option', { value: 'medium' }, 'Medium'),
              e('option', { value: 'high' }, 'High')
            ])
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Description'),
            e('textarea', {
              value: ticketFormData.description,
              onChange: (e) => setTicketFormData({ ...ticketFormData, description: e.target.value }),
              rows: 4,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              required: true
            })
          ]),
          
          e('div', { className: 'flex space-x-3 pt-4' }, [
            e('button', {
              type: 'button',
              onClick: () => setShowTicketForm(false),
              className: 'flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            }, 'Cancel'),
            e('button', {
              type: 'submit',
              className: 'flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            }, 'Create Ticket')
          ])
        ])
      ])
    ]),

    // Send Feedback Modal
    showFeedbackForm && e('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50' }, [
      e('div', { className: 'bg-white rounded-lg shadow-xl w-full max-w-md' }, [
        e('div', { className: 'flex items-center justify-between p-6 border-b' }, [
          e('h2', { className: 'text-lg font-semibold' }, 'Send Feedback'),
          e('button', {
            onClick: () => setShowFeedbackForm(false),
            className: 'text-gray-400 hover:text-gray-600'
          }, '✕')
        ]),
        
        e('form', { onSubmit: handleFeedbackSubmit, className: 'p-6 space-y-4' }, [
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Feedback Type'),
            e('select', {
              value: feedbackFormData.feedbackType,
              onChange: (e) => setFeedbackFormData({ ...feedbackFormData, feedbackType: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
            }, [
              e('option', { value: 'general' }, 'General Feedback'),
              e('option', { value: 'bug_report' }, 'Bug Report'),
              e('option', { value: 'feature_request' }, 'Feature Request'),
              e('option', { value: 'improvement' }, 'Improvement Suggestion'),
              e('option', { value: 'compliment' }, 'Compliment'),
              e('option', { value: 'complaint' }, 'Complaint')
            ])
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Category'),
            e('select', {
              value: feedbackFormData.category,
              onChange: (e) => setFeedbackFormData({ ...feedbackFormData, category: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
            }, [
              e('option', { value: 'general' }, 'General'),
              e('option', { value: 'ui_ux' }, 'UI/UX'),
              e('option', { value: 'performance' }, 'Performance'),
              e('option', { value: 'security' }, 'Security'),
              e('option', { value: 'functionality' }, 'Functionality'),
              e('option', { value: 'content' }, 'Content')
            ])
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Title'),
            e('input', {
              type: 'text',
              value: feedbackFormData.title,
              onChange: (e) => setFeedbackFormData({ ...feedbackFormData, title: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent',
              required: true
            })
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Rating'),
            e('div', { className: 'flex items-center space-x-2' }, [
              ...[1, 2, 3, 4, 5].map((rating) =>
                e('button', {
                  key: rating,
                  type: 'button',
                  onClick: () => setFeedbackFormData({ ...feedbackFormData, rating }),
                  className: `p-1 ${rating <= feedbackFormData.rating ? 'text-yellow-400' : 'text-gray-300'}`
                }, '⭐')
              ),
              e('span', { className: 'text-sm text-gray-600 ml-2' }, `${feedbackFormData.rating}/5`)
            ])
          ]),
          
          e('div', {}, [
            e('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Message'),
            e('textarea', {
              value: feedbackFormData.message,
              onChange: (e) => setFeedbackFormData({ ...feedbackFormData, message: e.target.value }),
              rows: 4,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent',
              required: true
            })
          ]),
          
          e('div', { className: 'flex space-x-3 pt-4' }, [
            e('button', {
              type: 'button',
              onClick: () => setShowFeedbackForm(false),
              className: 'flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            }, 'Cancel'),
            e('button', {
              type: 'submit',
              className: 'flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
            }, 'Send Feedback')
          ])
        ])
      ])
    ])
  ]);
}

// My Bookings Page Component
function MyBookingsPage({ user, onBack }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load user bookings
  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      } else {
        console.error('Failed to load bookings');
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBookings();
  }, []);

  // Filter bookings based on status
  const filterBookings = (status) => {
    const now = new Date();
    return bookings.filter(booking => {
      const bookingDate = new Date(`${booking.scheduledDate}T${booking.startTime}`);
      
      switch (status) {
        case 'upcoming':
          return booking.status === 'confirmed' && bookingDate > now;
        case 'completed':
          return booking.status === 'completed' || (booking.status === 'confirmed' && bookingDate < now);
        case 'cancelled':
          return booking.status === 'cancelled';
        default:
          return true;
      }
    });
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (response.ok) {
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedBooking(null);
        loadBookings();
        alert('Booking cancelled successfully');
      } else {
        const error = await response.json();
        alert(`Failed to cancel booking: ${error.error || 'Please try again'}`);
      }
    } catch (error) {
      console.error('Cancel booking error:', error);
      alert('Failed to cancel booking. Please check your connection and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule booking
  const handleRescheduleBooking = async (bookingId) => {
    // This would open a reschedule modal similar to the booking form
    alert('Reschedule functionality coming soon!');
  };

  // Join session (for video calls)
  const handleJoinSession = (booking) => {
    if (booking.sessionLink) {
      window.open(booking.sessionLink, '_blank');
    } else {
      alert('Session link not available yet. Please check back closer to your appointment time.');
    }
  };

  const renderBookingCard = (booking) => {
    const bookingDate = new Date(`${booking.scheduledDate}T${booking.startTime}`);
    const isUpcoming = booking.status === 'confirmed' && bookingDate > new Date();
    const canJoin = isUpcoming && bookingDate <= new Date(Date.now() + 15 * 60 * 1000); // 15 minutes before

    return e('div', {
      key: `booking-${booking.id}`,
      className: 'bg-white rounded-xl p-6 shadow-lg border hover:shadow-xl transition-shadow'
    }, [
      // Booking Header
      e('div', {
        key: 'booking-header',
        className: 'flex items-start justify-between mb-4'
      }, [
        e('div', { key: 'booking-info' }, [
          e('h3', {
            key: 'session-topic',
            className: 'text-lg font-bold text-gray-900 mb-1'
          }, booking.topic),
          e('p', {
            key: 'mentor-name',
            className: 'text-blue-600 font-medium'
          }, `with ${booking.mentorFirstName} ${booking.mentorLastName}`)
        ]),
        e('div', {
          key: 'booking-status',
          className: `px-3 py-1 rounded-full text-sm font-medium ${
            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`
        }, booking.status.charAt(0).toUpperCase() + booking.status.slice(1))
      ]),

      // Session Details
      e('div', {
        key: 'session-details',
        className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'
      }, [
        e('div', { key: 'date-time', className: 'flex items-center gap-2' }, [
          e('span', { key: 'calendar-icon', className: 'text-lg' }, '📅'),
          e('div', { key: 'date-info' }, [
            e('p', { key: 'date', className: 'font-medium text-gray-900' }, 
              bookingDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            ),
            e('p', { key: 'time', className: 'text-gray-600 text-sm' }, 
              `${booking.startTime} - ${booking.endTime}`)
          ])
        ]),
        e('div', { key: 'session-type', className: 'flex items-center gap-2' }, [
          e('span', { key: 'type-icon', className: 'text-lg' }, 
            booking.sessionType === 'video_call' ? '📹' :
            booking.sessionType === 'phone_call' ? '📞' : '💬'
          ),
          e('p', { key: 'type-text', className: 'font-medium text-gray-900' }, 
            booking.sessionType.replace('_', ' ').toUpperCase())
        ])
      ]),

      // Mentor Specialty & Notes
      e('div', {
        key: 'additional-info',
        className: 'mb-4'
      }, [
        e('p', {
          key: 'specialty',
          className: 'text-gray-600 mb-2'
        }, `Specialty: ${booking.mentorSpecialty} Expert`),
        booking.notes && e('div', { key: 'notes-section' }, [
          e('p', { key: 'notes-label', className: 'text-sm font-medium text-gray-700 mb-1' }, 'Notes:'),
          e('p', { key: 'notes-text', className: 'text-sm text-gray-600 bg-gray-50 p-2 rounded' }, booking.notes)
        ])
      ]),

      // Action Buttons
      e('div', {
        key: 'actions',
        className: 'flex flex-wrap gap-2'
      }, [
        // Join Session (for upcoming video calls)
        canJoin && booking.sessionType === 'video_call' && e('button', {
          key: 'join-session',
          onClick: () => handleJoinSession(booking),
          className: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium'
        }, 'Join Session'),

        // Reschedule (for upcoming bookings)
        isUpcoming && e('button', {
          key: 'reschedule',
          onClick: () => handleRescheduleBooking(booking.id),
          className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        }, 'Reschedule'),

        // Cancel (for upcoming bookings)
        isUpcoming && e('button', {
          key: 'cancel',
          onClick: () => {
            setSelectedBooking(booking);
            setShowCancelModal(true);
          },
          className: 'px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors'
        }, 'Cancel'),

        // Contact Mentor
        e('button', {
          key: 'contact',
          onClick: () => alert('Contact mentor functionality coming soon!'),
          className: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
        }, 'Contact Mentor')
      ])
    ]);
  };

  const renderCancelModal = () => {
    if (!showCancelModal || !selectedBooking) return null;

    return e('div', {
      key: 'cancel-modal',
      className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4',
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setShowCancelModal(false);
        }
      }
    }, [
      e('div', {
        key: 'modal-content',
        className: 'bg-white rounded-xl max-w-md w-full p-6'
      }, [
        e('h3', {
          key: 'modal-title',
          className: 'text-xl font-bold text-gray-900 mb-4'
        }, 'Cancel Booking'),
        e('p', {
          key: 'modal-description',
          className: 'text-gray-600 mb-4'
        }, `Are you sure you want to cancel your session with ${selectedBooking.mentorFirstName} ${selectedBooking.mentorLastName}?`),
        e('div', {
          key: 'reason-field',
          className: 'mb-6'
        }, [
          e('label', {
            key: 'reason-label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
          }, 'Reason for cancellation:'),
          e('textarea', {
            key: 'reason-input',
            value: cancelReason,
            onChange: (e) => setCancelReason(e.target.value),
            className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            rows: 3,
            placeholder: 'Please provide a reason for cancelling...'
          })
        ]),
        e('div', {
          key: 'modal-actions',
          className: 'flex gap-3'
        }, [
          e('button', {
            key: 'modal-cancel',
            onClick: () => setShowCancelModal(false),
            className: 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
          }, 'Keep Booking'),
          e('button', {
            key: 'modal-confirm',
            onClick: () => handleCancelBooking(selectedBooking.id),
            disabled: actionLoading || !cancelReason.trim(),
            className: 'flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
          }, actionLoading ? 'Cancelling...' : 'Cancel Booking')
        ])
      ])
    ]);
  };

  if (loading) {
    return e('div', {
      className: 'flex items-center justify-center py-12'
    }, [
      e('div', {
        key: 'spinner',
        className: 'w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin'
      })
    ]);
  }

  const upcomingBookings = filterBookings('upcoming');
  const completedBookings = filterBookings('completed');
  const cancelledBookings = filterBookings('cancelled');

  return e('div', { className: 'bg-gray-50 min-h-screen' }, [
    // Header
    e('div', { key: 'header', className: 'bg-white border-b border-gray-200 px-6 py-4' }, [
      e('div', { className: 'flex items-center justify-between' }, [
        e('button', {
          key: 'back',
          onClick: onBack,
          className: 'flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors'
        }, [
          e('span', { key: 'icon' }, '←'),
          e('span', { key: 'text' }, 'Back to Dashboard')
        ]),
        e('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900' }, 'My Bookings')
      ])
    ]),

    // Content
    e('div', { key: 'content', className: 'p-6' }, [
      // Summary Stats
      e('div', {
        key: 'stats',
        className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'
      }, [
        e('div', { key: 'upcoming-stat', className: 'bg-blue-50 p-4 rounded-lg' }, [
          e('h3', { className: 'text-2xl font-bold text-blue-600' }, upcomingBookings.length.toString()),
          e('p', { className: 'text-blue-800' }, 'Upcoming Sessions')
        ]),
        e('div', { key: 'completed-stat', className: 'bg-green-50 p-4 rounded-lg' }, [
          e('h3', { className: 'text-2xl font-bold text-green-600' }, completedBookings.length.toString()),
          e('p', { className: 'text-green-800' }, 'Completed Sessions')
        ]),
        e('div', { key: 'cancelled-stat', className: 'bg-red-50 p-4 rounded-lg' }, [
          e('h3', { className: 'text-2xl font-bold text-red-600' }, cancelledBookings.length.toString()),
          e('p', { className: 'text-red-800' }, 'Cancelled Sessions')
        ])
      ]),

      // Tab Navigation
      e('div', {
        key: 'tabs',
        className: 'flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6'
      }, [
        ['upcoming', 'Upcoming', upcomingBookings.length],
        ['completed', 'Completed', completedBookings.length],
        ['cancelled', 'Cancelled', cancelledBookings.length]
      ].map(([key, label, count]) =>
        e('button', {
          key: `tab-${key}`,
          onClick: () => setActiveTab(key),
          className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-colors ${
            activeTab === key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`
        }, [
          e('span', { key: 'label' }, label),
          e('span', { 
            key: 'count', 
            className: `ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeTab === key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
            }`
          }, count.toString())
        ])
      )),

      // Bookings List
      e('div', {
        key: 'bookings-list',
        className: 'space-y-4'
      }, [
        activeTab === 'upcoming' && upcomingBookings.length === 0 && 
          e('div', { key: 'no-upcoming', className: 'text-center py-12' }, [
            e('div', { className: 'text-gray-400 text-6xl mb-4' }, '📅'),
            e('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, 'No Upcoming Sessions'),
            e('p', { className: 'text-gray-600 mb-6' }, 'Schedule a session with one of our expert mentors'),
            e('button', {
              onClick: () => window.location.hash = '#dashboard',
              className: 'px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
            }, 'Browse Mentors')
          ]),

        activeTab === 'completed' && completedBookings.length === 0 && 
          e('div', { key: 'no-completed', className: 'text-center py-12' }, [
            e('div', { className: 'text-gray-400 text-6xl mb-4' }, '✅'),
            e('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, 'No Completed Sessions'),
            e('p', { className: 'text-gray-600' }, 'Your completed sessions will appear here')
          ]),

        activeTab === 'cancelled' && cancelledBookings.length === 0 && 
          e('div', { key: 'no-cancelled', className: 'text-center py-12' }, [
            e('div', { className: 'text-gray-400 text-6xl mb-4' }, '❌'),
            e('h3', { className: 'text-xl font-semibold text-gray-900 mb-2' }, 'No Cancelled Sessions'),
            e('p', { className: 'text-gray-600' }, 'Keep your momentum going!')
          ]),

        // Render filtered bookings
        activeTab === 'upcoming' ? upcomingBookings.map(renderBookingCard) :
        activeTab === 'completed' ? completedBookings.map(renderBookingCard) :
        cancelledBookings.map(renderBookingCard)
      ])
    ]),

    // Modals
    renderCancelModal()
  ]);
}

// Sign Up Page Component
function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    countryCode: '+1',
    nationality: '',
    acceptTerms: false,
    acceptPrivacy: false,
    marketingConsent: false
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [fieldValidation, setFieldValidation] = useState({});
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Firebase is already initialized in the main app component
    // Just wait for it to be available
    const waitForFirebase = () => {
      if (window.firebaseAuth) {
        console.log('Firebase already initialized and ready');
      } else {
        setTimeout(waitForFirebase, 100);
      }
    };

    waitForFirebase();
    
    // Add click outside handler for country dropdown
    const handleClickOutside = (event) => {
      if (showCountryDropdown && !event.target.closest('.country-dropdown-container')) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/password-does-not-meet-requirements':
        return 'Password must be at least 6 characters and include a mix of letters, numbers, and special characters';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for authentication';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again';
      default:
        console.error('Unhandled Firebase error code:', errorCode);
        return 'An authentication error occurred. Please try again.';
    }
  };
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: 'bg-gray-200'
  });

  // Country codes data
  const countryCodes = [
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+1', country: 'Canada', flag: '🇨🇦' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+51', country: 'Peru', flag: '🇵🇪' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
    { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
    { code: '+36', country: 'Hungary', flag: '🇭🇺' },
    { code: '+40', country: 'Romania', flag: '🇷🇴' },
    { code: '+30', country: 'Greece', flag: '🇬🇷' },
    { code: '+353', country: 'Ireland', flag: '🇮🇪' },
    { code: '+358', country: 'Finland', flag: '🇫🇮' },
    { code: '+370', country: 'Lithuania', flag: '🇱🇹' },
    { code: '+371', country: 'Latvia', flag: '🇱🇻' },
    { code: '+372', country: 'Estonia', flag: '🇪🇪' }
  ];

  const filteredCountries = countryCodes.filter(country => 
    country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  );

  const calculatePasswordStrength = (password) => {
    let score = 0;
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    
    if (requirements.length) score += 25;
    if (requirements.lowercase) score += 15;
    if (requirements.uppercase) score += 15;
    if (requirements.number) score += 15;
    if (requirements.special) score += 30;
    
    let feedback = '';
    let color = 'bg-gray-200';
    
    if (score < 30) {
      feedback = 'Very Weak - Add more characters and complexity';
      color = 'bg-red-500';
    } else if (score < 60) {
      feedback = 'Weak - Add uppercase, numbers, and special characters';
      color = 'bg-orange-500';
    } else if (score < 80) {
      feedback = 'Good - Consider adding special characters';
      color = 'bg-yellow-500';
    } else {
      feedback = 'Strong - Great password!';
      color = 'bg-green-500';
    }
    
    return { score, feedback, color, requirements };
  };

  const validateField = (field, value) => {
    const validation = { isValid: true, message: '' };
    
    switch (field) {
      case 'firstName':
        if (!value.trim()) {
          validation.isValid = false;
          validation.message = 'First name is required';
        } else if (value.length < 2) {
          validation.isValid = false;
          validation.message = 'First name must be at least 2 characters';
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          validation.isValid = false;
          validation.message = 'Last name is required';
        } else if (value.length < 2) {
          validation.isValid = false;
          validation.message = 'Last name must be at least 2 characters';
        }
        break;
      case 'email':
        if (!value.trim()) {
          validation.isValid = false;
          validation.message = 'Email is required';
        } else if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          validation.isValid = false;
          validation.message = 'Please enter a valid email address';
        }
        break;
      case 'username':
        if (!value.trim()) {
          validation.isValid = false;
          validation.message = 'Username is required';
        } else if (value.length < 3) {
          validation.isValid = false;
          validation.message = 'Username must be at least 3 characters';
        } else if (!value.match(/^[a-zA-Z0-9_]+$/)) {
          validation.isValid = false;
          validation.message = 'Username can only contain letters, numbers, and underscores';
        }
        break;
      case 'password':
        if (!value) {
          validation.isValid = false;
          validation.message = 'Password is required';
        } else if (value.length < 8) {
          validation.isValid = false;
          validation.message = 'Password must be at least 8 characters long';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
          validation.isValid = false;
          validation.message = 'Password must include uppercase, lowercase, number, and special character';
        }
        break;
      case 'confirmPassword':
        if (!value) {
          validation.isValid = false;
          validation.message = 'Please confirm your password';
        } else if (value !== formData.password) {
          validation.isValid = false;
          validation.message = 'Passwords do not match';
        } else if (value.length < 8) {
          validation.isValid = false;
          validation.message = 'Password must be at least 8 characters';
        }
        break;
      case 'confirmPassword':
        if (!value) {
          validation.isValid = false;
          validation.message = 'Please confirm your password';
        } else if (value !== formData.password) {
          validation.isValid = false;
          validation.message = 'Passwords do not match';
        }
        break;
      case 'phoneNumber':
        if (value && !value.match(/^[0-9\s\-\(\)]+$/)) {
          validation.isValid = false;
          validation.message = 'Please enter a valid phone number';
        }
        break;
    }
    
    return validation;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation
    const validation = validateField(field, value);
    setFieldValidation(prev => ({
      ...prev,
      [field]: validation
    }));
    
    // Password strength calculation
    if (field === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleCountrySelect = (country) => {
    console.log('Country selected:', country);
    setFormData(prev => ({
      ...prev,
      countryCode: country.code
    }));
    setShowCountryDropdown(false);
    setCountrySearch('');
    
    // Force re-render to update display
    setTimeout(() => {
      const button = document.querySelector('.country-selector-button');
      if (button) {
        button.focus();
      }
    }, 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCountryDropdown && !event.target.closest('.country-dropdown-container')) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryDropdown]);

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms of service';
    if (!formData.acceptPrivacy) newErrors.acceptPrivacy = 'You must accept the privacy policy';
    
    // Email validation
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    // Password confirmation validation
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Username validation
    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (formData.username && !formData.username.match(/^[a-zA-Z0-9_]+$/)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    // Name validation
    if (formData.firstName && formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    
    if (formData.lastName && formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    
    console.log('Form validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submissions
    if (loading) {
      console.log('Sign-up already in progress');
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    // Set timeout for the operation (30 seconds)
    const timeoutId = setTimeout(() => {
      setError('Request timeout. Please try again.');
      setLoading(false);
    }, 30000);
    
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const userCredential = await createUserWithEmailAndPassword(
        window.firebaseAuth,
        formData.email,
        formData.password
      );
      
      // Get the user info
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });
      
      console.log('Firebase sign-up successful:', user.email);
      
      // Create user in our backend with network timeout
      const syncResponse = await Promise.race([
        fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: `${formData.firstName} ${formData.lastName}`,
            photoURL: null,
            emailVerified: user.emailVerified,
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            phoneNumber: formData.phoneNumber ? `${formData.countryCode} ${formData.phoneNumber}` : null,
            nationality: formData.nationality,
            acceptTerms: formData.acceptTerms,
            acceptPrivacy: formData.acceptPrivacy,
            marketingConsent: formData.marketingConsent,
            isNewUser: true
          }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 15000)
        )
      ]);
      
      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        
        // Success feedback
        clearTimeout(timeoutId);
        setError('');
        
        // Show enhanced account creation success notification
        if (window.showSuccessNotification) {
          window.showSuccessNotification(`${formData.firstName} ${formData.lastName}`, 'signup');
        } else {
          // Fallback notification
          const successMessage = document.createElement('div');
          successMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
            font-weight: 600;
          `;
          successMessage.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">✨</div>
              <div>
                <div style="font-size: 16px; margin-bottom: 2px;">Welcome to CushGlobal, ${formData.firstName}!</div>
                <div style="font-size: 14px; opacity: 0.9;">Account created successfully - Please sign in to continue</div>
              </div>
            </div>
          `;
          document.body.appendChild(successMessage);
        }
        
        // Redirect to sign-in page after successful account creation
        setTimeout(() => {
          window.location.hash = 'signin';
        }, 2500);
      } else {
        throw new Error('Failed to sync user with backend');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Registration error:', error);
      
      // Enhanced error handling
      let errorMessage = getFirebaseErrorMessage(error.code);
      
      if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // Track Google sign-up attempt
    if (window.trackButtonClick) {
      window.trackButtonClick('google_signup', 'authentication');
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Starting Google Sign-Up process...');
      
      // Try popup first, fallback to redirect  
      const auth = window.firebaseAuth || await window.initializeFirebaseAuth();
      const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = 
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      let result;
      try {
        console.log('Attempting popup sign-up...');
        result = await signInWithPopup(auth, provider);
      } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          console.log('Popup blocked, using redirect...');
          await signInWithRedirect(auth, provider);
          return; // Page will redirect and OAuth handler will take over
        }
        throw error;
      }
      
      if (result && result.user) {
        console.log('Google sign-up successful:', result.user.email);
        
        // Track successful Google sign-up
        if (window.trackAuthEvent) {
          window.trackAuthEvent('google', 'sign_up');
        }
        
        // Complete authentication flow (as new user)
        const backendResult = await window.syncFirebaseUserWithBackend(result.user, true);
        
        if (backendResult && backendResult.success) {
          console.log('Google sign-up completed successfully');
          
          // Show success notification for Google sign-up
          if (window.showSuccessNotification) {
            window.showSuccessNotification(result.user.displayName || result.user.email.split('@')[0], 'signup');
          }
          
          // Redirect to sign-in page after account creation (not dashboard)
          setTimeout(() => {
            window.navigate('signin');
          }, 2500);
        }
      }
      // If result is null, it means redirect method was used
      
    } catch (error) {
      console.error('Google sign-up error:', error);
      
      // Use the enhanced error handler
      const errorMessage = window.handleFirebaseAuthError ? 
        window.handleFirebaseAuthError(error) : error.message;
      if (errorMessage) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return e('div', { className: 'min-h-screen flex' }, [
    // Left Side - Image Panel
    e('div', {
      key: 'left-panel',
      className: 'hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative overflow-hidden'
    }, [
      // Background Pattern
      e('div', {
        key: 'pattern',
        className: 'absolute inset-0 opacity-10',
        style: {
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '30px 30px'
        }
      }),
      
      // Content
      e('div', {
        key: 'left-content',
        className: 'relative z-10 flex flex-col justify-center items-center p-12 text-white'
      }, [
        // Logo
        e('img', {
          key: 'logo-left',
          src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
          alt: 'Cush Logo',
          className: 'h-12 mb-8'
        }),
        
        // Main Image
        e('div', {
          key: 'image-container',
          className: 'mb-8 relative'
        }, [
          e('img', {
            key: 'main-image',
            src: '/attached_assets/lady smiling_1752121060443.jpg',
            alt: 'Happy professional woman',
            className: 'w-96 h-96 object-cover rounded-2xl shadow-2xl'
          }),
          e('div', {
            key: 'image-overlay',
            className: 'absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl'
          })
        ]),
        
        // Text Content
        e('div', {
          key: 'text-content',
          className: 'text-center max-w-md'
        }, [
          e('h2', {
            key: 'welcome-title',
            className: 'text-3xl font-bold mb-4'
          }, 'Welcome to Cush'),
          e('p', {
            key: 'welcome-subtitle',
            className: 'text-xl text-blue-100 mb-6 leading-relaxed'
          }, 'Your gateway to global success. Join thousands of immigrants who have transformed their dreams into reality.'),
          e('div', {
            key: 'features',
            className: 'space-y-3 text-left'
          }, [
            e('div', {
              key: 'feature-1',
              className: 'flex items-center gap-3'
            }, [
              e('div', {
                key: 'check-1',
                className: 'w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0'
              }, [
                e('svg', {
                  key: 'check-icon-1',
                  className: 'w-4 h-4 text-white',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'check-path-1',
                    fillRule: 'evenodd',
                    d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                    clipRule: 'evenodd'
                  })
                ])
              ]),
              e('span', { key: 'feature-1-text' }, 'AI-powered immigration guidance')
            ]),
            e('div', {
              key: 'feature-2',
              className: 'flex items-center gap-3'
            }, [
              e('div', {
                key: 'check-2',
                className: 'w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0'
              }, [
                e('svg', {
                  key: 'check-icon-2',
                  className: 'w-4 h-4 text-white',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'check-path-2',
                    fillRule: 'evenodd',
                    d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                    clipRule: 'evenodd'
                  })
                ])
              ]),
              e('span', { key: 'feature-2-text' }, 'Comprehensive financial services')
            ]),
            e('div', {
              key: 'feature-3',
              className: 'flex items-center gap-3'
            }, [
              e('div', {
                key: 'check-3',
                className: 'w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0'
              }, [
                e('svg', {
                  key: 'check-icon-3',
                  className: 'w-4 h-4 text-white',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'check-path-3',
                    fillRule: 'evenodd',
                    d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                    clipRule: 'evenodd'
                  })
                ])
              ]),
              e('span', { key: 'feature-3-text' }, 'Expert mentor network')
            ])
          ])
        ])
      ])
    ]),

    // Right Side - Form Panel
    e('div', {
      key: 'right-panel',
      className: 'w-full lg:w-1/2 flex flex-col justify-center px-8 py-12 bg-gray-50'
    }, [
      // Header with Back Button (Mobile)
      e('div', {
        key: 'mobile-header',
        className: 'lg:hidden mb-8 flex items-center justify-between'
      }, [
        e('button', {
          key: 'back-button',
          onClick: () => navigate('home'),
          className: 'flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors'
        }, [
          e('svg', {
            key: 'back-icon',
            className: 'w-5 h-5',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          }, [
            e('path', {
              key: 'back-path',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M10 19l-7-7m0 0l7-7m-7 7h18'
            })
          ]),
          e('span', { key: 'back-text' }, 'Back')
        ]),
        e('img', {
          key: 'logo-mobile',
          src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
          alt: 'Cush Logo',
          className: 'h-8'
        })
      ]),
      
      // Form Container
      e('div', {
        key: 'form-container',
        className: 'max-w-md mx-auto w-full'
      }, [
        // Header Section
        e('div', {
          key: 'form-header',
          className: 'text-center mb-8'
        }, [
          e('h1', {
            key: 'title',
            className: 'text-3xl font-bold text-gray-900 mb-2'
          }, 'Create Your Account'),
          e('p', {
            key: 'subtitle',
            className: 'text-gray-600'
          }, 'Join thousands of successful immigrants worldwide')
        ]),

        // Form Card
        e('div', {
          key: 'form-card',
          className: 'bg-white rounded-xl shadow-lg p-8 border border-gray-100'
        }, [
          // Google Sign Up Button - Simple Text Only
          e('button', {
            key: 'google-signup',
            onClick: () => window.simpleGoogleSignIn(),
            type: 'button',
            style: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer' },
            className: 'w-full mb-6'
          }, 'Sign in with Google'),

          // Divider
          e('div', {
            key: 'divider',
            className: 'flex items-center mb-6'
          }, [
            e('div', { key: 'line1', className: 'flex-1 border-t border-gray-300' }),
            e('span', { key: 'or-text', className: 'px-4 text-gray-500 text-sm' }, 'or continue with email'),
            e('div', { key: 'line2', className: 'flex-1 border-t border-gray-300' })
          ]),

          // Registration Form
          e('form', { key: 'signup-form', onSubmit: handleSubmit }, [
            // General Error
            (errors.general || error) && e('div', {
              key: 'general-error',
              className: 'mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'
            }, errors.general || error),

            // First Name and Last Name
            e('div', {
              key: 'name-fields',
              className: 'grid grid-cols-2 gap-4 mb-4'
            }, [
              e('div', { key: 'first-name-field' }, [
                e('label', {
                  key: 'first-name-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'First Name *'),
                e('input', {
                  key: 'first-name-input',
                  type: 'text',
                  value: formData.firstName,
                  onChange: (e) => handleInputChange('firstName', e.target.value),
                  className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    fieldValidation.firstName?.isValid === false ? 'border-red-300 bg-red-50' :
                    fieldValidation.firstName?.isValid === true ? 'border-green-300 bg-green-50' :
                    'border-gray-300'
                  }`
                }),
                fieldValidation.firstName && !fieldValidation.firstName.isValid && e('p', {
                  key: 'first-name-validation',
                  className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'error-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'error-path',
                      fillRule: 'evenodd',
                      d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  fieldValidation.firstName.message
                ]),
                fieldValidation.firstName && fieldValidation.firstName.isValid && e('p', {
                  key: 'first-name-success',
                  className: 'mt-1 text-sm text-green-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'success-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'success-path',
                      fillRule: 'evenodd',
                      d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  'Looks good!'
                ])
              ]),
              e('div', { key: 'last-name-field' }, [
                e('label', {
                  key: 'last-name-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Last Name *'),
                e('input', {
                  key: 'last-name-input',
                  type: 'text',
                  value: formData.lastName,
                  onChange: (e) => handleInputChange('lastName', e.target.value),
                  className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    fieldValidation.lastName?.isValid === false ? 'border-red-300 bg-red-50' :
                    fieldValidation.lastName?.isValid === true ? 'border-green-300 bg-green-50' :
                    'border-gray-300'
                  }`
                }),
                fieldValidation.lastName && !fieldValidation.lastName.isValid && e('p', {
                  key: 'last-name-validation',
                  className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'error-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'error-path',
                      fillRule: 'evenodd',
                      d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  fieldValidation.lastName.message
                ]),
                fieldValidation.lastName && fieldValidation.lastName.isValid && e('p', {
                  key: 'last-name-success',
                  className: 'mt-1 text-sm text-green-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'success-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'success-path',
                      fillRule: 'evenodd',
                      d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  'Looks good!'
                ])
              ])
            ]),

            // Email Field
            e('div', { key: 'email-field', className: 'mb-4' }, [
              e('label', {
                key: 'email-label',
                className: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Email *'),
              e('input', {
                key: 'email-input',
                type: 'email',
                value: formData.email,
                onChange: (e) => handleInputChange('email', e.target.value),
                className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  fieldValidation.email?.isValid === false ? 'border-red-300 bg-red-50' :
                  fieldValidation.email?.isValid === true ? 'border-green-300 bg-green-50' :
                  'border-gray-300'
                }`
              }),
              fieldValidation.email && !fieldValidation.email.isValid && e('p', {
                key: 'email-validation',
                className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
              }, [
                e('svg', {
                  key: 'error-icon',
                  className: 'w-4 h-4',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'error-path',
                    fillRule: 'evenodd',
                    d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                    clipRule: 'evenodd'
                  })
                ]),
                fieldValidation.email.message
              ]),
              fieldValidation.email && fieldValidation.email.isValid && e('p', {
                key: 'email-success',
                className: 'mt-1 text-sm text-green-600 flex items-center gap-1'
              }, [
                e('svg', {
                  key: 'success-icon',
                  className: 'w-4 h-4',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'success-path',
                    fillRule: 'evenodd',
                    d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                    clipRule: 'evenodd'
                  })
                ]),
                'Looks good!'
              ])
            ]),

            // Username Field
            e('div', { key: 'username-field', className: 'mb-4' }, [
              e('label', {
                key: 'username-label',
                className: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Username *'),
              e('input', {
                key: 'username-input',
                type: 'text',
                value: formData.username,
                onChange: (e) => handleInputChange('username', e.target.value),
                className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  fieldValidation.username?.isValid === false ? 'border-red-300 bg-red-50' :
                  fieldValidation.username?.isValid === true ? 'border-green-300 bg-green-50' :
                  'border-gray-300'
                }`
              }),
              fieldValidation.username && !fieldValidation.username.isValid && e('p', {
                key: 'username-validation',
                className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
              }, [
                e('svg', {
                  key: 'error-icon',
                  className: 'w-4 h-4',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'error-path',
                    fillRule: 'evenodd',
                    d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                    clipRule: 'evenodd'
                  })
                ]),
                fieldValidation.username.message
              ]),
              fieldValidation.username && fieldValidation.username.isValid && e('p', {
                key: 'username-success',
                className: 'mt-1 text-sm text-green-600 flex items-center gap-1'
              }, [
                e('svg', {
                  key: 'success-icon',
                  className: 'w-4 h-4',
                  fill: 'currentColor',
                  viewBox: '0 0 20 20'
                }, [
                  e('path', {
                    key: 'success-path',
                    fillRule: 'evenodd',
                    d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                    clipRule: 'evenodd'
                  })
                ]),
                'Looks good!'
              ])
            ]),

            // Password Fields
            e('div', {
              key: 'password-fields',
              className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'
            }, [
              e('div', { key: 'password-field' }, [
                e('label', {
                  key: 'password-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Password *'),
                e('input', {
                  key: 'password-input',
                  type: 'password',
                  value: formData.password,
                  onChange: (e) => handleInputChange('password', e.target.value),
                  className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    fieldValidation.password?.isValid === false ? 'border-red-300 bg-red-50' :
                    fieldValidation.password?.isValid === true ? 'border-green-300 bg-green-50' :
                    'border-gray-300'
                  }`
                }),
                // Password Strength Indicator
                formData.password && e('div', {
                  key: 'password-strength',
                  className: 'mt-2'
                }, [
                  e('div', {
                    key: 'strength-bar-container',
                    className: 'w-full bg-gray-200 rounded-full h-2 mb-1'
                  }, [
                    e('div', {
                      key: 'strength-bar',
                      className: `h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`,
                      style: { width: `${passwordStrength.score}%` }
                    })
                  ]),
                  e('div', {
                    key: 'strength-feedback',
                    className: 'flex justify-between text-xs'
                  }, [
                    e('span', {
                      key: 'strength-text',
                      className: `font-medium ${
                        passwordStrength.score < 30 ? 'text-red-600' :
                        passwordStrength.score < 60 ? 'text-yellow-600' :
                        passwordStrength.score < 80 ? 'text-blue-600' : 'text-green-600'
                      }`
                    }, passwordStrength.feedback),
                    e('span', {
                      key: 'strength-score',
                      className: 'text-gray-500'
                    }, `${passwordStrength.score}/100`)
                  ]),
                  e('div', {
                    key: 'password-requirements',
                    className: 'mt-2 text-xs text-gray-600'
                  }, [
                    e('p', { key: 'req-text', className: 'mb-1' }, 'Password should include:'),
                    e('ul', { key: 'req-list', className: 'space-y-1' }, [
                      e('li', {
                        key: 'req-length',
                        className: `flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`
                      }, [
                        formData.password.length >= 8 ? '✓' : '○',
                        ' At least 8 characters'
                      ]),
                      e('li', {
                        key: 'req-upper',
                        className: `flex items-center gap-1 ${formData.password.match(/[A-Z]/) ? 'text-green-600' : 'text-gray-400'}`
                      }, [
                        formData.password.match(/[A-Z]/) ? '✓' : '○',
                        ' Uppercase letter'
                      ]),
                      e('li', {
                        key: 'req-lower',
                        className: `flex items-center gap-1 ${formData.password.match(/[a-z]/) ? 'text-green-600' : 'text-gray-400'}`
                      }, [
                        formData.password.match(/[a-z]/) ? '✓' : '○',
                        ' Lowercase letter'
                      ]),
                      e('li', {
                        key: 'req-number',
                        className: `flex items-center gap-1 ${formData.password.match(/[0-9]/) ? 'text-green-600' : 'text-gray-400'}`
                      }, [
                        formData.password.match(/[0-9]/) ? '✓' : '○',
                        ' Number'
                      ]),
                      e('li', {
                        key: 'req-special',
                        className: `flex items-center gap-1 ${formData.password.match(/[^A-Za-z0-9]/) ? 'text-green-600' : 'text-gray-400'}`
                      }, [
                        formData.password.match(/[^A-Za-z0-9]/) ? '✓' : '○',
                        ' Special character'
                      ])
                    ])
                  ])
                ]),
                fieldValidation.password && !fieldValidation.password.isValid && e('p', {
                  key: 'password-validation',
                  className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'error-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'error-path',
                      fillRule: 'evenodd',
                      d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  fieldValidation.password.message
                ])
              ]),
              e('div', { key: 'confirm-password-field' }, [
                e('label', {
                  key: 'confirm-password-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Confirm Password *'),
                e('input', {
                  key: 'confirm-password-input',
                  type: 'password',
                  value: formData.confirmPassword,
                  onChange: (e) => handleInputChange('confirmPassword', e.target.value),
                  className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    fieldValidation.confirmPassword?.isValid === false ? 'border-red-300 bg-red-50' :
                    fieldValidation.confirmPassword?.isValid === true ? 'border-green-300 bg-green-50' :
                    'border-gray-300'
                  }`
                }),
                fieldValidation.confirmPassword && !fieldValidation.confirmPassword.isValid && e('p', {
                  key: 'confirm-password-validation',
                  className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'error-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'error-path',
                      fillRule: 'evenodd',
                      d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  fieldValidation.confirmPassword.message
                ]),
                fieldValidation.confirmPassword && fieldValidation.confirmPassword.isValid && e('p', {
                  key: 'confirm-password-success',
                  className: 'mt-1 text-sm text-green-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'success-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'success-path',
                      fillRule: 'evenodd',
                      d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  'Passwords match!'
                ])
              ])
            ]),

            // Optional Fields
            e('div', {
              key: 'optional-fields',
              className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'
            }, [
              e('div', { key: 'phone-field' }, [
                e('label', {
                  key: 'phone-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Phone Number (Optional)'),
                e('div', {
                  key: 'phone-container',
                  className: 'flex w-full'
                }, [
                  // Country Code Selector - Streamlined
                  e('div', {
                    key: 'country-selector',
                    className: 'relative country-dropdown-container flex-shrink-0'
                  }, [
                    e('button', {
                      key: 'country-button',
                      type: 'button',
                      onClick: () => setShowCountryDropdown(!showCountryDropdown),
                      className: 'country-selector-button flex items-center justify-center px-3 py-3 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white w-20 h-12'
                    }, [
                      e('span', {
                        key: 'country-flag',
                        className: 'text-sm'
                      }, countryCodes.find(c => c.code === formData.countryCode)?.flag || '🌍'),
                      e('span', {
                        key: 'country-code',
                        className: 'text-xs font-medium ml-1'
                      }, formData.countryCode)
                    ]),
                    
                    // Dropdown Menu
                    showCountryDropdown && e('div', {
                      key: 'country-dropdown',
                      className: 'absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'
                    }, [
                      // Search Input
                      e('div', {
                        key: 'search-container',
                        className: 'p-3 border-b border-gray-200'
                      }, [
                        e('input', {
                          key: 'search-input',
                          type: 'text',
                          value: countrySearch,
                          onChange: (e) => setCountrySearch(e.target.value),
                          placeholder: 'Search country...',
                          className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                        })
                      ]),
                      
                      // Country List
                      e('div', {
                        key: 'country-list',
                        className: 'py-1'
                      }, filteredCountries.map((country, index) => 
                        e('button', {
                          key: `country-${index}`,
                          type: 'button',
                          onClick: () => handleCountrySelect(country),
                          className: 'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors'
                        }, [
                          e('span', {
                            key: `flag-${index}`,
                            className: 'text-base'
                          }, country.flag),
                          e('span', {
                            key: `code-${index}`,
                            className: 'text-sm font-medium text-gray-600 w-12'
                          }, country.code),
                          e('span', {
                            key: `name-${index}`,
                            className: 'text-sm text-gray-900 flex-1'
                          }, country.country)
                        ])
                      ))
                    ])
                  ]),
                  
                  // Phone Number Input - Aligned with country selector
                  e('input', {
                    key: 'phone-input',
                    type: 'tel',
                    value: formData.phoneNumber,
                    onChange: (e) => handleInputChange('phoneNumber', e.target.value),
                    placeholder: 'Phone number (optional)',
                    className: `flex-1 min-w-0 px-4 py-3 border-l-0 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors h-12 ${
                      fieldValidation.phoneNumber?.isValid === false ? 'border-red-300 bg-red-50' :
                      fieldValidation.phoneNumber?.isValid === true ? 'border-green-300 bg-green-50' :
                      'border-gray-300'
                    }`
                  })
                ]),
                fieldValidation.phoneNumber && !fieldValidation.phoneNumber.isValid && e('p', {
                  key: 'phone-validation',
                  className: 'mt-1 text-sm text-red-600 flex items-center gap-1'
                }, [
                  e('svg', {
                    key: 'error-icon',
                    className: 'w-4 h-4',
                    fill: 'currentColor',
                    viewBox: '0 0 20 20'
                  }, [
                    e('path', {
                      key: 'error-path',
                      fillRule: 'evenodd',
                      d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
                      clipRule: 'evenodd'
                    })
                  ]),
                  fieldValidation.phoneNumber.message
                ])
              ]),
              e('div', { key: 'nationality-field' }, [
                e('label', {
                  key: 'nationality-label',
                  className: 'block text-sm font-medium text-gray-700 mb-1'
                }, 'Nationality (Optional)'),
                e('input', {
                  key: 'nationality-input',
                  type: 'text',
                  value: formData.nationality,
                  onChange: (e) => handleInputChange('nationality', e.target.value),
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                })
              ])
            ]),

            // Checkboxes
            e('div', { key: 'checkboxes', className: 'mb-6 space-y-3' }, [
              e('div', { key: 'terms-privacy-checkbox', className: 'flex items-start' }, [
                e('input', {
                  key: 'terms-privacy-input',
                  type: 'checkbox',
                  checked: formData.acceptTerms && formData.acceptPrivacy,
                  onChange: (e) => {
                    const isChecked = e.target.checked;
                    handleInputChange('acceptTerms', isChecked);
                    handleInputChange('acceptPrivacy', isChecked);
                  },
                  className: 'mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                }),
                e('label', {
                  key: 'terms-privacy-label',
                  className: 'ml-2 text-sm text-gray-700'
                }, [
                  'I accept the ',
                  e('button', {
                    key: 'terms-link',
                    type: 'button',
                    onClick: () => navigate('terms'),
                    className: 'text-blue-600 hover:text-blue-800 underline'
                  }, 'Terms of Service'),
                  ' and ',
                  e('button', {
                    key: 'privacy-link',
                    type: 'button',
                    onClick: () => navigate('privacy'),
                    className: 'text-blue-600 hover:text-blue-800 underline'
                  }, 'Privacy Policy')
                ]),
                (errors.acceptTerms || errors.acceptPrivacy) && e('p', {
                  key: 'terms-privacy-error',
                  className: 'mt-1 text-sm text-red-600'
                }, errors.acceptTerms || errors.acceptPrivacy)
              ]),
              e('div', { key: 'marketing-checkbox', className: 'flex items-start' }, [
                e('input', {
                  key: 'marketing-input',
                  type: 'checkbox',
                  checked: formData.marketingConsent,
                  onChange: (e) => handleInputChange('marketingConsent', e.target.checked),
                  className: 'mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                }),
                e('label', {
                  key: 'marketing-label',
                  className: 'ml-2 text-sm text-gray-700'
                }, 'I agree to receive marketing communications (optional)')
              ])
            ]),

            // Submit Button
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
              className: `w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`
            }, loading ? 'Creating Account...' : 'Create Account'),
            
            // Display validation errors summary
            Object.keys(errors).length > 0 && e('div', {
              key: 'errors-summary',
              className: 'mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'
            }, [
              e('p', {
                key: 'errors-title',
                className: 'text-sm font-medium text-red-800 mb-2'
              }, 'Please fix the following errors:'),
              e('ul', {
                key: 'errors-list',
                className: 'text-sm text-red-700 space-y-1'
              }, Object.values(errors).map((error, index) => 
                e('li', {
                  key: `error-${index}`,
                  className: 'flex items-center gap-1'
                }, [
                  '• ',
                  error
                ])
              ))
            ])
          ])
        ]),

        // Sign In Link
        e('div', {
          key: 'signin-link',
          className: 'text-center mt-6'
        }, [
          e('p', {
            key: 'signin-text',
            className: 'text-gray-600'
          }, [
            'Already have an account? ',
            e('button', {
              key: 'signin-button',
              onClick: () => {
                if (typeof window.navigate === 'function') {
                  window.navigate('signin');
                } else {
                  window.location.hash = 'signin';
                }
              },
              className: 'text-blue-600 hover:text-blue-800 font-medium'
            }, 'Sign In')
          ])
        ])
      ])
    ]),

    // Success Message Modal
    showSuccessMessage && e('div', {
      key: 'success-modal',
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
    }, [
      e('div', {
        key: 'success-content',
        className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300 ease-out scale-105'
      }, [
        e('div', {
          key: 'success-header',
          className: 'bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center'
        }, [
          e('div', {
            key: 'success-icon',
            className: 'w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4'
          }, [
            e('svg', {
              key: 'check-icon',
              className: 'w-8 h-8 text-white',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            }, [
              e('path', {
                key: 'check-path',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 3,
                d: 'M5 13l4 4L19 7'
              })
            ])
          ]),
          e('h2', {
            key: 'success-title',
            className: 'text-2xl font-bold text-white mb-2'
          }, 'Yaay! 🎉'),
          e('p', {
            key: 'success-message',
            className: 'text-green-100 text-lg'
          }, 'Your account has been successfully created!')
        ]),
        e('div', {
          key: 'success-body',
          className: 'p-6 text-center'
        }, [
          e('p', {
            key: 'redirect-message',
            className: 'text-gray-600 mb-4'
          }, 'Redirecting you to the sign-in page...'),
          e('div', {
            key: 'loading-dots',
            className: 'flex justify-center space-x-1'
          }, [
            e('div', {
              key: 'dot-1',
              className: 'w-2 h-2 bg-blue-500 rounded-full animate-bounce',
              style: { animationDelay: '0ms' }
            }),
            e('div', {
              key: 'dot-2',
              className: 'w-2 h-2 bg-blue-500 rounded-full animate-bounce',
              style: { animationDelay: '150ms' }
            }),
            e('div', {
              key: 'dot-3',
              className: 'w-2 h-2 bg-blue-500 rounded-full animate-bounce',
              style: { animationDelay: '300ms' }
            })
          ])
        ])
      ])
    ])
  ]);
}

// Cush Pay Page Component
function RailsrPayPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('wallets');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wallets, setWallets] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/railsr/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setWallets(data.wallets || []);
        setCards(data.cards || []);
        setTransactions(data.recentTransactions || []);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async (currency) => {
    try {
      setLoading(true);
      const response = await fetch('/api/railsr/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency })
      });
      
      if (response.ok) {
        loadDashboardData();
      } else {
        throw new Error('Failed to create wallet');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCard = async (walletId, cardType) => {
    try {
      setLoading(true);
      const response = await fetch('/api/railsr/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, cardType })
      });
      
      if (response.ok) {
        loadDashboardData();
      } else {
        throw new Error('Failed to create card');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return e('div', { className: 'min-h-screen bg-gray-50' }, [
    // Header
    e('div', {
      key: 'header',
      className: 'bg-white shadow-sm border-b border-gray-200 mb-6'
    }, [
      e('div', { className: 'flex items-center justify-between px-6 py-4' }, [
        e('div', { key: 'title-section', className: 'flex items-center gap-3' }, [
          e('button', {
            key: 'back-button',
            onClick: onBack,
            className: 'text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors'
          }, '← Back to Dashboard'),
          e('h1', { key: 'title', className: 'text-2xl font-bold text-gray-900' }, 'Cush Pay'),
          e('span', { key: 'badge', className: 'bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full' }, 'Embedded Finance')
        ])
      ])
    ]),

    // Tab Navigation
    e('div', {
      key: 'tabs',
      className: 'bg-white border-b border-gray-200 mb-6'
    }, [
      e('div', { className: 'container mx-auto px-6' }, [
        e('nav', { className: 'flex space-x-8' }, [
          ['wallets', 'Wallets', '💳'],
          ['cards', 'Cards', '🎯'],
          ['transfers', 'Transfers', '💸'],
          ['transactions', 'Transactions', '📊']
        ].map(([tab, label, icon]) =>
          e('button', {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } transition-colors`
          }, [
            e('span', { key: 'icon' }, icon),
            label
          ])
        ))
      ])
    ]),

    // Content Area
    e('div', {
      key: 'content',
      className: 'container mx-auto px-6 py-8'
    }, [
      // Error Message
      error && e('div', {
        key: 'error',
        className: 'mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800'
      }, error),

      // Loading State
      loading && e('div', {
        key: 'loading',
        className: 'text-center py-8'
      }, 'Loading...'),

      // Dashboard Stats
      dashboardData && e('div', {
        key: 'stats',
        className: 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'
      }, [
        e('div', {
          key: 'total-balance',
          className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200'
        }, [
          e('h3', { key: 'title', className: 'text-sm font-medium text-gray-600' }, 'Total Balance'),
          e('p', { key: 'amount', className: 'text-2xl font-bold text-gray-900' }, `£${dashboardData.totalBalance?.toFixed(2) || '0.00'}`),
          e('p', { key: 'change', className: 'text-sm text-green-600' }, '+2.5% from last month')
        ]),
        
        e('div', {
          key: 'active-wallets',
          className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200'
        }, [
          e('h3', { key: 'title', className: 'text-sm font-medium text-gray-600' }, 'Active Wallets'),
          e('p', { key: 'count', className: 'text-2xl font-bold text-gray-900' }, wallets.length.toString()),
          e('p', { key: 'currencies', className: 'text-sm text-gray-500' }, `${[...new Set(wallets.map(w => w.currency))].join(', ')} currencies`)
        ]),
        
        e('div', {
          key: 'active-cards',
          className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200'
        }, [
          e('h3', { key: 'title', className: 'text-sm font-medium text-gray-600' }, 'Active Cards'),
          e('p', { key: 'count', className: 'text-2xl font-bold text-gray-900' }, cards.length.toString()),
          e('p', { key: 'types', className: 'text-sm text-gray-500' }, 'Virtual & Physical cards')
        ])
      ]),

      // Tab Content
      activeTab === 'wallets' && e('div', { key: 'wallets-content' }, [
        e('div', { key: 'wallets-header', className: 'flex items-center justify-between mb-6' }, [
          e('h2', { key: 'title', className: 'text-xl font-semibold text-gray-900' }, 'Your Wallets'),
          e('div', { key: 'actions', className: 'flex gap-2' }, [
            ['GBP', 'EUR', 'USD'].map(currency =>
              e('button', {
                key: currency,
                onClick: () => createWallet(currency),
                className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm'
              }, `Create ${currency} Wallet`)
            )
          ])
        ]),
        
        e('div', { key: 'wallets-grid', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' }, 
          wallets.length === 0 ? 
            [e('p', { key: 'no-wallets', className: 'col-span-full text-center py-8 text-gray-500' }, 'No wallets created yet')] :
            wallets.map((wallet, index) =>
              e('div', {
                key: `wallet-${wallet.id || index}`,
                className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200'
              }, [
                e('div', { key: 'wallet-header', className: 'flex items-center justify-between mb-4' }, [
                  e('h3', { key: 'currency', className: 'font-semibold text-gray-900' }, wallet.currency),
                  e('span', { key: 'status', className: 'text-xs bg-green-100 text-green-800 px-2 py-1 rounded' }, wallet.status || 'Active')
                ]),
                e('p', { key: 'balance', className: 'text-2xl font-bold text-gray-900' }, `${wallet.currency === 'GBP' ? '£' : wallet.currency === 'EUR' ? '€' : '$'}${wallet.balance?.toFixed(2) || '0.00'}`),
                e('p', { key: 'id', className: 'text-xs text-gray-500 mt-2' }, `ID: ${wallet.railsrWalletId || 'N/A'}`)
              ])
            )
        )
      ]),

      activeTab === 'cards' && e('div', { key: 'cards-content' }, [
        e('div', { key: 'cards-header', className: 'flex items-center justify-between mb-6' }, [
          e('h2', { key: 'title', className: 'text-xl font-semibold text-gray-900' }, 'Your Cards'),
          wallets.length > 0 && e('button', {
            key: 'create-card',
            onClick: () => createCard(wallets[0].id, 'virtual'),
            className: 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
          }, 'Create Virtual Card')
        ]),
        
        e('div', { key: 'cards-grid', className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' }, 
          cards.length === 0 ? 
            [e('p', { key: 'no-cards', className: 'col-span-full text-center py-8 text-gray-500' }, 'No cards created yet')] :
            cards.map((card, index) =>
              e('div', {
                key: `card-${card.id || index}`,
                className: 'bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-white shadow-lg'
              }, [
                e('div', { key: 'card-header', className: 'flex items-center justify-between mb-4' }, [
                  e('span', { key: 'type', className: 'text-blue-100 text-sm' }, card.cardType || 'Virtual'),
                  e('span', { key: 'brand', className: 'text-white font-bold' }, 'VISA')
                ]),
                e('p', { key: 'number', className: 'text-lg font-mono tracking-wider' }, '**** **** **** ****'),
                e('div', { key: 'card-details', className: 'flex justify-between mt-4' }, [
                  e('div', { key: 'holder' }, [
                    e('p', { key: 'label', className: 'text-blue-100 text-xs' }, 'CARD HOLDER'),
                    e('p', { key: 'name', className: 'text-sm font-medium' }, `${user.firstName} ${user.lastName}`)
                  ]),
                  e('div', { key: 'expiry' }, [
                    e('p', { key: 'label', className: 'text-blue-100 text-xs' }, 'EXPIRES'),
                    e('p', { key: 'date', className: 'text-sm font-medium' }, '12/26')
                  ])
                ])
              ])
            )
        )
      ]),

      activeTab === 'transfers' && e('div', { key: 'transfers-content' }, [
        e('h2', { key: 'title', className: 'text-xl font-semibold text-gray-900 mb-6' }, 'Send Money'),
        e('div', { key: 'transfer-form', className: 'bg-white p-6 rounded-lg shadow-sm border border-gray-200' }, [
          e('p', { key: 'coming-soon', className: 'text-center py-8 text-gray-500' }, 'Transfer functionality coming soon...')
        ])
      ]),

      activeTab === 'transactions' && e('div', { key: 'transactions-content' }, [
        e('h2', { key: 'title', className: 'text-xl font-semibold text-gray-900 mb-6' }, 'Recent Transactions'),
        e('div', { key: 'transactions-list', className: 'bg-white rounded-lg shadow-sm border border-gray-200' }, [
          transactions.length === 0 ? 
            e('p', { key: 'no-transactions', className: 'text-center py-8 text-gray-500' }, 'No transactions yet') :
            transactions.map((transaction, index) =>
              e('div', {
                key: `transaction-${transaction.id || index}`,
                className: 'p-4 border-b border-gray-200 last:border-b-0'
              }, [
                e('div', { key: 'transaction-content', className: 'flex items-center justify-between' }, [
                  e('div', { key: 'transaction-info' }, [
                    e('p', { key: 'description', className: 'font-medium text-gray-900' }, transaction.description || 'Transaction'),
                    e('p', { key: 'date', className: 'text-sm text-gray-500' }, new Date(transaction.createdAt).toLocaleDateString())
                  ]),
                  e('div', { key: 'amount', className: `font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}` }, 
                    `${transaction.amount > 0 ? '+' : ''}£${transaction.amount?.toFixed(2) || '0.00'}`
                  )
                ])
              ])
            )
        ])
      ])
    ])
  ]);
}

// Mount the application
document.addEventListener('DOMContentLoaded', function() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(e(App));
  } else {
    console.error('Root element not found');
  }
});