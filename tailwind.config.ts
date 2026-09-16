import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#080c16",
        foreground: "#f8fafc",
        card: {
          DEFAULT: "rgba(15, 23, 42, 0.75)",
          border: "rgba(56, 189, 248, 0.15)",
        },
        primary: {
          DEFAULT: "#0284c7",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        cyber: {
          cyan: "#00f0ff",
          neon: "#39ff14",
          purple: "#9d4edd",
          gold: "#ffd700",
          silver: "#e2e8f0",
          bronze: "#cd7f32",
        },
      },
      boxShadow: {
        "cyan-glow": "0 0 25px -5px rgba(14, 165, 233, 0.4)",
        "gold-glow": "0 0 30px -5px rgba(234, 179, 8, 0.5)",
        "emerald-glow": "0 0 25px -5px rgba(16, 185, 129, 0.4)",
        "rose-glow": "0 0 25px -5px rgba(244, 63, 94, 0.4)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-subtle": "bounce 2s infinite",
        "shimmer": "shimmer 2.5s infinite linear",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
