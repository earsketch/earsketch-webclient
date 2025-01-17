/**
 * Websocket configs for building a release bundle for DEV / PROD servers.
 */
const path = require("path")
const webpack = require("webpack")
const { merge } = require("webpack-merge")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")
const common = require("./webpack.common.js")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = env => {
    const envFile = (env && env.flags) ? env.flags : path.resolve(__dirname, "flags.env")
    const apiHost = (env && env.apihost) ? env.apihost : "builderror"
    const webSocketURL = apiHost.replace("http", "ws") + "/EarSketchWS"
    const clientBaseURI = (env && env.baseuri) ? env.baseuri : "https://earsketch.gatech.edu/earsketch2"
    const release = (env && env.release) ? env.release : Date.now()
    const buildConfig = (env && env.buildconfig) ? env.buildconfig : "dev"
    const baseURL = (env && env.baseurl) ? env.baseurl : "/earsketch2/"
    const mode = "production" // For both ES DEV and PROD servers.

    return merge(common(mode), {
        entry: {
            newrelic: `./public/newrelic/newrelicbrowser.${buildConfig}.js`,
        },
        module: {
            rules: [{
                test: /allstyles.less/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: clientBaseURI + "/dist",
                        },
                    },
                    "css-loader", "less-loader"],
            }],
        },
        plugins: [
            // Environment variables
            new webpack.DefinePlugin({
                BUILD_NUM: JSON.stringify(release),
                BASE_URL: JSON.stringify(baseURL),
                FLAGS: require("dotenv").config({ path: envFile }).parsed,
                URL_DOMAIN: JSON.stringify(`${apiHost}/EarSketchWS`),
                URL_WEBSOCKET: JSON.stringify(`${webSocketURL}`),
                SITE_BASE_URI: JSON.stringify(`${clientBaseURI}`),
            }),
            new CleanWebpackPlugin(),
            new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" }),
        ],
        devtool: "source-map",
    })
}
