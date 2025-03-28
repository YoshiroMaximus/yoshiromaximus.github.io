import { SignIn } from "@clerk/nextjs"
import { BackgroundShapes } from "@/components/background-shapes"

export default function SignInPage() {
  return (
    <main className="dark:bg-slate-900 bg-gray-50 dark:text-white text-slate-900 min-h-screen flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 -z-10"></div>

      {/* Animated background shapes */}
      <BackgroundShapes />

      <div className="bg-white/70 dark:bg-slate-800/70 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-transparent shadow-none",
            },
          }}
        />
      </div>
    </main>
  )
}

