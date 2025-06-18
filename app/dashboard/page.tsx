"use client"

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceChart } from "@/components/balance-chart";
import { TransactionList } from "@/components/transaction-list";
import { FinancialGoalsWidget } from "@/components/FinancialGoalsWidget";
import { AchievementWidget } from "@/components/AchievementWidget";
import { ImisiChat } from "@/components/imisi-chat";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, DollarSign, TrendingUp, Target, Award } from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();

  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/accounts"],
    enabled: !!user,
  });

  const { data: transactionData, isLoading: transactionLoading } = useQuery({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics"],
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalBalance = accountData?.reduce((sum: number, account: any) => sum + account.balance, 0) || 0;
  const monthlyIncome = analyticsData?.monthlyIncome || 0;
  const monthlyExpenses = analyticsData?.monthlyExpenses || 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.username}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here's your financial overview for today.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${monthlyIncome.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {savingsRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Of monthly income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.achievementCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Badges earned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Overview</CardTitle>
                    <CardDescription>
                      Your account balance trend over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {accountLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <BalanceChart data={accountData} />
                    )}
                  </CardContent>
                </Card>

                <FinancialGoalsWidget />
              </TabsContent>

              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your latest financial activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <TransactionList transactions={transactionData?.slice(0, 10)} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="space-y-6">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Financial Insights</CardTitle>
                          <CardDescription>
                            AI-powered analysis of your spending patterns
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {analyticsData?.insights?.map((insight: any, index: number) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h4 className="font-medium mb-2">{insight.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {insight.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <AchievementWidget />
            <ImisiChat />
          </div>
        </div>
      </main>
    </div>
  );
}