"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/lib/trpc/client"
import { useToast } from "@/hooks/use-toast"
import { Trophy, Medal, Star, Award, Crown } from "lucide-react"

interface AchievementsProps {
  userId: string
}

export function Achievements({ userId }: AchievementsProps) {
  const { data: achievements, isLoading } = trpc.user.getAchievements.useQuery({ userId })
  const { toast } = useToast()

  // Check for new achievements
  const checkAchievementsMutation = trpc.user.checkAchievements.useMutation({
    onSuccess: (newAchievements) => {
      if (newAchievements && newAchievements.length > 0) {
        newAchievements.forEach((achievement) => {
          toast({
            title: "New Achievement Unlocked!",
            description: achievement.name,
            variant: "default",
          })
        })
      }
    },
  })

  useEffect(() => {
    // Check for new achievements when component mounts
    checkAchievementsMutation.mutate({ userId })
  }, [userId])

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case "GAMES_PLAYED":
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case "RATING":
        return <Star className="h-5 w-5 text-blue-500" />
      case "REVIEWS":
        return <Medal className="h-5 w-5 text-green-500" />
      case "FAVORITES":
        return <Award className="h-5 w-5 text-purple-500" />
      default:
        return <Crown className="h-5 w-5 text-red-500" />
    }
  }

  return (
    <Card className="bg-white/70 dark:bg-slate-800/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements
        </CardTitle>
        <CardDescription>Track your gaming milestones</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading achievements...</div>
        ) : achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md flex items-center gap-3"
              >
                {getAchievementIcon(achievement.type)}
                <div>
                  <div className="font-medium">{achievement.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{achievement.description}</div>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No achievements yet. Start playing games to earn them!
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-3">Available Achievements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-gray-100 dark:bg-slate-900/50 p-2 rounded-md flex items-center gap-2 opacity-70">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div className="text-sm">Play 5 different games</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-900/50 p-2 rounded-md flex items-center gap-2 opacity-70">
              <Star className="h-4 w-4 text-blue-500" />
              <div className="text-sm">Rate 10 games</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-900/50 p-2 rounded-md flex items-center gap-2 opacity-70">
              <Medal className="h-4 w-4 text-green-500" />
              <div className="text-sm">Write 3 reviews</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-900/50 p-2 rounded-md flex items-center gap-2 opacity-70">
              <Award className="h-4 w-4 text-purple-500" />
              <div className="text-sm">Add 5 favorite games</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

