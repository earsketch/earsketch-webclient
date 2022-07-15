/**
 * The main webpack configuration file.
 */
const path = require("path")
const webpack = require("webpack")
const HappyPack = require("happypack")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

const libDir = "lib"
const dataDir = "src/data"
const distDir = path.resolve(__dirname, "dist")
const newrelic = /public\/newrelic\/newrelicbrowser.*.js/

module.exports = {
    entry: {
        main: "./src/index.tsx",
        img: "./public/img/video-thumbnail.png",
        // Used for dynamic theme switching:
        light: "./css/earsketch/theme_light.css",
        dark: "./css/earsketch/theme_dark.css",
        // Only used by autograders:
        bootstrap: "./css/vendor/bootstrap.css",
        glyphicons: "./css/vendor/bootstrap-glyphicons.css",
    },
    output: {
        path: path.resolve(__dirname, "dist/"),
        filename: "bundle.[contenthash].js",
        publicPath: "",
    },
    resolve: {
        extensions: ["*", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".wasm", ".json", ".css"],
        alias: {
            droplet: path.resolve(__dirname, `${libDir}/droplet/droplet-full.min.js`),
            jsDiffLib: path.resolve(__dirname, `${libDir}/jsdifflib/difflib.js`),
            jsDiffView: path.resolve(__dirname, `${libDir}/jsdifflib/diffview.js`),
            kali: path.resolve(__dirname, `${libDir}/kali.min.js`),
            volumeMeter: path.resolve(__dirname, `${libDir}/volume-meter.js`),
            dsp: path.resolve(__dirname, `${libDir}/dsp.js`),
            d3: path.resolve(__dirname, `${libDir}/d3.min.js`),
            recorderWorker: path.resolve(__dirname, `${libDir}/recorderjs/recorderWorker.js`),
            pitchshiftWorklet: path.resolve(__dirname, `${libDir}/pitchshift/worklet.js`),
        },
    },
    module: {
        // These files are preprocessed and loaded in a special way (e.g., making certain variables exportable).
        // Note that exports-loader does not expose the variables as semi-globals automatically, so they may need to be assigned to the window scope in index.ts.
        rules: [{
            test: path.resolve(__dirname, `${libDir}/pitchshift/worklet.js`),
            type: "asset/resource",
        }, {
            test: path.resolve(__dirname, `${libDir}/recorderjs/recorderWorker.js`),
            type: "asset/resource",
        }, {
            test: path.resolve(__dirname, `${dataDir}/audiokeys_recommendations.json`),
            type: "asset/resource",
        }, {
            test: /\.(js|jsx|mjs)$/,
            exclude: [
                /(node_modules)/,
                newrelic,
                path.resolve(__dirname, libDir),
                path.resolve(__dirname, dataDir),
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
            exclude: /css\/(vendor\/|earsketch\/theme).*css/,
        }, {
            test: /css\/(vendor\/|earsketch\/theme).*css/,
            type: "asset/resource",
            generator: { filename: "[file]" },
        }, {
            test: path.resolve(__dirname, "public/img/video-thumbnail.png"),
            type: "asset/resource",
            generator: { filename: "img/video-thumbnail.png" },
        }, {
            test: newrelic,
            type: "asset/resource",
            generator: { filename: "newrelic/newrelicbrowser.js" },
        }, {
            test: /\.(png|svg|jpg|jpeg|gif)$/,
            exclude: /node_modules/,
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
        }],
    },
    plugins: [
        // These names are pre-exposed as semi-global variables. No need to assign them to the window scope in index.ts.
        new webpack.ProvidePlugin({
            SC: "soundcloud",
            droplet: "droplet",
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
            filename: path.resolve(distDir, "index.html"),
            template: "public/index.html",
            favicon: "public/favicon.ico",
        }),
        ...["sorry", "message-login", "index_maintenance"].map(name => new HtmlWebpackPlugin({
            filename: path.resolve(distDir, `${name}.html`),
            template: `public/${name}.html`,
            inject: false,
        })),
        ...["autograder", "codeAnalyzer", "codeAnalyzerCAI", "codeAnalyzerContest"].map(name => new HtmlWebpackPlugin({
            filename: path.resolve(distDir, `${name}/index.html`),
            template: "public/index_autograders.html",
            favicon: "public/favicon.ico",
        })),
        new BundleAnalyzerPlugin({
            analyzerMode: "static",
            openAnalyzer: false,
        }),
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                default: false,
            },
            chunks: "all",
        },
    },
}
