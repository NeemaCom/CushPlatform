import { db } from "./db.js";
import { 
  achievementBadges, 
  userAchievements, 
  achievementProgress,
  transactions,
  accounts,
  financialGoals,
  goalProgress,
  type AchievementBadge,
  type UserAchievement,
  type AchievementProgress as ProgressType,
  type SafeUser
} from "../shared/schema.js";
import { eq, and, gte, desc, sum, count, sql } from "drizzle-orm";

export interface BadgeCriteria {
  type: string;
  threshold?: number;
  duration?: string;
  conditions?: Record<string, any>;
}

export interface AchievementCheck {
  badgeId: number;
  criteria: BadgeCriteria;
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  progress: number;
}

export class AchievementService {
  
  /**
   * Initialize default achievement badges
   */
  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      // Savings Achievements
      {
        name: "first_save",
        title: "First Step 🎯",
        description: "Made your first savings transaction",
        icon: "🎯",
        category: "savings",
        criteria: { type: "first_savings_transaction", threshold: 1 },
        rarity: "common",
        points: 10
      },
      {
        name: "save_100",
        title: "Century Saver 💯",
        description: "Saved $100 or more",
        icon: "💯",
        category: "savings",
        criteria: { type: "total_savings", threshold: 100 },
        rarity: "common",
        points: 15
      },
      {
        name: "save_1000",
        title: "Thousand Club 🏆",
        description: "Saved $1,000 or more",
        icon: "🏆",
        category: "savings",
        criteria: { type: "total_savings", threshold: 1000 },
        rarity: "rare",
        points: 50
      },
      {
        name: "save_5000",
        title: "Financial Fortress 🏰",
        description: "Saved $5,000 or more",
        icon: "🏰",
        category: "savings",
        criteria: { type: "total_savings", threshold: 5000 },
        rarity: "epic",
        points: 100
      },

      // Goal Achievements
      {
        name: "goal_creator",
        title: "Dream Architect 🏗️",
        description: "Created your first financial goal",
        icon: "🏗️",
        category: "goals",
        criteria: { type: "goals_created", threshold: 1 },
        rarity: "common",
        points: 10
      },
      {
        name: "goal_achiever",
        title: "Goal Crusher ⭐",
        description: "Completed your first financial goal",
        icon: "⭐",
        category: "goals",
        criteria: { type: "goals_completed", threshold: 1 },
        rarity: "rare",
        points: 25
      },
      {
        name: "multi_goal",
        title: "Multi-Tasker 🎭",
        description: "Completed 3 financial goals",
        icon: "🎭",
        category: "goals",
        criteria: { type: "goals_completed", threshold: 3 },
        rarity: "epic",
        points: 75
      },

      // Streak Achievements
      {
        name: "week_streak",
        title: "Week Warrior 📅",
        description: "Made transactions for 7 consecutive days",
        icon: "📅",
        category: "streaks",
        criteria: { type: "transaction_streak", threshold: 7, duration: "days" },
        rarity: "common",
        points: 20
      },
      {
        name: "month_streak",
        title: "Monthly Master 🗓️",
        description: "Made transactions for 30 consecutive days",
        icon: "🗓️",
        category: "streaks",
        criteria: { type: "transaction_streak", threshold: 30, duration: "days" },
        rarity: "rare",
        points: 50
      },

      // Milestone Achievements
      {
        name: "balance_positive",
        title: "In the Green 🌱",
        description: "Maintained positive balance for 30 days",
        icon: "🌱",
        category: "milestones",
        criteria: { type: "positive_balance_streak", threshold: 30, duration: "days" },
        rarity: "common",
        points: 15
      },
      {
        name: "no_overdraft",
        title: "Steady Hand 🤝",
        description: "Avoided overdrafts for 90 days",
        icon: "🤝",
        category: "milestones",
        criteria: { type: "no_overdraft_streak", threshold: 90, duration: "days" },
        rarity: "rare",
        points: 40
      },

