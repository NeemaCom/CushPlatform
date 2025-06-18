import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Star, Zap } from "lucide-react";

interface AchievementStatsProps {
  totalBadges: number;
  unlockedBadges: number;
  totalPoints: number;
  categoryStats: Record<string, number>;
}

export function AchievementStats({ totalBadges, unlockedBadges, totalPoints, categoryStats }: AchievementStatsProps) {
  const completionPercentage = totalBadges > 0 ? (unlockedBadges / totalBadges) * 100 : 0;

  const categoryIcons = {
    savings: "💰",
    goals: "🎯",
    streaks: "🔥",
    milestones: "🏆",
    spending: "💳"
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
          <Trophy className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unlockedBadges}/{totalBadges}</div>
          <div className="mt-2 space-y-1">
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(completionPercentage)}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Points */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Star className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Achievement points earned
          </p>
        </CardContent>
      </Card>

      {/* Badges Unlocked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Badges Unlocked</CardTitle>
          <Target className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unlockedBadges}</div>
          <p className="text-xs text-muted-foreground">
            Out of {totalBadges} available
          </p>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
          <Zap className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Object.keys(categoryStats).length}</div>
          <p className="text-xs text-muted-foreground">
            Categories with badges
          </p>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryStats).length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Category Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(categoryStats).map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="text-2xl">
                    {categoryIcons[category as keyof typeof categoryIcons] || "🏅"}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <span className="text-sm text-muted-foreground">{count} badges</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {category === 'savings' && 'Financial savings achievements'}
                      {category === 'goals' && 'Goal completion milestones'}
                      {category === 'streaks' && 'Consistency rewards'}
                      {category === 'milestones' && 'Major accomplishments'}
                      {category === 'spending' && 'Smart spending habits'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}