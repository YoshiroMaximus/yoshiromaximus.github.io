import { BackgroundShapes } from "@/components/background-shapes"
import { LinksCard } from "@/components/links-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackButton } from "@/components/back-button"
import { UserButton } from "@clerk/nextjs"

export default function LinksPage() {
  return (
    <main className="dark:bg-slate-900 bg-gray-50 dark:text-white text-slate-900 min-h-screen flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 -z-10"></div>

      {/* Animated background shapes */}
      <BackgroundShapes />

      {/* Back button */}
      <BackButton href="/" />

      {/* Theme toggle and user button */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <UserButton afterSignOutUrl="/" />
        <ThemeToggle />
      </div>

      {/* Main content */}
      <LinksCard />
    </main>
  )
}

