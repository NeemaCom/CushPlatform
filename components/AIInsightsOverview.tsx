import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface QuickInsight {
  type: 'forecast' | 'alert' | 'opportunity' | 'achievement';
  title: string;
  value: string;
  trend: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export function AIInsightsOverview() {
  const { data: insights } = useQuery<any[]>({
    queryKey: ['/api/ai/predictive-insights'],
    refetchInterval: 300000
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['/api/ai/smart-alerts'],
    refetchInterval: 60000
  });

  const { data: forecast } = useQuery<any>({
    queryKey: ['/api/ai/financial-forecast'],
    refetchInterval: 600000
  });

  const quickInsights: QuickInsight[] = React.useMemo(() => {
    const items: QuickInsight[] = [];

    // Add forecast insight
    if (forecast?.balanceForecast?.[0]) {
      const nextMonth = forecast.balanceForecast[0];
      items.push({
        type: 'forecast',
        title: 'Next Month Balance',
        value: `$${nextMonth.predicted.toLocaleString()}`,
        trend: nextMonth.predicted > 25000 ? 'positive' : 'neutral',
        confidence: nextMonth.confidence
      });
    }

    // Add critical alerts count
    if (alerts) {
      const criticalCount = alerts.filter(a => a.severity === 'critical').length;
      if (criticalCount > 0) {
        items.push({
          type: 'alert',
          title: 'Critical Alerts',
          value: criticalCount.toString(),
          trend: 'negative',
          confidence: 100
        });
      }
    }

    // Add savings opportunity
    if (forecast?.savingsProjection) {
      items.push({
        type: 'opportunity',
        title: '6-Month Savings',
        value: `$${forecast.savingsProjection.sixMonths.toLocaleString()}`,
        trend: 'positive',
        confidence: forecast.savingsProjection.confidence
      });
    }

    // Add high-confidence insight
    const highConfidenceInsight = insights?.find(i => i.confidence > 80);
    if (highConfidenceInsight) {
      items.push({
        type: 'achievement',
        title: 'AI Insight',
        value: `${highConfidenceInsight.confidence}% confident`,
        trend: highConfidenceInsight.impact === 'high' ? 'positive' : 'neutral',
        confidence: highConfidenceInsight.confidence
      });
    }

    return items.slice(0, 4);
  }, [insights, alerts, forecast]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'forecast': return <TrendingUp className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Target className="h-4 w-4" />;
      case 'achievement': return <Sparkles className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string, trend: string) => {
    if (type === 'alert') return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    if (trend === 'positive') return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (trend === 'negative') return 'text-red-600 bg-red-100 dark:bg-red-900/20';
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5" />
              AI Insights Overview
            </CardTitle>
            <CardDescription>Quick AI-powered financial insights</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Live AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {quickInsights.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50"
              >
                <div className={`p-2 rounded-full ${getInsightColor(insight.type, insight.trend)}`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {insight.title}
                  </p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {insight.value}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI is analyzing your financial data...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}