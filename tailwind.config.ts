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
                porcelain: "#F9F5F2",
                "dusty-rose": "#E8D5D5",
                charcoal: "#2D2A2A",
                gold: {
                    DEFAULT: "#D4AF37",
                    light: "#E8CC6E",
                    dark: "#AA8C2C",
                },
                blush: {
                    DEFAULT: "#F2E6E6",
                    hover: "#F2E6E6",
                    light: "#F7F0F0",
                },
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
