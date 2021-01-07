require.config({
    baseUrl: 'scripts',
    paths: {
        // Vendor paths
        jquery:         '../node_modules/jquery/dist/jquery.min',
        jqueryui:       '../node_modules/jquery-ui-dist/jquery-ui.min',

        ng_upload: '../node_modules/ng-file-upload/dist/ng-file-upload.min',
        angular_clipboard:'../node_modules/angular-clipboard/angular-clipboard',

        chance: '../node_modules/chance/dist/chance.min',
        jszip: '../node_modules/jszip/dist/jszip.min',

        skulpt: 'vendor/skulpt/skulpt.min',
        skulptstdlib: 'vendor/skulpt/skulpt-stdlib',

        acorn: 'vendor/js-interpreter/acorn',
        js_interpreter: 'vendor/js-interpreter/interpreter',

        angular: '../node_modules/angular/angular',
        angular_animate: '../node_modules/angular-animate/angular-animate.min',
        angular_mocks: '../node_modules/angular-mocks/angular-mocks',

        angular_ui: '../node_modules/angular-resource/angular-resource.min',
        angular_res: '../node_modules/angular-ui-router/release/angular-ui-router.min',
        angular_ui_utils: 'vendor/angular/angular-ui-utils.min',

        angular_ui_bootstrap: '../node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls',
        angular_ui_layout: 'lib/ui-layout',
        angular_ui_scroll: 'lib/ui-scroll.min',
        angular_ui_scroll_grid: 'lib/ui-scroll-grid.min',

        angular_confirm: '../node_modules/angular-confirm/angular-confirm.min',
        angular_slider: '../node_modules/angularjs-slider/dist/rzslider',

        bootstrap: '../node_modules/bootstrap/dist/js/bootstrap.bundle.min',

        // Ace
        ace: '../node_modules/ace-builds/src-min/ace',
        chrome: '../node_modules/ace-builds/src-min/theme-chrome',
        monokai: '../node_modules/ace-builds/src-min/theme-monokai',
        pythonmode: '../node_modules/ace-builds/src-min/mode-python',
        javascriptmode: '../node_modules/ace-builds/src-min/mode-javascript',
        languagetools: '../node_modules/ace-builds/src-min/ext-language_tools',

        // Earsketch Javascript library
        angular_wrappers: 'src/api/angular-wrappers',
        espassthrough: 'src/api/passthrough',
        jslib: 'src/api/earsketch.js',
        pylib: 'src/api/earsketch.py',

        // autograder library
        autograder_common: 'src/api/autograder-common',
        autograder_py: 'src/api/autograder.py',

        // misc libraries
        d3: 'vendor/d3.min',
        lodash: '../node_modules/lodash/lodash.min',
        lamejs: '../node_modules/lamejs/lame.min',
        droplet: 'lib/droplet/droplet-full.min',

        tabdrop: '../node_modules/bootstrap-tabdrop-ro/js/bootstrap-tabdrop',

        // Curriculum search
        lunr: '../node_modules/lunr/lunr.min',
        hilitor: 'vendor/hilitor',

        // Lib paths
        cookies: 'lib/cookies',
        dsp: 'lib/dsp',
        esdsp: 'lib/earsketch-dsp',
        esdspapp: 'lib/earsketch-appdsp',
        recorder: 'lib/recorderjs/recorder',
        volume_meter: 'lib/volume-meter',
        highlight: 'lib/highlightjs/highlight.pack',
        kali: 'lib/kali.min',

        // Earsketch src
        setup: 'src/setup',

        // Earsketch src model
        modules: 'src/model/modules',
        esutils: 'src/model/esutils',
        applyeffects: 'src/model/applyeffects',
        analysis: 'src/model/analysis',
        wsapi: 'src/model/wsapi',

        // Earsketch src app controllers and directives
        app: 'src/app/app',
        maincontroller: 'src/app/mainController',
        editor: 'src/app/editorDirective',
        diff: 'src/app/diffDirective',
        idecontroller: 'src/app/ideController',
        tabcontroller: 'src/app/tabController',
        dawcontroller: 'src/app/dawController',
        uploadcontroller: 'src/app/uploadController',
        recordercontroller: 'src/app/recorderController',
        soundbrowsercontroller: 'src/app/soundbrowserController',
        scriptbrowsercontroller: 'src/app/scriptbrowserController',
        sharebrowsercontroller: 'src/app/sharebrowserController',
        apibrowsercontroller: 'src/app/apibrowserController',
        createaccountcontroller: 'src/app/createaccountController',
        changepasswordcontroller: 'src/app/changepasswordController',
        editProfileController: 'src/app/editProfileController',
        adminwindowcontroller: 'src/app/adminWindowController',
        forgotpasswordcontroller: 'src/app/forgotPasswordController',
        sharecontroller: 'src/app/shareController',
        analyzeScriptController: 'src/app/analyzeScriptController',
        scriptversioncontroller: 'src/app/scriptVersionController',
        sharescriptcontroller:'src/app/shareScriptController',
        submitAWSController:'src/app/submitAWSController',
        downloadcontroller:'src/app/downloadController',
        renamecontroller: 'src/app/renameController',
        curriculumpanecontroller: 'src/app/curriculumPaneController',
        curriculumsearchcontroller: 'src/app/curriculumSearchController',
        chatwindowdirective: 'src/app/chatWindowDirective',
        createscriptcontroller: 'src/app/createScriptController',
        layoutcontroller:'src/app/layoutController',
        promptController:'src/app/promptController',
        autogradercontroller: 'src/app/autograderController',
        autograder2controller: 'src/app/autograder2Controller',
        autograderAWScontroller: 'src/app/autograderAWSController',
        autograder3controller: 'src/app/autograder3Controller',
        inputsController: 'src/app/inputsController',
        userHistoryController: 'src/app/userHistoryController',
        notificationui: 'src/app/notificationUI',
        collabmanagercontroller: 'src/app/collabManagerController',

        // Earsketch src app services
        audiocontext: 'src/app/services/audiocontext',
        compiler: 'src/app/services/compiler',
        reader: 'src/app/services/reader',
        player: 'src/app/services/player',
        renderer: 'src/app/services/renderer',
        pitchshifter: 'src/app/services/pitchshifter',
        audiolibrary: 'src/app/services/audiolibrary',
        waveformcache: 'src/app/services/waveformcache',
        uploader: 'src/app/services/uploader',
        exporter: 'src/app/services/exporter',
        esrecorder: 'src/app/services/esrecorder',
        userconsole: 'src/app/services/userconsole',
        esconsole: 'src/app/services/esconsole',
        usernotification: 'src/app/services/userNotification',
        userproject: 'src/app/services/userProject',
        localstorage: 'src/app/services/localStorage',
        completer: 'src/app/services/completer',
        autograder: 'src/app/services/autograder',
        layout: 'src/app/services/layout',
        tabs: 'src/app/services/tabs',
        colorTheme: 'src/app/services/colorTheme',
        websocket: 'src/app/services/websocket',
        collaboration: 'src/app/services/collaboration',
        timesync: 'src/app/services/timesync',

        // Analytics
        analytics: 'src/app/services/reporter',

        // CAI (Co-creative AI) utilities

        caiStudent: 'src/app/services/caiStudent',
        caiStudentPreferenceModule: 'src/app/services/caiStudentPreferenceModule',
        caiStudentHistoryModule: 'src/app/services/caiStudentHistoryModule',
        complexityCalculator: 'src/app/services/complexityCalculator',
        caiAnalysisModule: 'src/app/services/caiAnalysisModule',

        // Recommender system
        recommender: 'src/app/services/recommender',

        // Recommendation JSON/js file
        audiokeys_numbers: 'vendor/audiokeys_numbers',
        numbers_audiokeys: 'vendor/numbers_audiokeys',
        audiokeys_recommendations: 'vendor/audiokeys_recommendations',

        // Complexity Calculator JS file
        cc_samples: 'vendor/ccsamples',

        soundcloud: '../node_modules/soundcloud/sdk',

        // Misc data
        messages: 'src/data/messages',
        apidoc: 'src/data/api_doc',
        curr_toc: 'src/data/curr_toc',
        curr_pages: 'src/data/curr_pages',
        num_slides: 'src/data/num_slides',
        curr_searchdoc: 'src/data/curr_searchdoc',

        // JS Diff Lib
        jsdifflib: 'lib/jsdifflib/difflib',
        jsdiffview: 'lib/jsdifflib/diffview'
    },
    shim: {
        jquery: {exports: '$'},
        soundcloud: {exports: 'SC'},
        acorn: {exports: 'acorn'},
        lunr: {exports: 'lunr'},
        angular: {
            deps: ['jquery'],
            exports: 'angular'
        },
        chance: {
          exports: 'chance'
        },
        angular_animate: {deps: ['angular']},
        angular_mocks: {deps: ['angular']},
        angular_res: {deps: ['angular']},
        angular_ui: {deps: ['angular_res']},
        angular_ui_utils: {deps: ['angular_res', 'angular_ui_layout']},
        angular_ui_layout : {deps: ['angular']},
        angular_ui_scroll : {deps: ['angular']},
        angular_ui_scroll_grid : {deps: ['angular']},
        ng_upload: {deps: ['angular']},
        angular_clipboard:{deps: ['angular']},
        pylib: {deps: ['app', 'espassthrough']},
        jslib: {deps: ['app', 'espassthrough']},
        autograder_py: {deps: ['app', 'autograder_common']},
        audiocontext: {deps: ['app']},
        audiolibrary: {deps: ['app', 'audiocontext', 'kali']},
        compiler: {deps: ['pitchshifter', 'audiolibrary', 'audiocontext', 'app']},
        reader: { deps: ['app'] },
        complexityCalculator: { deps: ['app', 'cc_samples'] },
        player: {deps: ['esutils', 'app', 'audiocontext', 'applyeffects', 'timesync']},
        renderer: {deps: ['esutils', 'app', 'applyeffects']},
        waveformcache: {deps: ['app']},
        userconsole: {deps: ['app']},
        esconsole: {deps: ['app']},
        usernotification: {deps: ['app']},
        pitchshifter: {deps: ['esutils', 'renderer', 'audiocontext', 'app', 'esdspapp']},
        kali: {deps: ['app']},
        esrecorder: {deps: ['app', 'recorder', 'volume_meter']},
        uploader: {deps: ['app']},
        exporter: {deps: ['app']},
        analytics: { deps: ['app'] },
        caiAnalysisModule: { deps: ['app', 'esutils', 'complexityCalculator', 'recommender', 'caiStudent']},
        recommender: {deps: ['app', 'audiokeys_numbers', 'numbers_audiokeys', 'audiokeys_recommendations']},
        esutils: {deps: ['app']},
        applyeffects: {deps: ['app']},
        analysis: {deps: ['applyeffects']},
        localstorage: {deps: ['app']},
        layout: {deps: ['app']},
        tabs: {deps: ['app']},
        colorTheme: {deps: ['app', 'localstorage', 'esconsole']},
        websocket: {deps: ['app', 'localstorage', 'esconsole', 'usernotification', 'collaboration']},
        collaboration: {deps: ['app']},
        timesync: {deps: ['app']},
        completer: {deps: ['app', 'ace', 'languagetools']},
        autograder: {deps: ['app','inputsController']},
        skulptstdlib: {deps: ['skulpt', 'chance']},
        js_interpreter: {deps: ['acorn', 'chance']},
        esdspapp: {deps: ['esdsp']},
        ace: {exports: 'ace'},
        chrome: {deps: ['ace']},
        monokai: {deps: ['ace']},
        pythonmode: {deps: ['ace']},
        javascriptmode: {deps: ['ace']},
        languagetools: {deps: ['ace']},
        lodash: {exports: "_"},
        espassthrough: {deps: ['app', 'analysis', 'angular_wrappers']},
        autograder_common: {deps: ['app', 'angular_wrappers']},
        wsapi: {deps: ['app']},
        app: {
            deps: ['angular', 'angular_animate', 'soundcloud', 'skulpt', 'skulptstdlib',
                'js_interpreter', 'd3', 'bootstrap', 'lodash', 'ace', 'ng_upload',
                'angular_clipboard', 'chance','angular_confirm',
                'angular_ui_scroll', 'angular_ui_scroll_grid'],
            exports: "app"
        },
        bootstrap: {
            deps: ['angular'],
            exports: 'Bootstrap'
        },

        angular_ui_bootstrap: {
            deps: ['angular', 'bootstrap'],
            exports: 'AngularBootstrapUI'
        },

        tabdrop: {
            deps: ['jquery', 'bootstrap']
        },

        maincontroller: {
            deps: ['app', 'audiolibrary', 'idecontroller', 'tabcontroller', 'userproject', 'dawcontroller',
                'uploadcontroller', 'recordercontroller', 'soundbrowsercontroller', 'sharebrowsercontroller',
                'scriptbrowsercontroller', 'apibrowsercontroller',
                'createaccountcontroller', 'forgotpasswordcontroller',
                'sharecontroller', 'scriptversioncontroller', 'renamecontroller', 'editProfileController', 'changepasswordcontroller', 'adminwindowcontroller', 'analyzeScriptController',
                'sharescriptcontroller', 'submitAWSController', 'downloadcontroller','curriculumpanecontroller', 'curriculumsearchcontroller', 'chatwindowdirective', 'layoutcontroller', 'localstorage',
                'promptController', 'colorTheme', 'layout', 'tabs', 'usernotification', 'notificationui', 'collabmanagercontroller']
        },
        editor: {deps: ['app', 'collaboration', 'websocket']},
        diff: {deps: ['app', 'highlight', 'jsdifflib', 'jsdiffview']},
        idecontroller: {deps: ['app', 'editor', 'compiler', 'renderer', 'uploader', 'userconsole', 'pylib', 'jslib', 'wsapi', 'createscriptcontroller', 'lamejs','completer', 'colorTheme', 'caiAnalysisModule']},
        tabcontroller: {deps: ['app', 'editor', 'compiler', 'renderer', 'uploader', 'userconsole', 'pylib', 'jslib', 'wsapi', 'createscriptcontroller', 'lamejs','completer', 'colorTheme']},
        userproject: {deps: ['app', 'modules', 'esutils', 'websocket']},
        dawcontroller: {deps: ['app', 'player', 'waveformcache', 'audiolibrary', 'applyeffects', 'angular_slider', 'timesync']},
        uploadcontroller: {deps: ['app', 'audiocontext', 'userconsole']},
        recordercontroller: {deps: ['app', 'esrecorder']},
        soundbrowsercontroller: {deps: ['app', 'recommender']},
        scriptbrowsercontroller: {deps: ['app']},
        apibrowsercontroller: {deps: ['app', 'apidoc']},
        createaccountcontroller: {deps: ['app']},
        forgotpasswordcontroller: {deps: ['app']},
        sharecontroller: {deps: ['app']},
        analyzeScriptController: {deps: ['app', 'reader']},
        scriptversioncontroller: {deps: ['app', 'diff']},
        sharebrowsercontroller: {deps: ['app']},
        sharescriptcontroller: {deps:['app', 'colorTheme', 'collaboration', 'websocket']},
        submitAWSController: {deps:['app', 'colorTheme', 'collaboration', 'websocket']},
        downloadcontroller: {deps:['app', 'exporter']},
        renamecontroller: {deps: ['app']},
        changepasswordcontroller: {deps: ['app']},
        editProfileController: {deps: ['app']},
        adminwindowcontroller: {deps: ['app', 'websocket']},
        curriculumpanecontroller: {deps: ['app', 'lunr', 'hilitor', 'curr_toc', 'curr_pages', 'num_slides', 'colorTheme', 'collaboration']},
        curriculumsearchcontroller: {deps: ['app', 'hilitor', 'curr_searchdoc']},
        chatwindowdirective: {deps: ['app']},
        layoutcontroller: {deps: ['app']},
        createscriptcontroller: {deps: ['app', 'userproject']},
        promptController: {deps: ['app']},
        inputsController: {deps: ['app']},
        autogradercontroller :    {
            deps: ['app', 'audiolibrary','compiler','modules','esutils','ng_upload']
        },
        autograder2controller :    {
            deps: ['app', 'audiolibrary','compiler','modules','esutils','ng_upload','autograder']
        },
        autograderAWScontroller :    {
            deps: ['app', 'audiolibrary','compiler','modules','esutils','ng_upload','autograder','reader', 'caiAnalysisModule']
        },
        autograder3controller :    {
            deps: ['app', 'audiolibrary','compiler','modules','esutils','ng_upload','autograder','reader', 'caiAnalysisModule']
        },
        userHistoryController :    {
            deps: ['app', 'audiolibrary','modules','esutils','ng_upload']
        },
        notificationui: {deps: ['app']},
        collabmanagercontroller: {deps: ['app']},
        highlight : {exports: 'hljs'},
        jsdifflib : {exports: 'jsdifflib'},
        jsdiffview : {deps: ['jsdifflib']},
        jquerybootpag: {deps: ['jquery', 'bootstrap']},
        setup: {
            deps: ['modules', 'userproject', 'highlight', 'jsdiffview', 'jquery',
                'jqueryui', 'ace', 'analytics', 'esconsole'],
            init: function () {
                angular.bootstrap(document, ['EarSketchApp']);
            }
        }
    },
    waitSeconds: 60.0
});

