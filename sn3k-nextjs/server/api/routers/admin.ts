import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"

// Admin router with protected procedures that check for admin role
export const adminRouter = createTRPCRouter({
  // Middleware to check if user is admin
  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user || user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      })
    }

    return true
  }),

  // Game management
  getAllGames: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user || user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      })
    }

    return ctx.prisma.game.findMany({
      orderBy: { name: "asc" },
    })
  }),

  addGame: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user || user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        })
      }

      return ctx.prisma.game.create({
        data: input,
      })
    }),

  updateGame: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        url: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user || user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        })
      }

      const { id, ...data } = input

      return ctx.prisma.game.update({
        where: { id },
        data,
      })
    }),

  deleteGame: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user || user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        })
      }

      return ctx.prisma.game.delete({
        where: { id: input.id },
      })
    }),

  // User management
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user || user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      })
    }

    return ctx.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        role: true,
        _count: {
          select: {
            gameHistory: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  // Statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    })

    if (!user || user.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      })
    }

    const totalUsers = await ctx.prisma.user.count()
    const totalGames = await ctx.prisma.game.count()
    const totalPlays = await ctx.prisma.gameHistory.count()

    // Get popular games
    const popularGames = await ctx.prisma.game.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        _count: {
          select: {
            history: true,
          },
        },
      },
      orderBy: {
        history: {
          _count: "desc",
        },
      },
      take: 5,
    })

    return {
      totalUsers,
      totalGames,
      totalPlays,
      popularGames,
    }
  }),

  // Make a user admin
  makeAdmin: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user || user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        })
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: "ADMIN" },
      })
    }),
})

