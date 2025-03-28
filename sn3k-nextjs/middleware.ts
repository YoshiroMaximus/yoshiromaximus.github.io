import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ["/", "/games", "/links", "/servers", "/mb(.*)"],

  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: ["/api/public(.*)"],
})

export const config = {
  // Matcher ignoring files with extensions like images, videos, etc.
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}

