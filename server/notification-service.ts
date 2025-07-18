import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { WebSocket } from 'ws';

export interface Notification {
  id: string;
  userId: number;
  type: 'loan' | 'community' | 'system' | 'achievement' | 'financial' | 'support' | 'account' | 'security' | 'payment' | 'credit' | 'investment' | 'migration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  expiresAt?: Date;
  sentAt?: Date;
  scheduledFor?: Date;
}

export class NotificationService {
  private notifications: Map<number, Notification[]> = new Map();
  private notificationId = 1;
  private wsConnections: Map<number, WebSocket[]> = new Map(); // userId -> WebSocket connections

  // WebSocket connection management
  addWebSocketConnection(userId: number, ws: WebSocket): void {
    const userConnections = this.wsConnections.get(userId) || [];
    userConnections.push(ws);
    this.wsConnections.set(userId, userConnections);

    // Clean up on close
    ws.on('close', () => {
      this.removeWebSocketConnection(userId, ws);
    });
  }

  removeWebSocketConnection(userId: number, ws: WebSocket): void {
    const userConnections = this.wsConnections.get(userId) || [];
    const index = userConnections.indexOf(ws);
    if (index > -1) {
      userConnections.splice(index, 1);
      if (userConnections.length === 0) {
        this.wsConnections.delete(userId);
      } else {
        this.wsConnections.set(userId, userConnections);
      }
    }
  }

