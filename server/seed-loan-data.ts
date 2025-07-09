import { db } from './db';
import { loanProviders } from '@shared/schema';
import type { InsertLoanProvider } from '@shared/schema';

// Nigeria loan providers
const nigerianProviders: InsertLoanProvider[] = [
  {
    name: 'Access Bank Nigeria',
    country: 'Nigeria',
    type: 'bank',
    description: 'Leading Nigerian bank offering personal and business loans with competitive rates.',
    website: 'https://www.accessbankplc.com',
    phoneNumber: '+234-1-2712005',
    email: 'customercare@accessbankplc.com',
    minAmount: '50000',
    maxAmount: '10000000',
    minInterestRate: '12.5',
    maxInterestRate: '28.0',
    minTermMonths: 6,
    maxTermMonths: 60,
    currencies: ['NGN'],
    eligibilityCriteria: {
      minIncome: 50000,
      minAge: 18,
      maxAge: 65,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 40,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['ID Card', 'Proof of Income', 'Bank Statement', 'Utility Bill'],
    processingTime: '3-5 business days',
    features: ['Online Application', 'Quick Approval', 'Flexible Terms', 'No Collateral Required'],
    rating: '4.2',
    totalReviews: 1250,
    isActive: true,
    isVerified: true
  },
  {
    name: 'GTBank Nigeria',
    country: 'Nigeria',
    type: 'bank',
    description: 'Guaranteed Trust Bank offering instant loans and salary advances.',
    website: 'https://www.gtbank.com',
    phoneNumber: '+234-1-2481030',
    email: 'contactcenter@gtbank.com',
    minAmount: '25000',
    maxAmount: '5000000',
    minInterestRate: '15.0',
    maxInterestRate: '30.0',
    minTermMonths: 3,
    maxTermMonths: 36,
    currencies: ['NGN'],
    eligibilityCriteria: {
      minIncome: 30000,
      minAge: 21,
      maxAge: 60,
      employmentTypes: ['employed'],
      minScore: 35,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['Valid ID', 'Salary Certificate', 'Bank Statement', 'Passport Photo'],
    processingTime: '24-48 hours',
    features: ['Instant Approval', 'Mobile Banking', 'Salary Advance', 'No Guarantor'],
    rating: '4.0',
    totalReviews: 890,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Kuda Microfinance Bank',
    country: 'Nigeria',
    type: 'fintech',
    description: 'Digital bank offering quick personal loans through mobile app.',
    website: 'https://kuda.com',
    phoneNumber: '+234-1-8889999',
    email: 'hello@kuda.com',
    minAmount: '10000',
    maxAmount: '1000000',
    minInterestRate: '18.0',
    maxInterestRate: '35.0',
    minTermMonths: 1,
    maxTermMonths: 12,
    currencies: ['NGN'],
    eligibilityCriteria: {
      minIncome: 25000,
      minAge: 18,
      maxAge: 65,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 30,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['BVN', 'Bank Statement', 'ID Card'],
    processingTime: '15 minutes',
    features: ['100% Digital', 'No Paperwork', 'Instant Disbursement', 'Flexible Repayment'],
    rating: '4.5',
    totalReviews: 2340,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Carbon (formerly Paylater)',
    country: 'Nigeria',
    type: 'fintech',
    description: 'AI-powered lending platform offering instant loans and credit building.',
    website: 'https://carbon.ng',
    phoneNumber: '+234-1-4448888',
    email: 'hello@carbon.ng',
    minAmount: '1500',
    maxAmount: '1000000',
    minInterestRate: '20.0',
    maxInterestRate: '40.0',
    minTermMonths: 1,
    maxTermMonths: 12,
    currencies: ['NGN'],
    eligibilityCriteria: {
      minIncome: 20000,
      minAge: 18,
      maxAge: 60,
      employmentTypes: ['employed', 'self_employed', 'student'],
      minScore: 25,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['BVN', 'Phone Number', 'Bank Account'],
    processingTime: '5 minutes',
    features: ['AI Credit Scoring', 'Instant Approval', 'Credit Building', 'No Collateral'],
    rating: '4.1',
    totalReviews: 3420,
    isActive: true,
    isVerified: true
  }
];

// UK loan providers
const ukProviders: InsertLoanProvider[] = [
  {
    name: 'Barclays Personal Loan',
    country: 'UK',
    type: 'bank',
    description: 'Established UK bank offering competitive personal loans with flexible terms.',
    website: 'https://www.barclays.co.uk',
    phoneNumber: '+44-345-734-5345',
    email: 'customer.services@barclays.co.uk',
    minAmount: '1000',
    maxAmount: '50000',
    minInterestRate: '3.1',
    maxInterestRate: '34.9',
    minTermMonths: 12,
    maxTermMonths: 60,
    currencies: ['GBP'],
    eligibilityCriteria: {
      minIncome: 15000,
      minAge: 18,
      maxAge: 75,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 60,
      residenceTypes: ['citizen', 'permanent_resident', 'visa_holder']
    },
    requiredDocuments: ['Photo ID', 'Proof of Income', 'Bank Statement', 'Proof of Address'],
    processingTime: '1-2 business days',
    features: ['Competitive Rates', 'No Early Repayment Fees', 'Online Management', 'Flexible Terms'],
    rating: '4.3',
    totalReviews: 5670,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Santander Personal Loan',
    country: 'UK',
    type: 'bank',
    description: 'Santander UK offering personal loans with preferential rates for existing customers.',
    website: 'https://www.santander.co.uk',
    phoneNumber: '+44-330-9-123-123',
    email: 'customer.services@santander.co.uk',
    minAmount: '1000',
    maxAmount: '25000',
    minInterestRate: '3.4',
    maxInterestRate: '19.9',
    minTermMonths: 12,
    maxTermMonths: 84,
    currencies: ['GBP'],
    eligibilityCriteria: {
      minIncome: 12000,
      minAge: 18,
      maxAge: 70,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 55,
      residenceTypes: ['citizen', 'permanent_resident', 'visa_holder']
    },
    requiredDocuments: ['Valid ID', 'Proof of Income', 'Bank Statement', 'Address Proof'],
    processingTime: '2-3 business days',
    features: ['Customer Discounts', 'No Hidden Fees', 'Online Application', 'Flexible Repayment'],
    rating: '4.1',
    totalReviews: 3890,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Zopa Personal Loan',
    country: 'UK',
    type: 'fintech',
    description: 'Digital-first lender offering competitive personal loans with transparent pricing.',
    website: 'https://www.zopa.com',
    phoneNumber: '+44-20-7580-6060',
    email: 'hello@zopa.com',
    minAmount: '1000',
    maxAmount: '25000',
    minInterestRate: '3.0',
    maxInterestRate: '34.9',
    minTermMonths: 12,
    maxTermMonths: 60,
    currencies: ['GBP'],
    eligibilityCriteria: {
      minIncome: 12000,
      minAge: 20,
      maxAge: 85,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 50,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['Photo ID', 'Proof of Income', 'Bank Statement'],
    processingTime: '1 business day',
    features: ['Digital-First', 'Competitive Rates', 'No Early Repayment Fees', 'Quick Approval'],
    rating: '4.6',
    totalReviews: 8920,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Monzo Personal Loan',
    country: 'UK',
    type: 'fintech',
    description: 'Digital bank offering personal loans with full mobile app integration.',
    website: 'https://monzo.com',
    phoneNumber: '+44-20-3375-0670',
    email: 'help@monzo.com',
    minAmount: '1000',
    maxAmount: '15000',
    minInterestRate: '3.2',
    maxInterestRate: '21.9',
    minTermMonths: 12,
    maxTermMonths: 60,
    currencies: ['GBP'],
    eligibilityCriteria: {
      minIncome: 15000,
      minAge: 18,
      maxAge: 65,
      employmentTypes: ['employed'],
      minScore: 55,
      residenceTypes: ['citizen', 'permanent_resident']
    },
    requiredDocuments: ['Valid ID', 'Proof of Income', 'Bank Statement'],
    processingTime: '24 hours',
    features: ['Mobile First', 'Real-time Notifications', 'No Hidden Fees', 'Instant Decisions'],
    rating: '4.4',
    totalReviews: 2340,
    isActive: true,
    isVerified: true
  },
  {
    name: 'Lloyds Bank Personal Loan',
    country: 'UK',
    type: 'bank',
    description: 'Trusted UK bank offering personal loans with competitive rates and flexible terms.',
    website: 'https://www.lloydsbank.com',
    phoneNumber: '+44-345-300-0000',
    email: 'customer.services@lloydsbank.com',
    minAmount: '1000',
    maxAmount: '50000',
    minInterestRate: '3.1',
    maxInterestRate: '29.9',
    minTermMonths: 12,
    maxTermMonths: 84,
    currencies: ['GBP'],
    eligibilityCriteria: {
      minIncome: 10000,
      minAge: 18,
      maxAge: 75,
      employmentTypes: ['employed', 'self_employed'],
      minScore: 50,
      residenceTypes: ['citizen', 'permanent_resident', 'visa_holder']
    },
    requiredDocuments: ['Photo ID', 'Proof of Income', 'Bank Statement', 'Proof of Address'],
    processingTime: '1-3 business days',
    features: ['Established Bank', 'Flexible Terms', 'No Early Repayment Fees', 'Online Management'],
    rating: '4.0',
    totalReviews: 4560,
    isActive: true,
    isVerified: true
  }
];

export async function seedLoanProviders() {
  try {
    console.log('Seeding loan providers...');
    
    // Insert Nigerian providers
    for (const provider of nigerianProviders) {
      await db.insert(loanProviders).values(provider).onConflictDoNothing();
    }
    
    // Insert UK providers
    for (const provider of ukProviders) {
      await db.insert(loanProviders).values(provider).onConflictDoNothing();
    }
    
    console.log('Loan providers seeded successfully!');
  } catch (error) {
    console.error('Error seeding loan providers:', error);
  }
}