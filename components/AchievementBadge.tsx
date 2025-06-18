import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Medal, Award } from "lucide-react";
import type { AchievementBadge as BadgeType, UserAchievement, AchievementProgress } from "@shared/schema";

interface AchievementBadgeProps {
  badge: BadgeType;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  showProgress?: boolean;
}

const rarityColors = {
  common: "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600",
  rare: "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600",
  epic: "bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-600",
  legendary: "bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-600"
};

const rarityIcons = {
  common: Medal,
  rare: Star,
  epic: Trophy,
  legendary: Award
};

export function AchievementBadge({ badge, userAchievement, progress, showProgress = false }: AchievementBadgeProps) {
  const isUnlocked = !!userAchievement;
  const progressPercentage = progress ? 
    Math.min((Number(progress.currentValue) / Number(progress.targetValue)) * 100, 100) : 0;
  
  const RarityIcon = rarityIcons[badge.rarity as keyof typeof rarityIcons] || Medal;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-200
          ${isUnlocked ? rarityColors[badge.rarity as keyof typeof rarityColors] : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}
          ${isUnlocked ? 'shadow-md' : 'opacity-60'}
        `}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl
              ${isUnlocked ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-200 dark:bg-gray-700'}
            `}>
              {badge.icon || <RarityIcon className="w-6 h-6" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold truncate ${isUnlocked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {badge.title}
                </h3>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${isUnlocked ? '' : 'opacity-50'}`}
                >
                  {badge.rarity}
                </Badge>
              </div>

              <p className={`text-sm mb-2 ${isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                {badge.description}
              </p>

              {/* Progress Bar */}
              {showProgress && progress && !isUnlocked && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{progress.currentValue} / {progress.targetValue}</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}

              {/* Points */}
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {badge.points} points
                </span>
                {isUnlocked && userAchievement && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Unlocked {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Unlock Animation Overlay */}
          {isUnlocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute top-2 right-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}