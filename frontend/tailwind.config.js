/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#259E7E",
          primaryHover: "#1E7D64",
          accent: "#C1D544",
          accentHover: "#A6B83B",
          dark: "#1A2421",
          cream: "#FAF9F6",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F3F7F4",
        },
        ink: {
          DEFAULT: "#1A2421",
          soft: "#4A5D56",
          muted: "#8EA19A",
        },
        line: {
          DEFAULT: "#E2E8E5",
          dark: "#2A3631",
        },
        status: {
          safe: "#259E7E",
          safeBg: "#E9F5F2",
          near: "#B89424",
          nearBg: "#FEF9E6",
          critical: "#C45A3D",
          criticalBg: "#FCF2EF",
          expired: "#C41E1E",
          expiredBg: "#FBEAEA",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(26,36,33,0.04), 0 8px 24px rgba(26,36,33,0.04)",
        glow: "0 6px 24px rgba(37,158,126,0.28)",
        accent: "0 6px 24px rgba(193,213,68,0.35)",
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
      },
      animation: {
        scanline: "scanline 2.4s ease-in-out infinite alternate",
        pulse_dot: "pulse_dot 1.6s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
