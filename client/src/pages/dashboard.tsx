import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/sidebar";
import { BalanceChart } from "@/components/balance-chart";
import { TransactionList } from "@/components/transaction-list";
import { ImisiChatHead } from "@/components/imisi-chat";
import { Bell, Wallet, TrendingUp, TrendingDown, PiggyBank, Crown, Sparkles } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

interface DashboardData {
  user: {
    name: string;
    email: string;
    initials: string;
  };
  accounts: {
    current: number;
    savings: number;
    investment: number;
    total: number;
  };
  monthlyStats: {
    income: number;
    expenses: number;
    savings: number;
    incomeChange: number;
    expensesChange: number;
    savingsChange: number;
  };
  spendingCategories: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
}

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ["/api/subscription-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Redirect to login if not authenticated
  if (!isLoading && !dashboardData) {
    navigate("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 ml-64">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="border-blue-100">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-24 mb-4" />
                      <Skeleton className="h-4 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.monthlyStats || {
    income: 0,
    expenses: 0,
    savings: 0,
    incomeChange: 0,
    expensesChange: 0,
    savingsChange: 0,
  };

  const accounts = dashboardData?.accounts || {
    current: 0,
    savings: 0,
    investment: 0,
    total: 0,
  };

  const categories = dashboardData?.spendingCategories || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      <div className="flex">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 ml-64">
          {/* Top Bar */}
          <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {dashboardData?.user.name || 'User'}!</p>
              </div>
              <div className="flex items-center space-x-4">
                {subscriptionStatus && !subscriptionStatus.hasActiveSubscription && (
                  <Button 
                    onClick={() => navigate("/subscribe")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                )}
                {subscriptionStatus && subscriptionStatus.hasActiveSubscription && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5 text-gray-400" />
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {dashboardData?.user.initials || 'U'}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {dashboardData?.user.name || 'User'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        £{accounts.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-cush-blue-100 p-3 rounded-full">
                      <Wallet className="h-5 w-5 text-cush-blue-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className="text-green-600 font-medium">+2.1%</span>
                    <span className="text-gray-600 ml-2">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Income</p>
                      <p className="text-2xl font-bold text-gray-900">
                        £{stats.income.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className={`font-medium ${stats.incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.incomeChange >= 0 ? '+' : ''}{stats.incomeChange.toFixed(1)}%
                    </span>
                    <span className="text-gray-600 ml-2">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Expenses</p>
                      <p className="text-2xl font-bold text-gray-900">
                        £{stats.expenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className={`font-medium ${stats.expensesChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.expensesChange >= 0 ? '+' : ''}{stats.expensesChange.toFixed(1)}%
                    </span>
                    <span className="text-gray-600 ml-2">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Savings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        £{stats.savings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-full">
                      <PiggyBank className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <span className={`font-medium ${stats.savingsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.savingsChange >= 0 ? '+' : ''}{stats.savingsChange.toFixed(1)}%
                    </span>
                    <span className="text-gray-600 ml-2">from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BalanceChart />
              <TransactionList />
            </div>

            {/* Additional Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Spending Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.length > 0 ? (
                      categories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-gray-600">{category.name}</span>
                          </div>
                          <span className="font-medium">
                            £{category.amount.toLocaleString('en-GB')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No spending data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <div className="bg-cush-blue-100 p-2 rounded-full mr-3">
                        <span className="text-cush-blue-600 text-sm">+</span>
                      </div>
                      Add Transaction
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <span className="text-green-600 text-sm">→</span>
                      </div>
                      Transfer Money
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <div className="bg-yellow-100 p-2 rounded-full mr-3">
                        <span className="text-yellow-600 text-sm">📄</span>
                      </div>
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Account</span>
                      <span className="font-medium">
                        £{accounts.current.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Savings Account</span>
                      <span className="font-medium">
                        £{accounts.savings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Investment Account</span>
                      <span className="font-medium">
                        £{accounts.investment.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-gray-900">Total Assets</span>
                        <span className="text-cush-blue-600">
                          £{accounts.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Imisi 2.0 AI Assistant */}
      <ImisiChatHead />
    </div>
  );
}
