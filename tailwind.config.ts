import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          black: "#000000",
          offwhite: "#F5F5F3",
          cream: "#EAE7E0",
          red: "#D32F2F",
          crimson: "#C62828",
          charcoal: "#121212",
          graphite: "#222222",
          muted: "#2C2C2C",
          gray: "#8A8A8A",
          silver: "#A0A0A0",
          gold: "#B8965A",
          goldLight: "#D4AF6E",
          // Editorial accent — Amber/Ember (grayscale)
          amber: "#8A8A8A",
          amberLight: "#A0A0A0",
          // Stone grey — secondary text
          stone: "#8A8A8A",
          stoneLight: "#E5E5E5",
        },
      },
      fontFamily: {
        display: ["'Oxanium'", "sans-serif"],
        body: ["'Outfit'", "system-ui", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      transitionTimingFunction: {
        streetwear: "cubic-bezier(0.16, 1, 0.3, 1)",
        luxury: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      letterSpacing: {
        ultra: "0.35em",
        "wider-xl": "0.25em",
        "wider-lg": "0.15em",
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease forwards",
        "fade-in": "fadeIn 0.6s ease forwards",
        "scale-in": "scaleIn 0.3s ease forwards",
        shimmer: "shimmer 2s linear infinite",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-left": "slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-up": "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-out-down": "slideOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "marquee-fast": "marquee 20s linear infinite",
        "accordion-down": "accordionDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "accordion-up": "accordionUp 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "menu-open": "menuOpen 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "menu-close": "menuClose 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideOutDown: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        accordionDown: {
          "0%": { height: "0px", opacity: "0" },
          "100%": { height: "var(--accordion-content-height, auto)", opacity: "1" },
        },
        accordionUp: {
          "0%": { height: "var(--accordion-content-height, auto)", opacity: "1" },
          "100%": { height: "0px", opacity: "0" },
        },
        menuOpen: {
          "0%": { opacity: "0", clipPath: "inset(0 0 100% 0)" },
          "100%": { opacity: "1", clipPath: "inset(0 0 0% 0)" },
        },
        menuClose: {
          "0%": { opacity: "1", clipPath: "inset(0 0 0% 0)" },
          "100%": { opacity: "0", clipPath: "inset(0 0 100% 0)" },
        },
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      screens: {
        "3xl": "1920px",
      },
    },
  },
  plugins: [],
};
export default config;
