/**
 * Webpack configs for localhost development. Note that you don't need to run the NPM "build" script.
 */
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

// TODO: variable esHost with env.target for localhost Tomcat server.
const esHost = 'https://api-dev.ersktch.gatech.edu';
const wsHost = esHost.replace('http', 'ws');

module.exports = env => {
    const port = (env && env.port) ? env.port : 8888;
    const clientPath = (env && env.path) ? '/' + env.path : '';
    const envFile = (env && env.flags) ? env.flags : path.resolve(__dirname, 'flags.env');
    const release = (env && env.release) ? env.release : Date.now();
    const buildConfig = (env && env.buildconfig) ? env.buildconfig : 'dev';
    const baseURL = (env && env.baseurl) ? env.baseurl : '/';

    return merge(common, {
        mode: 'development', // For localhost with websocket-dev-server
        output: {
            path: __dirname,
            filename: 'dist/bundle.js', // HtmlWebpackPlugin demands this workaround.
            publicPath: '/' // webclient folder
        },
        devServer: {
            publicPath: '/',
            port: port,
            hotOnly: true
        },
        module: {
            rules: [{
                test: /allstyles.less/,
                use: ['style-loader','css-loader','less-loader']
            }]
        },
        plugins: [
            // Environment variables
            new webpack.DefinePlugin({
                BUILD_NUM: JSON.stringify(release),
                BUILD_CONFIG: JSON.stringify(buildConfig),
                BASE_URL: JSON.stringify(baseURL),
                FLAGS: webpack.DefinePlugin.runtimeValue(
                    () => require('dotenv').config({ path: envFile }).parsed,
                    [envFile] // Watch the ~.env file and rebuild.
                ),
                URL_DOMAIN: JSON.stringify(`${esHost}/EarSketchWS`),
                URL_WEBSOCKET: JSON.stringify(`${wsHost}/EarSketchWS`),
                URL_LOADAUDIO: JSON.stringify(`${esHost}/EarSketchWS/services/audio/getaudiosample`),
                SITE_BASE_URI: JSON.stringify(`http://localhost:${port}${clientPath}`)
            })
        ],
        // This affects the rebuild (hot-reload) speed. Comment out for the fastest rebuild time.
        // See https://webpack.js.org/configuration/devtool/ for other source-mapping options.
        devtool: 'eval-cheap-module-source-map'
    });
}