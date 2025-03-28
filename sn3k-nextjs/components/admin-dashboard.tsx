"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit, Save } from "lucide-react"

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("games")
  const [newGame, setNewGame] = useState({
    name: "",
    url: "",
    category: "",
    description: "",
  })
  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [editedGame, setEditedGame] = useState({
    name: "",
    url: "",
    category: "",
    description: "",
  })

  const { toast } = useToast()

  const { data: games, isLoading: gamesLoading, refetch: refetchGames } = trpc.admin.getAllGames.useQuery()
  const { data: users, isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery()
  const { data: stats } = trpc.admin.getStats.useQuery()

  const addGameMutation = trpc.admin.addGame.useMutation({
    onSuccess: () => {
      toast({
        title: "Game added",
        description: "The game has been added successfully!",
      })
      setNewGame({
        name: "",
        url: "",
        category: "",
        description: "",
      })
      refetchGames()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add game. Please try again.",
        variant: "destructive",
      })
    },
  })

  const updateGameMutation = trpc.admin.updateGame.useMutation({
    onSuccess: () => {
      toast({
        title: "Game updated",
        description: "The game has been updated successfully!",
      })
      setEditingGame(null)
      refetchGames()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update game. Please try again.",
        variant: "destructive",
      })
    },
  })

  const deleteGameMutation = trpc.admin.deleteGame.useMutation({
    onSuccess: () => {
      toast({
        title: "Game deleted",
        description: "The game has been deleted successfully!",
      })
      refetchGames()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete game. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleAddGame = () => {
    if (!newGame.name || !newGame.url || !newGame.category) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    addGameMutation.mutate(newGame)
  }

  const handleEditGame = (game: any) => {
    setEditingGame(game.id)
    setEditedGame({
      name: game.name,
      url: game.url,
      category: game.category,
      description: game.description || "",
    })
  }

  const handleUpdateGame = (gameId: string) => {
    if (!editedGame.name || !editedGame.url || !editedGame.category) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    updateGameMutation.mutate({
      id: gameId,
      ...editedGame,
    })
  }

  const handleDeleteGame = (gameId: string) => {
    if (confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
      deleteGameMutation.mutate({ id: gameId })
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
        <CardDescription>Manage your website content and users</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="games" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Game</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Name *
                      </label>
                      <Input
                        id="name"
                        value={newGame.name}
                        onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                        placeholder="Game name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium">
                        Category *
                      </label>
                      <Select
                        value={newGame.category}
                        onValueChange={(value) => setNewGame({ ...newGame, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RPG">RPG</SelectItem>
                          <SelectItem value="Shooter">Shooter</SelectItem>
                          <SelectItem value="Racing">Racing</SelectItem>
                          <SelectItem value="Action">Action</SelectItem>
                          <SelectItem value="Puzzle">Puzzle</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="url" className="text-sm font-medium">
                      URL *
                    </label>
                    <Input
                      id="url"
                      value={newGame.url}
                      onChange={(e) => setNewGame({ ...newGame, url: e.target.value })}
                      placeholder="Game URL"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={newGame.description}
                      onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                      placeholder="Game description"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleAddGame} disabled={addGameMutation.isLoading} className="ml-auto">
                  {addGameMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Game
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Manage Games</h3>

              {gamesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2">Loading games...</p>
                </div>
              ) : games && games.length > 0 ? (
                <div className="space-y-4">
                  {games.map((game) => (
                    <Card key={game.id}>
                      {editingGame === game.id ? (
                        <CardContent className="pt-6">
                          <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Name *</label>
                                <Input
                                  value={editedGame.name}
                                  onChange={(e) => setEditedGame({ ...editedGame, name: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Category *</label>
                                <Select
                                  value={editedGame.category}
                                  onValueChange={(value) => setEditedGame({ ...editedGame, category: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="RPG">RPG</SelectItem>
                                    <SelectItem value="Shooter">Shooter</SelectItem>
                                    <SelectItem value="Racing">Racing</SelectItem>
                                    <SelectItem value="Action">Action</SelectItem>
                                    <SelectItem value="Puzzle">Puzzle</SelectItem>
                                    <SelectItem value="Casual">Casual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">URL *</label>
                              <Input
                                value={editedGame.url}
                                onChange={(e) => setEditedGame({ ...editedGame, url: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Description</label>
                              <Textarea
                                value={editedGame.description}
                                onChange={(e) => setEditedGame({ ...editedGame, description: e.target.value })}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setEditingGame(null)}>
                                Cancel
                              </Button>
                              <Button onClick={() => handleUpdateGame(game.id)} disabled={updateGameMutation.isLoading}>
                                {updateGameMutation.isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      ) : (
                        <>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{game.name}</CardTitle>
                                <CardDescription>{game.category}</CardDescription>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditGame(game)}>
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteGame(game.id)}
                                  disabled={deleteGameMutation.isLoading}
                                >
                                  {deleteGameMutation.isLoading && deleteGameMutation.variables?.id === game.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-medium">URL:</span> {game.url}
                              </div>
                              {game.description && (
                                <div className="text-sm">
                                  <span className="font-medium">Description:</span> {game.description}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No games found. Add your first game above!
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <h3 className="text-lg font-medium">User Management</h3>

            {usersLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2">Loading users...</p>
              </div>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700">
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Joined</th>
                      <th className="px-4 py-2 text-left">Games Played</th>
                      <th className="px-4 py-2 text-left">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-3">{user.username || "Anonymous"}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{user._count.gameHistory}</td>
                        <td className="px-4 py-3">{user._count.reviews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No users found.</div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalGames || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Plays</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalPlays || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Games</CardTitle>
                <CardDescription>Most played games on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.popularGames && stats.popularGames.length > 0 ? (
                  <div className="space-y-2">
                    {stats.popularGames.map((game, index) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-700/50 rounded-md"
                      >
                        <div className="flex items-center">
                          <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm mr-3">
                            {index + 1}
                          </span>
                          <span>{game.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{game._count.history} plays</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No game play data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

