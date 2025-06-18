// Demo data configuration for frontend-only deployment
export const isDemoMode = import.meta.env.PROD && !import.meta.env.VITE_API_URL;

export const demoUser = {
  id: 1,
  username: "demo_user",
  email: "demo@we-cush.com",
  initials: "DU",
  role: "customer" as const,
  hasActiveSubscription: false
};

export const demoDashboardData = {
  user: demoUser,
  currentBalance: 5420.32,
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  hasActiveSubscription: false,
  recentTransactions: [
    {
      id: 1,
      amount: 250.00,
      description: "Grocery Shopping",
      date: new Date('2024-12-15'),
      type: "expense" as const,
      category: "Food & Dining"
    },
    {
      id: 2,
      amount: 3200.00,
      description: "Salary Deposit",
      date: new Date('2024-12-14'),
      type: "income" as const,
      category: "Salary"
    },
    {
      id: 3,
      amount: 89.99,
      description: "Internet Bill",
      date: new Date('2024-12-13'),
      type: "expense" as const,
      category: "Utilities"
    }
  ],
  balanceHistory: [
    { date: new Date('2024-11-01'), balance: 4800 },
    { date: new Date('2024-11-15'), balance: 5200 },
    { date: new Date('2024-12-01'), balance: 5100 },
    { date: new Date('2024-12-15'), balance: 5420.32 }
  ]
};

export function getDemoApiResponse(endpoint: string) {
  if (endpoint === '/api/auth/me') {
    return demoUser;
  }
  if (endpoint === '/api/dashboard') {
    return demoDashboardData;
  }
  if (endpoint === '/api/balance-history') {
    return demoDashboardData.balanceHistory;
  }
  if (endpoint === '/api/transactions/recent') {
    return demoDashboardData.recentTransactions;
  }
  
  // Return empty responses for other endpoints
  return null;
}