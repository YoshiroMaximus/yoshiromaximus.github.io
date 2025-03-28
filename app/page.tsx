import { BackgroundShapes } from "@/components/background-shapes"
import { MenuCard } from "@/components/menu-card"
import { BottomLinks } from "@/components/bottom-links"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserButton } from "@clerk/nextjs"

export default function Home() {
  return (
    <main className="dark:bg-slate-900 bg-gray-50 dark:text-white text-slate-900 min-h-screen flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 -z-10"></div>

      {/* Animated background shapes */}
      <BackgroundShapes />

      {/* Main content */}
      <MenuCard />

      {/* Bottom left links */}
      <BottomLinks />

      {/* Theme toggle button */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <UserButton afterSignOutUrl="/" />
        <ThemeToggle />
      </div>
    </main>
  )
}