var showLoadingError = true; // TODO: global bad!
var loadingErrorMessage = 'EarSketch program could not be loaded! Please try refreshing the browser.'; // string.js not loaded yet
function loadingErrorCallback(error) {
    console.log(error);
    if (showLoadingError) {
        alert(loadingErrorMessage);
        showLoadingError = false;
    }
}

require(['jszip', 'angular_ui_utils', 'tabdrop', 'dsp', 'ace', 'droplet', 'acorn', 'lunr', 'maincontroller', 'autogradercontroller', 'autograder2controller', 'autograderAWScontroller', 'autograder3controller', 'userHistoryController','angular_ui_bootstrap'],
function (jszip, angular_ui_utils, tabdrop, dsp, ace, droplet, acorn, lunr, maincontroller, autogradercontroller, autograder2controller, autograderAWScontroller, autograder3controller, angular_ui_bootstrap) {
    window.JSZip = jszip;
    window.droplet = droplet;
    window.acorn = acorn;
    window.lunr = lunr;

    // parse out the base path
    var parser = document.createElement("a");
    parser.href = require.s.head.baseURI;

    if (typeof(parser.origin) !== 'undefined') {
        SITE_BASE_URI = parser.origin + parser.pathname;
    } else {
        SITE_BASE_URI = parser.href; // with Edge browser, parser.origin is empty
    }

    console.log('Loaded jquery, ace, bootstrap'); // OK

    var config = require("ace/config");
    config.set("packaged", true);

    var path = "scripts/vendor/ace";
    // let path = 'node_modules/ace-builds/src-min'
    config.set("basePath", path)

    require(['setup', 'messages', 'cookies'], function () {
        esconsole("Loaded setup", ['info', 'init']);
    }, loadingErrorCallback);
    require([], function () {
        console.log();
    });

}, loadingErrorCallback);
