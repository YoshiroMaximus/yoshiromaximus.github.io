import Link from "next/link"

interface BackButtonProps {
  href: string
}

export function BackButton({ href }: BackButtonProps) {
  return (
    <div className="fixed top-4 left-4 z-10">
      <Link
        href={href}
        aria-label="Back to Home"
        className="block bg-white/70 dark:bg-slate-800/70 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary dark:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>
    </div>
  )
}

