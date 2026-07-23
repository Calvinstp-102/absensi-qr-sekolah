import type { Config } from "tailwindcss";

export default {
    content: [
        "./app/**/*.{vue,js,ts}",
        "./app/pages/**/*.vue",
        "./app/components/**/*.vue",
        "./app/layouts/**/*.vue",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#eef3f8",
                    100: "#d3e0ec",
                    400: "#3d6690",
                    600: "#1E3A5F",
                    700: "#162c48",
                    900: "#0d1b2d",
                },
                accent: {
                    400: "#e69455",
                    500: "#D97A2B",
                    600: "#b8621f",
                },
            },
            fontFamily: {
                heading: ['"Plus Jakarta Sans"', "sans-serif"],
                body: ["Inter", "sans-serif"],
            },
        },
    },
    plugins: [],
} satisfies Config;
