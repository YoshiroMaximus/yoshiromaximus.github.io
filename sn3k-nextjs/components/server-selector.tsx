"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

interface Server {
  name: string
  url: string
}

export function ServerSelector() {
  const [showPopup, setShowPopup] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { toast } = useToast()

  const servers: Server[] = [
    { name: "Server 1", url: "https://example.com" },
    { name: "Server 2", url: "https://www.google.com" },
    { name: "Server 3", url: "https://classroom.google.com/" },
  ]

  const handleServerSelect = (url: string) => {
    setShowPopup(false)
    setLoading(true)
    setSelectedServer(url)

    // Show loading for 2 seconds
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }

  const handleClose = () => {
    setSelectedServer(null)
    setShowPopup(true)
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key to close iframe
      if (e.key === "Escape" && selectedServer) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedServer])

  return (
    <>
      {/* Loading indicator */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${loading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white bg-primary/80 px-4 py-2 rounded-lg shadow-md">Loading server...</p>
      </div>

      {/* Popup overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${showPopup ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() =>
          toast({
            title: "Please Select a Server",
            description: "Choose a server to continue or return home.",
            variant: "default",
          })
        }
      ></div>

      {/* Server selection popup */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-[350px] max-w-[90vw] z-50 transition-all duration-300 ${
          showPopup ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popupTitle"
        tabIndex={-1}
      >
        <h2
          id="popupTitle"
          className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-accent-blue bg-clip-text text-transparent"
        >
          Select a Server
        </h2>

        <div className="flex flex-col space-y-3 mb-6">
          {servers.map((server) => (
            <button
              key={server.name}
              onClick={() => handleServerSelect(server.url)}
              className="server-button bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 relative overflow-hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {server.name}
              <span className="absolute inset-0 overflow-hidden">
                <span className="absolute left-0 top-0 h-full w-full bg-white/20 transform -translate-x-full hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              </span>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Choose a server to continue</p>
          <a
            href="/"
            className="text-primary hover:underline mt-2 inline-block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded"
          >
            Return to Home
          </a>
        </div>
      </div>

      {/* Return button */}
      <button
        onClick={handleClose}
        className={`fixed top-4 right-4 bg-white/70 dark:bg-slate-800/70 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 hover:scale-110 ${selectedServer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-label="Return to Server Selector"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary dark:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Credits Section */}
      <div className="fixed bottom-4 left-4 text-gray-400 text-sm z-50 bg-black/30 dark:bg-white/10 backdrop-blur-sm p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
        <div>servers provided by leo,</div>
        <div>website made by yoshiro</div>
      </div>

      {/* Main iframe */}
      {selectedServer && (
        <iframe
          ref={iframeRef}
          src={selectedServer}
          className="fixed inset-0 w-full h-full border-none z-10"
          title="Loaded Content"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          loading="lazy"
          allowFullScreen
        ></iframe>
      )}
    </>
  )
}

