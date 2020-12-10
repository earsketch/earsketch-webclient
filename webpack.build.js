/**
 * Websocket configs for building a release bundle for DEV / PROD servers.
 */
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = env => {
    let esHost = 'https://earsketch.gatech.edu'; // Default (prod)
    const port = (env && env.port) ? env.port : 8080;
    if (env && ['dev','local'].includes(env.target)) {
        esHost = env.target==='dev' ? 'https://earsketch-dev.lmc.gatech.edu' : 'http://localhost:'+port;
    }
    const clientPath = (env && env.path) ? env.path : 'earsketch2';
    const wsHost = esHost.replace('http', 'ws');
    const envFile = (env && env.flags) ? env.flags : path.resolve(__dirname, 'flags.env');
    const release = (env && env.release) ? env.release : Date.now();

    return merge(common, {
        mode: 'production', // For both ES DEV and PROD servers.
        output: {
            // Generate JS files to...
            path: path.resolve(__dirname,'dist/'),
            filename: 'bundle.js',
            // For testing with localhost, specify the build.js location from the localhost root. E.g.:
            // $ npm run build-dev -- --env.path=/path/to/dist/
            // The empty "--" is required for appending arguments. The path may need to be modified.
            publicPath: env.path ? env.path : 'dist/'
        },
        plugins: [
            // Environment variables
            new webpack.DefinePlugin({
                BUILD_NUM: JSON.stringify(release),
                FLAGS: require('dotenv').config({ path: envFile }).parsed,
                URL_DOMAIN: JSON.stringify(`${esHost}/EarSketchWS`),
                URL_WEBSOCKET: JSON.stringify(`${wsHost}/websocket`),
                URL_SEARCHFREESOUND: JSON.stringify(`${esHost}/EarSketchWS/services/audio/searchfreesound`),
                URL_SAVEFREESOUND: JSON.stringify(`${esHost}/EarSketchWS/services/files/uploadfromfreesound`),
                URL_LOADAUDIO: JSON.stringify(`${esHost}/EarSketchWS/services/audio/getaudiosample`),
                SITE_BASE_URI: JSON.stringify(`${esHost}/${clientPath}`)
            }),
            new CleanWebpackPlugin()
        ],
        devtool: 'source-map'
    });
};