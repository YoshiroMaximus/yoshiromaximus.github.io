"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc/client"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

interface GameReviewsProps {
  gameId: string
}

export function GameReviews({ gameId }: GameReviewsProps) {
  const [reviewText, setReviewText] = useState("")
  const { toast } = useToast()
  const { user, isLoaded } = useUser()

  const { data: reviews, isLoading, refetch } = trpc.games.getReviews.useQuery({ gameId })

  const addReviewMutation = trpc.games.addReview.useMutation({
    onSuccess: () => {
      setReviewText("")
      toast({
        title: "Review submitted",
        description: "Your review has been added successfully!",
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleSubmitReview = () => {
    if (!reviewText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a review before submitting.",
        variant: "destructive",
      })
      return
    }

    addReviewMutation.mutate({
      gameId,
      content: reviewText,
    })
  }

  if (!isLoaded) {
    return <div className="text-center py-4">Loading user information...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/50 dark:bg-slate-800/50">
        <CardHeader>
          <CardTitle>Game Reviews</CardTitle>
          <CardDescription>See what others think about this game or share your own thoughts</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Write your review here..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleSubmitReview}
                disabled={addReviewMutation.isLoading || !reviewText.trim()}
                className="w-full"
              >
                {addReviewMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">Please sign in to leave a review</div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Recent Reviews</h3>

        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            <p className="mt-2">Loading reviews...</p>
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="bg-white/50 dark:bg-slate-800/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={review.user.imageUrl || ""} />
                      <AvatarFallback>{review.user.username?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{review.user.username || "Anonymous"}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{review.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No reviews yet. Be the first to review this game!
          </div>
        )}
      </div>
    </div>
  )
}

