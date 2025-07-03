import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  Target,
  Sparkles,
  BarChart3,
  Heart,
  RefreshCw
} from 'lucide-react';

interface MoodAnalysis {
  moodScore: number;
  moodLabel: string;
  moodColor: string;
  mainFactors: string[];
  motivationTips: string[];
  actionableSteps: string[];
  celebrationPoints: string[];
  warningSignals: string[];
}

export function FinancialMoodMeter() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data: moodData, isLoading, error, refetch } = useQuery<MoodAnalysis>({
    queryKey: ['/api/financial-mood', refreshKey],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😟';
    return '😰';
  };

  const getMoodGradient = (color: string) => {
    switch (color.toLowerCase()) {
      case '#10b981': // green
        return 'from-green-400 to-green-600';
      case '#f59e0b': // yellow
        return 'from-yellow-400 to-yellow-600';
      case '#ef4444': // red
        return 'from-red-400 to-red-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Financial Mood Meter
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your financial wellness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">Analyzing your financial mood...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Financial Mood Meter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">Unable to analyze your financial mood at the moment.</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!moodData) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Financial Mood Meter
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your financial wellness
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mood Score Display */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getMoodGradient(moodData.moodColor)} shadow-lg mb-4`}>
            <div className="text-3xl font-bold text-white">
              {getMoodEmoji(moodData.moodScore)}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold" style={{ color: moodData.moodColor }}>
              {moodData.moodLabel}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Score: {moodData.moodScore}/10
              </span>
            </div>
            <Progress value={moodData.moodScore * 10} className="w-32 mx-auto" />
          </div>
        </div>

        <Separator />

        {/* Main Factors */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Key Factors
          </h4>
          <div className="space-y-2">
            {moodData.mainFactors.map((factor, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Celebration Points */}
        {moodData.celebrationPoints.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              Celebrate Your Progress
            </h4>
            <div className="space-y-2">
              {moodData.celebrationPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning Signals */}
        {moodData.warningSignals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Areas for Attention
            </h4>
            <div className="space-y-2">
              {moodData.warningSignals.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivation Tips */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            Motivation Boost
          </h4>
          <div className="space-y-2">
            {moodData.motivationTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-pink-50 dark:bg-pink-950 rounded-lg">
                <Heart className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 italic">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            Action Steps
          </h4>
          <div className="space-y-2">
            {moodData.actionableSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Badge */}
        <div className="flex justify-center pt-4">
          <Badge 
            variant="outline" 
            className="px-4 py-2"
            style={{ borderColor: moodData.moodColor, color: moodData.moodColor }}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            Powered by AI Financial Analysis
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}