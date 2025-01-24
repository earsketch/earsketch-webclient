import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// TODO
const port = 8888
const clientPath = ""
const esHost = "https://api-dev.ersktch.gatech.edu"
const wsHost = esHost.replace("http", "ws")

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ["skulpt"],
    },
    define: {
        global: {},
        BUILD_NUM: JSON.stringify("TODO"),
        URL_DOMAIN: JSON.stringify(`${esHost}/EarSketchWS`),
        URL_WEBSOCKET: JSON.stringify(`${wsHost}/EarSketchWS`),
        SITE_BASE_URI: JSON.stringify(`http://localhost:${port}${clientPath}`),
    },
})
