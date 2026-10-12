
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/webview/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#111318",
          panel: "#181B22",
          border: "#292D37",
          muted: "#9299A8",
          accent: "#32D6B0"
        }
      }
    }
  },
  plugins: []
};
