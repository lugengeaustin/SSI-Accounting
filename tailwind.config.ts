import type { Config } from "tailwindcss";
import { colors as ssi } from "@ssi/brand/tokens";

// Calm Studio palette, sourced from the canonical @ssi/brand package so brand
// changes propagate here automatically. The class names below (brand.*, ink,
// muted, line, bg, card) are unchanged — only their VALUES now come from tokens.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: ssi.execBlue,
          blued: ssi.execBlueDeep,
          gold: ssi.growthGold,
          green: ssi.sustainGreen,
          red: ssi.error,
        },
        ink: ssi.ink,
        muted: ssi.inkMuted,
        line: ssi.line,
        bg: ssi.offWhite,
        card: ssi.white,
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
