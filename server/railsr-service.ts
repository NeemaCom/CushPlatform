import { db } from "./db";
import { railsrConfig, railsrEndusers, railsrWallets, railsrCards, railsrTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { Decimal } from "decimal.js";

export interface RailsrEnduser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  nationality?: string;
  identityDocument?: {
    type: string;
    number: string;
    expiryDate?: string;
  };
}

export interface RailsrWallet {
  id: string;
  enduserId: string;
  currency: string;
  balance: number;
  status: string;
  type: string;
  description?: string;
}

export interface RailsrCard {
  id: string;
  walletId: string;
  type: 'virtual' | 'physical';
  status: string;
  pan?: string;
  cvv?: string;
  expiryDate?: string;
  cardholderName: string;
  limits?: {
    daily: number;
    monthly: number;
    transaction: number;
  };
}

export interface RailsrTransaction {
  id: string;
  walletId: string;
  amount: number;
  currency: string;
  description: string;
  type: string;
  status: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RailsrTransferRequest {
  fromWalletId: string;
  toWalletId?: string;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface RailsrCardTransactionRequest {
  cardId: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory?: string;
  reference?: string;
}

class RailsrService {
  private config: any = null;
  private baseUrl: string = "";
  private apiKey: string = "";

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig() {
    try {
      // Get active Railsr configuration from database
      const [activeConfig] = await db
        .select()
        .from(railsrConfig)
        .where(eq(railsrConfig.isActive, true))
        .limit(1);

      if (!activeConfig) {
        // Create default configuration if none exists
        const defaultConfig = {
          environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
          baseUrl: process.env.RAILSR_BASE_URL || "https://api.railsr.com",
          apiKey: process.env.RAILSR_API_KEY || "",
          webhookSecret: process.env.RAILSR_WEBHOOK_SECRET || "",
          isActive: true,
        };

        const [newConfig] = await db.insert(railsrConfig).values(defaultConfig).returning();
        this.config = newConfig;
      } else {
        this.config = activeConfig;
      }

      this.baseUrl = this.config.baseUrl;
      this.apiKey = this.config.apiKey;
    } catch (error) {
      console.error("Failed to initialize Railsr configuration, using defaults:", error);
      // Fall back to environment variables if database is not available
      this.config = {
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        baseUrl: process.env.RAILSR_BASE_URL || "https://api.railsr.com",
        apiKey: process.env.RAILSR_API_KEY || "",
        webhookSecret: process.env.RAILSR_WEBHOOK_SECRET || "",
        isActive: true,
      };
      this.baseUrl = this.config.baseUrl;
      this.apiKey = this.config.apiKey;
    }
  }

  private async makeRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    if (!this.config) {
      await this.initializeConfig();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error("Railsr API Error:", error);
      throw error;
    }
  }

  // Enduser Management
  async createEnduser(cusUserId: string, enduserData: RailsrEnduser): Promise<{ success: boolean; railsrEnduserId?: string; error?: string }> {
    try {
      const payload = {
        person: {
          name: `${enduserData.firstName} ${enduserData.lastName}`,
          email: enduserData.email,
          date_of_birth: enduserData.dateOfBirth,
          telephone: enduserData.phone,
          address: enduserData.address ? {
            address_line_1: enduserData.address.line1,
            address_line_2: enduserData.address.line2,
            address_city: enduserData.address.city,
            address_state: enduserData.address.state,
            address_country: enduserData.address.country,
            address_postal_code: enduserData.address.postalCode,
          } : undefined,
          nationality: enduserData.nationality,
          identity_document: enduserData.identityDocument ? {
            type: enduserData.identityDocument.type,
            number: enduserData.identityDocument.number,
            expiry_date: enduserData.identityDocument.expiryDate,
          } : undefined,
        }
      };

      const response = await this.makeRequest("/endusers", "POST", payload);
      
      // Store the mapping in our database
      await db.insert(railsrEndusers).values({
        cushUserId: cusUserId,
        railsrEnduserId: response.enduser_id,
        email: enduserData.email,
        firstName: enduserData.firstName,
        lastName: enduserData.lastName,
        status: response.status || "active",
        kycStatus: response.kyc_status || "pending",
        createdAt: new Date(),
      });

      return {
        success: true,
        railsrEnduserId: response.enduser_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create enduser",
      };
    }
  }

  async getEnduser(railsrEnduserId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/endusers/${railsrEnduserId}`);
      return response;
    } catch (error) {
      console.error("Railsr get enduser error:", error);
      throw error;
    }
  }

  // Wallet Management
  async createWallet(railsrEnduserId: string, currency: string = "GBP", type: string = "ledger"): Promise<{ success: boolean; walletId?: string; error?: string }> {
    try {
      const payload = {
        enduser_id: railsrEnduserId,
        currency,
        type,
      };

      const response = await this.makeRequest("/wallets", "POST", payload);
      
      // Store the wallet in our database
      await db.insert(railsrWallets).values({
        railsrWalletId: response.wallet_id,
        railsrEnduserId,
        currency,
        balance: new Decimal(0),
        status: response.status || "active",
        type,
        createdAt: new Date(),
      });

      return {
        success: true,
        walletId: response.wallet_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create wallet",
      };
    }
  }

  async getWallet(walletId: string): Promise<RailsrWallet> {
    try {
      const response = await this.makeRequest(`/wallets/${walletId}`);
      
      // Update our database with the latest balance
      await db.update(railsrWallets)
        .set({ 
          balance: new Decimal(response.balance),
          status: response.status,
          updatedAt: new Date(),
        })
        .where(eq(railsrWallets.railsrWalletId, walletId));

      return {
        id: response.wallet_id,
        enduserId: response.enduser_id,
        currency: response.currency,
        balance: parseFloat(response.balance),
        status: response.status,
        type: response.type,
        description: response.description,
      };
    } catch (error) {
      console.error("Railsr get wallet error:", error);
      throw error;
    }
  }

  async getWalletTransactions(walletId: string, limit: number = 50): Promise<RailsrTransaction[]> {
    try {
      const response = await this.makeRequest(`/wallets/${walletId}/transactions?limit=${limit}`);
      return response.transactions || [];
    } catch (error) {
      console.error("Railsr get wallet transactions error:", error);
      throw error;
    }
  }

  // Card Management
  async createCard(walletId: string, type: 'virtual' | 'physical' = 'virtual', cardholderName: string): Promise<{ success: boolean; cardId?: string; error?: string }> {
    try {
      const payload = {
        wallet_id: walletId,
        type,
        cardholder_name: cardholderName,
      };

      const response = await this.makeRequest("/cards", "POST", payload);
      
      // Store the card in our database
      await db.insert(railsrCards).values({
        railsrCardId: response.card_id,
        railsrWalletId: walletId,
        type,
        status: response.status || "inactive",
        cardholderName,
        createdAt: new Date(),
      });

      return {
        success: true,
        cardId: response.card_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create card",
      };
    }
  }

  async getCard(cardId: string): Promise<RailsrCard> {
    try {
      const response = await this.makeRequest(`/cards/${cardId}`);
      
      // Update our database with the latest card status
      await db.update(railsrCards)
        .set({ 
          status: response.status,
          updatedAt: new Date(),
        })
        .where(eq(railsrCards.railsrCardId, cardId));

      return {
        id: response.card_id,
        walletId: response.wallet_id,
        type: response.type,
        status: response.status,
        pan: response.pan,
        cvv: response.cvv,
        expiryDate: response.expiry_date,
        cardholderName: response.cardholder_name,
        limits: response.limits,
      };
    } catch (error) {
      console.error("Railsr get card error:", error);
      throw error;
    }
  }

  async activateCard(cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest(`/cards/${cardId}/activate`, "PUT");
      
      // Update our database
      await db.update(railsrCards)
        .set({ 
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(railsrCards.railsrCardId, cardId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to activate card",
      };
    }
  }

  async setCardLimits(cardId: string, limits: { daily?: number; monthly?: number; transaction?: number }): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = { limits };
      await this.makeRequest(`/cards/${cardId}/limits`, "PUT", payload);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set card limits",
      };
    }
  }

  // Transaction Management
  async createTransaction(transferRequest: RailsrTransferRequest): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const payload = {
        wallet_id: transferRequest.fromWalletId,
        amount: transferRequest.amount,
        currency: transferRequest.currency,
        description: transferRequest.description,
        reference: transferRequest.reference,
        metadata: transferRequest.metadata,
      };

      const response = await this.makeRequest("/transactions", "POST", payload);
      
      // Store the transaction in our database
      await db.insert(railsrTransactions).values({
        railsrTransactionId: response.transaction_id,
        railsrWalletId: transferRequest.fromWalletId,
        amount: new Decimal(transferRequest.amount),
        currency: transferRequest.currency,
        description: transferRequest.description,
        type: response.type || "transfer",
        status: response.status || "pending",
        reference: transferRequest.reference,
        metadata: transferRequest.metadata,
        createdAt: new Date(),
      });

      return {
        success: true,
        transactionId: response.transaction_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create transaction",
      };
    }
  }

  async getTransaction(transactionId: string): Promise<RailsrTransaction> {
    try {
      const response = await this.makeRequest(`/transactions/${transactionId}`);
      
      // Update our database with the latest transaction status
      await db.update(railsrTransactions)
        .set({ 
          status: response.status,
          updatedAt: new Date(),
        })
        .where(eq(railsrTransactions.railsrTransactionId, transactionId));

      return {
        id: response.transaction_id,
        walletId: response.wallet_id,
        amount: parseFloat(response.amount),
        currency: response.currency,
        description: response.description,
        type: response.type,
        status: response.status,
        reference: response.reference,
        metadata: response.metadata,
        createdAt: response.created_at,
      };
    } catch (error) {
      console.error("Railsr get transaction error:", error);
      throw error;
    }
  }

  // Webhook handling
  async processWebhook(webhookData: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Processing Railsr webhook:", webhookData);

      const { type, data } = webhookData;

      switch (type) {
        case "transaction.created":
        case "transaction.updated":
          await this.handleTransactionWebhook(data);
          break;
        case "card.created":
        case "card.updated":
          await this.handleCardWebhook(data);
          break;
        case "wallet.updated":
          await this.handleWalletWebhook(data);
          break;
        default:
          console.log(`Unhandled webhook type: ${type}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Railsr webhook processing error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      };
    }
  }

  private async handleTransactionWebhook(data: any) {
    // Update transaction status in database
    await db.update(railsrTransactions)
      .set({ 
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(railsrTransactions.railsrTransactionId, data.transaction_id));
  }

  private async handleCardWebhook(data: any) {
    // Update card status in database
    await db.update(railsrCards)
      .set({ 
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(railsrCards.railsrCardId, data.card_id));
  }

  private async handleWalletWebhook(data: any) {
    // Update wallet balance in database
    await db.update(railsrWallets)
      .set({ 
        balance: new Decimal(data.balance),
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(railsrWallets.railsrWalletId, data.wallet_id));
  }

  // Utility methods
  async getUserWallets(cushUserId: string): Promise<any[]> {
    try {
      // Get Railsr enduser for this Cush user
      const [enduser] = await db
        .select()
        .from(railsrEndusers)
        .where(eq(railsrEndusers.cushUserId, cushUserId))
        .limit(1);

      if (!enduser) {
        return [];
      }

      // Get all wallets for this enduser
      const wallets = await db
        .select()
        .from(railsrWallets)
        .where(eq(railsrWallets.railsrEnduserId, enduser.railsrEnduserId));

      return wallets;
    } catch (error) {
      console.error("Error getting user wallets:", error);
      return [];
    }
  }

  async getUserCards(cushUserId: string): Promise<any[]> {
    try {
      const wallets = await this.getUserWallets(cushUserId);
      const walletIds = wallets.map(w => w.railsrWalletId);

      if (walletIds.length === 0) {
        return [];
      }

      const cards = await db
        .select()
        .from(railsrCards)
        .where(eq(railsrCards.railsrWalletId, walletIds[0])); // Simplified for now

      return cards;
    } catch (error) {
      console.error("Error getting user cards:", error);
      return [];
    }
  }
}

export const railsrService = new RailsrService();