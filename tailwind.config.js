/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Use 'class' to enable dark mode toggling
  theme: {
    extend: {
      colors: {
        // Customize your color palette
        darkBg: '#1e293b', // Dark mode background
        lightBg: '#f3f4f6', // Light mode background
        textLight: '#ffffff', // Light text for dark mode
        textDark: '#1e293b', // Dark text for light mode
      },
    },
  },
  plugins: [],
};
