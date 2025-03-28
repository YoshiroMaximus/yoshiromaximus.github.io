import Link from "next/link"
import Image from "next/image"

export function BottomLinks() {
  return (
    <div className="fixed left-4 bottom-4 flex items-center bg-white/70 dark:bg-slate-800/70 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
      <Link
        href="/old"
        className="text-primary hover:text-accent-blue transition duration-300 p-2"
        aria-label="Old version"
      >
        <Image src="/images/rocket.png" alt="Rocket" width={24} height={24} className="hover:animate-float" />
      </Link>
      <a
        href="https://github.com/YoshiroMaximus"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-accent-blue transition duration-300 p-2"
        aria-label="GitHub"
      >
        <Image
          id="githubIcon"
          src="/images/github-light.svg"
          alt="GitHub Logo"
          width={24}
          height={24}
          className="dark:block hidden"
        />
        <Image
          id="githubIconLight"
          src="/images/github-dark.svg"
          alt="GitHub Logo"
          width={24}
          height={24}
          className="dark:hidden block"
        />
      </a>
      <a
        href="https://tally.so/r/wM6dQp"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-accent-blue transition duration-300 p-2"
        aria-label="Feedback form"
      >
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.99169 2.39306C9.99169 3.27827 9.66489 4.49613 9.18309 6.13269L8.83837 7.38966L9.92921 6.67715C12.0027 5.2211 13.2549 4.67462 14.0838 4.67462C15.0266 4.67462 16 5.34831 16 6.68815C16 8.39252 14.1804 8.8767 10.6672 8.9364L9.35372 8.99811L10.3896 9.82276C12.8489 11.7184 13.7015 12.647 13.7015
 13.8238C13.7015 14.7498 12.8408 15.7144 11.7737 15.7144C10.1704 15.7144 9.44568 14.0483 8.46877 11.2197L7.97078 9.99025L7.50229 11.2197C6.40739 14.4325 5.56468 15.6849 4.16787 15.6849C3.04174 15.6849 2.2401 14.6612 2.2401 13.7942C2.2401 12.4993 3.41711 11.4228 5.58146 9.82276L6.61736 8.99811L5.33333 8.9364C1.60214 8.90626 0 8.36962 0 6.6586C0 5.31875 1.00351 4.64506 1.92835 4.64506C3.04521 4.64506 4.2633 5.39844 6.07135 6.67715L7.1622 7.38966L6.81748 6.13269C6.2952 4.40746 6.04995 3.14179 6.04995 2.39306C6.04995 1.22098 6.71048 0.25 8.00028 0.25C9.31959 0.25 9.99169 1.22098 9.99169 2.39306Z"
          />
        </svg>
      </a>
      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300 hidden sm:inline-block">
        ← give recc plz (made by yoshiro)
      </span>
    </div>
  )
}

