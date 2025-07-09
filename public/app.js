// React 18 Components for Cush Platform - Fixed Syntax
const { useState, useEffect, createElement: e } = React;
const { createRoot } = ReactDOM;

// Navigation Header Component
function NavigationHeader() {
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
          }, [
            e('button', {
              key: 'sign-in',
              onClick: () => navigate('signin'),
              className: 'text-white/90 hover:text-white font-medium px-4 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all'
            }, 'Sign In'),
            e('button', {
              key: 'get-started',
              onClick: () => navigate('signin'),
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
              onClick: () => navigate('signin'),
              className: 'text-white/90 hover:text-white font-medium px-4 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-all text-center'
            }, 'Sign In'),
            e('button', {
              key: 'mobile-get-started',
              onClick: () => navigate('signin'),
              className: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 shadow-lg text-center'
            }, 'Get Started')
          ])
        ])
      ])
    ])
  ]);
}

// Homepage Hero Section - Based on Reference Design
function HeroSection() {
  return e('section', { 
    className: 'relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 min-h-screen flex items-center justify-center overflow-hidden'
  }, [
    // Navigation Header
    e(NavigationHeader, { key: 'navigation' }),
    
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
            onClick: () => navigate('signin')
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
            className: 'space-y-6'
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
          ))
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

// Modern Sign In Page inspired by Vesti design
function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [testCredentials, setTestCredentials] = useState(null);
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupForm.email,
          email: signupForm.email,
          password: signupForm.password,
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          address: signupForm.address,
          country: signupForm.country,
          phone: signupForm.phone
        })
      });
      
      if (response.ok) {
        alert('Account created successfully! Please sign in.');
        setIsSignUp(false);
        setLoginForm({ email: signupForm.email, password: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Registration failed');
      }
    } catch (error) {
      alert('Registration failed. Please try again.');
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
            onClick: () => navigate('home'),
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
                className: 'w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
                placeholder: 'ajitd@gmail.com'
              })
            ]),
            
            e('div', { key: 'password-field' }, [
              e('input', {
                key: 'password-input',
                type: 'password',
                value: loginForm.password,
                onChange: (e) => setLoginForm({ ...loginForm, password: e.target.value }),
                required: true,
                className: 'w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500',
                placeholder: 'Enter your password'
              })
            ]),

            e('div', {
              key: 'forgot-password',
              className: 'text-left'
            }, [
              e('button', {
                key: 'forgot-link',
                type: 'button',
                className: 'text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors'
              }, 'Forgot Password? Reset here')
            ]),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
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
                  onClick: () => setIsSignUp(true),
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
                    showPrivacyPolicy();
                  },
                  className: 'text-blue-600 hover:text-blue-800 underline font-medium'
                }, 'Privacy Policy'),
                ' and ',
                e('a', {
                  key: 'terms-link',
                  href: '#',
                  onClick: (e) => {
                    e.preventDefault();
                    showTermsOfService();
                  },
                  className: 'text-blue-600 hover:text-blue-800 underline font-medium'
                }, 'Terms of Service'),
                '. I understand that by creating an account, I consent to the collection and use of my information as described in these documents.'
              ])
            ]),
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading || !signupForm.agreeToTerms,
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
            onClick: () => navigate('signin'),
            className: 'bg-blue-600 hover:bg-blue-700 text-white font-bold px-12 py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1'
          }, 'Get Started Now'),
          e('button', {
            key: 'sign-in',
            onClick: () => navigate('signin'),
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
function Dashboard({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  


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

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      // Clear storage first
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Call logout endpoint
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Force redirect regardless of response
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even on error
      window.location.href = '/';
    }
  };

  // Modern Sidebar Navigation Items
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', view: 'dashboard' },
    { id: 'community', label: 'Community', icon: '🌍', view: 'community' },
    { id: 'loans', label: 'Loans', icon: '💰', view: 'loans' },
    { id: 'imisi', label: 'Imisi AI', icon: '🤖', view: 'imisi' },
    { id: 'jobs', label: 'Local Jobs', icon: '💼', view: 'jobs' },
    { id: 'settings', label: 'Settings', icon: '⚙️', view: 'settings' }
  ];

  return e('div', { className: 'min-h-screen bg-gray-50 flex' }, [
    // Left Sidebar
    e('div', { 
      key: 'sidebar',
      className: `fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
    }, [
      // Sidebar Header
      e('div', { 
        key: 'sidebar-header',
        className: 'flex items-center justify-between px-6 py-4 border-b border-gray-200'
      }, [
        e('div', {
          key: 'logo-section',
          className: 'flex items-center gap-3'
        }, [
          e('div', {
            key: 'logo-circle',
            className: 'w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'
          }, [
            e('span', {
              key: 'logo-text',
              className: 'text-white font-bold text-sm'
            }, 'C')
          ]),
          e('span', {
            key: 'brand-name',
            className: 'font-bold text-lg text-gray-900'
          }, 'Cush')
        ]),
        // Mobile close button
        e('button', {
          key: 'close-sidebar',
          onClick: () => setSidebarOpen(false),
          className: 'lg:hidden text-gray-500 hover:text-gray-700'
        }, '✕')
      ]),

      // User Profile Section
      e('div', {
        key: 'user-profile',
        className: 'px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white'
      }, [
        e('div', { 
          key: 'user-avatar',
          className: 'flex items-center gap-3'
        }, [
          e('div', {
            key: 'avatar-circle',
            className: 'w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'
          }, [
            e('img', {
              key: 'user-image',
              src: '/attached_assets/guy smiling2_1751497479944.jpg',
              alt: 'User Avatar',
              className: 'w-10 h-10 rounded-full object-cover'
            })
          ]),
          e('div', { key: 'user-info' }, [
            e('div', {
              key: 'user-name',
              className: 'font-medium text-sm'
            }, `${user?.firstName || 'User'} ${user?.lastName || ''}`),
            e('div', {
              key: 'user-status',
              className: 'text-xs text-blue-100'
            }, 'Welcome back!')
          ])
        ])
      ]),

      // Navigation Menu
      e('nav', { 
        key: 'navigation',
        className: 'flex-1 px-4 py-6 space-y-2'
      }, [
        sidebarItems.map(item => 
          e('button', {
            key: item.id,
            onClick: () => setCurrentView(item.view),
            className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === item.view 
                ? 'bg-blue-50 text-blue-600 border-r-3 border-blue-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }, [
            e('span', { key: 'icon', className: 'text-lg' }, item.icon),
            e('span', { key: 'label', className: 'font-medium' }, item.label)
          ])
        )
      ]),

      // Admin Panel & Logout
      e('div', {
        key: 'sidebar-footer',
        className: 'px-4 py-4 border-t border-gray-200 space-y-2'
      }, [
        // Show admin panel for admin users
        ...(user && user.role === 'admin' ? [
          e('button', {
            key: 'admin-panel',
            onClick: () => setCurrentView('admin'),
            className: 'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors font-medium'
          }, [
            e('span', { key: 'admin-icon', className: 'text-lg' }, '🛡️'),
            e('span', { key: 'admin-label', className: 'font-medium' }, 'Admin Panel')
          ])
        ] : []),
        e('button', {
          key: 'logout-btn',
          onClick: handleLogout,
          className: 'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors'
        }, [
          e('span', { key: 'logout-icon', className: 'text-lg' }, '🚪'),
          e('span', { key: 'logout-label', className: 'font-medium' }, 'Sign Out')
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
      className: 'flex-1 lg:ml-0'
    }, [
      // Top Header Bar
      e('header', {
        key: 'header',
        className: 'bg-white shadow-sm border-b border-gray-200'
      }, [
        e('div', { 
          key: 'header-content',
          className: 'flex items-center justify-between px-6 py-4'
        }, [
          e('div', {
            key: 'header-left',
            className: 'flex items-center gap-4'
          }, [
            // Mobile hamburger menu
            e('button', {
              key: 'mobile-menu',
              onClick: () => setSidebarOpen(!sidebarOpen),
              className: 'lg:hidden text-gray-500 hover:text-gray-700'
            }, '☰'),
            e('h1', {
              key: 'page-title',
              className: 'text-2xl font-bold text-gray-900'
            }, currentView === 'dashboard' ? 'Dashboard' : 
               currentView === 'community' ? 'Community Hub' :
               currentView === 'loans' ? 'Loans' :
               currentView === 'imisi' ? 'Imisi AI Assistant' :
               currentView === 'jobs' ? 'Local Jobs' :
               currentView === 'admin' ? 'Admin Panel' :
               currentView === 'account' ? 'Account Settings' : 'Dashboard')
          ]),
          
          // Header Actions
          e('div', {
            key: 'header-actions',
            className: 'flex items-center gap-4'
          }, [
            e('div', {
              key: 'search-box',
              className: 'relative hidden md:block'
            }, [
              e('input', {
                key: 'search-input',
                type: 'text',
                placeholder: 'Search...',
                className: 'pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64'
              }),
              e('span', {
                key: 'search-icon',
                className: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              }, '🔍')
            ]),
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
                  className: 'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'
                }, unreadCount.toString())
              ]),
              
              // Notifications Panel
              notificationsPanelOpen && e('div', {
                key: 'notifications-panel',
                className: 'absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50'
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
                    notifications.map((notification, index) =>
                      e('div', {
                        key: `notification-${notification.id}-${index}`,
                        className: `p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`,
                        onClick: () => markAsRead(notification.id)
                      }, [
                        e('div', { key: 'notification-content', className: 'flex items-start gap-3' }, [
                          e('div', { key: 'notification-icon', className: 'text-xl flex-shrink-0' }, 
                            notification.type === 'loan' ? '💰' :
                            notification.type === 'community' ? '🌍' :
                            notification.type === 'achievement' ? '🏆' :
                            notification.type === 'financial' ? '📊' : '🔔'
                          ),
                          e('div', { key: 'notification-text', className: 'flex-1 min-w-0' }, [
                            e('h4', { key: 'notification-title', className: 'font-medium text-gray-900 text-sm' }, notification.title),
                            e('p', { key: 'notification-message', className: 'text-gray-600 text-sm mt-1' }, notification.message),
                            e('p', { key: 'notification-time', className: 'text-gray-400 text-xs mt-1' }, 
                              new Date(notification.createdAt).toLocaleString())
                          ])
                        ])
                      ])
                    )
                ])
              ])
            ]),
            
            e('button', {
              key: 'account-btn',
              onClick: () => setCurrentView('account'),
              className: 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors'
            }, 'Account')
          ])
        ])
      ]),

      // Dashboard Content
      e('main', {
        key: 'content',
        className: 'p-6'
      }, [
        // Render different views based on currentView
        currentView === 'account' ? e(UserAccountPage, { key: 'account-page', user, onBack: () => setCurrentView('dashboard') }) : 
        currentView === 'admin' && user?.role === 'admin' ? e(AdminDashboard, { key: 'admin-dashboard', user, onBack: () => setCurrentView('dashboard') }) : 
        currentView === 'community' ? e(CommunityHub, { key: 'community-hub' }) :
        currentView === 'loans' ? e(LoansPage, { key: 'loans-page', user, onBack: () => setCurrentView('dashboard') }) :
        currentView === 'mood-meter' ? e(FinancialMoodMeter, { key: 'mood-meter', onBack: () => setCurrentView('dashboard') }) :
        currentView === 'health-radar' ? e(FinancialHealthRadar, { key: 'health-radar', onBack: () => setCurrentView('dashboard') }) :
        // Modern Financial Dashboard
        e('div', { key: 'dashboard-content', className: 'space-y-6' }, [
          // Test Notification Button (Development Only)
          e('div', {
            key: 'test-notifications',
            className: 'mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'
          }, [
            e('h3', { key: 'test-title', className: 'text-sm font-medium text-yellow-800 mb-2' }, 'Development Test'),
            e('button', {
              key: 'test-btn',
              onClick: async () => {
                try {
                  const response = await fetch('/api/notifications/test', { method: 'POST' });
                  if (response.ok) {
                    loadNotifications();
                    loadUnreadCount();
                  }
                } catch (error) {
                  console.error('Failed to create test notifications:', error);
                }
              },
              className: 'bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-600'
            }, 'Create Test Notifications')
          ]),

          // Financial Overview Cards
          e('div', {
            key: 'overview-cards',
            className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
          }, [
            // Total Balance Card
            e('div', {
              key: 'total-balance',
              className: 'bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg'
            }, [
              e('div', { key: 'balance-header', className: 'flex items-center justify-between mb-4' }, [
                e('h3', { key: 'balance-title', className: 'text-blue-100 text-sm font-medium' }, 'Total Balance'),
                e('div', { key: 'balance-icon', className: 'w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center' }, '💰')
              ]),
              e('div', { key: 'balance-amount', className: 'text-3xl font-bold mb-2' }, '£1,320.00'),
              e('div', { key: 'balance-change', className: 'text-blue-100 text-sm' }, '+2.5% from last month')
            ]),
            
            // Loans Card
            e('div', {
              key: 'loans-card',
              className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
            }, [
              e('div', { key: 'loans-header', className: 'flex items-center justify-between mb-4' }, [
                e('h3', { key: 'loans-title', className: 'text-gray-600 text-sm font-medium' }, 'Loans'),
                e('div', { key: 'loans-icon', className: 'w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center' }, '📊')
              ]),
              e('div', { key: 'loans-amount', className: 'text-2xl font-bold text-gray-900 mb-2' }, '£25,200.00'),
              e('div', { key: 'loans-status', className: 'text-green-600 text-sm' }, 'On track')
            ]),
            
            // Savings Card
            e('div', {
              key: 'savings-card',
              className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
            }, [
              e('div', { key: 'savings-header', className: 'flex items-center justify-between mb-4' }, [
                e('h3', { key: 'savings-title', className: 'text-gray-600 text-sm font-medium' }, 'Savings'),
                e('div', { key: 'savings-icon', className: 'w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center' }, '💸')
              ]),
              e('div', { key: 'savings-amount', className: 'text-2xl font-bold text-gray-900 mb-2' }, '£3,280.00'),
              e('div', { key: 'savings-target', className: 'text-gray-500 text-sm' }, 'Target: £5,000')
            ]),
            
            // Investments Card
            e('div', {
              key: 'investments-card',
              className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
            }, [
              e('div', { key: 'investments-header', className: 'flex items-center justify-between mb-4' }, [
                e('h3', { key: 'investments-title', className: 'text-gray-600 text-sm font-medium' }, 'Investments'),
                e('div', { key: 'investments-icon', className: 'w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center' }, '📈')
              ]),
              e('div', { key: 'investments-amount', className: 'text-2xl font-bold text-gray-900 mb-2' }, '£8,450.00'),
              e('div', { key: 'investments-change', className: 'text-green-600 text-sm' }, '+12.3% this year')
            ])
          ]),

          // Charts and Transactions Section
          e('div', {
            key: 'charts-section',
            className: 'grid grid-cols-1 lg:grid-cols-2 gap-6'
          }, [
            // Balance Chart
            e('div', {
              key: 'balance-chart',
              className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
            }, [
              e('h3', { key: 'chart-title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Balance Overview'),
              e('div', { key: 'chart-placeholder', className: 'h-64 bg-gray-50 rounded-lg flex items-center justify-center' }, [
                e('div', { key: 'chart-content', className: 'text-center' }, [
                  e('div', { key: 'chart-icon', className: 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4' }, '📊'),
                  e('p', { key: 'chart-text', className: 'text-gray-600' }, 'Interactive balance chart would display here')
                ])
              ])
            ]),
            
            // Quick Actions
            e('div', {
              key: 'quick-actions',
              className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
            }, [
              e('h3', { key: 'actions-title', className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Quick Actions'),
              e('div', { key: 'actions-grid', className: 'grid grid-cols-2 gap-4' }, [
                e('button', {
                  key: 'transfer-btn',
                  className: 'p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left',
                  onClick: () => setCurrentView('loans')
                }, [
                  e('div', { key: 'transfer-icon', className: 'w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-2' }, '💳'),
                  e('div', { key: 'transfer-text', className: 'text-sm font-medium text-gray-900' }, 'Apply for Loan')
                ]),
                e('button', {
                  key: 'community-btn',
                  className: 'p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left',
                  onClick: () => setCurrentView('community')
                }, [
                  e('div', { key: 'community-icon', className: 'w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-2' }, '🌍'),
                  e('div', { key: 'community-text', className: 'text-sm font-medium text-gray-900' }, 'Community Hub')
                ]),
                e('button', {
                  key: 'imisi-btn',
                  className: 'p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left',
                  onClick: () => setCurrentView('imisi')
                }, [
                  e('div', { key: 'imisi-icon', className: 'w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-2' }, '🤖'),
                  e('div', { key: 'imisi-text', className: 'text-sm font-medium text-gray-900' }, 'Imisi AI Assistant')
                ]),
                e('button', {
                  key: 'settings-btn',
                  className: 'p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left',
                  onClick: () => setCurrentView('settings')
                }, [
                  e('div', { key: 'settings-icon', className: 'w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mb-2' }, '⚙️'),
                  e('div', { key: 'settings-text', className: 'text-sm font-medium text-gray-900' }, 'Settings')
                ])
              ])
            ])
          ]),

          // Recent Transactions Table
          e('div', {
            key: 'transactions-table',
            className: 'bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'
          }, [
            e('div', { key: 'table-header', className: 'px-6 py-4 border-b border-gray-200' }, [
              e('h3', { key: 'table-title', className: 'text-lg font-semibold text-gray-900' }, 'Recent Transactions')
            ]),
            e('div', { key: 'table-content', className: 'overflow-x-auto' }, [
              e('table', { key: 'transactions-table-element', className: 'w-full' }, [
                e('thead', { key: 'table-head', className: 'bg-gray-50' }, [
                  e('tr', { key: 'header-row' }, [
                    e('th', { key: 'date-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Date'),
                    e('th', { key: 'desc-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Description'),
                    e('th', { key: 'amount-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Amount'),
                    e('th', { key: 'type-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Type'),
                    e('th', { key: 'status-header', className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status')
                  ])
                ]),
                e('tbody', { key: 'table-body', className: 'bg-white divide-y divide-gray-200' }, [
                  // Sample transaction rows
                  e('tr', { key: 'trans-1', className: 'hover:bg-gray-50' }, [
                    e('td', { key: 'date-1', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, '2025-01-15'),
                    e('td', { key: 'desc-1', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, 'Salary Deposit'),
                    e('td', { key: 'amount-1', className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600' }, '+£2,500.00'),
                    e('td', { key: 'type-1', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' }, 'Income'),
                    e('td', { key: 'status-1', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('span', { key: 'status-badge-1', className: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800' }, 'Completed')
                    ])
                  ]),
                  e('tr', { key: 'trans-2', className: 'hover:bg-gray-50' }, [
                    e('td', { key: 'date-2', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, '2025-01-14'),
                    e('td', { key: 'desc-2', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, 'Grocery Shopping'),
                    e('td', { key: 'amount-2', className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600' }, '-£125.50'),
                    e('td', { key: 'type-2', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' }, 'Expense'),
                    e('td', { key: 'status-2', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('span', { key: 'status-badge-2', className: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800' }, 'Completed')
                    ])
                  ]),
                  e('tr', { key: 'trans-3', className: 'hover:bg-gray-50' }, [
                    e('td', { key: 'date-3', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, '2025-01-13'),
                    e('td', { key: 'desc-3', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, 'Rent Payment'),
                    e('td', { key: 'amount-3', className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600' }, '-£850.00'),
                    e('td', { key: 'type-3', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500' }, 'Expense'),
                    e('td', { key: 'status-3', className: 'px-6 py-4 whitespace-nowrap' }, [
                      e('span', { key: 'status-badge-3', className: 'inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800' }, 'Pending')
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ])
    ])
  ]);
}

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
      hourlyRate: "$120",
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
      hourlyRate: "$150",
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
      hourlyRate: "$130",
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
    setInsights(sampleInsights);
    setMentors(sampleMentors);
    setLoading(false);
  }, []);

  const renderInsightCard = (insight) => e('div', {
    key: `insight-${insight.id}`,
    className: 'bg-white rounded-xl p-6 shadow-lg border hover:shadow-xl transition-shadow cursor-pointer',
    onClick: () => setSelectedInsight(insight)
  }, [
    e('div', {
      key: 'insight-header',
      className: 'flex items-start gap-4 mb-4'
    }, [
      e('div', {
        key: 'insight-content',
        className: 'flex-1'
      }, [
        e('h3', {
          key: 'title',
          className: 'text-xl font-bold text-gray-900 mb-2'
        }, insight.title),
        e('p', {
          key: 'excerpt',
          className: 'text-gray-600 leading-relaxed mb-3'
        }, insight.excerpt),
        e('div', {
          key: 'meta',
          className: 'flex items-center gap-4 text-sm text-gray-500'
        }, [
          e('span', { key: 'author' }, `By ${insight.author}`),
          e('span', { key: 'role' }, insight.authorRole),
          e('span', { key: 'read-time' }, `${insight.readTime} min read`),
          e('span', { key: 'date' }, new Date(insight.publishedAt).toLocaleDateString())
        ])
      ])
    ]),
    e('div', {
      key: 'tags',
      className: 'flex flex-wrap gap-2'
    }, insight.tags.map((tag, index) => 
      e('span', {
        key: `tag-${index}`,
        className: 'px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'
      }, tag)
    ))
  ]);

  const renderMentorCard = (mentor) => e('div', {
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
      }, mentor.name.split(' ').map(n => n[0]).join('')),
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
          e('span', { key: 'rating' }, `⭐ ${mentor.rating}`),
          e('span', { key: 'sessions' }, `${mentor.sessions} sessions`)
        ])
      ])
    ]),
    e('p', {
      key: 'bio',
      className: 'text-gray-600 mb-4'
    }, mentor.bio),
    e('div', {
      key: 'specialties',
      className: 'flex flex-wrap gap-2 mb-4'
    }, mentor.specialties.map((spec, index) =>
      e('span', {
        key: `spec-${index}`,
        className: 'px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm'
      }, spec)
    )),
    e('div', {
      key: 'actions',
      className: 'flex items-center justify-between'
    }, [
      e('span', {
        key: 'rate',
        className: 'text-lg font-bold text-gray-900'
      }, mentor.hourlyRate + '/hour'),
      e('button', {
        key: 'book-btn',
        onClick: () => {
          setSelectedMentor(mentor);
          setShowBookingForm(true);
        },
        className: 'px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
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

  const renderBookingForm = () => {
    if (!showBookingForm || !selectedMentor) return null;

    return e('div', {
      key: 'booking-modal',
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setShowBookingForm(false);
        }
      }
    }, [
      e('div', {
        key: 'booking-form',
        className: 'bg-white rounded-xl max-w-lg w-full p-6'
      }, [
        e('h2', {
          key: 'form-title',
          className: 'text-2xl font-bold text-gray-900 mb-4'
        }, `Book Session with ${selectedMentor.name}`),
        
        e('div', {
          key: 'form-fields',
          className: 'space-y-4'
        }, [
          e('div', { key: 'date-field' }, [
            e('label', {
              key: 'date-label',
              className: 'block text-sm font-medium text-gray-700 mb-2'
            }, 'Select Date & Time:'),
            e('select', {
              key: 'date-select',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }, [
              e('option', { key: 'default-option', value: '' }, 'Choose available slot...'),
              ...selectedMentor.availability.weekdays.map((slot, index) =>
                e('option', {
                  key: `slot-${index}`,
                  value: `${slot.day}-${slot.startTime}`
                }, `${slot.day} ${slot.startTime} - ${slot.endTime}`)
              )
            ])
          ]),

          e('div', { key: 'topic-field' }, [
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
            key: 'actions',
            className: 'flex gap-3 pt-4'
          }, [
            e('button', {
              key: 'cancel',
              onClick: () => setShowBookingForm(false),
              className: 'flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors'
            }, 'Cancel'),
            e('button', {
              key: 'book',
              onClick: () => {
                setShowBookingForm(false);
                alert('Consultation booked successfully! You will receive a confirmation email shortly.');
              },
              className: 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors'
            }, 'Book Session')
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
    className: 'max-w-7xl mx-auto p-6'
  }, [
    // Header
    e('div', {
      key: 'header',
      className: 'mb-8'
    }, [
      e('div', {
        key: 'title-section',
        className: 'flex items-center gap-4 mb-4'
      }, [
        e('h1', {
          key: 'title',
          className: 'text-3xl font-bold text-gray-900'
        }, 'Community Hub'),
        e('div', {
          key: 'stats',
          className: 'flex items-center gap-6 text-sm text-gray-600'
        }, [
          e('span', { key: 'insights-count' }, `${insights.length} Expert Insights`),
          e('span', { key: 'mentors-count' }, `${mentors.length} Certified Mentors`),
          e('span', { key: 'members-count' }, '2,500+ Community Members')
        ])
      ]),
      e('p', {
        key: 'description',
        className: 'text-gray-600 text-lg'
      }, 'Connect with experts, access curated insights, and join our global immigration community')
    ]),

    // Tab Navigation
    e('div', {
      key: 'tabs',
      className: 'flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8'
    }, [
      ['insights', 'Expert Insights', '📚'],
      ['mentors', 'Find Mentors', '👥'],
      ['events', 'Community Events', '📅']
    ].map(([key, label, icon]) =>
      e('button', {
        key: `tab-${key}`,
        onClick: () => setActiveTab(key),
        className: `flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-colors ${
          activeTab === key
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`
      }, [
        e('span', { key: 'icon' }, icon),
        e('span', { key: 'label' }, label)
      ])
    )),

    // Content
    e('div', {
      key: 'content'
    }, [
      // Insights Tab
      activeTab === 'insights' && e('div', {
        key: 'insights-content'
      }, [
        e('div', {
          key: 'insights-grid',
          className: 'grid md:grid-cols-2 gap-6'
        }, insights.map(renderInsightCard))
      ]),

      // Mentors Tab
      activeTab === 'mentors' && e('div', {
        key: 'mentors-content'
      }, [
        e('div', {
          key: 'mentors-grid',
          className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6'
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
    e('div', { key: 'app-container' }, [
      e(Dashboard, { key: 'dashboard', user }),
      e(ImisiChatHead, { key: 'imisi-chat' })
    ]) :
    e(AppRouter, { key: 'router' });
}

// Homepage Component
function Homepage() {
  return e('div', { className: 'min-h-screen' }, [
    e(HeroSection, { key: 'hero' }),
    e(ServicesSection, { key: 'services' }),
    e(TestimonialsSection, { key: 'testimonials' }),
    e(AboutUsSection, { key: 'about' }),
    e(ContactSection, { key: 'contact' }),
    e(AuthComponent, { key: 'auth' })
  ]);
}

// Main App Router Component
function AppRouter() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.hash.substring(1) || 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.substring(1) || 'home');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global navigate function
  window.navigate = (route) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  switch (currentRoute) {
    case 'signin':
      return e(SignInPage, { key: 'signin' });
    case 'about':
      return e(AboutUsPage, { key: 'about' });
    case 'mentors':
      return e(MentorBookingPage, { key: 'mentors' });
    case 'home':
    default:
      return e(Homepage, { key: 'homepage' });
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
    hourlyRate: '',
    languages: '',
    certifications: '',
    availability: {
      timezone: 'EST',
      weekdays: []
    }
  });

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

  const addMentor = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mentors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMentor,
          languages: newMentor.languages.split(',').map(lang => lang.trim()),
          certifications: newMentor.certifications.split(',').map(cert => cert.trim())
        })
      });

      if (response.ok) {
        fetchMentors();
        setShowAddMentor(false);
        setNewMentor({
          name: '',
          email: '',
          specialty: '',
          experience: '',
          bio: '',
          hourlyRate: '',
          languages: '',
          certifications: '',
          availability: {
            timezone: 'EST',
            weekdays: []
          }
        });
        alert('Mentor added successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add mentor');
      }
    } catch (error) {
      alert('Failed to add mentor');
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
        e('div', {
          key: 'stats-grid',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'
        }, dashboardStats ? [
          {
            title: 'Total Users',
            value: dashboardStats.totalUsers.toLocaleString(),
            icon: '👥'
          },
          {
            title: 'Monthly Active',
            value: dashboardStats.monthlyActiveUsers.toLocaleString(),
            icon: '📈'
          },
          {
            title: 'Total Transactions',
            value: dashboardStats.totalTransactions.toLocaleString(),
            icon: '💳'
          },
          {
            title: 'Total Balance',
            value: formatCurrency(parseFloat(dashboardStats.totalBalance)),
            icon: '💰'
          }
        ].map((stat, index) =>
          e('div', {
            key: index,
            className: 'bg-white rounded-lg p-6 shadow-sm border border-gray-200'
          }, [
            e('div', { key: 'header', className: 'flex items-center justify-between' }, [
              e('div', { key: 'title', className: 'text-sm font-medium text-gray-600' }, stat.title),
              e('span', { key: 'icon', className: 'text-2xl' }, stat.icon)
            ]),
            e('div', { key: 'value', className: 'mt-2 text-3xl font-bold text-gray-900' }, stat.value)
          ])
        ) : [
          e('div', {
            key: 'loading',
            className: 'col-span-4 text-center py-8 text-gray-500'
          }, loading ? 'Loading statistics...' : 'Failed to load statistics')
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
                    e('td', { key: 'no-users-message', className: 'px-6 py-4 text-center text-gray-500', colspan: '5' }, 
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
                  e('span', { key: 'rate' }, mentor.hourlyRate),
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
                  e('option', { key: 'canada', value: 'Canadian Immigration' }, 'Canadian Immigration'),
                  e('option', { key: 'australia', value: 'Australian Migration' }, 'Australian Migration'),
                  e('option', { key: 'uk', value: 'UK Immigration' }, 'UK Immigration'),
                  e('option', { key: 'usa', value: 'US Immigration' }, 'US Immigration'),
                  e('option', { key: 'general', value: 'General Immigration' }, 'General Immigration')
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
              e('div', { key: 'hourly-rate-field' }, [
                e('label', {
                  key: 'hourly-rate-label',
                  className: 'block text-sm font-medium text-gray-700 mb-2'
                }, 'Hourly Rate'),
                e('input', {
                  key: 'hourly-rate-input',
                  type: 'text',
                  required: true,
                  placeholder: 'e.g., $120',
                  value: newMentor.hourlyRate,
                  onChange: (e) => setNewMentor({ ...newMentor, hourlyRate: e.target.value }),
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

// User Account Page Component
function UserAccountPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    nationality: user?.nationality || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  return e('div', { className: 'max-w-4xl mx-auto' }, [
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
        }, 'Account Settings'),
        e('p', {
          key: 'subtitle',
          className: 'text-gray-600 mt-2'
        }, 'Manage your account information and security settings')
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
            onClick: () => navigate('signin'),
            className: 'bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl'
          }, 'Get Started Today'),
          e('button', {
            key: 'find-mentors',
            onClick: () => navigate('mentors'),
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
      hourlyRate: '$150',
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
      hourlyRate: '$140',
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
      hourlyRate: '$160',
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
      hourlyRate: '$170',
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
                key: 'rate',
                className: 'flex justify-between'
              }, [
                e('span', { key: 'rate-label', className: 'text-gray-600' }, 'Hourly Rate:'),
                e('span', { key: 'rate-value', className: 'font-medium text-green-600' }, mentor.hourlyRate)
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

  return e('div', { className: 'min-h-screen bg-gray-50' }, [
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
    e('div', { key: 'content', className: 'p-6' }, [
      currentStep === 'overview' && renderOverview(),
      currentStep === 'prequalify' && renderPrequalification(),
      currentStep === 'providers' && renderProviders(),
      currentStep === 'favorites' && renderFavorites(),
      currentStep === 'drafts' && renderDrafts()
    ])
  ]);
}

// Mount the application
const root = createRoot(document.getElementById('root'));
root.render(e(App));