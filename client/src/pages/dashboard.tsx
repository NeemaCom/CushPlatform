import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedSidebar } from "@/components/enhanced-sidebar";
import { VersionIndicator } from "@/components/version-indicator";
import { BalanceChart } from "@/components/balance-chart";
import { TransactionList } from "@/components/transaction-list";
import { ImisiChatHead } from "@/components/imisi-chat";
import { FinancialGoalsWidget } from "@/components/FinancialGoalsWidget";
import { Bell, Wallet, TrendingUp, TrendingDown, PiggyBank, Crown, Sparkles, ArrowLeftRight } from "lucide-react";
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
          <EnhancedSidebar />
          <div className="flex-1 lg:ml-64">
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
        <EnhancedSidebar />
        
        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          {/* Top Bar */}
          <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-blue-100 px-4 lg:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl lg:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">Dashboard</h1>
                  <VersionIndicator />
                </div>
                <p className="text-gray-600 text-sm lg:text-base truncate">Welcome back, {dashboardData?.user.name || 'User'}!</p>
              </div>
              <div className="flex items-center space-x-2 lg:space-x-4">
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Bell className="h-5 w-5 text-gray-400" />
                </Button>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {dashboardData?.user.initials || 'U'}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 hidden sm:block">
                    {dashboardData?.user.name || 'User'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-4 lg:p-6 space-y-6">
            {/* Welcome Section with Onboarding Progress */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                <div className="mb-4 lg:mb-0">
                  <h2 className="text-2xl font-bold mb-2">Welcome to Cush!</h2>
                  <p className="text-blue-100">Your global immigration financial companion</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 min-w-0 lg:min-w-[200px]">
                  <div className="text-sm text-blue-100 mb-1">Profile Setup</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 w-3/4"></div>
                    </div>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

            {/* Financial Goals Widget */}
            <div className="mt-6">
              <FinancialGoalsWidget />
            </div>

            {/* Quick Actions Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button className="flex flex-col items-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ArrowLeftRight className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Transfer</span>
                </button>
                
                <button className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Save</span>
                </button>
                
                <button className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Analytics</span>
                </button>
                
                <button className="flex flex-col items-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors group">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">AI Insights</span>
                </button>
              </div>
            </div>

            {/* Additional Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Spending Categories */}
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-gray-900">Spending Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.length > 0 ? (
                      categories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-gray-700 font-medium">{category.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">
                            £{category.amount.toLocaleString('en-GB')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No spending data yet</p>
                        <p className="text-sm text-gray-400">Start tracking your expenses</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Immigration Services */}
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-gray-900">Immigration Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <button className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-700">Find Jobs</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
                      </div>
                    </button>
                    
                    <button className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-700">Housing</span>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">New</span>
                      </div>
                    </button>
                    
                    <button className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MessageCircle className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-gray-700">AI Assistant</span>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">AI</span>
                      </div>
                    </button>
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
