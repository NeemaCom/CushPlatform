import { db } from "./db";
import { cymonzConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CymonzUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  country: string;
  idType?: string;
  idNumber?: string;
}

export interface CymonzTransactionRequest {
  sender: CymonzUser;
  recipient: {
    name: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    swiftCode?: string;
  };
  sendAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  deliveryMethod: string;
  purpose?: string;
  reference?: string;
}

export interface CymonzTransactionResponse {
  transactionId: string;
  status: string;
  reference: string;
  paymentUrl?: string;
  redirectUrl?: string;
  exchangeRate: number;
  fees: number;
  totalCost: number;
  estimatedDeliveryTime: string;
}

export interface CymonzRatesResponse {
  sendCurrency: string;
  receiveCurrency: string;
  exchangeRate: number;
  fees: number;
  totalCost: number;
  estimatedDeliveryTime: string;
  minAmount: number;
  maxAmount: number;
}

export interface CymonzWebhookData {
  transactionId: string;
  status: string;
  reference: string;
  timestamp: string;
  amount: number;
  currency: string;
  recipient: any;
  metadata?: Record<string, any>;
}

class CymonzService {
  private config: any = null;

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig() {
    try {
      // Get active Cymonz configuration from database
      const [activeConfig] = await db
        .select()
        .from(cymonzConfig)
        .where(eq(cymonzConfig.isActive, true))
        .limit(1);

      if (!activeConfig) {
        // Create default configuration if none exists
        const defaultConfig = {
          environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
          baseUrl: process.env.CYMONZ_BASE_URL || "https://sandbox-api.cymonz.com",
          apiKey: process.env.CYMONZ_API_KEY || "",
          secretKey: process.env.CYMONZ_SECRET_KEY || "",
          webhookUrl: process.env.CYMONZ_WEBHOOK_URL || "",
          callbackUrl: process.env.CYMONZ_CALLBACK_URL || "",
          partnerCode: process.env.CYMONZ_PARTNER_CODE || "",
          isActive: true,
        };

        const [newConfig] = await db.insert(cymonzConfig).values(defaultConfig).returning();
        this.config = newConfig;
      } else {
        this.config = activeConfig;
      }
    } catch (error) {
      console.error("Failed to initialize Cymonz configuration, using defaults:", error);
      // Fall back to environment variables if database is not available
      this.config = {
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        baseUrl: process.env.CYMONZ_BASE_URL || "https://sandbox-api.cymonz.com",
        apiKey: process.env.CYMONZ_API_KEY || "",
        secretKey: process.env.CYMONZ_SECRET_KEY || "",
        webhookUrl: process.env.CYMONZ_WEBHOOK_URL || "",
        callbackUrl: process.env.CYMONZ_CALLBACK_URL || "",
        partnerCode: process.env.CYMONZ_PARTNER_CODE || "",
        isActive: true,
      };
    }
  }

