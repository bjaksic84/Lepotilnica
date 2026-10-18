import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // ── Luxury palette ──
                // Warmed in the 2026 UI pass. The previous gold (#D4AF37) was a
                // bright metallic yellow that read cheaply across large fills;
                // the muted tone below holds up at section scale and sits
                // closer to the salon's actual gold signage. Names are
                // unchanged so every existing usage keeps working.
                porcelain: "#FBF7F3",
                "dusty-rose": "#E8D5D5",
                charcoal: "#2A2320",
                gold: {
                    DEFAULT: "#C7A567",
                    light: "#D9BC85",
                    dark: "#A8854A",
                },
                blush: {
                    DEFAULT: "#F3E8E5",
                    hover: "#F3E8E5",
                    light: "#F8F1EE",
                },
                /** Accent for italic display words — used sparingly in headings. */
                rose: {
                    DEFAULT: "#B07567",
                    dark: "#8E5F56",
                },
            },
            transitionTimingFunction: {
                /** Slow, long-travel motion (panels, filters, reveals). */
                silk: "cubic-bezier(.32,.72,0,1)",
                /** Short, snappy motion (buttons, icons, hovers). */
                swift: "cubic-bezier(.16,1,.3,1)",
            },
            fontFamily: {
                playfair: ["var(--font-playfair)", "serif"],
                sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
            },
            keyframes: {
                "aurora-drift": {
                    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
                    "33%": { transform: "translate(30px, -20px) scale(1.05)" },
                    "66%": { transform: "translate(-20px, 15px) scale(0.97)" },
                },
                "aurora-drift-reverse": {
                    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
                    "33%": { transform: "translate(-25px, 20px) scale(0.96)" },
                    "66%": { transform: "translate(20px, -15px) scale(1.04)" },
                },
                "aurora-breathe": {
                    "0%, 100%": { opacity: "0.4" },
                    "50%": { opacity: "0.6" },
                },
            },
            animation: {
                "aurora-1": "aurora-drift 20s ease-in-out infinite",
                "aurora-2": "aurora-drift-reverse 25s ease-in-out infinite",
                "aurora-3": "aurora-drift 30s ease-in-out infinite",
                "aurora-breathe": "aurora-breathe 8s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};
export default config;
