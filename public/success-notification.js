// Success Notification System - Creative and Engaging Login Success Feedback
// Provides immediate positive feedback after successful authentication

(function() {
  console.log('Success Notification System loaded');

  // Create and show success notification
  window.showSuccessNotification = (userName, type = 'login') => {
    console.log('Showing success notification for:', userName, type);
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.success-notification');
    existingNotifications.forEach(notification => {
      document.body.removeChild(notification);
    });

    // Create notification container
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      font-weight: 600;
      min-width: 320px;
      max-width: 400px;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 2px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    `;

    // Create content based on type
    let icon, title, subtitle;
    
    if (type === 'login') {
      icon = '🎉';
      title = userName ? `Welcome back, ${userName.split(' ')[0]}!` : 'Welcome back!';
      subtitle = 'Successfully signed in with Google';
    } else if (type === 'signup') {
      icon = '✨';
      title = userName ? `Welcome to CushGlobal, ${userName.split(' ')[0]}!` : 'Welcome to CushGlobal!';
      subtitle = 'Account created successfully';
    } else {
      icon = '🔐';
      title = 'Authentication Successful';
      subtitle = 'Taking you to your dashboard...';
    }

    // Build notification HTML
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 16px;">
        <div style="font-size: 32px; line-height: 1; margin-top: 2px;">${icon}</div>
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px; color: white;">
            ${title}
          </div>
          <div style="font-size: 14px; font-weight: 400; color: rgba(255, 255, 255, 0.9); margin-bottom: 12px;">
            ${subtitle}
          </div>
          <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px; overflow: hidden;">
            <div class="progress-bar" style="
              width: 0%;
              height: 100%;
              background: linear-gradient(90deg, #FBBF24, #F59E0B);
              border-radius: 2px;
              transition: width 2.5s ease-out;
            "></div>
          </div>
        </div>
        <button class="close-btn" style="
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='white'" 
           onmouseout="this.style.background='none'; this.style.color='rgba(255,255,255,0.7)'">
          ×
        </button>
      </div>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Start progress bar animation
    setTimeout(() => {
      const progressBar = notification.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.style.width = '100%';
      }
    }, 100);

    // Add close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.onclick = () => {
      hideNotification(notification);
    };

    // Auto-hide after 3 seconds
    const hideTimeout = setTimeout(() => {
      hideNotification(notification);
    }, 3000);

    // Add click to dismiss functionality
    notification.onclick = (e) => {
      if (e.target === notification) {
        clearTimeout(hideTimeout);
        hideNotification(notification);
      }
    };

    return notification;
  };

  // Hide notification with animation
  function hideNotification(notification) {
    if (!notification || !document.body.contains(notification)) return;
    
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }

  // Enhanced success notification with confetti effect
  window.showEnhancedSuccessNotification = (userName, type = 'login') => {
    // Show main notification
    const notification = window.showSuccessNotification(userName, type);
    
    // Add confetti effect
    createConfettiEffect();
    
    return notification;
  };

  // Simple confetti effect
  function createConfettiEffect() {
    const colors = ['#10B981', '#059669', '#FBBF24', '#F59E0B', '#3B82F6', '#1D4ED8'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
      }, i * 20);
    }
  }

  function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      top: -10px;
      right: ${Math.random() * 100 + 50}px;
      width: 8px;
      height: 8px;
      background: ${color};
      border-radius: 50%;
      z-index: 9999;
      pointer-events: none;
      animation: confetti-fall 2s ease-out forwards;
    `;

    // Add CSS animation
    if (!document.getElementById('confetti-styles')) {
      const styles = document.createElement('style');
      styles.id = 'confetti-styles';
      styles.textContent = `
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(confetti);

    // Remove confetti piece after animation
    setTimeout(() => {
      if (document.body.contains(confetti)) {
        document.body.removeChild(confetti);
      }
    }, 2000);
  }

  // Toast notification variant
  window.showToastNotification = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      transform: translateY(100%);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateY(100%)';
      toast.style.opacity = '0';
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);

    return toast;
  };

  console.log('Success Notification System ready');
})();