import docusaurus from "@docusaurus/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
    // TypeScript/TSX files configuration
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "@docusaurus": docusaurus,
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            ...docusaurus.configs.recommended.rules,
        },
    },
    // JavaScript/JSX files configuration
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@docusaurus": docusaurus,
        },
        rules: {
            ...docusaurus.configs.recommended.rules,
        },
    },
];
