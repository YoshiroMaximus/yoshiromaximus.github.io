import { createTRPCRouter } from "@/server/api/trpc"
import { gamesRouter } from "@/server/api/routers/games"
import { userRouter } from "@/server/api/routers/user"

/**
 * This is the primary router for your server.
 */
export const appRouter = createTRPCRouter({
  games: gamesRouter,
  user: userRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