  private async makeRequest(endpoint: string, method: string = "GET", body?: any): Promise<any> {
    if (!this.config) {
      await this.initializeConfig();
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`,
      "X-Partner-Code": this.config.partnerCode,
      "X-Secret-Key": this.config.secretKey,
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
      console.error("Cymonz API Error:", error);
      throw error;
    }
  }

  async createOrUpdateUser(user: CymonzUser): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const userData = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        country: user.country,
        identification: user.idType && user.idNumber ? {
          type: user.idType,
          number: user.idNumber
        } : undefined,
      };

      const response = await this.makeRequest("/v1/users", "POST", userData);
      
      return {
        success: true,
        userId: response.userId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      };
    }
  }

  async getRates(
    sendCurrency: string,
    receiveCurrency: string,
    amount: number,
    deliveryMethod: string = "bank_transfer"
  ): Promise<CymonzRatesResponse> {
    try {
      const response = await this.makeRequest(
        `/v1/rates?sendCurrency=${sendCurrency}&receiveCurrency=${receiveCurrency}&amount=${amount}&deliveryMethod=${deliveryMethod}`
      );

      return {
        sendCurrency,
        receiveCurrency,
        exchangeRate: response.exchangeRate,
        fees: response.fees,
        totalCost: response.totalCost,
        estimatedDeliveryTime: response.estimatedDeliveryTime,
        minAmount: response.minAmount,
        maxAmount: response.maxAmount,
      };
    } catch (error) {
      console.error("Cymonz rates error:", error);
      throw error;
    }
  }

  async initiateTransaction(request: CymonzTransactionRequest): Promise<CymonzTransactionResponse> {
    try {
      const transactionData = {
        sender: {
          id: request.sender.id,
          email: request.sender.email,
          firstName: request.sender.firstName,
          lastName: request.sender.lastName,
          phone: request.sender.phone,
          address: request.sender.address,
          country: request.sender.country,
          identification: request.sender.idType && request.sender.idNumber ? {
            type: request.sender.idType,
            number: request.sender.idNumber
          } : undefined,
        },
        recipient: {
          name: request.recipient.name,
          email: request.recipient.email,
          phone: request.recipient.phone,
          address: request.recipient.address,
          country: request.recipient.country,
          bankDetails: request.recipient.bankName ? {
            bankName: request.recipient.bankName,
            bankCode: request.recipient.bankCode,
            accountNumber: request.recipient.accountNumber,
            accountName: request.recipient.accountName,
            swiftCode: request.recipient.swiftCode,
          } : undefined,
        },
        transaction: {
          sendAmount: request.sendAmount,
          sendCurrency: request.sendCurrency,
          receiveCurrency: request.receiveCurrency,
          deliveryMethod: request.deliveryMethod,
          purpose: request.purpose || "family_support",
          reference: request.reference,
        },
      };

      const response = await this.makeRequest("/v1/transactions", "POST", transactionData);

      return {
        transactionId: response.transactionId,
        status: response.status,
        reference: response.reference,
        paymentUrl: response.paymentUrl,
        redirectUrl: response.redirectUrl,
        exchangeRate: response.exchangeRate,
        fees: response.fees,
        totalCost: response.totalCost,
        estimatedDeliveryTime: response.estimatedDeliveryTime,
      };
    } catch (error) {
      console.error("Cymonz transaction error:", error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/v1/transactions/${transactionId}`);
      return response;
    } catch (error) {
      console.error("Cymonz transaction status error:", error);
      throw error;
    }
  }

  async processWebhook(webhookData: CymonzWebhookData): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate webhook signature (implementation depends on Cymonz webhook signing)
      // For now, we'll just process the data

      console.log("Processing Cymonz webhook:", webhookData);

      // Here you would typically:
      // 1. Validate the webhook signature
      // 2. Update the transaction status in your database
      // 3. Send notifications to users
      // 4. Process any business logic

      return { success: true };
    } catch (error) {
      console.error("Cymonz webhook processing error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Webhook processing failed" 
      };
    }
  }

  async getTransactionHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await this.makeRequest(
        `/v1/transactions/user/${userId}?limit=${limit}`
      );
      return response.transactions || [];
    } catch (error) {
      console.error("Cymonz transaction history error:", error);
      throw error;
    }
  }

  async cancelTransaction(transactionId: string, reason: string = "User requested"): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest(
        `/v1/transactions/${transactionId}/cancel`,
        "POST",
        { reason }
      );
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to cancel transaction" 
      };
    }
  }

  async getSupportedCountries(): Promise<any[]> {
    try {
      const response = await this.makeRequest("/v1/countries");
      return response.countries || [];
    } catch (error) {
      console.error("Cymonz countries error:", error);
      throw error;
    }
  }

  async getBankList(country: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`/v1/banks?country=${country}`);
      return response.banks || [];
    } catch (error) {
      console.error("Cymonz banks error:", error);
      throw error;
    }
  }
}

export const cymonzService = new CymonzService();