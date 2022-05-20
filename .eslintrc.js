module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        "plugin:react/recommended",
        "standard",
        "plugin:json/recommended",
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
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_$", argsIgnorePattern: "^_$" }],
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": ["error", { functions: false, variables: false, classes: false }],
        "object-curly-spacing": "off",
        "@typescript-eslint/object-curly-spacing": ["error", "always"],
        "no-redeclare": "off",
        "@typescript-eslint/no-redeclare": ["error"],
        "@typescript-eslint/type-annotation-spacing": ["error"],
        "@typescript-eslint/prefer-for-of": ["error"],
        "space-before-function-paren": ["error", { named: "never" }],
        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "never",
        }],
        indent: "off",
        "@typescript-eslint/indent": ["error", 4, { SwitchCase: 1 }],
        quotes: ["error", "double", { avoidEscape: true }],
        "react/jsx-indent": ["error"],
        "react/jsx-indent-props": ["error", { ignoreTernaryOperator: true }],
        "react/jsx-curly-brace-presence": ["error"],
        "react/jsx-curly-newline": ["error", "never"],
        "react/jsx-curly-spacing": ["error", { children: true }],
        "jsx-quotes": ["error", "prefer-double"],
        "no-restricted-syntax": ["error", {
            selector: "!BinaryExpression[operator = /[=<>!]+/][left.callee.property.name = 'indexOf'][right.type=/Literal|UnaryExpression/]",
            message: "Use .includes() instead of comparing the result of .indexOf()",
        }],
        "prefer-arrow-callback": ["error"],
        "linebreak-style": ["error", "unix"],
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "no-undef": "off",
            },
        },
    ],
    settings: {
        react: {
            version: "detect",
        },
    },
}
