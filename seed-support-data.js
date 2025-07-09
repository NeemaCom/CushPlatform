// Seed support data for testing
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function seedSupportData() {
  try {
    await client.connect();
    
    // Create FAQ articles
    const faqArticles = [
      {
        title: 'How do I reset my password?',
        content: 'To reset your password, click on the "Forgot Password" link on the login page. Enter your email address and follow the instructions sent to your email.',
        category: 'account',
        isPublished: true
      },
      {
        title: 'How do I apply for a loan?',
        content: 'To apply for a loan, navigate to the Loans section from your dashboard. Complete the prequalification form and browse available loan providers.',
        category: 'loans',
        isPublished: true
      },
      {
        title: 'How do I join community events?',
        content: 'Visit the Community section to see upcoming events. Click on any event to register and receive updates.',
        category: 'community',
        isPublished: true
      },
      {
        title: 'How do I update my profile information?',
        content: 'Go to Settings from your dashboard sidebar. You can update your profile picture, personal information, and password from there.',
        category: 'account',
        isPublished: true
      },
      {
        title: 'What security measures does Cush use?',
        content: 'Cush uses industry-standard encryption, secure authentication, and regular security audits to protect your data.',
        category: 'security',
        isPublished: true
      },
      {
        title: 'How do I contact support?',
        content: 'You can contact support through the Help & Support page, where you can create tickets, send feedback, or use live chat.',
        category: 'technical',
        isPublished: true
      }
    ];

    // Insert FAQ articles
    for (const article of faqArticles) {
      await client.query(`
        INSERT INTO faq_articles (title, content, category, is_published, views, helpful_count, not_helpful_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (title) DO NOTHING
      `, [article.title, article.content, article.category, article.isPublished, 0, 0, 0]);
    }

    console.log('Support data seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding support data:', error);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedSupportData();
}

module.exports = { seedSupportData };