import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import type { AchievementBadge as BadgeType, UserAchievement, AchievementProgress } from "@shared/schema";

interface AchievementWithBadge extends UserAchievement {
  badge: BadgeType;
}

interface ProgressWithBadge extends AchievementProgress {
  badge: BadgeType;
}

export function AchievementWidget() {
  // Fetch recent achievements (limit to 3)
  const { data: achievements = [] } = useQuery({
    queryKey: ['/api/achievements'],
    select: (data: AchievementWithBadge[]) => data.slice(0, 3)
  });

  // Fetch progress data (limit to 2 closest to completion)
  const { data: progress = [] } = useQuery({
    queryKey: ['/api/achievements/progress'],
    select: (data: ProgressWithBadge[]) => 
      data
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 2)
  });

  // Fetch achievement stats
  const { data: stats } = useQuery({
    queryKey: ['/api/achievements/stats']
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const getRarityBadgeVariant = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'secondary';
      case 'uncommon': return 'default';
      case 'rare': return 'default';
      case 'epic': return 'destructive';
      case 'legendary': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Achievements
        </CardTitle>
        <Link href="/achievements">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Achievement Stats Summary */}
        {stats && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">{stats.totalPoints.toLocaleString()} Points</p>
                <p className="text-xs text-muted-foreground">
                  {stats.unlockedBadges}/{stats.totalBadges} Badges
                </p>
              </div>
            </div>
            <div className="text-right">
              <Progress 
                value={stats.totalBadges > 0 ? (stats.unlockedBadges / stats.totalBadges) * 100 : 0} 
                className="w-16 h-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(stats.totalBadges > 0 ? (stats.unlockedBadges / stats.totalBadges) * 100 : 0)}%
              </p>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Recent Achievements
            </h4>
            {achievements.map(achievement => (
              <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="text-2xl">{achievement.badge.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{achievement.badge.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getRarityBadgeVariant(achievement.badge.rarity)} className="text-xs">
                      {achievement.badge.rarity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      +{achievement.badge.points} pts
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Towards Next Achievements */}
        {progress.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Nearly Complete</h4>
            {progress.map(progressItem => (
              <div key={progressItem.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{progressItem.badge.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{progressItem.badge.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {progressItem.badge.category}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(progressItem.progress)}%
                  </span>
                </div>
                <Progress value={progressItem.progress} className="h-2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {achievements.length === 0 && progress.length === 0 && (
          <div className="text-center py-6">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No achievements yet</p>
            <p className="text-xs text-muted-foreground">
              Start making transactions to earn your first badges!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}