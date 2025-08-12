/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#170024",
          800: "#30163D",
          700: "#5B486F",
          300: "#B1A6C8",
          200: "#CBC9DE",
          50: "#F6F5FA",
          DEFAULT: "#5B486F",
        },
      },
      borderRadius: { "2xl": "1.25rem" },
      boxShadow: { soft: "0 12px 36px rgba(0,0,0,0.08)" },
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
