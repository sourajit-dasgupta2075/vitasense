/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0d1b4d",
        cyan: "#22d3ee",
        mint: "#34d399",
        panel: "#111b4b",
        shell: "#f4f8ff",
        glow: "#64f1d6"
      },
      boxShadow: {
        glass: "0 18px 45px rgba(23, 42, 93, 0.18)"
      },
      animation: {
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.75" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
