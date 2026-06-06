import { loadEnv, splitVendorChunkPlugin } from "vite"
import { defineConfig } from "vitest/config"
import { adapter, analyzer } from "vite-bundle-analyzer"
import react from "@vitejs/plugin-react-swc"
import path from "path"

const release = process.env.ES_VERSION ?? Date.now()

let apiHost
let URL_WEBSOCKET
let SITE_BASE_URI
let baseURL
let buildType
const port = process.env.port ? +process.env.port : 8888
if (process.env.NODE_ENV === "production") {
    apiHost = process.env.ES_API_HOST ?? "builderror"
    URL_WEBSOCKET = apiHost.replace("http", "ws") + "/EarSketchWS"
    SITE_BASE_URI = process.env.ES_BASE_URI ?? "https://earsketch.gatech.edu/earsketch2"
    baseURL = process.env.ES_BASE_URL ?? "/earsketch2/"
    buildType = process.env.ES_BUILD_TYPE ?? "production"
} else {
    apiHost = "https://api-dev.ersktch.gatech.edu"
    const wsHost = apiHost.replace("http", "ws")
    URL_WEBSOCKET = `${wsHost}/EarSketchWS`
    const clientPath = process.env.path ? "/" + process.env.path : ""
    SITE_BASE_URI = `http://localhost:${port}${clientPath}`
    baseURL = process.env.ES_BASE_URL ?? "/"
    buildType = process.env.ES_BUILD_TYPE ?? "test"
}
const nrConfig = process.env.ES_NEWRELIC_CONFIG ?? "dev"

const isTest = !!process.env.VITEST

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd(), ["ES_WEB_"])
    return defineConfig({
        base: baseURL,
        plugins: [
            splitVendorChunkPlugin(),
            react(),
            ...(isTest ? [] : [adapter(analyzer({ analyzerMode: "static" }))]),
        ],
        // https://vite.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies
        optimizeDeps: {
            include: ["droplet", "skulpt"],
        },
        build: {
            commonjsOptions: {
                include: [/droplet/, /skulpt/, /node_modules/],
            },
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, "index.html"),
                    autograder: path.resolve(__dirname, "autograder/index.html"),
                },
            },
            sourcemap: buildType === "review",
        },
        test: {
            projects: [
                {
                    extends: true,
                    test: {
                        name: "unit",
                        environment: "jsdom",
                        include: ["tests/vitest/src/**/*.spec.{js,ts,jsx,tsx}"],
                    },
                },
                {
                    extends: true,
                    test: {
                        name: "scripts",
                        include: ["tests/vitest/scripts/**/*.spec.{js,ts,jsx,tsx}"],
                        setupFiles: ["./tests/vitest/scripts/setup.js"],
                        browser: {
                            enabled: true,
                            provider: "playwright",
                            headless: true,
                            instances: [{ browser: "chromium" }],
                        },
                    },
                },
            ],
        },
        server: {
            port,
        },
        preview: {
            port,
        },
        resolve: {
            alias: {
                "@lib": path.resolve(__dirname, "lib"),
                common: path.resolve(__dirname, "src/types/common"),
            },
        },
        define: {
            global: {},
            BUILD_NUM: JSON.stringify(release),
            URL_DOMAIN: JSON.stringify(`${apiHost}/EarSketchWS`),
            URL_WEBSOCKET: JSON.stringify(URL_WEBSOCKET),
            SITE_BASE_URI: JSON.stringify(SITE_BASE_URI),
            "import.meta.env.ES_NEWRELIC_CONFIG": JSON.stringify(nrConfig),
            ...env,
        },
    })
}
