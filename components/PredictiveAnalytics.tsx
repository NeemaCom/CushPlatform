import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Bell,
  Calendar,
  DollarSign
} from 'lucide-react';

interface PredictiveInsight {
  id: string;
  type: 'spending_forecast' | 'income_prediction' | 'savings_opportunity' | 'risk_alert' | 'goal_achievement';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  predictedValue?: number;
  timeframe: string;
  recommendations: string[];
  dataPoints: Array<{ date: string; value: number; }>;
  createdAt: string;
}

interface SmartAlert {
  id: string;
  type: 'budget_overrun' | 'unusual_spending' | 'income_drop' | 'goal_at_risk' | 'opportunity';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  affectedCategories: string[];
  threshold?: number;
  actualValue?: number;
  createdAt: string;
  expiresAt?: string;
}

interface FinancialPrediction {
  balanceForecast: Array<{ date: string; predicted: number; confidence: number; }>;
  spendingTrends: Array<{ category: string; trend: 'increasing' | 'decreasing' | 'stable'; change: number; }>;
  savingsProjection: { sixMonths: number; oneYear: number; confidence: number; };
  riskFactors: Array<{ factor: string; riskLevel: number; impact: string; }>;
}

export function PredictiveAnalytics() {
  const [activeTab, setActiveTab] = useState<'insights' | 'alerts' | 'forecast'>('insights');

  const { data: insights, isLoading: insightsLoading } = useQuery<PredictiveInsight[]>({
    queryKey: ['/api/ai/predictive-insights'],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<SmartAlert[]>({
    queryKey: ['/api/ai/smart-alerts'],
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery<FinancialPrediction>({
    queryKey: ['/api/ai/financial-forecast'],
    refetchInterval: 600000 // Refresh every 10 minutes
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'spending_forecast': return <TrendingUp className="h-5 w-5" />;
      case 'income_prediction': return <DollarSign className="h-5 w-5" />;
      case 'savings_opportunity': return <Target className="h-5 w-5" />;
      case 'risk_alert': return <AlertTriangle className="h-5 w-5" />;
      case 'goal_achievement': return <CheckCircle className="h-5 w-5" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'info': return <Info className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const InsightsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
          <p className="text-gray-600 dark:text-gray-400">Predictive analytics based on your financial patterns</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Brain className="h-3 w-3" />
          AI Generated
        </Badge>
      </div>

      {insightsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights?.map((insight) => (
            <Card key={insight.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getInsightColor(insight.impact)}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{insight.timeframe}</span>
                        <Badge variant="secondary">{insight.confidence}% confidence</Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                    {insight.impact} impact
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                
                {insight.predictedValue && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Predicted Value</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${insight.predictedValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recommendations:</h4>
                  <ul className="space-y-1">
                    {insight.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Category: {insight.category}</span>
                  <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const AlertsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Alerts</h3>
          <p className="text-gray-600 dark:text-gray-400">Real-time notifications about your financial health</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Live Monitoring
        </Badge>
      </div>

      {alertsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Alert key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
              alert.severity === 'warning' ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10' :
              'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
            }`}>
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.severity)}
                <div className="flex-1">
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.title}</span>
                    <div className="flex items-center gap-2">
                      {alert.actionRequired && (
                        <Badge variant="destructive" className="text-xs">Action Required</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                    </div>
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p>{alert.message}</p>
                    
                    {alert.threshold && alert.actualValue && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                        <div className="flex justify-between text-sm">
                          <span>Threshold: ${alert.threshold.toLocaleString()}</span>
                          <span className="font-semibold">Actual: ${alert.actualValue.toLocaleString()}</span>
                        </div>
                        <Progress 
                          value={Math.min((alert.actualValue / alert.threshold) * 100, 100)} 
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    {alert.suggestedActions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Suggested Actions:</h4>
                        <ul className="space-y-1">
                          {alert.suggestedActions.map((action, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <Target className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Affects: {alert.affectedCategories.join(', ')}</span>
                      <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No alerts detected. Your financial health is looking good.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const ForecastTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Forecast</h3>
          <p className="text-gray-600 dark:text-gray-400">Predictions for your financial future</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <LineChart className="h-3 w-3" />
          6-Month Outlook
        </Badge>
      </div>

      {forecastLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : forecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Balance Forecast
              </CardTitle>
              <CardDescription>Predicted account balance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.balanceForecast.slice(0, 3).map((point, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="font-medium">{new Date(point.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{point.confidence}% confidence</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${point.predicted.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Spending Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Spending Trends
              </CardTitle>
              <CardDescription>Category-wise spending predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.spendingTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend.trend)}
                      <span className="font-medium">{trend.category}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${
                        trend.trend === 'increasing' ? 'text-red-600' : 
                        trend.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Savings Projection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Savings Projection
              </CardTitle>
              <CardDescription>Expected savings growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">6 Months</p>
                  <p className="text-2xl font-bold text-green-600">${forecast.savingsProjection.sixMonths.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">1 Year</p>
                  <p className="text-2xl font-bold text-blue-600">${forecast.savingsProjection.oneYear.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline">{forecast.savingsProjection.confidence}% confidence</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
              <CardDescription>Potential financial risks identified</CardDescription>
            </CardHeader>
            <CardContent>
              {forecast.riskFactors.length > 0 ? (
                <div className="space-y-3">
                  {forecast.riskFactors.map((risk, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{risk.factor}</span>
                        <Badge variant={risk.riskLevel > 70 ? 'destructive' : risk.riskLevel > 40 ? 'default' : 'secondary'}>
                          {risk.riskLevel}% risk
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{risk.impact}</p>
                      <Progress value={risk.riskLevel} className="mt-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No significant risks detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Predictive Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced insights powered by artificial intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Powered by Gemini AI
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'insights' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('insights')}
          className="rounded-md"
        >
          <Brain className="h-4 w-4 mr-2" />
          Insights
        </Button>
        <Button
          variant={activeTab === 'alerts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('alerts')}
          className="rounded-md"
        >
          <Bell className="h-4 w-4 mr-2" />
          Alerts
          {alerts && alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs px-1">
              {alerts.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'forecast' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('forecast')}
          className="rounded-md"
        >
          <LineChart className="h-4 w-4 mr-2" />
          Forecast
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'insights' && <InsightsTab />}
      {activeTab === 'alerts' && <AlertsTab />}
      {activeTab === 'forecast' && <ForecastTab />}
    </div>
  );
}