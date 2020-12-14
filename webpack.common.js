/**
 * The main webpack configuration file.
 */
const path = require('path');
const webpack = require('webpack');
const HappyPack = require('happypack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const vendorDir = 'scripts/vendor';
const libDir = 'scripts/lib';
const appDir = 'scripts/src/app';
const servicesDir = 'scripts/src/app/services';
const apiDir = 'scripts/src/api';
const dataDir = 'scripts/src/data';
const modelDir = 'scripts/src/model';

module.exports = {
    entry: {
        main: './scripts/src/index.js'
    },
    resolve: {
        extensions: ['*','.js','.jsx','.mjs','.wasm','.json','.css'],
        alias: {
            jqueryUI: 'jquery-ui-dist/jquery-ui.js',
            tabdrop: 'bootstrap-tabdrop-ro/js/bootstrap-tabdrop.js',
            bootstrapBundle: 'bootstrap/dist/js/bootstrap.bundle.min.js',
            uiBootstrap: 'angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
            skulpt: path.resolve(__dirname,`${vendorDir}/skulpt/skulpt.min.js`),
            skulptStdLib: path.resolve(__dirname,`${vendorDir}/skulpt/skulpt-stdlib.js`),
            droplet: path.resolve(__dirname,`${libDir}/droplet/droplet-full.min.js`),
            hilitor: path.resolve(__dirname,`${vendorDir}/hilitor.js`),
            highlight: path.resolve(__dirname,`${libDir}/highlightjs/highlight.pack.js`),
            acorn: path.resolve(__dirname,`${vendorDir}/js-interpreter/acorn.js`),
            jsInterpreter: path.resolve(__dirname,`${vendorDir}/js-interpreter/interpreter.js`),
            jsDiffLib: path.resolve(__dirname,`${libDir}/jsdifflib/difflib.js`),
            jsDiffView: path.resolve(__dirname,`${libDir}/jsdifflib/diffview.js`),
            kali: path.resolve(__dirname,`${libDir}/kali.min.js`),
            volumeMeter: path.resolve(__dirname,`${libDir}/volume-meter.js`),
            recorder: path.resolve(__dirname,`${libDir}/recorderjs/recorder.js`),
            dsp: path.resolve(__dirname,`${libDir}/dsp.js`),
            d3: path.resolve(__dirname,`${vendorDir}/d3.min.js`),
            aceJsWorker: path.resolve(__dirname,`${vendorDir}/ace/worker-javascript.js`),

            // Emscripten
            esDSP: path.resolve(__dirname,`${libDir}/earsketch-dsp.js`),
            esAppDSP: path.resolve(__dirname,`${libDir}/earsketch-appdsp.js`),

            ngClipboard: 'angular-clipboard',
            uiLayout: path.resolve(__dirname,`${libDir}/ui-layout.js`),
            uiUtils: path.resolve(__dirname,`${vendorDir}/angular/angular-ui-utils.min.js`),
            uiScroll: path.resolve(__dirname,`${libDir}/ui-scroll.min.js`),
            uiScrollGrid: path.resolve(__dirname,`${libDir}/ui-scroll-grid.min.js`),

            // Controllers
            mainController: path.resolve(__dirname,`${appDir}/mainController.js`),
            editorDirective: path.resolve(__dirname,`${appDir}/editorDirective.js`),
            diffDirective: path.resolve(__dirname,`${appDir}/diffDirective.js`),
            ideController: path.resolve(__dirname,`${appDir}/ideController.js`),
            tabController: path.resolve(__dirname,`${appDir}/tabController.js`),
            dawController: path.resolve(__dirname,`${appDir}/dawController.js`),
            uploadController: path.resolve(__dirname,`${appDir}/uploadController.js`),
            recorderController: path.resolve(__dirname,`${appDir}/recorderController.js`),
            soundBrowserController: path.resolve(__dirname,`${appDir}/soundbrowserController.js`),
            scriptBrowserController: path.resolve(__dirname,`${appDir}/scriptbrowserController.js`),
            shareBrowserController: path.resolve(__dirname,`${appDir}/sharebrowserController.js`),
            apiBrowserController: path.resolve(__dirname,`${appDir}/apibrowserController.js`),
            createAccountController: path.resolve(__dirname,`${appDir}/createaccountController.js`),
            changePasswordController: path.resolve(__dirname,`${appDir}/changepasswordController.js`),
            editProfileController: path.resolve(__dirname,`${appDir}/editProfileController.js`),
            adminWindowController: path.resolve(__dirname,`${appDir}/adminWindowController.js`),
            forgotPasswordController: path.resolve(__dirname,`${appDir}/forgotPasswordController.js`),
            shareController: path.resolve(__dirname,`${appDir}/shareController.js`),
            analyzeScriptController: path.resolve(__dirname,`${appDir}/analyzeScriptController.js`),
            scriptVersionController: path.resolve(__dirname,`${appDir}/scriptVersionController.js`),
            shareScriptController: path.resolve(__dirname,`${appDir}/shareScriptController.js`),
            submitAWSController: path.resolve(__dirname,`${appDir}/submitAWSController.js`),
            downloadController: path.resolve(__dirname,`${appDir}/downloadController.js`),
            renameController: path.resolve(__dirname,`${appDir}/renameController.js`),
            curriculumPaneController: path.resolve(__dirname,`${appDir}/curriculumPaneController.js`),
            curriculumSearchController: path.resolve(__dirname,`${appDir}/curriculumSearchController.js`),
            chatWindowDirective: path.resolve(__dirname,`${appDir}/chatWindowDirective.js`),
            createScriptController: path.resolve(__dirname,`${appDir}/createScriptController.js`),
            layoutController: path.resolve(__dirname,`${appDir}/layoutController.js`),
            promptController: path.resolve(__dirname,`${appDir}/promptController.js`),
            autograderController: path.resolve(__dirname,`${appDir}/autograderController.js`),
            autograder2Controller: path.resolve(__dirname,`${appDir}/autograder2Controller.js`),
            autograderAWSController: path.resolve(__dirname,`${appDir}/autograderAWSController.js`),
            autograder3Controller: path.resolve(__dirname,`${appDir}/autograder3Controller.js`),
            inputsController: path.resolve(__dirname,`${appDir}/inputsController.js`),
            userHistoryController: path.resolve(__dirname,`${appDir}/userHistoryController.js`),
            notificationUI: path.resolve(__dirname,`${appDir}/notificationUI.js`),

            // Models
            audioContext: path.resolve(__dirname,`${servicesDir}/audiocontext.js`),
            compiler: path.resolve(__dirname,`${servicesDir}/compiler.js`),
            reader: path.resolve(__dirname,`${servicesDir}/reader.js`),
            player: path.resolve(__dirname,`${servicesDir}/player.js`),
            renderer: path.resolve(__dirname,`${servicesDir}/renderer.js`),
            pitchShifter: path.resolve(__dirname,`${servicesDir}/pitchshifter.js`),
            audioLibrary: path.resolve(__dirname,`${servicesDir}/audiolibrary.js`),
            waveformCache: path.resolve(__dirname,`${servicesDir}/waveformcache.js`),
            uploader: path.resolve(__dirname,`${servicesDir}/uploader.js`),
            exporter: path.resolve(__dirname,`${servicesDir}/exporter.js`),
            esrecorder: path.resolve(__dirname,`${servicesDir}/esrecorder.js`),
            userConsole: path.resolve(__dirname,`${servicesDir}/userconsole.js`),
            esconsole: path.resolve(__dirname,`${servicesDir}/esconsole.js`),
            userNotification: path.resolve(__dirname,`${servicesDir}/userNotification.js`),
            userProject: path.resolve(__dirname,`${servicesDir}/userProject.js`),
            localStorage: path.resolve(__dirname,`${servicesDir}/localStorage.js`),
            completer: path.resolve(__dirname,`${servicesDir}/completer.js`),
            autograder: path.resolve(__dirname,`${servicesDir}/autograder.js`),
            layout: path.resolve(__dirname,`${servicesDir}/layout.js`),
            tabs: path.resolve(__dirname,`${servicesDir}/tabs.js`),
            colorTheme: path.resolve(__dirname,`${servicesDir}/colorTheme.js`),
            websocket: path.resolve(__dirname,`${servicesDir}/websocket.js`),
            collaboration: path.resolve(__dirname,`${servicesDir}/collaboration.js`),
            timesync: path.resolve(__dirname,`${servicesDir}/timesync.js`),
            reporter: path.resolve(__dirname,`${servicesDir}/reporter.js`),

            setup: path.resolve(__dirname,`scripts/src/setup.js`),
            modules: path.resolve(__dirname,`${modelDir}/modules.js`),
            esutils: path.resolve(__dirname,`${modelDir}/esutils.js`),
            applyEffects: path.resolve(__dirname,`${modelDir}/applyeffects.js`),
            analysis: path.resolve(__dirname,`${modelDir}/analysis.js`),
            wsapi: path.resolve(__dirname,`${modelDir}/wsapi.js`),
            helpers: path.resolve(__dirname,`scripts/src/helpers.js`),

            // ES API
            ngWrappers: path.resolve(__dirname,`${apiDir}/angular-wrappers.js`),
            passthrough: path.resolve(__dirname,`${apiDir}/passthrough.js`),
            jsAPI: path.resolve(__dirname,`${apiDir}/earsketch.js.js`),
            pyAPI: path.resolve(__dirname,`${apiDir}/earsketch.py.js`),

            // Data
            messages: path.resolve(__dirname,`${dataDir}/messages.js`),
            apiDoc: path.resolve(__dirname,`${dataDir}/api_doc.js`),
            numSlides: path.resolve(__dirname,`${dataDir}/num_slides.js`),
            
            // Curriculum Data
            // currToC: path.resolve(__dirname,`${dataDir}/curr_toc.js`),
            // currPages: path.resolve(__dirname,`${dataDir}/curr_pages.js`),
            // currSearchDoc: path.resolve(__dirname,`${dataDir}/curr_searchdoc.js`),

            // Recommendation JSON/js file
            numbersAudiokeys: path.resolve(__dirname,`${dataDir}/numbers_audiokeys.js`),
            audiokeysRecommendations: path.resolve(__dirname,`${dataDir}/audiokeys_recommendations.js`),
            ccSamples: path.resolve(__dirname,`${dataDir}/ccsamples.js`),

            // CAI
            complexityCalculator: path.resolve(__dirname,`${servicesDir}/complexityCalculator.js`),
            caiAnalysisModule: path.resolve(__dirname,`${servicesDir}/caiAnalysisModule.js`),
            recommender: path.resolve(__dirname,`${servicesDir}/recommender.js`)
        }
    },
    module: {
        // These files are preprocessed and loaded in a special way (e.g., making certain variables exportable).
        // Note that exports-loader does not expose the variables as semi-globals automatically, so they may need to be assigned to the window scope in index.js.
        rules: [{
            test: /\.(js|jsx|mjs)$/,
            exclude: [
                /(node_modules|bower_components)/,
                path.resolve(__dirname,libDir),
                path.resolve(__dirname,vendorDir),
                path.resolve(__dirname,dataDir),
                path.resolve(__dirname,'scripts/analytics')
            ],
            // loader: 'babel-loader',
            // options: { presets: ['@babel/env'] }
            use: 'happypack/loader'
        }, {
            test: /\.(js|jsx|mjs)$/,
            use: 'react-hot-loader/webpack',
            include: /node_modules/
        }, {
            test: /\.css$/,
            use: ['style-loader','css-loader','postcss-loader']
        }, {
            test: /\.(png|svg|jpg|jpeg|gif)$/,
            exclude: /(node_modules|bower_components)/,
            use: [{
                loader: 'file-loader',
                options: {
                    name: 'img/[hash]-[name].[ext]',
                }
            }],
        }, {
            test: path.resolve(__dirname,'scripts/src/setup.js'),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: ['doCopy','resizeNavigationWidth','ValueError']
            }
        }, {
            test: path.resolve(__dirname,`${libDir}/dsp.js`),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: ['DSP','FFT','WindowFunction']
            }
        }, {
            test: path.resolve(__dirname,`${libDir}/earsketch-dsp.js`),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: ['Module']
            }
        }, {
            test: path.resolve(__dirname,`${libDir}/earsketch-appdsp.js`),
            loader: 'exports-loader',
            options: {
                type: 'commonjs',
                exports: ['ESDSP_NumberOfSamples','ESDSP_WINDOW_SIZE','ESDSP_HOP_SIZE','ESDSP_MAX_BUFFERSIZE','ESDSP_MAX_OUTSAMPLES','ESDSP_MAX_FRAMES','ESDSP_FRAMES','ESDSP_OUTSAMPLES','ESDSP_INTERSAMPLES','esdsploadtest','setupCWrappers','initHeap','setupHeap','initDSPLibrary','freeHeap','setOutSample','setVariableShift','computeNumberOfFrames','computePitchShift']
            }
        }]
    },
    plugins: [
        // These names are pre-exposed as semi-global variables. No need to assign them to the window scope in index.js.
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            // AngularJS and bootstrap-tabdrop depend on the global jQuery variable
            'window.jQuery': 'jquery',

            SC: 'soundcloud',
            lunr: 'lunr',
            hljs: 'highlight',
            droplet: 'droplet',
            Interpreter: 'js-interpreter',
            acorn: 'acorn',
            d3: 'd3',
            lamejs: 'lamejs',
            JSZip: 'jszip',
            Hilitor: 'exports-loader?type=commonjs&exports=single Hilitor!hilitor',
            createAudioMeter: 'exports-loader?type=commonjs&exports=single createAudioMeter!volumeMeter',
            difflib: 'exports-loader?type=commonjs&exports=single difflib!jsDiffLib',

            // Data global variables
            EarSketch: 'exports-loader?type=commonjs&exports=single EarSketch!modules',
            ESMessages: 'exports-loader?type=commonjs&exports=single ESMessages!messages',
            ESApiDoc: 'exports-loader?type=commonjs&exports=single ESApiDoc!apiDoc',
            // ESCurr_TOC: 'exports-loader?type=commonjs&exports=single ESCurr_TOC!currToC',
            // ESCurr_Pages: 'exports-loader?type=commonjs&exports=single ESCurr_Pages!currPages',
            ESNum_Slides: 'exports-loader?type=commonjs&exports=single ESNum_Slides!numSlides',
            // ESCurr_SearchDoc: 'exports-loader?type=commonjs&exports=single ESCurr_SearchDoc!currSearchDoc',
            
            AUDIOKEYS_NUMBERS: 'exports-loader?type=commonjs&exports=single AUDIOKEYS_NUMBERS!audiokeysNumbers',
            NUMBERS_AUDIOKEYS: 'exports-loader?type=commonjs&exports=single NUMBERS_AUDIOKEYS!numbersAudiokeys',
            AUDIOKEYS_RECOMMENDATIONS: 'exports-loader?type=commonjs&exports=single AUDIOKEYS_RECOMMENDATIONS!audiokeysRecommendations',

            ServiceWrapper: 'exports-loader?type=commonjs&exports=single ServiceWrapper!ngWrappers',
            ES_PASSTHROUGH: 'exports-loader?type=commonjs&exports=single ES_PASSTHROUGH!passthrough',
            ES_JAVASCRIPT_API: 'exports-loader?type=commonjs&exports=single ES_JAVASCRIPT_API!jsAPI'
        }),
        new webpack.HotModuleReplacementPlugin(),
        new HappyPack({
            threads: 4,
            loaders: ['babel-loader?presets[]=@babel/env']
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname,'index.html'),
            template: 'templates/index.html',
            hash: true
        })
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                default: false
            }
        }
    }
}