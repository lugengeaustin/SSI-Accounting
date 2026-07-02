import type { Config } from "tailwindcss";
// @ssi/brand ships the Calm Studio design tokens. The preset is CommonJS
// (module.exports), so we require() it and register it via `presets`.
// This is the canonical SSI consumption pattern (same as E-mteja / the suite).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const preset = require("@ssi/brand/tailwind-preset");

const config: Config = {
  presets: [preset],
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic Calm Studio tokens (var-backed → theme-aware).
        // Defined in src/index.css (light + dark values).
        canvas: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        blue: {
          DEFAULT: "var(--blue)",
          deep: "var(--blue-deep)",
          soft: "var(--blue-soft)", // tinted background fill
        },
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
        },
        green: {
          DEFAULT: "var(--green)",
          deep: "var(--green-deep)",
          soft: "var(--green-soft)",
        },
        danger: {
          DEFAULT: "var(--red)",
          soft: "var(--red-soft)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          soft: "var(--warn-soft)",
        },
        // Legacy aliases — the existing pages consume these (brand-blue, bg,
        // card…); they now resolve to the same Calm Studio vars so the whole
        // app restyles without touching every page.
        brand: {
          blue: "var(--blue)",
          blued: "var(--blue-deep)",
          gold: "var(--gold)",
          green: "var(--green)",
          red: "var(--red)",
        },
        bg: "var(--bg)",
      },
      fontFamily: {
        sans: ["Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["'Roboto Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Calm Studio: generously rounded white cards (18px) + pills + fields.
        card: "18px",
        pill: "999px",
        field: "12px",
      },
      boxShadow: {
        // Refined elevation scale — var-backed so dark-mode swaps for free.
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        pop: "var(--shadow-pop)",
      },
      backgroundImage: {
        // Brand gradients built from the palette CSS vars (no raw hex).
        "grad-brand": "var(--grad-brand)",
        "grad-primary": "var(--grad-primary)",
        "grad-surface": "var(--grad-surface)",
        "grad-numeric": "var(--grad-numeric)",
        "grad-active-nav": "var(--grad-active-nav)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
