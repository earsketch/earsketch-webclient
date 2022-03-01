/**
 * The main webpack configuration file.
 */
const path = require("path")
const webpack = require("webpack")
const HappyPack = require("happypack")
const HtmlWebpackPlugin = require("html-webpack-plugin")

const vendorDir = "scripts/vendor"
const libDir = "scripts/lib"
const appDir = "scripts/src/app"
const dataDir = "scripts/src/data"

module.exports = {
    entry: {
        main: "./scripts/src/index.tsx",
    },
    resolve: {
        extensions: ["*", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".wasm", ".json", ".css"],
        alias: {
            skulpt: path.resolve(__dirname, `${vendorDir}/skulpt/skulpt.min.js`),
            skulptStdLib: path.resolve(__dirname, `${vendorDir}/skulpt/skulpt-stdlib.js`),
            droplet: path.resolve(__dirname, `${libDir}/droplet/droplet-full.min.js`),
            highlight: path.resolve(__dirname, `${libDir}/highlightjs/highlight.pack.js`),
            jsInterpreter: path.resolve(__dirname, `${vendorDir}/js-interpreter/interpreter.js`),
            jsDiffLib: path.resolve(__dirname, `${libDir}/jsdifflib/difflib.js`),
            jsDiffView: path.resolve(__dirname, `${libDir}/jsdifflib/diffview.js`),
            kali: path.resolve(__dirname, `${libDir}/kali.min.js`),
            volumeMeter: path.resolve(__dirname, `${libDir}/volume-meter.js`),
            recorder: path.resolve(__dirname, `${libDir}/recorderjs/recorder.js`),
            dsp: path.resolve(__dirname, `${libDir}/dsp.js`),
            d3: path.resolve(__dirname, `${vendorDir}/d3.min.js`),
            aceJsWorker: path.resolve(__dirname, `${vendorDir}/ace/worker-javascript.js`),

            // Emscripten
            esDSP: path.resolve(__dirname, `${libDir}/earsketch-dsp.js`),

            // Controllers
            chatWindowDirective: path.resolve(__dirname, `${appDir}/chatWindowDirective.js`),
        },
    },
    module: {
        // These files are preprocessed and loaded in a special way (e.g., making certain variables exportable).
        // Note that exports-loader does not expose the variables as semi-globals automatically, so they may need to be assigned to the window scope in index.ts.
        rules: [{
            test: /\.(js|jsx|mjs)$/,
            exclude: [
                /(node_modules)/,
                path.resolve(__dirname, libDir),
                path.resolve(__dirname, vendorDir),
                path.resolve(__dirname, dataDir),
                path.resolve(__dirname, "scripts/analytics"),
            ],
            // loader: 'babel-loader',
            // options: { presets: ['@babel/env'] }
            use: "happypack/loader",
        }, {
            test: /\.(js|jsx|mjs)$/,
            use: "react-hot-loader/webpack",
            include: /node_modules/,
        }, {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        }, {
            test: /\.css$/,
            use: ["style-loader", "css-loader", "postcss-loader"],
        }, {
            test: /\.(png|svg|jpg|jpeg|gif)$/,
            exclude: /(node_modules)/,
            type: "asset/resource",
        }, {
            test: /\.(woff|woff2|eot|ttf|otf)$/i,
            type: "asset/resource",
        }, {
            test: path.resolve(__dirname, `${libDir}/dsp.js`),
            loader: "exports-loader",
            options: {
                exports: ["DSP", "FFT", "WindowFunction"],
            },
        }, {
            test: path.resolve(__dirname, `${libDir}/earsketch-dsp.js`),
            loader: "exports-loader",
            options: {
                type: "commonjs",
                exports: ["single Module"],
            },
        }],
    },
    plugins: [
        // These names are pre-exposed as semi-global variables. No need to assign them to the window scope in index.ts.
        new webpack.ProvidePlugin({
            SC: "soundcloud",
            lunr: "lunr",
            hljs: "highlight",
            droplet: "droplet",
            Interpreter: "js-interpreter",
            d3: "d3",
            lamejs: "lamejs",
            JSZip: "jszip",
            createAudioMeter: "exports-loader?type=commonjs&exports=single createAudioMeter!volumeMeter",
            difflib: "exports-loader?type=commonjs&exports=single difflib!jsDiffLib",
        }),
        new HappyPack({
            threads: 4,
            loaders: ["babel-loader?presets[]=@babel/env"],
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "index.html"),
            template: "public/index.html",
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "message-login.html"),
            template: "public/message-login.html",
            inject: false,
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "autograder/index.html"),
            template: "public/index.html",
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "codeAnalyzer/index.html"),
            template: "public/index.html",
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "codeAnalyzerCAI/index.html"),
            template: "public/index.html",
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "codeAnalyzerContest/index.html"),
            template: "public/index.html",
        }),
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                default: false,
            },
        },
    },
}
