module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        "plugin:react/recommended",
        "standard",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 12,
        sourceType: "module",
    },
    plugins: [
        "react",
        "@typescript-eslint",
    ],
    rules: {
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": ["error", { functions: false, variables: false, classes: false }],
        "@typescript-eslint/type-annotation-spacing": ["error"],
        "space-before-function-paren": ["error", { named: "never" }],
        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "never",
        }],
        indent: ["error", 4],
        quotes: ["error", "double", { avoidEscape: true }],
        "jsx-quotes": ["error", "prefer-double"],
        "no-restricted-syntax": ["error", {
            selector: "BinaryExpression > CallExpression > MemberExpression > Identifier[name = 'indexOf']",
            message: "Use .includes() instead of comparing the result of .indexOf()",
        }],
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "no-undef": "off",
            },
        },
    ],
}
