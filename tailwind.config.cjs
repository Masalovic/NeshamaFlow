/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      /* ---- Palette ---- */
      colors: {
        // Named swatches from your reference
        chiffon: "#F7F5F2",
        silk: "#EADFD8",
        blossom: "#F7D9DF",
        rose: "#D65DA6",
        smoke: "#4B4B4D",
        velvet: "#0F0F10",

        // Brand scale (mapped to rose family for compatibility)
        brand: {
          50: "#FCFAF9", // near chiffon
          100: "#F7F0EE",
          200: "#F7D9DF", // blossom
          300: "#F0BCC7",
          400: "#E98DA0",
          500: "#DF6F83",
          600: "#D65DA6", // rose (primary)
          700: "#B94C63",
          800: "#943E51",
          900: "#6F2F3E",
          DEFAULT: "#D65DA6",
        },
      },

      /* ---- Radius / Shadows ---- */
      borderRadius: { "2xl": "1.25rem", pill: "9999px" },
      boxShadow: {
        soft: "0 12px 36px rgba(15,15,16,0.08)",
        "soft-press": "inset 0 2px 8px rgba(15,15,16,0.10)",
      },

      /* ---- Fonts ---- */
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'SF Pro Display'",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
