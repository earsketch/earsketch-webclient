import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react-swc"
import path from "path"

const release = process.env.ES_VERSION ?? Date.now()

let apiHost
let URL_WEBSOCKET
let SITE_BASE_URI
let baseURL
if (process.env.NODE_ENV === "production") {
    apiHost = process.env.ES_API_HOST ?? "builderror"
    URL_WEBSOCKET = apiHost.replace("http", "ws") + "/EarSketchWS"
    SITE_BASE_URI = process.env.ES_BASE_URI ?? "https://earsketch.gatech.edu/earsketch2"
    baseURL = process.env.ES_BASE_URL ?? "/earsketch2/"
} else {
    apiHost = "https://api-dev.ersktch.gatech.edu"
    const wsHost = apiHost.replace("http", "ws")
    URL_WEBSOCKET = `${wsHost}/EarSketchWS`
    const port = process.env.port ?? 8888
    const clientPath = process.env.path ? "/" + process.env.path : ""
    SITE_BASE_URI = `http://localhost:${port}${clientPath}`
    baseURL = process.env.ES_BASE_URL ?? "/"
}

// https://vite.dev/config/
export default defineConfig({
    base: baseURL,
    plugins: [react()],
    // https://vite.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies
    optimizeDeps: {
        include: ["droplet", "skulpt"],
    },
    build: {
        commonjsOptions: {
            include: [/droplet/, /skulpt/, /node_modules/],
        },
    },
    test: {
        environment: "jsdom",
    },
    resolve: {
        alias: {
            "@lib": path.resolve(__dirname, "lib"),
        },
    },
    define: {
        global: {},
        BUILD_NUM: JSON.stringify(release),
        URL_DOMAIN: JSON.stringify(`${apiHost}/EarSketchWS`),
        URL_WEBSOCKET: JSON.stringify(URL_WEBSOCKET),
        SITE_BASE_URI: JSON.stringify(SITE_BASE_URI),
    },
})
