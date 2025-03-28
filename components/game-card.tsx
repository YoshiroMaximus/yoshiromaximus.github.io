"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface GameOption {
  value: string
  label: string
  category: string
  special?: string
}

export function GameCard() {
  const [selectedGame, setSelectedGame] = useState<string>("")
  const { toast } = useToast()

  // Group games by category
  const gameCategories = {
    RPG: [{ value: "/mb/fger/forager/main", label: "Forager" }],
    Shooter: [
      { value: "/mb/doomori", label: "Doomori" },
      { value: "/mb/10mins", label: "10 Minutes Till Dawn" },
      { value: "/mb/1v1", label: "1v1" },
      { value: "/mb/cold", label: "Supercold" },
      { value: "/mb/serious/t.html", label: "Serious Shooter" },
    ],
    Racing: [
      { value: "/mb/surf", label: "Surf" },
      { value: "/mb/slope", label: "Slope" },
      { value: "/mb/totm", label: "Tomb of the Mask" },
      { value: "/mb/poly", label: "Polytrack" },
      { value: "/mb/dino", label: "Chrome Dino" },
      { value: "/mb/snowrider", label: "Snowrider 3D" },
      { value: "/mb/glitch-buster", label: "Glitch Buster" },
    ],
    Action: [
      { value: "/mb/stik", label: "Stik" },
      { value: "/mb/hsmc", label: "Henry Stickmin" },
      { value: "/mb/porydrive", label: "Pory Drive" },
      { value: "/mb/oh-flip", label: "OH-FLIP!" },
      { value: "/mb/uno", label: "UNO Multiplayer" },
      { value: "/mb/NotABug-Collection", label: "NotABug Collection" },
      { value: "/mb/hextris", label: "Hextris" },
      { value: "/mb/adarkroom", label: "A Dark Room" },
    ],
    Puzzle: [
      { value: "/mb/blockcraft", label: "BlockCraft", special: "blockcraft" },
      { value: "/mb/2048", label: "2048" },
      { value: "/mb/tetris", label: "Tetris" },
      { value: "/mb/no-game", label: "There Is No Game" },
      { value: "/mb/cookie", label: "Cookie Clicker" },
      { value: "/mb/dice", label: "Dice Roller" },
      { value: "/mb/osu", label: "osu!" },
      { value: "/mb/2048-cupcake", label: "2048 Cupcake" },
    ],
    Casual: [
      { value: "/mb/monkey", label: "Monkey Mart" },
      { value: "/mb/bowl", label: "Retro Bowl" },
      { value: "/mb/bitlife", label: "BitLife" },
      { value: "/mb/oregon-trail", label: "Oregon Trail" },
    ],
    Down: [
      { value: "/mb/agar", label: "Agar.io (offline)" },
      { value: "/mb/time", label: "Superhot" },
    ],
    "Coming Soon": [
      { value: "", label: "Coming Soon", disabled: true },
      { value: "/beta-driftboss", label: "Drift Boss", disabled: true },
      { value: "/mb/othello", label: "Othello", disabled: true },
      { value: "/mb/more-ore", label: "More Ore", disabled: true },
    ],
  }

  // Flatten games for random selection
  const allGames: GameOption[] = Object.entries(gameCategories)
    .flatMap(([category, games]) => games.map((game) => ({ ...game, category })))
    .filter((game) => !game.disabled && game.category !== "Down" && game.category !== "Coming Soon")

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGame(e.target.value)
  }

  const handleRandomGame = () => {
    const randomIndex = Math.floor(Math.random() * allGames.length)
    const randomGame = allGames[randomIndex]

    setSelectedGame(randomGame.value)

    toast({
      title: "Random Game Selected",
      description: `${randomGame.label} (${randomGame.category})`,
      duration: 2000,
    })
  }

  const handlePlayGame = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedGame) {
      toast({
        title: "No Game Selected",
        description: "Please select a game first!",
        variant: "destructive",
      })
      return
    }

    let gameUrl = selectedGame

    // Handle special cases
    if (selectedGame === "/mb/tetris") {
      gameUrl = "tetris"
    } else if (selectedGame === "/mb/blockcraft") {
      const version = prompt(
        "Choose a BlockCraft version:\n\n1.8 - Modern version with more features\n1.2 - Classic version",
        "1.8",
      )

      if (!version) return // User canceled

      const trimmedVersion = version.trim()
      if (trimmedVersion === "1.8") {
        gameUrl = "mb/eaglarfast"
      } else if (trimmedVersion === "1.2") {
        gameUrl = "vxlc"
      } else {
        toast({
          title: "Invalid Choice",
          description: "Please choose 1.8 or 1.2.",
          variant: "destructive",
        })
        return
      }
    }

    // Open the game in a new tab
    window.open(gameUrl, "_blank")
  }

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "r") {
        handleRandomGame()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div className="game-card bg-white/70 dark:bg-slate-800/70 p-8 rounded-2xl shadow-lg max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent-blue bg-clip-text text-transparent">
        Game Library
      </h1>

      <form
        onSubmit={handlePlayGame}
        className="flex flex-col space-y-6 w-full items-center"
        aria-labelledby="game-selection"
      >
        <div className="w-full relative">
          <label htmlFor="games" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Choose a game:
          </label>
          <div className="relative">
            <select
              id="games"
              value={selectedGame}
              onChange={handleGameChange}
              className="w-full bg-gradient-to-r from-primary to-accent-blue text-white dark:text-white py-3 px-4 pr-16 rounded-lg shadow-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-300 hover:shadow-lg"
              aria-label="Select a game"
            >
              <option value="" disabled>
                - - -&gt; Select a game &lt;- - -
              </option>

              {Object.entries(gameCategories).map(([category, games]) => (
                <optgroup key={category} label={category}>
                  {games.map((game) => (
                    <option
                      key={game.value || game.label}
                      value={game.value}
                      disabled={game.disabled}
                      data-special={game.special}
                    >
                      {game.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div className="absolute right-12 top-0 h-full flex items-center">
              <div className="separator-line absolute top-1/2 h-3/5 w-px -translate-y-1/2 bg-gray-400/50"></div>
            </div>

            <button
              type="button"
              onClick={handleRandomGame}
              className="absolute right-12 top-0 h-full px-3 flex items-center justify-center hover:opacity-90 transition-all focus:outline-none group"
              aria-label="Select random game"
            >
              <span className="text-2xl group-hover:animate-float">🎲</span>
              <span className="sr-only">Random Game</span>
              <span className="absolute bottom-full mb-2 w-24 bg-black/80 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                Random Game
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full hover-gradient bg-gradient-to-r from-primary to-accent-blue text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 flex items-center justify-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span>PLAY GAME</span>
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          disabled
          className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-semibold py-3 px-6 rounded-lg shadow-md cursor-not-allowed transition duration-300 flex items-center justify-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span>Coming Soon</span>
        </button>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
          More games are being added regularly!
        </p>
      </div>
    </div>
  )
}

