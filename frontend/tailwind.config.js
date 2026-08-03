/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        greenhouse: {
          900: "#0a1f0f",
          800: "#122818",
          700: "#1a3822",
          500: "#2d6a3e",
          400: "#4ade80",
          300: "#86efac",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
