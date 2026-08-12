/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          optimal: "#10B981",
          optimalDark: "#059669",
          warning: "#F59E0B",
          error: "#EF4444",
        },
        water: {
          DEFAULT: "#2563EB",
          light: "#DBEAFE",
        },
        label: "#6B7280",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F9FAFB",
          page: "#F3F4F6",
        },
        border: {
          DEFAULT: "#E5E7EB",
          light: "#F3F4F6",
        },
        // Legacy alias — mapped to light-theme greens for gradual migration
        greenhouse: {
          900: "#111827",
          800: "#FFFFFF",
          700: "#E5E7EB",
          600: "#059669",
          500: "#059669",
          400: "#10B981",
          300: "#6B7280",
          950: "#F9FAFB",
        },
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        cardHover: "0 4px 12px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
