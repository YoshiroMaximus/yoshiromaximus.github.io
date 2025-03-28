import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"

export const userRouter = createTRPCRouter({
  createOrUpdateUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (existingUser) {
        // Update existing user
        return ctx.prisma.user.update({
          where: { clerkId: ctx.userId },
          data: {
            email: input.email,
            username: input.username,
            imageUrl: input.imageUrl,
          },
        })
      } else {
        // Create new user
        return ctx.prisma.user.create({
          data: {
            clerkId: ctx.userId,
            email: input.email,
            username: input.username,
            imageUrl: input.imageUrl,
          },
        })
      }
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
      include: {
        favoriteGames: {
          include: { game: true },
        },
        gameHistory: {
          include: { game: true },
          orderBy: { playedAt: "desc" },
          take: 10,
        },
      },
    })
  }),

  // New methods for achievements
  getAchievements: protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Get user's achievements
    return ctx.prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: "desc" },
    })
  }),

  checkAchievements: protectedProcedure.input(z.object({ userId: z.string() })).mutation(async ({ ctx }) => {
    // First, find the user by Clerk ID
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Get user stats
    const gamesPlayed = await ctx.prisma.gameHistory.groupBy({
      by: ["gameId"],
      where: { userId: user.id },
    })

    const ratingsCount = await ctx.prisma.rating.count({
      where: { userId: user.id },
    })

    const reviewsCount = await ctx.prisma.review.count({
      where: { userId: user.id },
    })

    const favoritesCount = await ctx.prisma.favoriteGame.count({
      where: { userId: user.id },
    })

    // Get existing achievements
    const existingAchievements = await ctx.prisma.achievement.findMany({
      where: { userId: user.id },
    })

    const newAchievements = []

    // Check for games played achievement
    if (gamesPlayed.length >= 5 && !existingAchievements.some((a) => a.type === "GAMES_PLAYED")) {
      const achievement = await ctx.prisma.achievement.create({
        data: {
          userId: user.id,
          name: "Game Explorer",
          description: "Played 5 different games",
          type: "GAMES_PLAYED",
        },
      })
      newAchievements.push(achievement)
    }

    // Check for ratings achievement
    if (ratingsCount >= 10 && !existingAchievements.some((a) => a.type === "RATING")) {
      const achievement = await ctx.prisma.achievement.create({
        data: {
          userId: user.id,
          name: "Game Critic",
          description: "Rated 10 games",
          type: "RATING",
        },
      })
      newAchievements.push(achievement)
    }

    // Check for reviews achievement
    if (reviewsCount >= 3 && !existingAchievements.some((a) => a.type === "REVIEWS")) {
      const achievement = await ctx.prisma.achievement.create({
        data: {
          userId: user.id,
          name: "Thoughtful Reviewer",
          description: "Wrote 3 game reviews",
          type: "REVIEWS",
        },
      })
      newAchievements.push(achievement)
    }

    // Check for favorites achievement
    if (favoritesCount >= 5 && !existingAchievements.some((a) => a.type === "FAVORITES")) {
      const achievement = await ctx.prisma.achievement.create({
        data: {
          userId: user.id,
          name: "Game Collector",
          description: "Added 5 games to favorites",
          type: "FAVORITES",
        },
      })
      newAchievements.push(achievement)
    }

    return newAchievements
  }),
})

