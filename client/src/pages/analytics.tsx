import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/sidebar";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface AnalyticsData {
  spending: {
    total: number;
    categories: Array<{
      name: string;
      amount: number;
      percentage: number;
      color: string;
    }>;
    trend: number;
  };
  income: {
    total: number;
    monthly: Array<{
      month: string;
      amount: number;
    }>;
    trend: number;
  };
  savings: {
    total: number;
    goal: number;
    rate: number;
    trend: number;
  };
  budgets: Array<{
    category: string;
    spent: number;
    budget: number;
    percentage: number;
    status: 'on-track' | 'warning' | 'over-budget';
  }>;
  transactions: {
    monthly: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
    }>;
  };
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("6months");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", { timeRange, category: selectedCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("timeRange", timeRange);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      
      const response = await fetch(`/api/analytics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch analytics data");
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getBudgetStatus = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'over-budget':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const spendingColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Financial Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Track your spending patterns, income trends, and financial goals
              </p>
            </div>
            <div className="flex gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics?.spending?.total || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(analytics?.spending?.trend || 0)}
                  <span className={analytics?.spending?.trend > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatPercentage(analytics?.spending?.trend || 0)} from last period
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics?.income?.total || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(analytics?.income?.trend || 0)}
                  <span className={analytics?.income?.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(analytics?.income?.trend || 0)} from last period
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics?.savings?.total || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-green-600">
                    {analytics?.savings?.rate || 0}% savings rate
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings Goal</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(((analytics?.savings?.total || 0) / (analytics?.savings?.goal || 1)) * 100)}%
                </div>
                <Progress 
                  value={((analytics?.savings?.total || 0) / (analytics?.savings?.goal || 1)) * 100} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income vs Expenses</CardTitle>
                    <CardDescription>Monthly cash flow overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics?.transactions?.monthly || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Spending by Category</CardTitle>
                    <CardDescription>Current period breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics?.spending?.categories || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                        >
                          {(analytics?.spending?.categories || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={spendingColors[index % spendingColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="spending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spending Breakdown</CardTitle>
                  <CardDescription>Detailed category analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(analytics?.spending?.categories || []).map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: spendingColors[index % spendingColors.length] }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(category.amount)}</div>
                          <div className="text-sm text-gray-500">{category.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income Trend</CardTitle>
                  <CardDescription>Monthly income over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analytics?.income?.monthly || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="budgets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Performance</CardTitle>
                  <CardDescription>Track spending against your budgets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(analytics?.budgets || []).map((budget) => (
                      <div key={budget.category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="font-medium capitalize">{budget.category}</span>
                            <Badge className={getBudgetStatus(budget.status)}>
                              {budget.status.replace('-', ' ')}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {budget.percentage}% used
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={budget.percentage} 
                          className={`h-2 ${budget.status === 'over-budget' ? 'bg-red-100' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}