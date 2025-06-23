import bcrypt from 'bcrypt';
import { storage } from './storage';

export async function createTestUsers() {
  try {
    // Test user credentials
    const testUsers = [
      {
        username: 'demo_user',
        email: 'demo@cush.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User',
        role: 'customer'
      },
      {
        username: 'admin_user',
        email: 'admin@cush.com', 
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        username: 'test_customer',
        email: 'customer@cush.com',
        password: 'customer123',
        firstName: 'Test',
        lastName: 'Customer',
        role: 'customer'
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        phoneNumber: '+1234567890',
        nationality: 'US',
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: true,
        isEmailVerified: true,
        isPhoneVerified: true
      });

      console.log(`Created test user: ${userData.email}`);
      createdUsers.push(user);
    }

    return createdUsers;
  } catch (error) {
    console.error('Error creating test users:', error);
    throw error;
  }
}