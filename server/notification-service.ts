import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface Notification {
  id: string;
  userId: number;
  type: 'loan' | 'community' | 'system' | 'achievement' | 'financial';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export class NotificationService {
  private notifications: Map<number, Notification[]> = new Map();
  private notificationId = 1;

  // Create a new notification
  createNotification(
    userId: number,
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>,
    expiresAt?: Date
  ): Notification {
    const notification: Notification = {
      id: `notif_${this.notificationId++}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
      expiresAt
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification);
    this.notifications.set(userId, userNotifications);

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

// Clean up expired notifications every hour
setInterval(() => {
  notificationService.cleanupExpiredNotifications();
}, 60 * 60 * 1000);