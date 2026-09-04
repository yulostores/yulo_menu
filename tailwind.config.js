/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Static equivalents of yulo_restaurant's shadcn CSS vars — this app has no
        // theme toggle, so plain hex keeps `text-muted-foreground` / `text-foreground`
        // working in the ported screens without pulling in the whole CSS-variable layer.
        foreground: "#24190f",
        muted: {
          DEFAULT: "#F5DFCE",
          foreground: "#8a7566",
        },
        // Same brand palette as yulo_restaurant (tailwind.config.js) — the guest sees
        // this app right after scanning a table QR, it should look like the same product.
        brand: {
          red: "#A4161A",
          orange: "#D9480F",
          maroon: "#B11226",
          cream: "#F5DFCE",
          dark: "#23180E",
          page: "#FFF8F5",
          saffron: "#F2A65A",
          green: "#2E7D32",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #A4161A 0%, #D9480F 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
