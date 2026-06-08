import type { Config } from "tailwindcss";

// SSI Editorial Precision design tokens
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1E3FA0",
          blued: "#152C70",
          gold: "#F0C84A",
          green: "#22B14C",
          red: "#C0392B",
        },
        ink: "#1A1D24",
        muted: "#5C6470",
        line: "#E3E6EC",
        bg: "#F4F6FA",
        card: "#FFFFFF",
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
        mono: ["'Roboto Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(20,30,60,.08), 0 8px 24px rgba(20,30,60,.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
