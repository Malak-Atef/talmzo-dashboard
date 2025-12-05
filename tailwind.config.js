// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d9488',
        secondary: '#1e40af',
        accent: '#f59e0b',
        danger: '#dc2626',
        light: '#f8fafc',
        dark: '#0f172a',
        gray: '#64748b',
      },
      fontFamily: {
        sans: ['Tajawal', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};