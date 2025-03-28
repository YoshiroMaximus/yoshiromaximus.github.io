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
})

