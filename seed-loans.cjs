// Quick seeding script for loan providers
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Initialize WebSocket constructor
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedLoanProviders() {
  try {
    console.log('Seeding loan providers...');
    
    // Nigeria providers
    const nigerianProviders = [
      {
        name: 'Access Bank Nigeria',
        country: 'Nigeria',
        type: 'bank',
        description: 'Leading Nigerian bank offering personal and business loans with competitive rates.',
        website: 'https://www.accessbankplc.com',
        phone_number: '+234-1-2712005',
        email: 'customercare@accessbankplc.com',
        min_amount: 50000,
        max_amount: 10000000,
        min_interest_rate: 12.5,
        max_interest_rate: 28.0,
        min_term_months: 6,
        max_term_months: 60,
        currencies: ['NGN'],
        eligibility_criteria: JSON.stringify({
          minIncome: 50000,
          minAge: 18,
          maxAge: 65,
          employmentTypes: ['employed', 'self_employed'],
          minScore: 40,
          residenceTypes: ['citizen', 'permanent_resident']
        }),
        required_documents: ['ID Card', 'Proof of Income', 'Bank Statement', 'Utility Bill'],
        processing_time: '3-5 business days',
        features: ['Online Application', 'Quick Approval', 'Flexible Terms', 'No Collateral Required'],
        rating: 4.2,
        total_reviews: 1250,
        is_active: true,
        is_verified: true
      },
      {
        name: 'Kuda Microfinance Bank',
        country: 'Nigeria',
        type: 'fintech',
        description: 'Digital bank offering quick personal loans through mobile app.',
        website: 'https://kuda.com',
        phone_number: '+234-1-8889999',
        email: 'hello@kuda.com',
        min_amount: 10000,
        max_amount: 1000000,
        min_interest_rate: 18.0,
        max_interest_rate: 35.0,
        min_term_months: 1,
        max_term_months: 12,
        currencies: ['NGN'],
        eligibility_criteria: JSON.stringify({
          minIncome: 25000,
          minAge: 18,
          maxAge: 65,
          employmentTypes: ['employed', 'self_employed'],
          minScore: 30,
          residenceTypes: ['citizen', 'permanent_resident']
        }),
        required_documents: ['BVN', 'Bank Statement', 'ID Card'],
        processing_time: '15 minutes',
        features: ['100% Digital', 'No Paperwork', 'Instant Disbursement', 'Flexible Repayment'],
        rating: 4.5,
        total_reviews: 2340,
        is_active: true,
        is_verified: true
      }
    ];

    // UK providers
    const ukProviders = [
      {
        name: 'Barclays Personal Loan',
        country: 'UK',
        type: 'bank',
        description: 'Established UK bank offering competitive personal loans with flexible terms.',
        website: 'https://www.barclays.co.uk',
        phone_number: '+44-345-734-5345',
        email: 'customer.services@barclays.co.uk',
        min_amount: 1000,
        max_amount: 50000,
        min_interest_rate: 3.1,
        max_interest_rate: 34.9,
        min_term_months: 12,
        max_term_months: 60,
        currencies: ['GBP'],
        eligibility_criteria: JSON.stringify({
          minIncome: 15000,
          minAge: 18,
          maxAge: 75,
          employmentTypes: ['employed', 'self_employed'],
          minScore: 60,
          residenceTypes: ['citizen', 'permanent_resident', 'visa_holder']
        }),
        required_documents: ['Photo ID', 'Proof of Income', 'Bank Statement', 'Proof of Address'],
        processing_time: '1-2 business days',
        features: ['Competitive Rates', 'No Early Repayment Fees', 'Online Management', 'Flexible Terms'],
        rating: 4.3,
        total_reviews: 5670,
        is_active: true,
        is_verified: true
      },
      {
        name: 'Zopa Personal Loan',
        country: 'UK',
        type: 'fintech',
        description: 'Digital-first lender offering competitive personal loans with transparent pricing.',
        website: 'https://www.zopa.com',
        phone_number: '+44-20-7580-6060',
        email: 'hello@zopa.com',
        min_amount: 1000,
        max_amount: 25000,
        min_interest_rate: 3.0,
        max_interest_rate: 34.9,
        min_term_months: 12,
        max_term_months: 60,
        currencies: ['GBP'],
        eligibility_criteria: JSON.stringify({
          minIncome: 12000,
          minAge: 20,
          maxAge: 85,
          employmentTypes: ['employed', 'self_employed'],
          minScore: 50,
          residenceTypes: ['citizen', 'permanent_resident']
        }),
        required_documents: ['Photo ID', 'Proof of Income', 'Bank Statement'],
        processing_time: '1 business day',
        features: ['Digital-First', 'Competitive Rates', 'No Early Repayment Fees', 'Quick Approval'],
        rating: 4.6,
        total_reviews: 8920,
        is_active: true,
        is_verified: true
      }
    ];

    // Insert providers
    const allProviders = [...nigerianProviders, ...ukProviders];
    
    for (const provider of allProviders) {
      try {
        await pool.query(`
          INSERT INTO loan_providers (
            name, country, type, description, website, phone_number, email,
            min_amount, max_amount, min_interest_rate, max_interest_rate,
            min_term_months, max_term_months, currencies, eligibility_criteria,
            required_documents, processing_time, features, rating, total_reviews,
            is_active, is_verified
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22
          ) ON CONFLICT (name) DO NOTHING
        `, [
          provider.name, provider.country, provider.type, provider.description,
          provider.website, provider.phone_number, provider.email,
          provider.min_amount, provider.max_amount, provider.min_interest_rate,
          provider.max_interest_rate, provider.min_term_months, provider.max_term_months,
          provider.currencies, provider.eligibility_criteria, provider.required_documents,
          provider.processing_time, provider.features, provider.rating,
          provider.total_reviews, provider.is_active, provider.is_verified
        ]);
        
        console.log(`✓ Added ${provider.name}`);
      } catch (error) {
        console.error(`✗ Failed to add ${provider.name}:`, error.message);
      }
    }
    
    console.log('Loan providers seeded successfully!');
  } catch (error) {
    console.error('Error seeding loan providers:', error);
  } finally {
    await pool.end();
  }
}

seedLoanProviders();