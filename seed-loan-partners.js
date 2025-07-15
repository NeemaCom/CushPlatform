// Seed script to populate loan partners table
import { Client } from 'pg';
import { randomBytes } from 'crypto';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedLoanPartners() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Clear existing partners
    await client.query('DELETE FROM loan_partners');
    console.log('Cleared existing loan partners');

    // Insert comprehensive loan partners
    const partners = [
      {
        name: 'Access Bank Nigeria',
        eligibilityCriteria: JSON.stringify({
          minIncome: 50000,
          minCreditScore: 600,
          acceptedEmploymentStatus: ['employed', 'self_employed'],
          minAge: 18,
          maxAge: 65,
          requiredDocuments: ['salary_slip', 'bank_statement', 'id_verification']
        }),
        referralCommissionRate: 0.025, // 2.5%
        isActive: true,
        apiEndpoint: 'https://api.accessbankplc.com/loans/webhook',
        contactEmail: 'partners@accessbankplc.com',
        website: 'https://www.accessbankplc.com',
        description: 'Leading commercial bank in Nigeria offering personal and business loans with competitive rates and flexible terms.',
        logoUrl: 'https://www.accessbankplc.com/logo.png',
        supportedCountries: ['NG'],
        minLoanAmount: 50000,
        maxLoanAmount: 10000000,
        supportedCurrencies: ['NGN'],
        processingTimeRange: '3-5 business days'
      },
      {
        name: 'Kuda Microfinance Bank',
        eligibilityCriteria: JSON.stringify({
          minIncome: 30000,
          minCreditScore: 550,
          acceptedEmploymentStatus: ['employed', 'self_employed', 'student'],
          minAge: 18,
          maxAge: 60,
          requiredDocuments: ['bank_statement', 'id_verification']
        }),
        referralCommissionRate: 0.035, // 3.5%
        isActive: true,
        apiEndpoint: 'https://api.kuda.com/loans/webhook',
        contactEmail: 'partnerships@kuda.com',
        website: 'https://kuda.com',
        description: 'Digital-first microfinance bank providing instant loans and financial services to young Nigerians.',
        logoUrl: 'https://kuda.com/logo.png',
        supportedCountries: ['NG'],
        minLoanAmount: 10000,
        maxLoanAmount: 1000000,
        supportedCurrencies: ['NGN'],
        processingTimeRange: '15 minutes'
      },
      {
        name: 'Barclays Personal Loan',
        eligibilityCriteria: JSON.stringify({
          minIncome: 20000,
          minCreditScore: 650,
          acceptedEmploymentStatus: ['employed'],
          minAge: 21,
          maxAge: 70,
          requiredDocuments: ['payslip', 'bank_statement', 'credit_report']
        }),
        referralCommissionRate: 0.015, // 1.5%
        isActive: true,
        apiEndpoint: 'https://api.barclays.co.uk/personal-loans/webhook',
        contactEmail: 'partnerships@barclays.co.uk',
        website: 'https://www.barclays.co.uk',
        description: 'One of the UK\'s largest banks offering competitive personal loans with no early repayment fees.',
        logoUrl: 'https://www.barclays.co.uk/logo.png',
        supportedCountries: ['GB'],
        minLoanAmount: 1000,
        maxLoanAmount: 50000,
        supportedCurrencies: ['GBP'],
        processingTimeRange: '1-2 business days'
      },
      {
        name: 'Zopa Personal Loan',
        eligibilityCriteria: JSON.stringify({
          minIncome: 18000,
          minCreditScore: 600,
          acceptedEmploymentStatus: ['employed', 'self_employed'],
          minAge: 20,
          maxAge: 85,
          requiredDocuments: ['payslip', 'bank_statement']
        }),
        referralCommissionRate: 0.02, // 2.0%
        isActive: true,
        apiEndpoint: 'https://api.zopa.com/loans/webhook',
        contactEmail: 'partnerships@zopa.com',
        website: 'https://www.zopa.com',
        description: 'UK\'s first peer-to-peer lending platform, now offering direct loans with competitive rates.',
        logoUrl: 'https://www.zopa.com/logo.png',
        supportedCountries: ['GB'],
        minLoanAmount: 1000,
        maxLoanAmount: 25000,
        supportedCurrencies: ['GBP'],
        processingTimeRange: '1 business day'
      },
      {
        name: 'LendingClub',
        eligibilityCriteria: JSON.stringify({
          minIncome: 35000,
          minCreditScore: 600,
          acceptedEmploymentStatus: ['employed', 'self_employed'],
          minAge: 18,
          maxAge: 80,
          requiredDocuments: ['tax_return', 'bank_statement', 'employment_verification']
        }),
        referralCommissionRate: 0.03, // 3.0%
        isActive: true,
        apiEndpoint: 'https://api.lendingclub.com/webhook',
        contactEmail: 'partnerships@lendingclub.com',
        website: 'https://www.lendingclub.com',
        description: 'America\'s largest marketplace connecting borrowers and investors for personal loans.',
        logoUrl: 'https://www.lendingclub.com/logo.png',
        supportedCountries: ['US'],
        minLoanAmount: 1000,
        maxLoanAmount: 40000,
        supportedCurrencies: ['USD'],
        processingTimeRange: '2-5 business days'
      },
      {
        name: 'Prosper',
        eligibilityCriteria: JSON.stringify({
          minIncome: 25000,
          minCreditScore: 640,
          acceptedEmploymentStatus: ['employed', 'self_employed'],
          minAge: 18,
          maxAge: 85,
          requiredDocuments: ['bank_statement', 'employment_verification']
        }),
        referralCommissionRate: 0.028, // 2.8%
        isActive: true,
        apiEndpoint: 'https://api.prosper.com/webhook',
        contactEmail: 'partnerships@prosper.com',
        website: 'https://www.prosper.com',
        description: 'Peer-to-peer lending platform offering personal loans for debt consolidation and major purchases.',
        logoUrl: 'https://www.prosper.com/logo.png',
        supportedCountries: ['US'],
        minLoanAmount: 2000,
        maxLoanAmount: 50000,
        supportedCurrencies: ['USD'],
        processingTimeRange: '1-3 business days'
      }
    ];

    // Insert partners
    for (const partner of partners) {
      await client.query(`
        INSERT INTO loan_partners (
          name, eligibility_criteria, referral_commission_rate, is_active,
          api_endpoint, contact_email, website, description, logo_url,
          supported_countries, min_loan_amount, max_loan_amount,
          supported_currencies, processing_time_range
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        partner.name,
        partner.eligibilityCriteria,
        partner.referralCommissionRate,
        partner.isActive,
        partner.apiEndpoint,
        partner.contactEmail,
        partner.website,
        partner.description,
        partner.logoUrl,
        partner.supportedCountries,
        partner.minLoanAmount,
        partner.maxLoanAmount,
        partner.supportedCurrencies,
        partner.processingTimeRange
      ]);
      console.log(`✓ Inserted partner: ${partner.name}`);
    }

    // Create sample prequalification and referrals for demo
    console.log('\nCreating sample prequalification and referrals...');
    
    // Check if users exist
    const usersResult = await client.query('SELECT id FROM users ORDER BY id LIMIT 1');
    if (usersResult.rows.length === 0) {
      console.log('⚠️  No users found. Skipping sample data creation.');
      return;
    }
    
    const userId = usersResult.rows[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Insert sample prequalification
    const prequalResult = await client.query(`
      INSERT INTO loan_pre_qualifications (
        user_id, loan_purpose, amount_requested, currency, credit_score,
        employment_status, monthly_income, existing_debt, loan_term,
        country, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id
    `, [
      userId,
      'debt_consolidation',
      25000,
      'USD',
      720,
      'employed',
      5000,
      8000,
      36,
      'US',
      'matched'
    ]);
    
    const prequalId = prequalResult.rows[0].id;
    console.log(`✓ Created sample prequalification with ID: ${prequalId}`);

    // Get partner IDs for referrals
    const partnersResult = await client.query('SELECT id, name FROM loan_partners ORDER BY id LIMIT 2');
    const partnerIds = partnersResult.rows.map(p => p.id);
    
    // Create sample referrals
    const referralCodes = [
      'CUSH_' + randomBytes(4).toString('hex').toUpperCase(),
      'CUSH_' + randomBytes(4).toString('hex').toUpperCase()
    ];

    for (let i = 0; i < 2 && i < partnerIds.length; i++) {
      const partnerId = partnerIds[i];
      await client.query(`
        INSERT INTO loan_referrals (
          pre_qualification_id, partner_id, referral_link, referral_code,
          referral_status, commission_earned, commission_paid
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        prequalId,
        partnerId,
        `https://cushglobal.replit.app/referral/${referralCodes[i]}`,
        referralCodes[i],
        i === 0 ? 'approved' : 'applied',
        i === 0 ? 750 : 0, // $750 commission for approved referral
        i === 0 ? true : false
      ]);
      console.log(`✓ Created referral: ${referralCodes[i]}`);
    }

    console.log('\n✅ Successfully seeded loan partners, prequalifications, and referrals!');
    console.log(`Total partners: ${partners.length}`);
    console.log('Sample data created for commission tracking demonstration.');

  } catch (error) {
    console.error('Error seeding loan partners:', error);
  } finally {
    await client.end();
  }
}

seedLoanPartners();