  // Send real-time notification to connected WebSocket clients
  private sendRealtimeNotification(userId: number, notification: Notification): void {
    const userConnections = this.wsConnections.get(userId) || [];
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });

    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Create a new notification
  createNotification(
    userId: number,
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium',
    data?: Record<string, any>,
    options?: {
      actionRequired?: boolean;
      actionUrl?: string;
      actionText?: string;
      expiresAt?: Date;
      scheduledFor?: Date;
    }
  ): Notification {
    const notification: Notification = {
      id: `notif_${this.notificationId++}`,
      userId,
      type,
      priority,
      title,
      message,
      data,
      read: false,
      actionRequired: options?.actionRequired || false,
      actionUrl: options?.actionUrl,
      actionText: options?.actionText,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
      scheduledFor: options?.scheduledFor,
      sentAt: options?.scheduledFor ? undefined : new Date()
    };

    const userNotifications = this.notifications.get(userId) || [];
    
    // Insert based on priority (critical first, then high, medium, low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    let insertIndex = 0;
    
    for (let i = 0; i < userNotifications.length; i++) {
      if (priorityOrder[notification.priority] <= priorityOrder[userNotifications[i].priority]) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    userNotifications.splice(insertIndex, 0, notification);
    this.notifications.set(userId, userNotifications);

    // Send real-time notification if not scheduled
    if (!options?.scheduledFor) {
      this.sendRealtimeNotification(userId, notification);
    }

    return notification;
  }

  // Get user notifications
  getUserNotifications(userId: number, limit: number = 10): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications
      .filter(n => !n.expiresAt || n.expiresAt > new Date())
      .slice(0, limit);
  }

  // Mark notification as read
  markAsRead(userId: number, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // Mark all notifications as read
  markAllAsRead(userId: number): void {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(n => n.read = true);
  }

  // Get unread count
  getUnreadCount(userId: number): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Delete notification
  deleteNotification(userId: number, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
      userNotifications.splice(index, 1);
      return true;
    }
    return false;
  }

  // Create loan-related notifications
  createLoanNotification(userId: number, type: 'application' | 'approval' | 'rejection' | 'reminder', providerName: string) {
    const notifications = {
      application: {
        title: 'Loan Application Submitted',
        message: `Your loan application to ${providerName} has been submitted successfully.`
      },
      approval: {
        title: 'Loan Approved! 🎉',
        message: `Great news! Your loan application to ${providerName} has been approved.`
      },
      rejection: {
        title: 'Loan Application Update',
        message: `Your loan application to ${providerName} requires additional review.`
      },
      reminder: {
        title: 'Payment Reminder',
        message: `Your loan payment to ${providerName} is due soon.`
      }
    };

    const notif = notifications[type];
    return this.createNotification(userId, 'loan', notif.title, notif.message);
  }

  // Create community notifications
  createCommunityNotification(userId: number, type: 'event' | 'mentor' | 'forum', details: string) {
    const notifications = {
      event: {
        title: 'Community Event',
        message: `New event available: ${details}`
      },
      mentor: {
        title: 'Mentor Session',
        message: `Mentor session update: ${details}`
      },
      forum: {
        title: 'Community Discussion',
        message: `New activity in community: ${details}`
      }
    };

    const notif = notifications[type];
    return this.createNotification(userId, 'community', notif.title, notif.message);
  }

  // Create financial health notifications
  createFinancialNotification(userId: number, type: 'goal' | 'budget' | 'insight', message: string) {
    const titles = {
      goal: 'Financial Goal Update',
      budget: 'Budget Alert',
      insight: 'Financial Insight'
    };

    return this.createNotification(userId, 'financial', titles[type], message);
  }

  // Create achievement notifications
  createAchievementNotification(userId: number, achievementName: string, description: string) {
    return this.createNotification(
      userId,
      'achievement',
      `Achievement Unlocked: ${achievementName}`,
      description
    );
  }

  // Create support-related notifications
  createSupportNotification(userId: number, type: string, title: string, message: string, metadata: any) {
    return this.createNotification(
      userId,
      'support',
      title,
      message,
      metadata
    );
  }

  // Create support notifications
  createSupportNotification(userId: number, type: 'ticket_reply' | 'ticket_status' | 'feedback_response', title: string, message: string, data?: Record<string, any>) {
    return this.createNotification(userId, 'support', title, message, 'medium', { supportType: type, ...data });
  }

  // Create account notifications
  createAccountNotification(userId: number, type: 'security' | 'profile' | 'login' | 'verification', title: string, message: string) {
    return this.createNotification(userId, 'account', title, message, 'medium', { accountType: type });
  }

  // Create system notifications
  createSystemNotification(userId: number, title: string, message: string) {
    return this.createNotification(userId, 'system', title, message);
  }

  // Critical Financial Alert Methods
  createCriticalSecurityAlert(userId: number, title: string, message: string, actionUrl?: string) {
    return this.createNotification(userId, 'security', title, message, 'critical', {
      securityLevel: 'high',
      requiresImmediate: true,
      timestamp: new Date().toISOString()
    }, {
      actionRequired: true,
      actionUrl,
      actionText: 'Secure Account',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  }

  createPaymentAlert(userId: number, type: 'failed' | 'successful' | 'pending' | 'refunded', amount: string, currency: string, reference?: string) {
    const priority = type === 'failed' ? 'high' : type === 'successful' ? 'medium' : 'low';
    const titles = {
      failed: 'Payment Failed',
      successful: 'Payment Successful',
      pending: 'Payment Pending',
      refunded: 'Payment Refunded'
    };
    
    return this.createNotification(userId, 'payment', titles[type], 
      `${titles[type]}: ${amount} ${currency}${reference ? ` (${reference})` : ''}`,
      priority, {
        paymentType: type,
        amount,
        currency,
        reference
      }, {
        actionRequired: type === 'failed',
        actionUrl: type === 'failed' ? '/cush-pay' : undefined,
        actionText: type === 'failed' ? 'Retry Payment' : undefined
      });
  }

  createLoanStatusAlert(userId: number, loanId: string, status: 'approved' | 'rejected' | 'under_review' | 'disbursed', amount?: string, provider?: string) {
    const priority = status === 'approved' || status === 'rejected' ? 'high' : 'medium';
    const titles = {
      approved: 'Loan Approved! 🎉',
      rejected: 'Loan Application Update',
      under_review: 'Loan Under Review',
      disbursed: 'Loan Disbursed'
    };
    
    const messages = {
      approved: `Great news! Your loan application has been approved${amount ? ` for ${amount}` : ''}${provider ? ` by ${provider}` : ''}.`,
      rejected: `Your loan application has been reviewed${provider ? ` by ${provider}` : ''}. We'll help you find alternative options.`,
      under_review: `Your loan application is being reviewed${provider ? ` by ${provider}` : ''}. We'll notify you once there's an update.`,
      disbursed: `Your loan has been disbursed${amount ? ` (${amount})` : ''}. Funds should be available in your account shortly.`
    };
    
    return this.createNotification(userId, 'loan', titles[status], messages[status], priority, {
      loanId,
      status,
      amount,
      provider,
      timestamp: new Date().toISOString()
    }, {
      actionRequired: status === 'approved' || status === 'rejected',
      actionUrl: '/loans',
      actionText: status === 'approved' ? 'View Loan Details' : status === 'rejected' ? 'Explore Options' : undefined
    });
  }

  createCreditScoreAlert(userId: number, currentScore: number, previousScore: number, change: 'increase' | 'decrease' | 'no_change') {
    const priority = change === 'decrease' ? 'high' : change === 'increase' ? 'medium' : 'low';
    const diff = Math.abs(currentScore - previousScore);
    
    const titles = {
      increase: 'Credit Score Improved! 📈',
      decrease: 'Credit Score Alert 📉',
      no_change: 'Credit Score Update'
    };
    
    const messages = {
      increase: `Your credit score increased by ${diff} points to ${currentScore}. Keep up the good work!`,
      decrease: `Your credit score decreased by ${diff} points to ${currentScore}. Let's work on improving it.`,
      no_change: `Your credit score remains at ${currentScore}. Consider our credit improvement tips.`
    };
    
    return this.createNotification(userId, 'credit', titles[change], messages[change], priority, {
      currentScore,
      previousScore,
      change,
      difference: diff
    }, {
      actionRequired: change === 'decrease',
      actionUrl: '/credit-passport',
      actionText: change === 'decrease' ? 'Improve Score' : 'View Credit Report'
    });
  }

  createInvestmentAlert(userId: number, type: 'profit' | 'loss' | 'milestone', amount: string, currency: string, details?: string) {
    const priority = type === 'loss' ? 'high' : type === 'profit' ? 'medium' : 'low';
    const titles = {
      profit: 'Investment Profit 💰',
      loss: 'Investment Alert 📊',
      milestone: 'Investment Milestone 🎯'
    };
    
    return this.createNotification(userId, 'investment', titles[type], 
      `${titles[type]}: ${amount} ${currency}${details ? ` - ${details}` : ''}`,
      priority, {
        investmentType: type,
        amount,
        currency,
        details
      }, {
        actionRequired: type === 'loss',
        actionUrl: '/dashboard',
        actionText: 'Review Portfolio'
      });
  }

  createMigrationAlert(userId: number, type: 'visa_expiry' | 'document_required' | 'application_update' | 'deadline', message: string, daysLeft?: number) {
    const priority = type === 'visa_expiry' || type === 'deadline' ? 'critical' : 'high';
    const titles = {
      visa_expiry: 'Visa Expiry Alert 🚨',
      document_required: 'Document Required 📋',
      application_update: 'Application Update 📝',
      deadline: 'Important Deadline ⏰'
    };
    
    return this.createNotification(userId, 'migration', titles[type], message, priority, {
      migrationType: type,
      daysLeft,
      timestamp: new Date().toISOString()
    }, {
      actionRequired: true,
      actionUrl: '/imisi',
      actionText: 'Get Assistance',
      expiresAt: daysLeft ? new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000) : undefined
    });
  }

  // Enhanced WebSocket management with heartbeat
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage = JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
      
      for (const [userId, connections] of this.wsConnections.entries()) {
        connections.forEach((ws, index) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(heartbeatMessage);
          } else {
            // Remove dead connections
            connections.splice(index, 1);
          }
        });
        
        // Clean up empty connection arrays
        if (connections.length === 0) {
          this.wsConnections.delete(userId);
        }
      }
    }, 30000); // 30 seconds
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Get notifications with smart filtering
  getNotificationsByPriority(userId: number, priority?: Notification['priority']): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    if (!priority) return userNotifications;
    
    return userNotifications.filter(n => n.priority === priority);
  }

  getCriticalNotifications(userId: number): Notification[] {
    return this.getNotificationsByPriority(userId, 'critical');
  }

  getActionRequiredNotifications(userId: number): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => n.actionRequired && !n.read);
  }

  // Send real-time update to user about unread count
  sendUnreadCountUpdate(userId: number): void {
    const userConnections = this.wsConnections.get(userId) || [];
    const unreadCount = this.getUnreadCount(userId);
    const message = JSON.stringify({
      type: 'unread_count',
      data: { count: unreadCount }
    });

    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send real-time notification list update
  sendNotificationListUpdate(userId: number): void {
    const userConnections = this.wsConnections.get(userId) || [];
    const notifications = this.getUserNotifications(userId);
    const message = JSON.stringify({
      type: 'notification_list',
      data: notifications
    });

    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Clean up expired notifications
  cleanupExpiredNotifications(): void {
    const now = new Date();
    for (const [userId, notifications] of this.notifications.entries()) {
      const activeNotifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now);
      this.notifications.set(userId, activeNotifications);
    }
  }
}

export const notificationService = new NotificationService();

// Start heartbeat for WebSocket connections
notificationService.startHeartbeat();

// Clean up expired notifications every hour
setInterval(() => {
  notificationService.cleanupExpiredNotifications();
}, 60 * 60 * 1000);