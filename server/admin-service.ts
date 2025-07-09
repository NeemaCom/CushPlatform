import { db } from './db';
import { storage } from './storage';
import { notificationService } from './notification-service';

export interface AdminAnalytics {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  conversionRate: number;
  averageProcessingTime: number;
  topPerformingPartners: Array<{
    id: number;
    name: string;
    applications: number;
    approvals: number;
    conversionRate: number;
    totalCommission: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    applications: number;
    approvals: number;
    revenue: number;
  }>;
}

export interface FraudAlert {
  id: string;
  userId: number;
  applicationId: number;
  type: 'duplicate_application' | 'suspicious_income' | 'invalid_documents' | 'unusual_patterns';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: number;
}

export interface DocumentVerification {
  id: string;
  applicationId: number;
  documentType: 'income_proof' | 'identity' | 'address_proof' | 'employment_letter';
  status: 'pending' | 'verified' | 'rejected' | 'requires_review';
  confidence: number;
  verificationDetails: Record<string, any>;
  reviewedBy?: number;
  reviewedAt?: Date;
}

export interface CommissionRecord {
  id: string;
  partnerId: number;
  applicationId: number;
  amount: number;
  rate: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  calculatedAt: Date;
  paidAt?: Date;
  paymentReference?: string;
}

export class AdminService {
  private fraudAlerts: Map<string, FraudAlert> = new Map();
  private documentVerifications: Map<string, DocumentVerification> = new Map();
  private commissionRecords: Map<string, CommissionRecord> = new Map();
  private alertId = 1;
  private verificationId = 1;
  private commissionId = 1;

  // Partner Management
  async createPartner(partnerData: any) {
    const partner = await storage.createLoanPartner(partnerData);
    
    // Create welcome notification for admin
    notificationService.createNotification(
      1, // Admin user ID
      'system',
      'New Partner Added',
      `${partner.name} has been added as a loan partner`
    );
    
    return partner;
  }

  async updatePartner(partnerId: number, updateData: any) {
    const partner = await storage.updateLoanPartner(partnerId, updateData);
    
    // Log partner update
    notificationService.createNotification(
      1,
      'system',
      'Partner Updated',
      `${partner.name} partner details have been updated`
    );
    
    return partner;
  }

  async deactivatePartner(partnerId: number, reason: string) {
    const partner = await storage.updateLoanPartner(partnerId, { 
      isActive: false,
      deactivationReason: reason,
      deactivatedAt: new Date()
    });
    
    // Create deactivation notification
    notificationService.createNotification(
      1,
      'system',
      'Partner Deactivated',
      `${partner.name} has been deactivated. Reason: ${reason}`
    );
    
    return partner;
  }

  // Analytics and Reporting
  async getApplicationAnalytics(startDate?: Date, endDate?: Date): Promise<AdminAnalytics> {
    const applications = await storage.getLoanApplications();
    const partners = await storage.getLoanPartners();
    
    const filteredApplications = applications.filter(app => {
      const appDate = new Date(app.createdAt!);
      return (!startDate || appDate >= startDate) && (!endDate || appDate <= endDate);
    });

    const totalApplications = filteredApplications.length;
    const approvedApplications = filteredApplications.filter(app => app.status === 'approved').length;
    const rejectedApplications = filteredApplications.filter(app => app.status === 'rejected').length;
    const pendingApplications = filteredApplications.filter(app => app.status === 'pending').length;
    const conversionRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

    // Calculate average processing time
    const processedApps = filteredApplications.filter(app => app.status !== 'pending');
    const avgProcessingTime = processedApps.length > 0 
      ? processedApps.reduce((sum, app) => {
          const created = new Date(app.createdAt!);
          const updated = new Date(app.updatedAt!);
          return sum + (updated.getTime() - created.getTime());
        }, 0) / processedApps.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Top performing partners
    const partnerStats = partners.map(partner => {
      const partnerApps = filteredApplications.filter(app => app.loanProviderId === partner.id);
      const partnerApprovals = partnerApps.filter(app => app.status === 'approved');
      const conversionRate = partnerApps.length > 0 ? (partnerApprovals.length / partnerApps.length) * 100 : 0;
      
      return {
        id: partner.id,
        name: partner.name,
        applications: partnerApps.length,
        approvals: partnerApprovals.length,
        conversionRate,
        totalCommission: partnerApprovals.reduce((sum, app) => sum + (parseFloat(app.amount || '0') * 0.02), 0)
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      
      const monthApps = applications.filter(app => {
        const appDate = new Date(app.createdAt!);
        return appDate >= monthStart && appDate <= monthEnd;
      });
      
      const monthApprovals = monthApps.filter(app => app.status === 'approved');
      const monthRevenue = monthApprovals.reduce((sum, app) => sum + (parseFloat(app.amount || '0') * 0.02), 0);
      
      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        applications: monthApps.length,
        approvals: monthApprovals.length,
        revenue: monthRevenue
      });
    }

    return {
      totalApplications,
      approvedApplications,
      rejectedApplications,
      pendingApplications,
      conversionRate,
      averageProcessingTime: avgProcessingTime,
      topPerformingPartners: partnerStats.slice(0, 10),
      monthlyTrends
    };
  }

