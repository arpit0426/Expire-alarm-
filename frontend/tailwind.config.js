/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Street-market palette ─────────────────────────────────────────
        // Chutney green (primary), turmeric (accent), clay terracotta, indigo, cream
        brand: {
          primary: "#3A7D44",          // chutney green
          primaryHover: "#2E6535",
          primarySoft: "#E2EDDE",
          accent: "#E4A11B",           // turmeric
          accentHover: "#C28811",
          accentSoft: "#FBEDC9",
          terracotta: "#B0533C",       // clay terracotta
          terracottaHover: "#943F2A",
          indigo: "#2C3E5C",           // khadi indigo
          indigoSoft: "#D7DDE8",
          dark: "#1F2A40",             // deep indigo charcoal
          darker: "#161E2F",
          cream: "#F7EFE0",            // kulhad cream
          parchment: "#FBF6EA",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F2EBD9",
          glassBase: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#22241F",          // warm near-black
          soft: "#5D5749",
          muted: "#9C9081",
        },
        line: {
          DEFAULT: "#E5DAC4",          // warm cream-line
          dark: "#2A3447",             // for dark surfaces
        },
        status: {
          // semantic tiers, tuned to the street-market palette
          safe: "#3A7D44",             // chutney
          safeBg: "#E6EDD8",
          near: "#C58A0D",             // turmeric darker for AA contrast
          nearBg: "#FBF1D9",
          critical: "#B0533C",         // clay
          criticalBg: "#F6DDD2",
          expired: "#9A2C24",          // sindoor / brick
          expiredBg: "#F4D2CE",
        },
      },
      fontFamily: {
        // street-market typography:
        //  display – Anek Devanagari (versatile, distinct, Latin+Devanagari)
        //  sans    – Mukta (Indian-designed, very legible body face)
        //  mono    – JetBrains Mono (data)
        display: ['"Anek Devanagari"', "serif"],
        sans: ["Mukta", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(34,36,31,0.05), 0 10px 30px rgba(34,36,31,0.06)",
        glow: "0 6px 24px rgba(58,125,68,0.28)",
        accent: "0 6px 24px rgba(228,161,27,0.35)",
        // subtle glass shadow + inner-light highlight
        glass:
          "0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(34,36,31,0.04) inset, 0 12px 36px rgba(34,36,31,0.08)",
        glassDark:
          "0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 36px rgba(0,0,0,0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(0%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float_slow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        scanline: "scanline 2.4s ease-in-out infinite alternate",
        pulse_dot: "pulse_dot 1.6s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
        float_slow: "float_slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
