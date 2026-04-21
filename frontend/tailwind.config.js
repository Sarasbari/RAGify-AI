/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        ink: {
          50:  "#f4f3ef",
          100: "#e8e6df",
          200: "#d0cdc2",
          300: "#b0ac9f",
          400: "#8c8878",
          500: "#6e6a5a",
          600: "#57533f",
          700: "#403d2e",
          800: "#2a2820",
          900: "#181710",
          950: "#0e0d09",
        },
        gold: {
          300: "#e8c96d",
          400: "#d4a843",
          500: "#b8891f",
        }
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        "stream-in": "streamIn 0.15s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { opacity: 0.2, transform: "scale(0.8)" },
          "40%": { opacity: 1, transform: "scale(1)" },
        },
        streamIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}