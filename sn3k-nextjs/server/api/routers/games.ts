import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc"

export const gamesRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.game.findMany({
      orderBy: { name: "asc" },
    })
  }),

  getByCategory: publicProcedure.input(z.object({ category: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.game.findMany({
      where: { category: input.category },
      orderBy: { name: "asc" },
    })
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const game = await ctx.prisma.game.findUnique({
      where: { id: input.id },
    })

    if (!game) {
      throw new Error("Game not found")
    }

    // Get average rating
    const ratings = await ctx.prisma.rating.findMany({
      where: { gameId: input.id },
    })

    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0

    return {
      ...game,
      averageRating,
      totalRatings: ratings.length,
    }
  }),

  recordGamePlay: protectedProcedure.input(z.object({ gameId: z.string() })).mutation(async ({ ctx, input }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Record the game play
    return ctx.prisma.gameHistory.create({
      data: {
        userId: user.id,
        gameId: input.gameId,
      },
    })
  }),

  toggleFavorite: protectedProcedure.input(z.object({ gameId: z.string() })).mutation(async ({ ctx, input }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Check if the game is already a favorite
    const existingFavorite = await ctx.prisma.favoriteGame.findUnique({
      where: {
        userId_gameId: {
          userId: user.id,
          gameId: input.gameId,
        },
      },
    })

    if (existingFavorite) {
      // Remove from favorites
      return ctx.prisma.favoriteGame.delete({
        where: { id: existingFavorite.id },
      })
    } else {
      // Add to favorites
      return ctx.prisma.favoriteGame.create({
        data: {
          userId: user.id,
          gameId: input.gameId,
        },
      })
    }
  }),

  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Get all favorite games
    return ctx.prisma.favoriteGame.findMany({
      where: { userId: user.id },
      include: { game: true },
    })
  }),

  getRecentlyPlayed: protectedProcedure.query(async ({ ctx }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Get recently played games
    return ctx.prisma.gameHistory.findMany({
      where: { userId: user.id },
      include: { game: true },
      orderBy: { playedAt: "desc" },
      take: 5,
    })
  }),

  // New methods for ratings and reviews
  rateGame: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        rating: z.number().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First, find the user by Clerk ID
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user) {
        throw new Error("User not found")
      }

      // Check if user has already rated this game
      const existingRating = await ctx.prisma.rating.findUnique({
        where: {
          userId_gameId: {
            userId: user.id,
            gameId: input.gameId,
          },
        },
      })

      if (existingRating) {
        // Update existing rating
        return ctx.prisma.rating.update({
          where: { id: existingRating.id },
          data: { rating: input.rating },
        })
      } else {
        // Create new rating
        return ctx.prisma.rating.create({
          data: {
            userId: user.id,
            gameId: input.gameId,
            rating: input.rating,
          },
        })
      }
    }),

  getUserRating: protectedProcedure.input(z.object({ gameId: z.string() })).query(async ({ ctx, input }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Get user's rating for this game
    return ctx.prisma.rating.findUnique({
      where: {
        userId_gameId: {
          userId: user.id,
          gameId: input.gameId,
        },
      },
    })
  }),

  addReview: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        content: z.string().min(3).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First, find the user by Clerk ID
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user) {
        throw new Error("User not found")
      }

      // Create new review
      return ctx.prisma.review.create({
        data: {
          userId: user.id,
          gameId: input.gameId,
          content: input.content,
        },
      })
    }),

  getReviews: publicProcedure.input(z.object({ gameId: z.string() })).query(async ({ ctx, input }) => {
    // Get reviews for this game
    return ctx.prisma.review.findMany({
      where: { gameId: input.gameId },
      include: {
        user: {
          select: {
            username: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),
})

