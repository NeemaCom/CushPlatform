import { storage } from "./storage";

export async function seedFinancialData(userId: number) {
  try {
    // Create sample accounts
    const checkingAccount = await storage.createAccount({
      userId,
      name: "Primary Checking",
      type: "checking",
      balance: "2840.75",
      currency: "USD",
      isActive: true
    });

    const savingsAccount = await storage.createAccount({
      userId,
      name: "High-Yield Savings",
      type: "savings", 
      balance: "8650.20",
      currency: "USD",
      isActive: true
    });

    const investmentAccount = await storage.createAccount({
      userId,
      name: "Investment Portfolio",
      type: "investment",
      balance: "15230.45",
      currency: "USD", 
      isActive: true
    });

    // Create sample transactions for the last 3 months
    const transactions = [
      // Recent month (income)
      { description: "Salary Deposit", amount: "4200.00", type: "income", category: "Salary", daysAgo: 2 },
      { description: "Freelance Payment", amount: "850.00", type: "income", category: "Freelance", daysAgo: 5 },
      { description: "Investment Dividend", amount: "125.75", type: "income", category: "Investment", daysAgo: 7 },
      
      // Recent month (expenses)
      { description: "Rent Payment", amount: "-1200.00", type: "expense", category: "Housing", daysAgo: 1 },
      { description: "Grocery Store", amount: "-89.50", type: "expense", category: "Food", daysAgo: 2 },
      { description: "Gas Station", amount: "-45.30", type: "expense", category: "Transportation", daysAgo: 3 },
      { description: "Netflix Subscription", amount: "-15.99", type: "expense", category: "Entertainment", daysAgo: 4 },
      { description: "Coffee Shop", amount: "-12.75", type: "expense", category: "Food", daysAgo: 4 },
      { description: "Electric Bill", amount: "-78.25", type: "expense", category: "Utilities", daysAgo: 6 },
      { description: "Phone Bill", amount: "-65.00", type: "expense", category: "Utilities", daysAgo: 8 },
      { description: "Online Shopping", amount: "-156.80", type: "expense", category: "Shopping", daysAgo: 9 },
      { description: "Restaurant Dinner", amount: "-42.50", type: "expense", category: "Food", daysAgo: 10 },
      
      // Previous month
      { description: "Salary Deposit", amount: "4200.00", type: "income", category: "Salary", daysAgo: 32 },
      { description: "Side Project", amount: "650.00", type: "income", category: "Freelance", daysAgo: 35 },
      { description: "Rent Payment", amount: "-1200.00", type: "expense", category: "Housing", daysAgo: 31 },
      { description: "Car Insurance", amount: "-120.00", type: "expense", category: "Insurance", daysAgo: 33 },
      { description: "Grocery Store", amount: "-95.20", type: "expense", category: "Food", daysAgo: 34 },
      { description: "Gas Station", amount: "-52.40", type: "expense", category: "Transportation", daysAgo: 36 },
      { description: "Gym Membership", amount: "-35.00", type: "expense", category: "Health", daysAgo: 38 },
      { description: "Internet Bill", amount: "-55.00", type: "expense", category: "Utilities", daysAgo: 40 },
      
      // 2 months ago
      { description: "Salary Deposit", amount: "4200.00", type: "income", category: "Salary", daysAgo: 62 },
      { description: "Consulting Work", amount: "1200.00", type: "income", category: "Freelance", daysAgo: 65 },
      { description: "Rent Payment", amount: "-1200.00", type: "expense", category: "Housing", daysAgo: 61 },
      { description: "Medical Checkup", amount: "-150.00", type: "expense", category: "Health", daysAgo: 63 },
      { description: "Vacation Expenses", amount: "-450.75", type: "expense", category: "Travel", daysAgo: 67 },
      { description: "New Laptop", amount: "-899.99", type: "expense", category: "Electronics", daysAgo: 70 },
    ];

    // Insert transactions
    for (const transaction of transactions) {
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - transaction.daysAgo);
      
      await storage.createTransaction({
        userId,
        accountId: transaction.type === "income" ? checkingAccount.id : 
                  transaction.category === "Investment" ? investmentAccount.id : checkingAccount.id,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transactionDate
      });
    }

    // Create balance history entries
    const balanceEntries = [
      { totalBalance: "26721.40", daysAgo: 0 },
      { totalBalance: "26156.15", daysAgo: 7 },
      { totalBalance: "25840.30", daysAgo: 14 },
      { totalBalance: "24950.75", daysAgo: 21 },
      { totalBalance: "25200.20", daysAgo: 28 },
      { totalBalance: "24800.50", daysAgo: 35 },
      { totalBalance: "23950.25", daysAgo: 42 },
      { totalBalance: "24300.80", daysAgo: 49 },
      { totalBalance: "23750.40", daysAgo: 56 },
      { totalBalance: "24100.60", daysAgo: 63 },
      { totalBalance: "22800.90", daysAgo: 70 },
      { totalBalance: "23500.25", daysAgo: 77 },
      { totalBalance: "22950.75", daysAgo: 84 },
      { totalBalance: "23200.30", daysAgo: 91 }
    ];

    for (const entry of balanceEntries) {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - entry.daysAgo);
      
      await storage.createBalanceHistory(userId, entry.totalBalance);
    }

    console.log(`Financial data seeded successfully for user ${userId}`);
    return {
      accounts: [checkingAccount, savingsAccount, investmentAccount],
      transactionCount: transactions.length,
      balanceHistoryCount: balanceEntries.length
    };

  } catch (error) {
    console.error('Error seeding financial data:', error);
    throw error;
  }
}

export async function seedUserFinancialData(userId: number) {
  // Check if user already has data
  const existingAccounts = await storage.getAccountsByUserId(userId);
  if (existingAccounts.length > 0) {
    console.log(`User ${userId} already has financial data, skipping seed`);
    return existingAccounts;
  }

  return await seedFinancialData(userId);
}