  // Fraud Detection
  async detectFraudulentActivity(applicationId: number, userId: number): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];
    const userApplications = await storage.getLoanApplicationsByUserId(userId);
    const application = userApplications.find(app => app.id === applicationId);
    
    if (!application) return alerts;

    // Check for duplicate applications
    const duplicateApps = userApplications.filter(app => 
      app.id !== applicationId && 
      app.loanProviderId === application.loanProviderId &&
      new Date(app.createdAt!).getTime() - new Date(application.createdAt!).getTime() < 24 * 60 * 60 * 1000
    );

    if (duplicateApps.length > 0) {
      const alert: FraudAlert = {
        id: `fraud_${this.alertId++}`,
        userId,
        applicationId,
        type: 'duplicate_application',
        severity: 'high',
        description: 'Multiple applications to same provider within 24 hours',
        evidence: { duplicateApplications: duplicateApps.map(app => app.id) },
        status: 'pending',
        createdAt: new Date()
      };
      alerts.push(alert);
      this.fraudAlerts.set(alert.id, alert);
    }

    // Check for suspicious income patterns
    const amount = parseFloat(application.amount || '0');
    const income = parseFloat(application.employmentInfo?.income || '0');
    
    if (amount > income * 12) { // Requesting more than annual income
      const alert: FraudAlert = {
        id: `fraud_${this.alertId++}`,
        userId,
        applicationId,
        type: 'suspicious_income',
        severity: 'medium',
        description: 'Loan amount exceeds annual income',
        evidence: { requestedAmount: amount, annualIncome: income * 12 },
        status: 'pending',
        createdAt: new Date()
      };
      alerts.push(alert);
      this.fraudAlerts.set(alert.id, alert);
    }

    // Check for unusual patterns
    if (userApplications.length > 5) {
      const alert: FraudAlert = {
        id: `fraud_${this.alertId++}`,
        userId,
        applicationId,
        type: 'unusual_patterns',
        severity: 'medium',
        description: 'User has submitted multiple loan applications',
        evidence: { totalApplications: userApplications.length },
        status: 'pending',
        createdAt: new Date()
      };
      alerts.push(alert);
      this.fraudAlerts.set(alert.id, alert);
    }

    return alerts;
  }

  async getFraudAlerts(): Promise<FraudAlert[]> {
    return Array.from(this.fraudAlerts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async resolveFraudAlert(alertId: string, adminId: number, resolution: 'resolved' | 'false_positive'): Promise<void> {
    const alert = this.fraudAlerts.get(alertId);
    if (alert) {
      alert.status = resolution;
      alert.resolvedAt = new Date();
      alert.resolvedBy = adminId;
      this.fraudAlerts.set(alertId, alert);
    }
  }

  // Document Verification
  async verifyDocument(applicationId: number, documentType: DocumentVerification['documentType']): Promise<DocumentVerification> {
    const verification: DocumentVerification = {
      id: `doc_${this.verificationId++}`,
      applicationId,
      documentType,
      status: 'pending',
      confidence: 0,
      verificationDetails: {}
    };

    // Simulate automated verification
    setTimeout(() => {
      verification.confidence = Math.random() * 100;
      verification.status = verification.confidence > 80 ? 'verified' : 
                           verification.confidence > 50 ? 'requires_review' : 'rejected';
      verification.verificationDetails = {
        ocrExtraction: `Extracted data from ${documentType}`,
        crossReference: verification.confidence > 70 ? 'Match found' : 'No match',
        timestamp: new Date()
      };
      this.documentVerifications.set(verification.id, verification);
    }, 2000);

    this.documentVerifications.set(verification.id, verification);
    return verification;
  }

  async getDocumentVerifications(): Promise<DocumentVerification[]> {
    return Array.from(this.documentVerifications.values());
  }

  async reviewDocument(verificationId: string, adminId: number, decision: 'verified' | 'rejected'): Promise<void> {
    const verification = this.documentVerifications.get(verificationId);
    if (verification) {
      verification.status = decision;
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      this.documentVerifications.set(verificationId, verification);
    }
  }

  // Commission Tracking
  async calculateCommission(applicationId: number): Promise<CommissionRecord> {
    const applications = await storage.getLoanApplications();
    const application = applications.find(app => app.id === applicationId);
    
    if (!application || application.status !== 'approved') {
      throw new Error('Application not found or not approved');
    }

    const amount = parseFloat(application.amount || '0');
    const rate = 0.02; // 2% commission rate
    const commissionAmount = amount * rate;

    const commission: CommissionRecord = {
      id: `comm_${this.commissionId++}`,
      partnerId: application.loanProviderId,
      applicationId,
      amount: commissionAmount,
      rate,
      status: 'pending',
      calculatedAt: new Date()
    };

    this.commissionRecords.set(commission.id, commission);
    return commission;
  }

  async getCommissionRecords(): Promise<CommissionRecord[]> {
    return Array.from(this.commissionRecords.values()).sort((a, b) => 
      new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
    );
  }

  async approveCommission(commissionId: string, adminId: number): Promise<void> {
    const commission = this.commissionRecords.get(commissionId);
    if (commission) {
      commission.status = 'approved';
      this.commissionRecords.set(commissionId, commission);
      
      // Create notification
      notificationService.createNotification(
        adminId,
        'system',
        'Commission Approved',
        `Commission of $${commission.amount.toFixed(2)} approved for partner`
      );
    }
  }

  async processCommissionPayout(commissionId: string, paymentReference: string): Promise<void> {
    const commission = this.commissionRecords.get(commissionId);
    if (commission && commission.status === 'approved') {
      commission.status = 'paid';
      commission.paidAt = new Date();
      commission.paymentReference = paymentReference;
      this.commissionRecords.set(commissionId, commission);
    }
  }

  // Partner Performance Metrics
  async getPartnerPerformance(partnerId: number, period: '30d' | '90d' | '1y' = '30d') {
    const applications = await storage.getLoanApplications();
    const partner = await storage.getLoanPartnerById(partnerId);
    
    if (!partner) throw new Error('Partner not found');

    const periodStart = new Date();
    switch (period) {
      case '30d':
        periodStart.setDate(periodStart.getDate() - 30);
        break;
      case '90d':
        periodStart.setDate(periodStart.getDate() - 90);
        break;
      case '1y':
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
    }

    const partnerApps = applications.filter(app => 
      app.loanProviderId === partnerId &&
      new Date(app.createdAt!) >= periodStart
    );

    const metrics = {
      totalApplications: partnerApps.length,
      approvedApplications: partnerApps.filter(app => app.status === 'approved').length,
      rejectedApplications: partnerApps.filter(app => app.status === 'rejected').length,
      pendingApplications: partnerApps.filter(app => app.status === 'pending').length,
      totalVolume: partnerApps.reduce((sum, app) => sum + parseFloat(app.amount || '0'), 0),
      approvedVolume: partnerApps.filter(app => app.status === 'approved')
        .reduce((sum, app) => sum + parseFloat(app.amount || '0'), 0),
      conversionRate: partnerApps.length > 0 ? 
        (partnerApps.filter(app => app.status === 'approved').length / partnerApps.length) * 100 : 0,
      averageApplicationAmount: partnerApps.length > 0 ? 
        partnerApps.reduce((sum, app) => sum + parseFloat(app.amount || '0'), 0) / partnerApps.length : 0,
      totalCommissions: partnerApps.filter(app => app.status === 'approved')
        .reduce((sum, app) => sum + (parseFloat(app.amount || '0') * 0.02), 0)
    };

    return { partner, metrics };
  }
}

export const adminService = new AdminService();