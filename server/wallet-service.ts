import { db } from "./db";
import { SecurityLogger } from "./security";
import { 
  wallets, 
  walletTransactions, 
  type Wallet, 
  type WalletTransaction, 
  type InsertWallet, 
  type InsertWalletTransaction 
} from "@shared/schema";
import { eq, and, desc, sum, sql } from "drizzle-orm";
import { Decimal } from "decimal.js";

export interface WalletBalance {
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  currency: string;
}

export interface WalletOperationResult {
  success: boolean;
  walletId?: number;
  transactionId?: number;
  newBalance?: string;
  error?: string;
}

export interface WalletTransactionRequest {
  walletId: number;
  userId: number;
  type: "deposit" | "withdrawal" | "transfer_out" | "transfer_in" | "fee" | "refund";
  amount: string;
  currency: string;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
}

class WalletService {
  private securityLogger = new SecurityLogger();

  // Create a new wallet for a user
  async createWallet(userId: number, currency: string = "USD"): Promise<WalletOperationResult> {
    try {
      const existingWallet = await db
        .select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.currency, currency)
        ))
        .limit(1);

      if (existingWallet.length > 0) {
        return {
          success: true,
          walletId: existingWallet[0].id,
        };
      }

      const walletData: InsertWallet = {
        userId,
        currency,
        balance: "0.00",
        availableBalance: "0.00",
        pendingBalance: "0.00",
        isActive: true,
        isFrozen: false,
        dailyLimit: "5000.00",
        monthlyLimit: "25000.00",
      };

      const [newWallet] = await db.insert(wallets).values(walletData).returning();

      this.securityLogger.logSecurityEvent(
        "wallet_created",
        { walletId: newWallet.id, currency },
        userId.toString()
      );

      return {
        success: true,
        walletId: newWallet.id,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_creation_failed",
        { 
          userId, 
          currency, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create wallet",
      };
    }
  }

  // Get wallet by user ID and currency
  async getWallet(userId: number, currency: string = "USD"): Promise<Wallet | null> {
    try {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.currency, currency),
          eq(wallets.isActive, true)
        ))
        .limit(1);

      return wallet || null;
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_fetch_failed",
        { 
          userId, 
          currency, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return null;
    }
  }

  // Get all wallets for a user
  async getUserWallets(userId: number): Promise<Wallet[]> {
    try {
      const userWallets = await db
        .select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, userId),
          eq(wallets.isActive, true)
        ))
        .orderBy(desc(wallets.createdAt));

      return userWallets;
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "user_wallets_fetch_failed",
        { 
          userId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return [];
    }
  }

  // Get wallet balance
  async getWalletBalance(walletId: number): Promise<WalletBalance | null> {
    try {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, walletId))
        .limit(1);

      if (!wallet) {
        return null;
      }

      return {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        currency: wallet.currency,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_balance_fetch_failed",
        { 
          walletId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        "system"
      );
      return null;
    }
  }

  // Process a wallet transaction
  async processTransaction(request: WalletTransactionRequest): Promise<WalletOperationResult> {
    try {
      // Get current wallet
      const [currentWallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, request.walletId))
        .limit(1);

      if (!currentWallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      if (currentWallet.isFrozen) {
        return {
          success: false,
          error: "Wallet is frozen",
        };
      }

      // Check if it's the user's wallet
      if (currentWallet.userId !== request.userId) {
        return {
          success: false,
          error: "Unauthorized wallet access",
        };
      }

      const amount = new Decimal(request.amount);
      const currentBalance = new Decimal(currentWallet.balance);
      const currentAvailableBalance = new Decimal(currentWallet.availableBalance);

      // Calculate new balance based on transaction type
      let newBalance: Decimal;
      let newAvailableBalance: Decimal;

      switch (request.type) {
        case "deposit":
        case "transfer_in":
        case "refund":
          newBalance = currentBalance.plus(amount);
          newAvailableBalance = currentAvailableBalance.plus(amount);
          break;

        case "withdrawal":
        case "transfer_out":
        case "fee":
          if (currentAvailableBalance.lessThan(amount)) {
            return {
              success: false,
              error: "Insufficient balance",
            };
          }
          newBalance = currentBalance.minus(amount);
          newAvailableBalance = currentAvailableBalance.minus(amount);
          break;

        default:
          return {
            success: false,
            error: "Invalid transaction type",
          };
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // Create wallet transaction record
        const transactionData: InsertWalletTransaction = {
          walletId: request.walletId,
          userId: request.userId,
          type: request.type,
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          reference: request.reference,
          status: "completed",
          balanceBefore: currentBalance.toString(),
          balanceAfter: newBalance.toString(),
          metadata: request.metadata,
        };

        const [newTransaction] = await tx
          .insert(walletTransactions)
          .values(transactionData)
          .returning();

        // Update wallet balance
        await tx
          .update(wallets)
          .set({
            balance: newBalance.toString(),
            availableBalance: newAvailableBalance.toString(),
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, request.walletId));

        return {
          transactionId: newTransaction.id,
          newBalance: newBalance.toString(),
        };
      });

      this.securityLogger.logSecurityEvent(
        "wallet_transaction_completed",
        { 
          walletId: request.walletId,
          transactionId: result.transactionId,
          type: request.type,
          amount: request.amount,
          currency: request.currency,
          newBalance: result.newBalance
        },
        request.userId.toString()
      );

      return {
        success: true,
        walletId: request.walletId,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_transaction_failed",
        { 
          walletId: request.walletId,
          type: request.type,
          amount: request.amount,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        request.userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
      };
    }
  }

  // Get wallet transaction history
  async getTransactionHistory(
    walletId: number,
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.walletId, walletId),
          eq(walletTransactions.userId, userId)
        ))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return transactions;
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_history_fetch_failed",
        { 
          walletId, 
          userId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return [];
    }
  }

  // Check if user has sufficient balance for a transaction
  async checkSufficientBalance(
    userId: number,
    amount: string,
    currency: string = "USD"
  ): Promise<{ sufficient: boolean; currentBalance: string; error?: string }> {
    try {
      const wallet = await this.getWallet(userId, currency);
      
      if (!wallet) {
        return {
          sufficient: false,
          currentBalance: "0.00",
          error: "Wallet not found",
        };
      }

      const requestedAmount = new Decimal(amount);
      const availableBalance = new Decimal(wallet.availableBalance);

      return {
        sufficient: availableBalance.greaterThanOrEqualTo(requestedAmount),
        currentBalance: wallet.availableBalance,
      };
    } catch (error) {
      return {
        sufficient: false,
        currentBalance: "0.00",
        error: error instanceof Error ? error.message : "Balance check failed",
      };
    }
  }

  // Freeze/unfreeze wallet
  async freezeWallet(walletId: number, userId: number, freeze: boolean = true): Promise<WalletOperationResult> {
    try {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(and(
          eq(wallets.id, walletId),
          eq(wallets.userId, userId)
        ))
        .limit(1);

      if (!wallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      await db
        .update(wallets)
        .set({
          isFrozen: freeze,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, walletId));

      this.securityLogger.logSecurityEvent(
        freeze ? "wallet_frozen" : "wallet_unfrozen",
        { walletId, userId },
        userId.toString()
      );

      return {
        success: true,
        walletId,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_freeze_operation_failed",
        { 
          walletId, 
          userId, 
          freeze, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Freeze operation failed",
      };
    }
  }

  // Get wallet statistics
  async getWalletStats(userId: number): Promise<{
    totalWallets: number;
    totalBalance: string;
    totalTransactions: number;
    currencies: string[];
  }> {
    try {
      const userWallets = await this.getUserWallets(userId);
      
      const totalTransactions = await db
        .select({ count: sql<number>`count(*)` })
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId));

      const totalBalance = userWallets.reduce((sum, wallet) => {
        if (wallet.currency === "USD") {
          return sum + parseFloat(wallet.balance);
        }
        return sum;
      }, 0);

      return {
        totalWallets: userWallets.length,
        totalBalance: totalBalance.toFixed(2),
        totalTransactions: totalTransactions[0]?.count || 0,
        currencies: [...new Set(userWallets.map(w => w.currency))],
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_stats_fetch_failed",
        { 
          userId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        totalWallets: 0,
        totalBalance: "0.00",
        totalTransactions: 0,
        currencies: [],
      };
    }
  }

  // Reserve balance for pending transactions
  async reserveBalance(
    userId: number,
    amount: string,
    currency: string = "USD",
    reference?: string
  ): Promise<WalletOperationResult> {
    try {
      const wallet = await this.getWallet(userId, currency);
      
      if (!wallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      const reserveAmount = new Decimal(amount);
      const currentAvailableBalance = new Decimal(wallet.availableBalance);
      const currentPendingBalance = new Decimal(wallet.pendingBalance);

      if (currentAvailableBalance.lessThan(reserveAmount)) {
        return {
          success: false,
          error: "Insufficient available balance",
        };
      }

      const newAvailableBalance = currentAvailableBalance.minus(reserveAmount);
      const newPendingBalance = currentPendingBalance.plus(reserveAmount);

      await db
        .update(wallets)
        .set({
          availableBalance: newAvailableBalance.toString(),
          pendingBalance: newPendingBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      this.securityLogger.logSecurityEvent(
        "wallet_balance_reserved",
        { 
          walletId: wallet.id,
          amount,
          currency,
          reference,
          newAvailableBalance: newAvailableBalance.toString(),
          newPendingBalance: newPendingBalance.toString()
        },
        userId.toString()
      );

      return {
        success: true,
        walletId: wallet.id,
        newBalance: newAvailableBalance.toString(),
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_balance_reservation_failed",
        { 
          userId, 
          amount, 
          currency, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Balance reservation failed",
      };
    }
  }

  // Release reserved balance
  async releaseBalance(
    userId: number,
    amount: string,
    currency: string = "USD",
    reference?: string
  ): Promise<WalletOperationResult> {
    try {
      const wallet = await this.getWallet(userId, currency);
      
      if (!wallet) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      const releaseAmount = new Decimal(amount);
      const currentAvailableBalance = new Decimal(wallet.availableBalance);
      const currentPendingBalance = new Decimal(wallet.pendingBalance);

      if (currentPendingBalance.lessThan(releaseAmount)) {
        return {
          success: false,
          error: "Insufficient pending balance",
        };
      }

      const newAvailableBalance = currentAvailableBalance.plus(releaseAmount);
      const newPendingBalance = currentPendingBalance.minus(releaseAmount);

      await db
        .update(wallets)
        .set({
          availableBalance: newAvailableBalance.toString(),
          pendingBalance: newPendingBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      this.securityLogger.logSecurityEvent(
        "wallet_balance_released",
        { 
          walletId: wallet.id,
          amount,
          currency,
          reference,
          newAvailableBalance: newAvailableBalance.toString(),
          newPendingBalance: newPendingBalance.toString()
        },
        userId.toString()
      );

      return {
        success: true,
        walletId: wallet.id,
        newBalance: newAvailableBalance.toString(),
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "wallet_balance_release_failed",
        { 
          userId, 
          amount, 
          currency, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Balance release failed",
      };
    }
  }
}

export const walletService = new WalletService();