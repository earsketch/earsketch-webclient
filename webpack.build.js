/**
 * Websocket configs for building a release bundle for DEV / PROD servers.
 */
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = env => {
    const envFile = (env && env.flags) ? env.flags : path.resolve(__dirname, 'flags.env');
    const target = (env && env.target) ? env.target : 'prod';
    const apiHost = target==='prod' ? 'https://api.ersktch.gatech.edu' : 'https://earsketch-dev.lmc.gatech.edu';
    const webSocketURL = apiHost.replace('http', 'ws') + (target==='prod' ? '/EarSketchWS' : '/websocket');
    const clientBaseURI = (env && env.baseuri) ? env.baseuri : 'https://earsketch.gatech.edu/earsketch2';
    const release = (env && env.release) ? env.release : Date.now();

    return merge(common, {
        mode: 'production', // For both ES DEV and PROD servers.
        output: {
            // Generate JS files to...
            path: path.resolve(__dirname,'dist/'),
            filename: 'bundle.[hash].js',
            publicPath: 'dist/'
        },
        plugins: [
            // Environment variables
            new webpack.DefinePlugin({
                BUILD_NUM: JSON.stringify(release),
                FLAGS: require('dotenv').config({ path: envFile }).parsed,
                URL_DOMAIN: JSON.stringify(`${apiHost}/EarSketchWS`),
                URL_WEBSOCKET: JSON.stringify(`${webSocketURL}`),
                URL_SEARCHFREESOUND: JSON.stringify(`${apiHost}/EarSketchWS/services/audio/searchfreesound`),
                URL_SAVEFREESOUND: JSON.stringify(`${apiHost}/EarSketchWS/services/files/uploadfromfreesound`),
                URL_LOADAUDIO: JSON.stringify(`${apiHost}/EarSketchWS/services/audio/getaudiosample`),
                SITE_BASE_URI: JSON.stringify(`${clientBaseURI}`)
            }),
            new CleanWebpackPlugin()
        ],
        devtool: 'source-map'
    });
};