import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AchievementBadge } from "@/components/AchievementBadge";
import { AchievementStats } from "@/components/AchievementStats";
import { apiRequest } from "@/lib/queryClient";
import { Trophy, RefreshCw, Filter, Award } from "lucide-react";
import type { AchievementBadge as BadgeType, UserAchievement, AchievementProgress } from "@shared/schema";

interface AchievementWithBadge extends UserAchievement {
  badge: BadgeType;
}

interface ProgressWithBadge extends AchievementProgress {
  badge: BadgeType;
}

interface AchievementStatsType {
  totalBadges: number;
  unlockedBadges: number;
  totalPoints: number;
  categoryStats: Record<string, number>;
}

export function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch user achievements
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['/api/achievements'],
    select: (data: AchievementWithBadge[]) => data
  });

  // Fetch progress data
  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['/api/achievements/progress'],
    select: (data: ProgressWithBadge[]) => data
  });

  // Fetch achievement stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/achievements/stats'],
    select: (data: AchievementStatsType) => data
  });

  // Check achievements mutation
  const checkAchievementsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to check achievements');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements/stats'] });
    }
  });

  // Get unique categories
  const categories = Array.from(new Set([
    ...achievements.map(a => a.badge.category),
    ...progress.map(p => p.badge.category)
  ]));

  // Filter achievements and progress by category
  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter(a => a.badge.category === selectedCategory);

  const filteredProgress = selectedCategory === "all"
    ? progress
    : progress.filter(p => p.badge.category === selectedCategory);

  // Combine achievements and progress for display
  const unlockedBadgeIds = new Set(achievements.map(a => a.badgeId));
  const progressBadges = filteredProgress.filter(p => !unlockedBadgeIds.has(p.badgeId));

  const isLoading = achievementsLoading || progressLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Achievements</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-600" />
          <div>
            <h1 className="text-3xl font-bold">Achievements</h1>
            <p className="text-muted-foreground">Track your financial milestones and earn badges</p>
          </div>
        </div>
        <Button
          onClick={() => checkAchievementsMutation.mutate()}
          disabled={checkAchievementsMutation.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checkAchievementsMutation.isPending ? 'animate-spin' : ''}`} />
          Check Progress
        </Button>
      </motion.div>

      {/* Stats Overview */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AchievementStats {...stats} />
        </motion.div>
      )}

      <Separator />

      {/* Achievements Content */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        {/* Category Filter */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Achievement Grids */}
        <TabsContent value={selectedCategory} className="space-y-8">
          {/* Unlocked Achievements */}
          {filteredAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold">Unlocked Badges</h2>
                <Badge variant="secondary">{filteredAchievements.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAchievements.map(achievement => (
                  <AchievementBadge
                    key={achievement.id}
                    badge={achievement.badge}
                    userAchievement={achievement}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Progress Badges */}
          {progressBadges.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">In Progress</h2>
                <Badge variant="outline">{progressBadges.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {progressBadges.map(progressItem => (
                  <AchievementBadge
                    key={progressItem.id}
                    badge={progressItem.badge}
                    progress={progressItem}
                    showProgress={true}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {filteredAchievements.length === 0 && progressBadges.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No badges in this category yet</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedCategory === "all" 
                    ? "Start making transactions and setting goals to earn your first badges!"
                    : `Complete financial activities in the ${selectedCategory} category to unlock badges.`
                  }
                </p>
                <Button
                  onClick={() => checkAchievementsMutation.mutate()}
                  disabled={checkAchievementsMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checkAchievementsMutation.isPending ? 'animate-spin' : ''}`} />
                  Check for New Achievements
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}