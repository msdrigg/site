/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [],
    corePlugins: {
        preflight: false,
        container: false,
    },
    darkMode: ["class", '[data-theme="dark"]'],
    content: [
        "./src/**/*.{jsx,tsx,html,mdx}",
        "./blog/**/*.{jsx,tsx,html,mdx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                sm: "4px",
            },
            screens: {
                sm: "0px",
                lg: "997px",
            },
            colors: {},
        },
    },
    plugins: [],
};
