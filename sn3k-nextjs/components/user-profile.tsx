"use client"

import { useState } from "react"
import type { User } from "@clerk/nextjs/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { trpc } from "@/lib/trpc/client"

interface UserProfileProps {
  user: User
}

export function UserProfile({ user }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState("profile")

  // Fetch user data from tRPC
  const { data: userProfile, isLoading } = trpc.user.getProfile.useQuery()
  const { data: recentGames } = trpc.games.getRecentlyPlayed.useQuery()
  const { data: favorites } = trpc.games.getFavorites.useQuery()

  return (
    <Card className="w-full max-w-3xl mx-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
            <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user.username || `${user.firstName} ${user.lastName}`}</CardTitle>
            <CardDescription>{user.emailAddresses[0].emailAddress}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="history">Game History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Account Information</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Username</div>
                    <div>{user.username || "Not set"}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                    <div>{user.emailAddresses[0].emailAddress}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">First Name</div>
                    <div>{user.firstName || "Not set"}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Last Name</div>
                    <div>{user.lastName || "Not set"}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Recent Activity</h3>
                {isLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : recentGames && recentGames.length > 0 ? (
                  <div className="space-y-2">
                    {recentGames.map((history) => (
                      <div
                        key={history.id}
                        className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md flex justify-between items-center"
                      >
                        <div>{history.game.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(history.playedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">No recent game activity</div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <h3 className="text-lg font-medium">Your Favorite Games</h3>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : favorites && favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="bg-white/50 dark:bg-slate-700/50 p-4 rounded-md">
                    <div className="font-medium">{favorite.game.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{favorite.game.category}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                You haven't added any favorite games yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-medium">Game History</h3>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : userProfile?.gameHistory && userProfile.gameHistory.length > 0 ? (
              <div className="space-y-2">
                {userProfile.gameHistory.map((history) => (
                  <div
                    key={history.id}
                    className="bg-white/50 dark:bg-slate-700/50 p-3 rounded-md flex justify-between items-center"
                  >
                    <div>{history.game.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(history.playedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No game history available</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

