import { db } from './db';
import { supportTickets, supportTicketMessages, userFeedback, faqArticles, users } from '@shared/schema';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';
import type { 
  SupportTicket, 
  SupportTicketMessage, 
  UserFeedback, 
  FaqArticle,
  CreateSupportTicket,
  UpdateSupportTicket,
  CreateSupportTicketMessage,
  CreateUserFeedback,
  CreateFaqArticle,
  UpdateFaqArticle
} from '@shared/schema';

export class SupportService {
  // Generate unique ticket number
  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CUSH-${timestamp}-${random}`.toUpperCase();
  }

  // Support Tickets
  async createSupportTicket(userId: number, ticketData: CreateSupportTicket): Promise<SupportTicket> {
    const ticketNumber = this.generateTicketNumber();
    
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        ...ticketData,
        userId,
        ticketNumber,
        updatedAt: new Date()
      })
      .returning();
    
    return ticket;
  }

  async getSupportTickets(userId: number): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(userId: number, ticketId: number): Promise<SupportTicket | null> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, userId)
      ));
    
    return ticket || null;
  }

  async updateSupportTicket(ticketId: number, updates: UpdateSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db
      .update(supportTickets)
      .set({
        ...updates,
        updatedAt: new Date(),
        ...(updates.status === 'resolved' && { resolvedAt: new Date() }),
        ...(updates.status === 'closed' && { closedAt: new Date() })
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    
    return ticket;
  }

  // Support Ticket Messages
  async createSupportTicketMessage(userId: number, messageData: CreateSupportTicketMessage): Promise<SupportTicketMessage> {
    const [message] = await db
      .insert(supportTicketMessages)
      .values({
        ...messageData,
        senderId: userId
      })
      .returning();
    
    return message;
  }

  async getSupportTicketMessages(ticketId: number): Promise<SupportTicketMessage[]> {
    return await db
      .select({
        id: supportTicketMessages.id,
        ticketId: supportTicketMessages.ticketId,
        senderId: supportTicketMessages.senderId,
        message: supportTicketMessages.message,
        isInternal: supportTicketMessages.isInternal,
        attachments: supportTicketMessages.attachments,
        createdAt: supportTicketMessages.createdAt,
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderEmail: users.email,
        senderRole: users.role
      })
      .from(supportTicketMessages)
      .leftJoin(users, eq(supportTicketMessages.senderId, users.id))
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(supportTicketMessages.createdAt);
  }

  // User Feedback
  async createUserFeedback(userId: number, feedbackData: CreateUserFeedback): Promise<UserFeedback> {
    const [feedback] = await db
      .insert(userFeedback)
      .values({
        ...feedbackData,
        userId,
        updatedAt: new Date()
      })
      .returning();
    
    return feedback;
  }

  async getUserFeedback(userId: number): Promise<UserFeedback[]> {
    return await db
      .select()
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }

  async updateFeedbackStatus(feedbackId: number, status: string, adminNotes?: string): Promise<UserFeedback> {
    const [feedback] = await db
      .update(userFeedback)
      .set({
        status,
        adminNotes,
        updatedAt: new Date(),
        ...(status === 'implemented' && { implementedAt: new Date() })
      })
      .where(eq(userFeedback.id, feedbackId))
      .returning();
    
    return feedback;
  }

  // FAQ Articles
  async getFaqArticles(category?: string): Promise<FaqArticle[]> {
    let query = db
      .select()
      .from(faqArticles)
      .where(eq(faqArticles.isPublic, true));
    
    if (category) {
      query = query.where(eq(faqArticles.category, category));
    }
    
    return await query.orderBy(faqArticles.sortOrder, faqArticles.createdAt);
  }

  async searchFaqArticles(searchTerm: string): Promise<FaqArticle[]> {
    return await db
      .select()
      .from(faqArticles)
      .where(and(
        eq(faqArticles.isPublic, true),
        or(
          ilike(faqArticles.question, `%${searchTerm}%`),
          ilike(faqArticles.answer, `%${searchTerm}%`)
        )
      ))
      .orderBy(faqArticles.sortOrder);
  }

  async incrementFaqView(articleId: number): Promise<void> {
    await db
      .update(faqArticles)
      .set({
        viewCount: sql`${faqArticles.viewCount} + 1`
      })
      .where(eq(faqArticles.id, articleId));
  }

  async rateFaqArticle(articleId: number, isHelpful: boolean): Promise<void> {
    if (isHelpful) {
      await db
        .update(faqArticles)
        .set({
          isHelpful: sql`${faqArticles.isHelpful} + 1`
        })
        .where(eq(faqArticles.id, articleId));
    } else {
      await db
        .update(faqArticles)
        .set({
          notHelpful: sql`${faqArticles.notHelpful} + 1`
        })
        .where(eq(faqArticles.id, articleId));
    }
  }

  // Admin Functions
  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        ticketNumber: supportTickets.ticketNumber,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        subject: supportTickets.subject,
        description: supportTickets.description,
        attachments: supportTickets.attachments,
        assignedTo: supportTickets.assignedTo,
        resolution: supportTickets.resolution,
        resolvedAt: supportTickets.resolvedAt,
        closedAt: supportTickets.closedAt,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllUserFeedback(): Promise<UserFeedback[]> {
    return await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        feedbackType: userFeedback.feedbackType,
        category: userFeedback.category,
        title: userFeedback.title,
        message: userFeedback.message,
        rating: userFeedback.rating,
        pageUrl: userFeedback.pageUrl,
        userAgent: userFeedback.userAgent,
        attachments: userFeedback.attachments,
        status: userFeedback.status,
        adminNotes: userFeedback.adminNotes,
        implementedAt: userFeedback.implementedAt,
        createdAt: userFeedback.createdAt,
        updatedAt: userFeedback.updatedAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .orderBy(desc(userFeedback.createdAt));
  }

  async createFaqArticle(articleData: CreateFaqArticle): Promise<FaqArticle> {
    const [article] = await db
      .insert(faqArticles)
      .values({
        ...articleData,
        updatedAt: new Date()
      })
      .returning();
    
    return article;
  }

  async updateFaqArticle(articleId: number, updates: UpdateFaqArticle): Promise<FaqArticle> {
    const [article] = await db
      .update(faqArticles)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(faqArticles.id, articleId))
      .returning();
    
    return article;
  }

  async deleteFaqArticle(articleId: number): Promise<void> {
    await db
      .delete(faqArticles)
      .where(eq(faqArticles.id, articleId));
  }

  // Support Statistics
  async getSupportStatistics() {
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      avgResolutionTime,
      totalFeedback,
      positiveFeedback
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(supportTickets),
      db.select({ count: sql<number>`count(*)` }).from(supportTickets).where(eq(supportTickets.status, 'open')),
      db.select({ count: sql<number>`count(*)` }).from(supportTickets).where(eq(supportTickets.status, 'resolved')),
      db.select({ 
        avgTime: sql<number>`avg(extract(epoch from (resolved_at - created_at))/3600)` 
      }).from(supportTickets).where(eq(supportTickets.status, 'resolved')),
      db.select({ count: sql<number>`count(*)` }).from(userFeedback),
      db.select({ count: sql<number>`count(*)` }).from(userFeedback).where(sql`rating >= 4`)
    ]);

    return {
      totalTickets: totalTickets[0]?.count || 0,
      openTickets: openTickets[0]?.count || 0,
      resolvedTickets: resolvedTickets[0]?.count || 0,
      avgResolutionTime: Math.round(avgResolutionTime[0]?.avgTime || 0),
      totalFeedback: totalFeedback[0]?.count || 0,
      positiveFeedback: positiveFeedback[0]?.count || 0,
      satisfactionRate: totalFeedback[0]?.count > 0 ? 
        Math.round((positiveFeedback[0]?.count / totalFeedback[0]?.count) * 100) : 0
    };
  }
}

export const supportService = new SupportService();