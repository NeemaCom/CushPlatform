import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, 
  Target, PiggyBank, CreditCard, DollarSign 
} from "lucide-react";

interface FinancialInsight {
  id: string;
  type: 'spending_spike' | 'recurring_expense' | 'income_drop' | 'savings_opportunity' | 'budget_overrun';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  amount: number;
  frequency: string;
  suggestions: string[];
  detectedAt: string;
}

interface SpendingPattern {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  monthlyAverage: number;
  prediction: string;
}

interface FinancialInsightsData {
  insights: FinancialInsight[];
  spendingPatterns: SpendingPattern[];
  financialHealthScore: {
    score: number;
    factors: string[];
    recommendations: string[];
  };
}

export function FinancialInsightsWidget() {
  const { data: insightsData, isLoading } = useQuery<FinancialInsightsData>({
    queryKey: ['/api/financial-insights'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = insightsData || {
    insights: [],
    spendingPatterns: [],
    financialHealthScore: { score: 0, factors: [], recommendations: [] }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'spending_spike': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'income_drop': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'savings_opportunity': return <PiggyBank className="h-4 w-4 text-green-500" />;
      case 'budget_overrun': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Financial Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getHealthScoreColor(data.financialHealthScore.score)}`}>
              {data.financialHealthScore.score}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    data.financialHealthScore.score >= 80 ? 'bg-green-500' :
                    data.financialHealthScore.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.financialHealthScore.score}%` }}
                />
              </div>
            </div>
          </div>
          
          {data.financialHealthScore.factors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Key Factors</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.financialHealthScore.factors.map((factor, index) => (
                  <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Powered Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Financial Insights
            </CardTitle>
            <Badge variant="outline">
              {data.insights.length} insights
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.insights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No insights available yet. Check back after more transaction data is collected.</p>
              </div>
            ) : (
              data.insights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <Badge variant={getInsightColor(insight.impact)}>
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      
                      {insight.amount > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Amount: <strong>{formatCurrency(insight.amount)}</strong></span>
                          <span className="text-gray-600">Frequency: <strong>{insight.frequency}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {insight.suggestions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 mb-2">Suggested Actions:</h5>
                      <ul className="space-y-1">
                        {insight.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spending Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Spending Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.spendingPatterns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Spending patterns will appear here as transaction data accumulates.</p>
              </div>
            ) : (
              data.spendingPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${
                      pattern.trend === 'increasing' ? 'bg-red-500' :
                      pattern.trend === 'decreasing' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{pattern.category}</p>
                      <p className="text-sm text-gray-600">{pattern.prediction}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {pattern.trend === 'increasing' ? 
                        <TrendingUp className="h-4 w-4 text-red-500" /> :
                        pattern.trend === 'decreasing' ?
                        <TrendingDown className="h-4 w-4 text-green-500" /> :
                        <div className="h-4 w-4" />
                      }
                      <span className={`text-sm font-medium ${
                        pattern.trend === 'increasing' ? 'text-red-600' :
                        pattern.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {pattern.changePercent > 0 ? '+' : ''}{pattern.changePercent}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{formatCurrency(pattern.monthlyAverage)}/mo</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.financialHealthScore.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.financialHealthScore.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}