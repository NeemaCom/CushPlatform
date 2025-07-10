import { db } from "./db";
import { SecurityLogger } from "./security";
import { cymonzService } from "./cymonz-service";
import { walletService } from "./wallet-service";
import { notificationService } from "./notification-service";
import { 
  remittanceTransactions, 
  remittanceRecipients,
  type RemittanceTransaction,
  type RemittanceRecipient,
  type InsertRemittanceTransaction,
  type InsertRemittanceRecipient,
  type InitiateRemittance,
  type SaveRecipient
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Decimal } from "decimal.js";

export interface RemittanceQuote {
  sendAmount: string;
  sendCurrency: string;
  receiveCurrency: string;
  receiveAmount: string;
  exchangeRate: string;
  fees: string;
  totalAmount: string;
  estimatedDeliveryTime: string;
  validUntil: string;
}

export interface RemittanceResult {
  success: boolean;
  transactionId?: number;
  cymonzTransactionId?: string;
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface RemittanceStatus {
  transactionId: number;
  cymonzTransactionId?: string;
  status: string;
  sendAmount: string;
  sendCurrency: string;
  receiveAmount?: string;
  receiveCurrency: string;
  exchangeRate?: string;
  fees: string;
  totalAmount: string;
  senderName: string;
  recipientName: string;
  recipientCountry: string;
  deliveryMethod: string;
  initiatedAt: Date;
  completedAt?: Date;
  trackingNumber?: string;
  error?: string;
}

class RemittanceService {
  private securityLogger = new SecurityLogger();

