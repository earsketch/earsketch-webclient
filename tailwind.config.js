const colors = require("tailwindcss/colors")

module.exports = {
    content: [
        "./public/*.html",
        "./scripts/src/**/*.{ts,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            // Modify some of .prose styles
            typography: {
                DEFAULT: {
                    css: {
                        h2: { "margin-top": "1em" },
                        h3: { "margin-top": "0.6em" },
                        pre: null,
                        code: null,
                        "pre code": null,
                        "code::before": null,
                        "code::after": null,
                        "blockquote p:first-of-type::before": null,
                        "blockquote p:last-of-type::after": null,
                    },
                },
                dark: {
                    css: {
                        color: "#bbb",
                        h1: { color: "#fff" },
                        h2: { color: "#fff" },
                        h3: { color: "#fff" },
                    },
                },
            },
            colors: {
                amber: {
                    DEFAULT: "#F5AE3C",
                },
                blue: {
                    DEFAULT: "#223546",
                },
                green: colors.emerald,
                current: "currentColor",
            },
            keyframes: {
                shake: {
                    "0%, 100%": { transform: "translateX(0px)" },
                    "10%, 90%": { transform: "translateX(-1px)" },
                    "20%, 80%": { transform: "translateX(2px)" },
                    "30%, 50%, 70%": { transform: "translateX(-4px)" },
                    "40%, 60%": { transform: "translateX(4px)" },
                },
            },
            animation: {
                shake: "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
            },
        },
    },
    plugins: [
        require("@tailwindcss/typography"),
        require("@tailwindcss/forms")({
            strategy: "class", // only generate classes
        }),
    ],
}
