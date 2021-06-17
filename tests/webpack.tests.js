/**
 * Webpack configs for localhost development. Note that you don't need to run the NPM "build" script.
 */
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const common = require('../webpack.common.js');

const esHost = 'https://api-dev.ersktch.gatech.edu';
const wsHost = esHost.replace('http', 'ws');
const port = 9876;
const clientPath = 'base';
const envFile = path.resolve(__dirname, '../flags.env');
const release = Date.now();
const buildConfig = 'dev';
const baseURL = '/';
const currDir = path.resolve(__dirname, '../curriculum');

module.exports = merge(common, {
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
            test: require.resolve('angular'),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: 'single angular'
            }
        }, {
            test: require.resolve('ng-midway-tester/src/ngMidwayTester.js'),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: 'single ngMidwayTester'
            }
        }, {
            test: /allstyles.less/,
            use: ['style-loader','css-loader','less-loader']
        }]
    },
    resolve: {
        alias: {
            angular: 'angular',
            ngMidwayTester: 'ng-midway-tester/src/ngMidwayTester.js',
            currToC: `${currDir}/curr_toc.js`,
            currPages: `${currDir}/curr_pages.js`,
            currSearchDoc: `${currDir}/curr_searchdoc.js`
        }
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
            SITE_BASE_URI: JSON.stringify(`http://localhost:${port}/${clientPath}`)
        }),
        new webpack.ProvidePlugin({
            ESCurr_TOC: 'exports-loader?type=commonjs&exports=single ESCurr_TOC!currToC',
            ESCurr_Pages: 'exports-loader?type=commonjs&exports=single ESCurr_Pages!currPages',
            ESCurr_SearchDoc: 'exports-loader?type=commonjs&exports=single ESCurr_SearchDoc!currSearchDoc'
        })
    ],
    // This affects the rebuild (hot-reload) speed. Comment out for the fastest rebuild time.
    // See https://webpack.js.org/configuration/devtool/ for other source-mapping options.
    // devtool: 'eval-cheap-module-source-map',
    optimization: undefined
});