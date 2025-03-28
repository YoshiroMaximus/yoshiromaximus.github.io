import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"

export const userRouter = createTRPCRouter({
  createOrUpdateUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().optional(),
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
          },
        })
      } else {
        // Create new user
        return ctx.prisma.user.create({
          data: {
            clerkId: ctx.userId,
            email: input.email,
            username: input.username,
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
})

