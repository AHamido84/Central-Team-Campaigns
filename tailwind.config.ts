import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// All colors come from CSS variables in app/globals.css.
// Change the brand there (one place), not here.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        brand: {
          primary: v("brand-primary"),
          secondary: v("brand-secondary"),
          accent: v("brand-accent"),
        },
        border: v("border"),
        input: v("input"),
        ring: v("ring"),
        background: v("background"),
        foreground: v("foreground"),
        primary: { DEFAULT: v("primary"), foreground: v("primary-foreground") },
        secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        card: { DEFAULT: v("card"), foreground: v("card-foreground") },
        popover: { DEFAULT: v("popover"), foreground: v("popover-foreground") },
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },
        success: { DEFAULT: v("success"), foreground: v("success-foreground") },
        warning: { DEFAULT: v("warning"), foreground: v("warning-foreground") },
        sidebar: { DEFAULT: v("sidebar"), foreground: v("sidebar-foreground"), muted: v("sidebar-muted") },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 6px)", xl: "calc(var(--radius) + 4px)" },
      fontFamily: {
        sans: ["var(--font-arabic)", "var(--font-latin)", "system-ui", "sans-serif"],
        latin: ["var(--font-latin)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(15 27 45 / 0.04), 0 4px 16px rgb(15 27 45 / 0.06)",
      },
    },
  },
  plugins: [animate],
};
export default config;
