import { BackgroundShapes } from "@/components/background-shapes"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"
import { GameRating } from "@/components/game-rating"
import { GameReviews } from "@/components/game-reviews"
import { UserButton } from "@clerk/nextjs"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Heart } from "lucide-react"

interface GamePageProps {
  params: {
    id: string
  }
}

export default async function GamePage({ params }: GamePageProps) {
  const game = await prisma.game.findUnique({
    where: { id: params.id },
  })

  if (!game) {
    notFound()
  }

  // Get average rating
  const ratings = await prisma.rating.findMany({
    where: { gameId: game.id },
  })

  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0

  return (
    <main className="dark:bg-slate-900 bg-gray-50 dark:text-white text-slate-900 min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 -z-10"></div>

      {/* Animated background shapes */}
      <BackgroundShapes />

      {/* Back button */}
      <BackButton href="/games" />

      {/* Theme toggle and user button */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <UserButton afterSignOutUrl="/" />
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl">{game.name}</CardTitle>
                <CardDescription className="text-lg">{game.category}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="h-5 w-5" />
                  <span className="sr-only">Add to favorites</span>
                </Button>
                <Button asChild>
                  <a href={game.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Play Game
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {game.description && (
              <div>
                <h3 className="text-lg font-medium mb-2">About</h3>
                <p>{game.description}</p>
              </div>
            )}

            <div className="flex flex-col items-center py-4 border-t border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-2">Game Rating</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ({ratings.length} {ratings.length === 1 ? "rating" : "ratings"})
                </div>
              </div>
              <GameRating gameId={game.id} />
            </div>

            <GameReviews gameId={game.id} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

