/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Use 'class' to enable dark mode toggling
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#1e293b', // Dark mode background
        lightBg: '#f3f4f6', // Light mode background
        textLight: '#ffffff', // Light text for dark mode
        textDark: '#1e293b', // Dark text for light mode
      },
    },
  },
  plugins: [],
};
