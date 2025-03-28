"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import { useToast } from "@/hooks/use-toast"

interface GameRatingProps {
  gameId: string
  initialRating?: number
  userHasRated?: boolean
}

export function GameRating({ gameId, initialRating = 0, userHasRated = false }: GameRatingProps) {
  const [rating, setRating] = useState(initialRating)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [hasRated, setHasRated] = useState(userHasRated)
  const { toast } = useToast()

  const rateGameMutation = trpc.games.rateGame.useMutation({
    onSuccess: () => {
      setHasRated(true)
      toast({
        title: "Rating submitted",
        description: "Thank you for rating this game!",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleRating = (newRating: number) => {
    if (hasRated) return

    setRating(newRating)
    rateGameMutation.mutate({
      gameId,
      rating: newRating,
    })
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            variant="ghost"
            size="sm"
            className="p-0 h-auto"
            disabled={hasRated}
            onClick={() => handleRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
          >
            <Star
              className={`h-6 w-6 ${
                (hoveredRating ? star <= hoveredRating : star <= rating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              } transition-colors`}
            />
            <span className="sr-only">Rate {star} stars</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {hasRated ? "Thank you for rating!" : "Click to rate this game"}
      </p>
    </div>
  )
}

