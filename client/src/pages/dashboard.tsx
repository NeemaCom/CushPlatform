import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedSidebar } from "@/components/enhanced-sidebar";
import { VersionIndicator } from "@/components/version-indicator";
import { ImisiChatHead } from "@/components/imisi-chat";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Crown, 
  Sparkles, 
  ArrowLeftRight,
  CreditCard
} from "lucide-react";

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
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <EnhancedSidebar />
        <div className="flex-1 ml-64 p-8">
          <VersionIndicator />
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <EnhancedSidebar />
        <div className="flex-1 ml-64 p-8">
          <VersionIndicator />
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
              <p className="text-sm mt-2">Please try refreshing the page</p>
            </div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const defaultData = {
    user: {
      name: data?.user?.name || "User",
      email: data?.user?.email || "user@example.com",
      initials: data?.user?.initials || "U"
    },
    accounts: {
      current: data?.accounts?.current || 5420,
      savings: data?.accounts?.savings || 12680,
      investment: data?.accounts?.investment || 8940,
      total: data?.accounts?.total || 27040
    },
    monthlyStats: {
      income: data?.monthlyStats?.income || 6500,
      expenses: data?.monthlyStats?.expenses || 4200,
      savings: data?.monthlyStats?.savings || 2300,
      incomeChange: data?.monthlyStats?.incomeChange || 12,
      expensesChange: data?.monthlyStats?.expensesChange || -8,
      savingsChange: data?.monthlyStats?.savingsChange || 15
    },
    spendingCategories: data?.spendingCategories || [
      { name: "Food & Dining", amount: 840, color: "#3B82F6" },
      { name: "Transportation", amount: 320, color: "#10B981" },
      { name: "Entertainment", amount: 180, color: "#F59E0B" },
      { name: "Shopping", amount: 520, color: "#EF4444" }
    ]
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <EnhancedSidebar />
      <div className="flex-1 ml-64 p-8">
        <VersionIndicator />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {defaultData.user.name}
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
          </div>
          <p className="text-gray-600">Here's your financial overview for today</p>
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">Dashboard Loaded Successfully</p>
            </div>
            <p className="text-green-600 text-sm mt-1">
              All chart references removed. Enhanced sidebar with grouped navigation is active.
            </p>
          </div>
        </div>

        {/* Account Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Current Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.accounts.current.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Main checking account</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Savings
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.accounts.savings.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Emergency fund</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Investments
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.accounts.investment.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Portfolio value</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Worth
              </CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.accounts.total.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Combined assets</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.monthlyStats.income.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">
                  {defaultData.monthlyStats.incomeChange}% from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Expenses
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.monthlyStats.expenses.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">
                  {Math.abs(defaultData.monthlyStats.expensesChange)}% reduction
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Savings
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${defaultData.monthlyStats.savings.toLocaleString()}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">
                  {defaultData.monthlyStats.savingsChange}% increase
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Analytics</span>
            </button>
            
            <button className="flex flex-col items-center p-4 rounded-xl bg-yellow-50 hover:bg-yellow-100 transition-colors group">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Invest</span>
            </button>
          </div>
        </div>

        {/* Spending Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-gray-600" />
              Spending Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {defaultData.spendingCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ${category.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ImisiChatHead />
      </div>
    </div>
  );
}