      // Spending Achievements
      {
        name: "budget_keeper",
        title: "Budget Boss 👑",
        description: "Stayed within budget for a month",
        icon: "👑",
        category: "spending",
        criteria: { type: "budget_adherence", threshold: 30, duration: "days" },
        rarity: "rare",
        points: 30
      },
      {
        name: "smart_spender",
        title: "Wise Wallet 🧠",
        description: "Reduced spending by 10% for a month",
        icon: "🧠",
        category: "spending",
        criteria: { type: "spending_reduction", threshold: 10, duration: "30_days" },
        rarity: "epic",
        points: 60
      }
    ];

    for (const badge of defaultBadges) {
      try {
        await db.insert(achievementBadges)
          .values(badge)
          .onConflictDoNothing();
      } catch (error) {
        console.log(`Badge ${badge.name} might already exist`);
      }
    }
  }

  /**
   * Check and update user achievements
   */
  async checkUserAchievements(userId: number): Promise<UserAchievement[]> {
    const newAchievements: UserAchievement[] = [];
    
    // Get all active badges
    const allBadges = await db.select()
      .from(achievementBadges)
      .where(eq(achievementBadges.isActive, true));

    // Get user's existing achievements
    const existingAchievements = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedBadgeIds = new Set(existingAchievements.map(a => a.badgeId));

    for (const badge of allBadges) {
      if (unlockedBadgeIds.has(badge.id)) continue;

      const progress = await this.calculateProgress(userId, badge);
      
      // Update or create progress record
      await db.insert(achievementProgress)
        .values({
          userId,
          badgeId: badge.id,
          currentValue: progress.currentValue.toString(),
          targetValue: progress.targetValue.toString(),
          progressData: { 
            type: badge.criteria.type,
            lastChecked: new Date().toISOString()
          },
          isCompleted: progress.isUnlocked
        })
        .onConflictDoUpdate({
          target: [achievementProgress.userId, achievementProgress.badgeId],
          set: {
            currentValue: progress.currentValue.toString(),
            lastUpdated: new Date(),
            isCompleted: progress.isUnlocked,
            progressData: { 
              type: badge.criteria.type,
              lastChecked: new Date().toISOString()
            }
          }
        });

      // If achievement is unlocked, award it
      if (progress.isUnlocked) {
        const [newAchievement] = await db.insert(userAchievements)
          .values({
            userId,
            badgeId: badge.id,
            progress: {
              earnedAt: new Date().toISOString(),
              finalValue: progress.currentValue
            }
          })
          .returning();

        newAchievements.push(newAchievement);
      }
    }

    return newAchievements;
  }

  /**
   * Calculate progress for a specific badge
   */
  private async calculateProgress(userId: number, badge: AchievementBadge): Promise<AchievementCheck> {
    const criteria = badge.criteria as BadgeCriteria;
    let currentValue = 0;
    let targetValue = criteria.threshold || 1;
    let isUnlocked = false;

    switch (criteria.type) {
      case "first_savings_transaction":
        const savingsCount = await db.select({ count: count() })
          .from(transactions)
          .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, "income"),
            sql`${transactions.category} ILIKE '%saving%'`
          ));
        currentValue = savingsCount[0]?.count || 0;
        isUnlocked = currentValue >= 1;
        break;

      case "total_savings":
        const savingsTotal = await db.select({ 
          total: sum(sql`CAST(${transactions.amount} AS DECIMAL)`) 
        })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          sql`${transactions.category} ILIKE '%saving%'`
        ));
        currentValue = Number(savingsTotal[0]?.total) || 0;
        isUnlocked = currentValue >= targetValue;
        break;

      case "goals_created":
        const goalsCount = await db.select({ count: count() })
          .from(financialGoals)
          .where(eq(financialGoals.userId, userId));
        currentValue = goalsCount[0]?.count || 0;
        isUnlocked = currentValue >= targetValue;
        break;

      case "goals_completed":
        const completedGoals = await db.select({ count: count() })
          .from(financialGoals)
          .where(and(
            eq(financialGoals.userId, userId),
            eq(financialGoals.isActive, false) // Using isActive field to represent completion
          ));
        currentValue = completedGoals[0]?.count || 0;
        isUnlocked = currentValue >= targetValue;
        break;

      case "transaction_streak":
        currentValue = await this.calculateTransactionStreak(userId);
        isUnlocked = currentValue >= targetValue;
        break;

      case "positive_balance_streak":
        currentValue = await this.calculatePositiveBalanceStreak(userId);
        isUnlocked = currentValue >= targetValue;
        break;

      case "no_overdraft_streak":
        currentValue = await this.calculateNoOverdraftStreak(userId);
        isUnlocked = currentValue >= targetValue;
        break;

      case "budget_adherence":
        currentValue = await this.calculateBudgetAdherence(userId);
        isUnlocked = currentValue >= targetValue;
        break;

      case "spending_reduction":
        currentValue = await this.calculateSpendingReduction(userId);
        isUnlocked = currentValue >= targetValue;
        break;

      default:
        currentValue = 0;
        isUnlocked = false;
    }

    return {
      badgeId: badge.id,
      criteria,
      currentValue,
      targetValue,
      isUnlocked,
      progress: Math.min((currentValue / targetValue) * 100, 100)
    };
  }

  /**
   * Calculate consecutive days with transactions
   */
  private async calculateTransactionStreak(userId: number): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await db.select({
      date: sql<string>`DATE(${transactions.date})`
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, thirtyDaysAgo)
    ))
    .groupBy(sql`DATE(${transactions.date})`)
    .orderBy(desc(sql`DATE(${transactions.date})`));

    if (recentTransactions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const transaction of recentTransactions) {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);

      if (transactionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate consecutive days with positive balance
   */
  private async calculatePositiveBalanceStreak(userId: number): Promise<number> {
    const userAccounts = await db.select()
      .from(accounts)
      .where(eq(accounts.userId, userId));

    if (userAccounts.length === 0) return 0;

    // Simplified: check if current total balance is positive
    const totalBalance = userAccounts.reduce((sum, account) => 
      sum + Number(account.balance), 0);

    return totalBalance > 0 ? 30 : 0; // Simplified calculation
  }

  /**
   * Calculate consecutive days without overdrafts
   */
  private async calculateNoOverdraftStreak(userId: number): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const overdrafts = await db.select({ count: count() })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, thirtyDaysAgo),
        sql`CAST(${transactions.amount} AS DECIMAL) < 0`,
        sql`${transactions.description} ILIKE '%overdraft%'`
      ));

    return (overdrafts[0]?.count || 0) === 0 ? 90 : 0;
  }

  /**
   * Calculate budget adherence (simplified)
   */
  private async calculateBudgetAdherence(userId: number): Promise<number> {
    // Simplified: return 30 if user has goals and recent transactions
    const hasGoals = await db.select({ count: count() })
      .from(financialGoals)
      .where(eq(financialGoals.userId, userId));

    return (hasGoals[0]?.count || 0) > 0 ? 30 : 0;
  }

  /**
   * Calculate spending reduction percentage
   */
  private async calculateSpendingReduction(userId: number): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentExpenses = await db.select({ 
      total: sum(sql`CAST(${transactions.amount} AS DECIMAL)`) 
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      gte(transactions.date, thirtyDaysAgo)
    ));

    const previousExpenses = await db.select({ 
      total: sum(sql`CAST(${transactions.amount} AS DECIMAL)`) 
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      gte(transactions.date, sixtyDaysAgo),
      sql`${transactions.date} < ${thirtyDaysAgo}`
    ));

    const recent = Number(recentExpenses[0]?.total) || 0;
    const previous = Number(previousExpenses[0]?.total) || 0;

    if (previous === 0) return 0;

    const reduction = ((previous - recent) / previous) * 100;
    return Math.max(0, reduction);
  }

  /**
   * Get user's achievements with badge details
   */
  async getUserAchievements(userId: number): Promise<(UserAchievement & { badge: AchievementBadge })[]> {
    return db.select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      badgeId: userAchievements.badgeId,
      unlockedAt: userAchievements.unlockedAt,
      progress: userAchievements.progress,
      isVisible: userAchievements.isVisible,
      notificationSent: userAchievements.notificationSent,
      badge: achievementBadges
    })
    .from(userAchievements)
    .innerJoin(achievementBadges, eq(userAchievements.badgeId, achievementBadges.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));
  }

  /**
   * Get user's progress on all badges
   */
  async getUserProgress(userId: number): Promise<(ProgressType & { badge: AchievementBadge })[]> {
    return db.select({
      id: achievementProgress.id,
      userId: achievementProgress.userId,
      badgeId: achievementProgress.badgeId,
      currentValue: achievementProgress.currentValue,
      targetValue: achievementProgress.targetValue,
      progressData: achievementProgress.progressData,
      lastUpdated: achievementProgress.lastUpdated,
      isCompleted: achievementProgress.isCompleted,
      badge: achievementBadges
    })
    .from(achievementProgress)
    .innerJoin(achievementBadges, eq(achievementProgress.badgeId, achievementBadges.id))
    .where(eq(achievementProgress.userId, userId))
    .orderBy(desc(achievementProgress.lastUpdated));
  }

  /**
   * Get achievement statistics for user
   */
  async getAchievementStats(userId: number): Promise<{
    totalBadges: number;
    unlockedBadges: number;
    totalPoints: number;
    categoryStats: Record<string, number>;
  }> {
    const totalBadges = await db.select({ count: count() })
      .from(achievementBadges)
      .where(eq(achievementBadges.isActive, true));

    const userAchievements = await this.getUserAchievements(userId);
    
    const totalPoints = userAchievements.reduce((sum, achievement) => 
      sum + achievement.badge.points, 0);

    const categoryStats: Record<string, number> = {};
    userAchievements.forEach(achievement => {
      const category = achievement.badge.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    return {
      totalBadges: totalBadges[0]?.count || 0,
      unlockedBadges: userAchievements.length,
      totalPoints,
      categoryStats
    };
  }
}

export const achievementService = new AchievementService();