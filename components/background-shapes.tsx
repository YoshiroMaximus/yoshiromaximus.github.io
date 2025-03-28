export function BackgroundShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/10 dark:bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
      <div
        className="absolute top-1/3 -right-20 w-96 h-96 bg-accent-teal/10 dark:bg-accent-teal/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute -bottom-32 left-1/3 w-80 h-80 bg-accent-red/10 dark:bg-accent-red/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"
        style={{ animationDelay: "2s" }}
      ></div>
    </div>
  )
}

