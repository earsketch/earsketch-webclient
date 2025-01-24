import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ["skulpt"],
    },
    define: {
        global: {},
        BUILD_NUM: JSON.stringify("TODO"),
        SITE_BASE_URI: JSON.stringify("TODO"),
    },
})
