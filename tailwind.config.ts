import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0b12",
        neural: "#7df9ff",
        "neural-deep": "#2dd4ff",
        warm: "#f2c278",
        "warm-deep": "#a45b2a",
        glass: "rgba(255, 255, 255, 0.08)"
      },
      boxShadow: {
        glow: "0 0 30px rgba(125, 249, 255, 0.35)",
        warm: "0 0 35px rgba(242, 194, 120, 0.35)"
      },
      backdropBlur: {
        xs: "2px"
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "pulse-soft": "pulse-soft 4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.75" },
          "50%": { opacity: "1" }
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