  // Get exchange rates and fees for a remittance
  async getQuote(
    sendAmount: string,
    sendCurrency: string,
    receiveCurrency: string,
    deliveryMethod: string = "bank_transfer"
  ): Promise<RemittanceQuote> {
    try {
      const amount = parseFloat(sendAmount);
      
      // Get rates from Cymonz
      const rates = await cymonzService.getRates(
        sendCurrency,
        receiveCurrency,
        amount,
        deliveryMethod
      );

      const receiveAmount = new Decimal(sendAmount)
        .mul(rates.exchangeRate)
        .toFixed(2);

      const totalAmount = new Decimal(sendAmount)
        .plus(rates.fees)
        .toFixed(2);

      // Quote is valid for 30 minutes
      const validUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      return {
        sendAmount,
        sendCurrency,
        receiveCurrency,
        receiveAmount,
        exchangeRate: rates.exchangeRate.toString(),
        fees: rates.fees.toString(),
        totalAmount,
        estimatedDeliveryTime: rates.estimatedDeliveryTime,
        validUntil,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_quote_failed",
        { 
          sendAmount,
          sendCurrency,
          receiveCurrency,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        "system"
      );

      // Return fallback quote with estimated rates
      const fallbackRate = this.getFallbackRate(sendCurrency, receiveCurrency);
      const receiveAmount = new Decimal(sendAmount).mul(fallbackRate).toFixed(2);
      const fees = new Decimal(sendAmount).mul(0.02).toFixed(2); // 2% fee
      const totalAmount = new Decimal(sendAmount).plus(fees).toFixed(2);

      return {
        sendAmount,
        sendCurrency,
        receiveCurrency,
        receiveAmount,
        exchangeRate: fallbackRate.toString(),
        fees,
        totalAmount,
        estimatedDeliveryTime: "1-3 business days",
        validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    }
  }

  // Initiate a remittance transaction
  async initiateRemittance(
    userId: number,
    remittanceData: InitiateRemittance
  ): Promise<RemittanceResult> {
    try {
      const sendAmount = new Decimal(remittanceData.sendAmount);
      const quote = await this.getQuote(
        remittanceData.sendAmount,
        remittanceData.sendCurrency,
        remittanceData.receiveCurrency,
        remittanceData.deliveryMethod
      );

      // Check if user has sufficient balance
      const balanceCheck = await walletService.checkSufficientBalance(
        userId,
        quote.totalAmount,
        remittanceData.sendCurrency
      );

      if (!balanceCheck.sufficient) {
        return {
          success: false,
          error: "Insufficient wallet balance",
          errorCode: "INSUFFICIENT_BALANCE",
        };
      }

      // Reserve balance in wallet
      const reserveResult = await walletService.reserveBalance(
        userId,
        quote.totalAmount,
        remittanceData.sendCurrency,
        `remittance_${Date.now()}`
      );

      if (!reserveResult.success) {
        return {
          success: false,
          error: reserveResult.error || "Failed to reserve balance",
          errorCode: "BALANCE_RESERVATION_FAILED",
        };
      }

      // Create remittance transaction record
      const transactionData: InsertRemittanceTransaction = {
        userId,
        walletId: reserveResult.walletId,
        senderName: remittanceData.senderName,
        senderEmail: remittanceData.senderEmail,
        senderPhone: remittanceData.senderPhone,
        senderAddress: remittanceData.senderAddress,
        senderCountry: remittanceData.senderCountry,
        senderIdType: remittanceData.senderIdType,
        senderIdNumber: remittanceData.senderIdNumber,
        
        recipientName: remittanceData.recipientName,
        recipientEmail: remittanceData.recipientEmail,
        recipientPhone: remittanceData.recipientPhone,
        recipientAddress: remittanceData.recipientAddress,
        recipientCountry: remittanceData.recipientCountry,
        recipientBankName: remittanceData.recipientBankName,
        recipientBankCode: remittanceData.recipientBankCode,
        recipientAccountNumber: remittanceData.recipientAccountNumber,
        recipientAccountName: remittanceData.recipientAccountName,
        
        sendAmount: quote.sendAmount,
        sendCurrency: quote.sendCurrency,
        receiveAmount: quote.receiveAmount,
        receiveCurrency: quote.receiveCurrency,
        exchangeRate: quote.exchangeRate,
        fees: quote.fees,
        totalAmount: quote.totalAmount,
        
        status: "initiated",
        paymentMethod: remittanceData.paymentMethod,
        deliveryMethod: remittanceData.deliveryMethod,
        purpose: remittanceData.purpose,
      };

      const [newTransaction] = await db
        .insert(remittanceTransactions)
        .values(transactionData)
        .returning();

      // Initiate transaction with Cymonz
      const cymonzResult = await cymonzService.initiateTransaction({
        sender: {
          id: userId.toString(),
          email: remittanceData.senderEmail,
          firstName: remittanceData.senderName.split(' ')[0],
          lastName: remittanceData.senderName.split(' ').slice(1).join(' ') || '',
          phone: remittanceData.senderPhone,
          address: remittanceData.senderAddress,
          country: remittanceData.senderCountry,
          idType: remittanceData.senderIdType,
          idNumber: remittanceData.senderIdNumber,
        },
        recipient: {
          name: remittanceData.recipientName,
          email: remittanceData.recipientEmail,
          phone: remittanceData.recipientPhone,
          address: remittanceData.recipientAddress,
          country: remittanceData.recipientCountry,
          bankName: remittanceData.recipientBankName,
          bankCode: remittanceData.recipientBankCode,
          accountNumber: remittanceData.recipientAccountNumber,
          accountName: remittanceData.recipientAccountName,
        },
        sendAmount: parseFloat(quote.sendAmount),
        sendCurrency: quote.sendCurrency,
        receiveCurrency: quote.receiveCurrency,
        deliveryMethod: remittanceData.deliveryMethod,
        purpose: remittanceData.purpose,
        reference: newTransaction.id.toString(),
      });

      // Update transaction with Cymonz details
      await db
        .update(remittanceTransactions)
        .set({
          cymonzTransactionId: cymonzResult.transactionId,
          cymonzRedirectUrl: cymonzResult.redirectUrl,
          status: cymonzResult.status,
          cymonzData: cymonzResult,
          updatedAt: new Date(),
        })
        .where(eq(remittanceTransactions.id, newTransaction.id));

      // If Cymonz transaction failed, release the reserved balance
      if (cymonzResult.status === "failed") {
        await walletService.releaseBalance(
          userId,
          quote.totalAmount,
          remittanceData.sendCurrency,
          `remittance_${newTransaction.id}_failed`
        );

        return {
          success: false,
          transactionId: newTransaction.id,
          error: cymonzResult.error || "Transaction failed",
          errorCode: cymonzResult.errorCode || "CYMONZ_TRANSACTION_FAILED",
        };
      }

      // Create notification for user
      await notificationService.createNotification(
        userId,
        "remittance_initiated",
        "Remittance Initiated",
        `Your remittance of ${quote.sendAmount} ${quote.sendCurrency} to ${remittanceData.recipientName} has been initiated.`,
        { transactionId: newTransaction.id, amount: quote.sendAmount, currency: quote.sendCurrency }
      );

      this.securityLogger.logSecurityEvent(
        "remittance_initiated",
        { 
          transactionId: newTransaction.id,
          cymonzTransactionId: cymonzResult.transactionId,
          amount: quote.sendAmount,
          currency: quote.sendCurrency,
          recipientCountry: remittanceData.recipientCountry
        },
        userId.toString()
      );

      return {
        success: true,
        transactionId: newTransaction.id,
        cymonzTransactionId: cymonzResult.transactionId,
        redirectUrl: cymonzResult.redirectUrl,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_initiation_failed",
        { 
          userId,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Remittance initiation failed",
        errorCode: "REMITTANCE_INITIATION_FAILED",
      };
    }
  }

  // Get remittance transaction status
  async getRemittanceStatus(
    transactionId: number,
    userId: number
  ): Promise<RemittanceStatus | null> {
    try {
      const [transaction] = await db
        .select()
        .from(remittanceTransactions)
        .where(and(
          eq(remittanceTransactions.id, transactionId),
          eq(remittanceTransactions.userId, userId)
        ))
        .limit(1);

      if (!transaction) {
        return null;
      }

      // Update status from Cymonz if transaction ID exists
      if (transaction.cymonzTransactionId) {
        const cymonzStatus = await cymonzService.getTransactionStatus(
          transaction.cymonzTransactionId
        );

        if (cymonzStatus.status !== transaction.status) {
          await db
            .update(remittanceTransactions)
            .set({
              status: cymonzStatus.status,
              updatedAt: new Date(),
            })
            .where(eq(remittanceTransactions.id, transactionId));
        }
      }

      return {
        transactionId: transaction.id,
        cymonzTransactionId: transaction.cymonzTransactionId || undefined,
        status: transaction.status,
        sendAmount: transaction.sendAmount,
        sendCurrency: transaction.sendCurrency,
        receiveAmount: transaction.receiveAmount || undefined,
        receiveCurrency: transaction.receiveCurrency,
        exchangeRate: transaction.exchangeRate || undefined,
        fees: transaction.fees,
        totalAmount: transaction.totalAmount,
        senderName: transaction.senderName,
        recipientName: transaction.recipientName,
        recipientCountry: transaction.recipientCountry,
        deliveryMethod: transaction.deliveryMethod || "bank_transfer",
        initiatedAt: transaction.initiatedAt || transaction.createdAt,
        completedAt: transaction.completedAt || undefined,
        trackingNumber: transaction.cymonzData?.trackingNumber,
        error: transaction.cymonzData?.error,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_status_check_failed",
        { 
          transactionId,
          userId,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return null;
    }
  }

  // Get user's remittance history
  async getRemittanceHistory(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<RemittanceStatus[]> {
    try {
      const transactions = await db
        .select()
        .from(remittanceTransactions)
        .where(eq(remittanceTransactions.userId, userId))
        .orderBy(desc(remittanceTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return transactions.map(transaction => ({
        transactionId: transaction.id,
        cymonzTransactionId: transaction.cymonzTransactionId || undefined,
        status: transaction.status,
        sendAmount: transaction.sendAmount,
        sendCurrency: transaction.sendCurrency,
        receiveAmount: transaction.receiveAmount || undefined,
        receiveCurrency: transaction.receiveCurrency,
        exchangeRate: transaction.exchangeRate || undefined,
        fees: transaction.fees,
        totalAmount: transaction.totalAmount,
        senderName: transaction.senderName,
        recipientName: transaction.recipientName,
        recipientCountry: transaction.recipientCountry,
        deliveryMethod: transaction.deliveryMethod || "bank_transfer",
        initiatedAt: transaction.initiatedAt || transaction.createdAt,
        completedAt: transaction.completedAt || undefined,
        trackingNumber: transaction.cymonzData?.trackingNumber,
        error: transaction.cymonzData?.error,
      }));
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_history_fetch_failed",
        { 
          userId,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return [];
    }
  }

  // Save recipient for future use
  async saveRecipient(
    userId: number,
    recipientData: SaveRecipient
  ): Promise<{ success: boolean; recipientId?: number; error?: string }> {
    try {
      const existingRecipient = await db
        .select()
        .from(remittanceRecipients)
        .where(and(
          eq(remittanceRecipients.userId, userId),
          eq(remittanceRecipients.fullName, recipientData.fullName),
          eq(remittanceRecipients.country, recipientData.country)
        ))
        .limit(1);

      if (existingRecipient.length > 0) {
        return {
          success: true,
          recipientId: existingRecipient[0].id,
        };
      }

      const newRecipientData: InsertRemittanceRecipient = {
        userId,
        nickname: recipientData.nickname,
        fullName: recipientData.fullName,
        email: recipientData.email,
        phone: recipientData.phone,
        address: recipientData.address,
        country: recipientData.country,
        bankName: recipientData.bankName,
        bankCode: recipientData.bankCode,
        accountNumber: recipientData.accountNumber,
        accountName: recipientData.accountName,
        swiftCode: recipientData.swiftCode,
        deliveryMethod: recipientData.deliveryMethod,
        isActive: true,
      };

      const [newRecipient] = await db
        .insert(remittanceRecipients)
        .values(newRecipientData)
        .returning();

      this.securityLogger.logSecurityEvent(
        "remittance_recipient_saved",
        { 
          recipientId: newRecipient.id,
          nickname: recipientData.nickname,
          country: recipientData.country
        },
        userId.toString()
      );

      return {
        success: true,
        recipientId: newRecipient.id,
      };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_recipient_save_failed",
        { 
          userId,
          nickname: recipientData.nickname,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save recipient",
      };
    }
  }

  // Get user's saved recipients
  async getSavedRecipients(userId: number): Promise<RemittanceRecipient[]> {
    try {
      const recipients = await db
        .select()
        .from(remittanceRecipients)
        .where(and(
          eq(remittanceRecipients.userId, userId),
          eq(remittanceRecipients.isActive, true)
        ))
        .orderBy(desc(remittanceRecipients.lastUsed), desc(remittanceRecipients.createdAt));

      return recipients;
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "saved_recipients_fetch_failed",
        { 
          userId,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );
      return [];
    }
  }

  // Cancel remittance transaction
  async cancelRemittance(
    transactionId: number,
    userId: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [transaction] = await db
        .select()
        .from(remittanceTransactions)
        .where(and(
          eq(remittanceTransactions.id, transactionId),
          eq(remittanceTransactions.userId, userId)
        ))
        .limit(1);

      if (!transaction) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      if (transaction.status === "completed") {
        return {
          success: false,
          error: "Cannot cancel completed transaction",
        };
      }

      if (transaction.status === "cancelled") {
        return {
          success: true,
        };
      }

      // Cancel with Cymonz if transaction ID exists
      if (transaction.cymonzTransactionId) {
        const cymonzResult = await cymonzService.cancelTransaction(
          transaction.cymonzTransactionId,
          reason
        );

        if (!cymonzResult.success) {
          return {
            success: false,
            error: cymonzResult.error || "Failed to cancel with payment processor",
          };
        }
      }

      // Update transaction status
      await db
        .update(remittanceTransactions)
        .set({
          status: "cancelled",
          notes: reason || "Cancelled by user",
          updatedAt: new Date(),
        })
        .where(eq(remittanceTransactions.id, transactionId));

      // Release reserved balance
      if (transaction.walletId) {
        await walletService.releaseBalance(
          userId,
          transaction.totalAmount,
          transaction.sendCurrency,
          `remittance_${transactionId}_cancelled`
        );
      }

      // Create notification
      await notificationService.createNotification(
        userId,
        "remittance_cancelled",
        "Remittance Cancelled",
        `Your remittance of ${transaction.sendAmount} ${transaction.sendCurrency} to ${transaction.recipientName} has been cancelled.`,
        { transactionId, reason }
      );

      this.securityLogger.logSecurityEvent(
        "remittance_cancelled",
        { 
          transactionId,
          amount: transaction.sendAmount,
          currency: transaction.sendCurrency,
          reason
        },
        userId.toString()
      );

      return { success: true };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_cancellation_failed",
        { 
          transactionId,
          userId,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        userId.toString()
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Cancellation failed",
      };
    }
  }

  // Process webhook from Cymonz
  async processWebhook(webhookData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { transactionId, status, reference } = webhookData;

      if (!transactionId || !status || !reference) {
        return {
          success: false,
          error: "Invalid webhook data",
        };
      }

      // Find transaction by reference (our transaction ID)
      const [transaction] = await db
        .select()
        .from(remittanceTransactions)
        .where(eq(remittanceTransactions.id, parseInt(reference)))
        .limit(1);

      if (!transaction) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      // Update transaction status
      const updateData: any = {
        status: status.toLowerCase(),
        cymonzData: webhookData,
        updatedAt: new Date(),
      };

      if (status.toLowerCase() === "completed") {
        updateData.completedAt = new Date();
        
        // Deduct balance from wallet
        if (transaction.walletId) {
          await walletService.processTransaction({
            walletId: transaction.walletId,
            userId: transaction.userId,
            type: "transfer_out",
            amount: transaction.totalAmount,
            currency: transaction.sendCurrency,
            description: `Remittance to ${transaction.recipientName}`,
            reference: transactionId,
            metadata: { remittanceId: transaction.id },
          });
        }

        // Create completion notification
        await notificationService.createNotification(
          transaction.userId,
          "remittance_completed",
          "Remittance Completed",
          `Your remittance of ${transaction.sendAmount} ${transaction.sendCurrency} to ${transaction.recipientName} has been completed.`,
          { transactionId: transaction.id }
        );
      } else if (status.toLowerCase() === "failed") {
        updateData.failedAt = new Date();
        
        // Release reserved balance
        if (transaction.walletId) {
          await walletService.releaseBalance(
            transaction.userId,
            transaction.totalAmount,
            transaction.sendCurrency,
            `remittance_${transaction.id}_failed`
          );
        }

        // Create failure notification
        await notificationService.createNotification(
          transaction.userId,
          "remittance_failed",
          "Remittance Failed",
          `Your remittance of ${transaction.sendAmount} ${transaction.sendCurrency} to ${transaction.recipientName} has failed.`,
          { transactionId: transaction.id, error: webhookData.error }
        );
      }

      await db
        .update(remittanceTransactions)
        .set(updateData)
        .where(eq(remittanceTransactions.id, transaction.id));

      this.securityLogger.logSecurityEvent(
        "remittance_webhook_processed",
        { 
          transactionId: transaction.id,
          cymonzTransactionId: transactionId,
          status: status.toLowerCase()
        },
        transaction.userId.toString()
      );

      return { success: true };
    } catch (error) {
      this.securityLogger.logSecurityEvent(
        "remittance_webhook_processing_failed",
        { 
          webhookData,
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        "system"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      };
    }
  }

  // Get fallback exchange rate (when Cymonz is unavailable)
  private getFallbackRate(fromCurrency: string, toCurrency: string): number {
    // This would normally come from a backup exchange rate API
    // For now, return estimated rates
    const rates: Record<string, Record<string, number>> = {
      USD: {
        NGN: 750,
        GBP: 0.79,
        EUR: 0.85,
        CAD: 1.35,
        AUD: 1.48,
        GHS: 12.5,
        KES: 140,
        UGX: 3700,
        TZS: 2350,
        ZAR: 18.5,
      },
      GBP: {
        USD: 1.27,
        NGN: 950,
        EUR: 1.08,
        CAD: 1.71,
        AUD: 1.88,
        GHS: 15.8,
        KES: 178,
        UGX: 4700,
        TZS: 2980,
        ZAR: 23.5,
      },
      EUR: {
        USD: 1.18,
        GBP: 0.93,
        NGN: 880,
        CAD: 1.59,
        AUD: 1.74,
        GHS: 14.7,
        KES: 165,
        UGX: 4360,
        TZS: 2770,
        ZAR: 21.8,
      },
    };

    return rates[fromCurrency]?.[toCurrency] || 1;
  }
}

export const remittanceService = new RemittanceService();