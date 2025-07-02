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
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [testCredentials, setTestCredentials] = useState(null);
  const [showTestAccounts, setShowTestAccounts] = useState(false);

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
            
            e('button', {
              key: 'submit-button',
              type: 'submit',
              disabled: loading,
              className: `w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${loading ? 'cursor-not-allowed' : ''}`
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

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Clear any local storage/session storage if needed
        localStorage.clear();
        sessionStorage.clear();
        // Force reload to ensure clean state
        window.location.href = '/';
      } else {
        console.error('Logout failed with status:', response.status);
        // Force redirect anyway for security
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect anyway for security
      window.location.href = '/';
    }
  };

  return e('div', { className: 'min-h-screen bg-gray-50 flex' }, [
    // Main Content
    e('div', { key: 'main', className: 'flex-1' }, [
      // Top Header
      e('header', {
        key: 'header',
        className: 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100'
      }, [
        e('div', { className: 'flex items-center justify-between px-6 py-4' }, [
          e('div', {
            key: 'logo-title',
            className: 'flex items-center gap-3'
          }, [
            e('img', {
              key: 'dashboard-logo',
              src: '/attached_assets/Logo + Typeface_PNG (4)_1751497310419.png',
              alt: 'Cush Logo',
              className: 'h-8 w-auto'
            }),
            e('span', {
              key: 'dashboard-text',
              className: 'text-xl font-medium text-gray-700'
            }, 'Dashboard')
          ]),
          
          e('div', { key: 'user-section', className: 'flex items-center gap-4' }, [
            e('span', { 
              key: 'welcome',
              className: 'text-gray-600'
            }, `Welcome, ${user?.firstName || 'User'}`),
            user?.role === 'admin' && e('button', {
              key: 'admin',
              onClick: () => setCurrentView('admin'),
              className: 'bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors'
            }, 'Admin Panel'),
            e('button', {
              key: 'account',
              onClick: () => setCurrentView('account'),
              className: 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors'
            }, 'Account'),
            e('button', {
              key: 'logout',
              onClick: handleLogout,
              className: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors'
            }, 'Sign Out')
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
        e('div', { key: 'dashboard-content' }, [
          // Welcome Section
          e('div', {
            key: 'welcome-section',
            className: 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-8 text-white mb-8 shadow-2xl'
          }, [
            e('h2', { key: 'welcome-title', className: 'text-3xl font-bold mb-4' }, 'Welcome to Cush Platform'),
            e('p', { key: 'welcome-desc', className: 'text-blue-100 text-lg' }, 'Your comprehensive immigration and financial services platform')
          ]),

          // Feature Cards
          e('div', {
            key: 'feature-cards',
            className: 'grid md:grid-cols-3 gap-6'
          }, [
            {
              title: 'Loan Referrals',
              description: 'Connect with trusted financial institutions',
              icon: '💳',
              color: 'from-green-500 to-emerald-500'
            },
            {
              title: 'Community Hub',
              description: 'Join our global immigrant community',
              icon: '🌍',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              title: 'Imisi 2.0 AI',
              description: 'Get instant immigration assistance',
              icon: '🤖',
              color: 'from-purple-500 to-pink-500'
            }
          ].map((feature, index) =>
            e('div', {
              key: `feature-${index}`,
              className: 'bg-white rounded-xl p-6 shadow-lg border'
            }, [
              e('div', {
                key: 'icon',
                className: `w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-2xl mb-4`
              }, feature.icon),
              e('h3', { key: 'title', className: 'text-xl font-bold text-gray-900 mb-2' }, feature.title),
              e('p', { key: 'desc', className: 'text-gray-600' }, feature.description)
            ])
          ))
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

  // Fetch dashboard statistics
  useEffect(() => {
    if (currentTab === 'overview') {
      fetchDashboardStats();
    } else if (currentTab === 'users') {
      fetchUsers();
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
        }, 500);
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
        } ${hasNewSuggestion ? 'animate-bounce' : ''}`
      }, [
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
              e('span', { key: 'message', className: 'text-white text-2xl' }, '💬'),
              e('div', {
                key: 'ai-badge',
                className: 'absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center'
              }, [
                e('span', { key: 'brain', className: 'text-xs' }, '🧠')
              ])
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
          className: 'absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center'
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
      className: `fixed bottom-24 right-6 z-40 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-12' : 'h-[600px]'
      }`
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
            className: 'w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm'
          }, [
            e('span', { key: 'robot', className: 'text-lg' }, '🤖')
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
          className: 'flex-1 p-4 overflow-y-auto space-y-4',
          style: { maxHeight: '400px' }
        }, [
          // Empty state
          messages.length === 0 && e('div', {
            key: 'empty-state',
            className: 'text-center text-gray-500 py-8'
          }, [
            e('div', {
              key: 'bot-icon',
              className: 'text-4xl mb-3'
            }, '🤖'),
            e('p', {
              key: 'ready-text',
              className: 'text-sm mb-2'
            }, "Ready to help with your migration journey!"),
            e('p', {
              key: 'tap-text',
              className: 'text-xs'
            }, 'Tap the chat button to start')
          ]),
          
          // Message list
          ...messages.map(message => 
            e('div', {
              key: message.id,
              className: `flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`
            }, [
              e('div', {
                key: 'message-bubble',
                className: `max-w-[80%] rounded-lg px-3 py-2 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`
              }, [
                e('p', {
                  key: 'content',
                  className: 'text-sm leading-relaxed'
                }, message.content),
                
                e('div', {
                  key: 'timestamp',
                  className: `text-xs mt-1 ${
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
            className: 'flex justify-start'
          }, [
            e('div', {
              key: 'typing-bubble',
              className: 'bg-gray-100 rounded-lg px-3 py-2'
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
          className: 'border-t p-4'
        }, [
          e('div', {
            key: 'input-form',
            className: 'flex gap-2'
          }, [
            e('input', {
              key: 'message-input',
              type: 'text',
              value: inputMessage,
              onChange: (e) => setInputMessage(e.target.value),
              onKeyPress: (e) => e.key === 'Enter' && handleSendMessage(),
              placeholder: 'Ask about visas, budgets, timelines...',
              disabled: isTyping,
              className: 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50'
            }),
            e('button', {
              key: 'send-btn',
              onClick: handleSendMessage,
              disabled: !inputMessage.trim() || isTyping,
              className: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed'
            }, [
              e('span', { key: 'send-icon', className: 'text-sm' }, isTyping ? '⏳' : '→')
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

// Mount the application
const root = createRoot(document.getElementById('root'));
root.render(e(App));