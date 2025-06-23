import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Info, 
  Bell,
  CheckCircle,
  Target,
  TrendingUp,
  X
} from 'lucide-react';

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

export function SmartAlertsWidget() {
  const { data: alerts, isLoading } = useQuery<SmartAlert[]>({
    queryKey: ['/api/ai/smart-alerts'],
    refetchInterval: 60000, // Refresh every minute
  });

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'warning': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Smart Alerts
          </CardTitle>
          <CardDescription>AI-powered financial notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = alerts?.filter(alert => alert.severity === 'critical') || [];
  const warningAlerts = alerts?.filter(alert => alert.severity === 'warning') || [];
  const infoAlerts = alerts?.filter(alert => alert.severity === 'info') || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Smart Alerts
              {alerts && alerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>AI-powered financial notifications</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Critical Alerts First */}
            {criticalAlerts.map((alert) => (
              <Alert key={alert.id} className={`border-l-4 ${getAlertColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-semibold">
                        {alert.title}
                        {alert.actionRequired && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Action Required
                          </Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        <p className="mb-2">{alert.message}</p>
                        
                        {alert.suggestedActions.length > 0 && (
                          <div className="mb-2">
                            <p className="font-medium mb-1">Suggested Actions:</p>
                            <ul className="space-y-1">
                              {alert.suggestedActions.slice(0, 2).map((action, index) => (
                                <li key={index} className="flex items-start gap-1">
                                  <Target className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Categories: {alert.affectedCategories.slice(0, 2).join(', ')}</span>
                          <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Alert>
            ))}

            {/* Warning Alerts */}
            {warningAlerts.map((alert) => (
              <Alert key={alert.id} className={`border-l-4 ${getAlertColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-semibold">
                        {alert.title}
                      </AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        <p className="mb-1">{alert.message}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{alert.affectedCategories.slice(0, 2).join(', ')}</span>
                          <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Alert>
            ))}

            {/* Info Alerts */}
            {infoAlerts.slice(0, 2).map((alert) => (
              <Alert key={alert.id} className={`border-l-4 ${getAlertColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-semibold">
                        {alert.title}
                      </AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        <p>{alert.message}</p>
                      </AlertDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">All Clear!</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No alerts detected. Your financial health looks good.
            </p>
          </div>
        )}

        {alerts && alerts.length > 3 && (
          <div className="mt-3 pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All {alerts.length} Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}