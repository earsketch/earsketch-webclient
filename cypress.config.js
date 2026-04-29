import { defineConfig } from "cypress";

export default defineConfig({
  video: false,

  component: {
    supportFile: "tests/cypress/support/component.js",
    indexHtmlFile: "tests/cypress/support/component-index.html",
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
