import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Target, Calendar, DollarSign, TrendingUp, Edit, Trash2, CheckCircle } from 'lucide-react';
import { ProgressRing, MultiProgressRing, AnimatedCounter } from './ProgressRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFinancialGoalSchema, type CreateFinancialGoal, type FinancialGoal } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const goalTypeColors = {
  savings: '#10b981',
  debt_payoff: '#f59e0b',
  investment: '#8b5cf6',
  emergency_fund: '#ef4444',
  vacation: '#06b6d4',
  home: '#84cc16',
  car: '#6366f1',
  education: '#ec4899',
  retirement: '#f97316'
};

const goalTypeIcons = {
  savings: Target,
  debt_payoff: TrendingUp,
  investment: DollarSign,
  emergency_fund: Target,
  vacation: Calendar,
  home: Target,
  car: Target,
  education: Target,
  retirement: Target
};

interface FinancialGoalsWidgetProps {
  className?: string;
}

export function FinancialGoalsWidget({ className = "" }: FinancialGoalsWidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['/api/financial-goals'],
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: CreateFinancialGoal) => apiRequest('/api/financial-goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/financial-goals'] });
      setIsDialogOpen(false);
      toast({
        title: "Goal Created",
        description: "Your financial goal has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateFinancialGoal>({
    resolver: zodResolver(createFinancialGoalSchema),
    defaultValues: {
      goalType: 'savings',
      priority: 'medium',
      currency: 'USD',
      autoTransferEnabled: false,
      reminderEnabled: true,
      reminderFrequency: 'weekly',
    },
  });

  const onSubmit = (data: CreateFinancialGoal) => {
    createGoalMutation.mutate(data);
  };

  const calculateProgress = (goal: FinancialGoal) => {
    const current = parseFloat(goal.currentAmount || '0');
    const target = parseFloat(goal.targetAmount);
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const formatCurrency = (amount: string | number, currency = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(num);
  };

  const getDaysUntilTarget = (targetDate: string | null) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Financial Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goals.filter((goal: FinancialGoal) => goal.isActive && !goal.isCompleted);
  const completedGoals = goals.filter((goal: FinancialGoal) => goal.isCompleted);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">Financial Goals</CardTitle>
          <CardDescription>
            Track your progress towards financial milestones
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Financial Goal</DialogTitle>
              <DialogDescription>
                Set a new financial target to track your progress.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Emergency Fund" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="goalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select goal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                            <SelectItem value="vacation">Vacation</SelectItem>
                            <SelectItem value="home">Home Purchase</SelectItem>
                            <SelectItem value="car">Car Purchase</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="retirement">Retirement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="10000" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your goal..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyContribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Contribution</FormLabel>
                        <FormControl>
                          <Input placeholder="500" type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional: Amount you plan to save monthly
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <FormField
                    control={form.control}
                    name="reminderEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Reminders</FormLabel>
                          <FormDescription>
                            Get periodic reminders about this goal
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGoalMutation.isPending}>
                    {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {activeGoals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Goals</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first financial goal to track your progress.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Goals Overview */}
            {activeGoals.length > 1 && (
              <div className="flex justify-center">
                <MultiProgressRing
                  size={160}
                  rings={activeGoals.slice(0, 3).map((goal: FinancialGoal) => ({
                    progress: calculateProgress(goal),
                    color: goalTypeColors[goal.goalType as keyof typeof goalTypeColors] || '#10b981',
                    label: goal.title
                  }))}
                  className="mb-4"
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      {activeGoals.length} Goals
                    </div>
                    <div className="text-lg font-bold">
                      {Math.round(activeGoals.reduce((acc, goal) => acc + calculateProgress(goal), 0) / activeGoals.length)}%
                    </div>
                  </div>
                </MultiProgressRing>
              </div>
            )}

            {/* Individual Goal Cards */}
            <div className="grid gap-4">
              {activeGoals.map((goal: FinancialGoal) => {
                const progress = calculateProgress(goal);
                const daysLeft = getDaysUntilTarget(goal.targetDate);
                const IconComponent = goalTypeIcons[goal.goalType as keyof typeof goalTypeIcons] || Target;
                
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ 
                                  backgroundColor: goalTypeColors[goal.goalType as keyof typeof goalTypeColors] + '20',
                                  color: goalTypeColors[goal.goalType as keyof typeof goalTypeColors]
                                }}
                              >
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{goal.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getPriorityColor(goal.priority)}>
                                    {goal.priority}
                                  </Badge>
                                  {daysLeft !== null && (
                                    <span className="text-sm text-muted-foreground">
                                      {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className="text-2xl font-bold">
                                  <AnimatedCounter
                                    value={parseFloat(goal.currentAmount || '0')}
                                    prefix="$"
                                    decimals={0}
                                  />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  of {formatCurrency(goal.targetAmount)}
                                </div>
                              </div>
                              <ProgressRing
                                progress={progress}
                                size={80}
                                color={goalTypeColors[goal.goalType as keyof typeof goalTypeColors] || '#10b981'}
                                strokeWidth={6}
                              />
                            </div>

                            {goal.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {goal.description}
                              </p>
                            )}

                            {goal.monthlyContribution && (
                              <div className="text-sm text-muted-foreground">
                                Monthly contribution: {formatCurrency(goal.monthlyContribution)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Completed Goals ({completedGoals.length})
                </h3>
                <div className="grid gap-3">
                  {completedGoals.map((goal: FinancialGoal) => (
                    <Card key={goal.id} className="opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                              <div className="font-medium">{goal.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Completed {goal.completedAt && new Date(goal.completedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(goal.targetAmount)}</div>
                            <div className="text-sm text-green-600">100% Complete</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}