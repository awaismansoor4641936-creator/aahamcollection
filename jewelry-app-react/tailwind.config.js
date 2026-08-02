/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: { 300: '#E6C96D', 400: '#D4AF37', 500: '#C5A017', 600: '#B08D07' },
        charcoal: '#1C1C1C',
        sand: '#F5F5F0'
      }
    },
  },
  plugins: [],
}
