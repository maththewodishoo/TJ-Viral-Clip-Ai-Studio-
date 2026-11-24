/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05030d",
          900: "#080414",
          850: "#0b0619",
          800: "#0f0821",
          700: "#171030",
        },
        brand: {
          300: "#c4a6ff",
          400: "#a97cff",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        electric: {
          400: "#38bdf8",
          500: "#22d3ee",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(139, 92, 246, 0.55)",
        "glow-sm": "0 0 14px -4px rgba(139, 92, 246, 0.6)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
        "hero-gradient": "linear-gradient(105deg, #1b0b3f 0%, #25105c 38%, #1d2a86 72%, #0c1a4d 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
