module.exports = {
    purge: [],
    darkMode: 'class',
    theme: {
        extend: {
            // Modify some of .prose styles
            typography: {
                DEFAULT: {
                    css: {
                        h2: { 'margin-top': '1em' },
                        h3: { 'margin-top': '0.6em' },
                        pre: null,
                        code: null,
                        'pre code': null,
                        'code::before': null,
                        'code::after': null,
                        "blockquote p:first-of-type::before": null,
                        "blockquote p:last-of-type::after": null
                    }
                },
                dark: {
                    css: {
                        color: '#bbb',
			h1: { color: '#fff' },
			h2: { color: '#fff' },
			h3: { color: '#fff' },
                    }
                }
            }
        },
    },
    variants: ['hover', 'active', 'dark'],
    plugins: [
        require('@tailwindcss/typography')
    ],
    corePlugins: {
        preflight: true // Applies normalize.css to reset the default styles polluted by bootstrap, etc. See: https://tailwindcss.com/docs/preflight
    }
}
