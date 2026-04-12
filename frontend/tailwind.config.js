/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This sets 'Inter' as the default sans-serif font
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        
        // Optional: If you want to keep a specific monospace font for your code blocks
        // mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
}

