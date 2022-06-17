// Global imports of CSS
import "../css/earsketch/allstyles.less"
import "./tailwind.css"
import "../fonts/icomoon_ultimate/style.css"
import "../fonts/roboto/roboto.css"
import "../fonts/lato/lato.css"
import "../fonts/hack/css/hack.css"

// TODO: These import globals for now.
import "jsDiffLib"
import "jsDiffView"
import "kali"

import * as ace from "ace-builds"
import "ace-builds/src-noconflict/theme-monokai"
import "ace-builds/src-noconflict/theme-chrome"
import "ace-builds/src-noconflict/mode-python"
import "ace-builds/src-noconflict/mode-javascript"
import "ace-builds/src-noconflict/ext-language_tools"

// NOTE: This bloats the webpack output
// import "ace-builds/webpack-resolver"

// https://github.com/ajaxorg/ace/blob/master/demo/webpack/demo.js#L12
// eslint-disable-next-line import/no-webpack-loader-syntax
import jsWorkerUrl from "file-loader!ace-builds/src-noconflict/worker-javascript"

import * as ESUtils from "./esutils"

// NOTE: We import these for their side-effects.
import "./i18n"
import "./ide/completer"

import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"
import * as SC from "soundcloud"

import { App } from "./app/App"
import store, { persistor } from "./reducers"

import { Autograder } from "./app/Autograder"
import { CodeAnalyzer } from "./app/CodeAnalyzer"
import { CodeAnalyzerCAI } from "./app/CodeAnalyzerCAI"
import { CodeAnalyzerContest } from "./app/CodeAnalyzerContest"

// Only load the languages we need to highlight.
// (This avoids including a bunch of unneeded language modules in the bundle.)
import type _ from "highlight.js"
import hljs from "highlight.js/lib/core"
import python from "highlight.js/lib/languages/python"
import javascript from "highlight.js/lib/languages/javascript"
hljs.registerLanguage("python", python)
hljs.registerLanguage("javascript", javascript)

ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)

; (window as any).droplet = droplet

// Initialize SoundCloud.
// TODO: Make these environment variables. And maybe add an entry for default `npm run serve` port of 8080?
const SOUNDCLOUD_ID_MAP = {
    "earsketch.gatech.edu": "595113847a0edfd82dcfadeed2051dca",
    "localhost:8888": "05a5bed478578d302739bf9945a70539",
} as { [key: string]: string }

const domain = Object.keys(SOUNDCLOUD_ID_MAP).find(domain => SITE_BASE_URI.includes(domain))
if (domain) {
    SC.initialize({ client_id: SOUNDCLOUD_ID_MAP[domain], redirect_uri: SITE_BASE_URI + "/sc.html" })
}

if (ESUtils.isMobileBrowser()) {
    alert("It appears you are using a mobile browser. EarSketch is not equipped for mobile use.")
}

// Check for IE <= 10. This excludes 11, which returns appName as "Netscape" (like every other browser).
if (window.navigator.appName === "Microsoft Internet Explorer") {
    if (/MSIE ([0-9]{1,}[.0-9]{0,})/.exec(navigator.userAgent) !== null) {
        if (!Number.isNaN(parseFloat(RegExp.$1))) {
            window.location.replace("sorry.html")
        }
    }
}

// Check for minimum version of Chrome/Firefox. TODO: Update?
const M = ESUtils.whichBrowser().split(" ")
if ((M[0] === "Chrome" && +M[1] < 43) || (M[0] === "Firefox" && +M[1] < 36) || (M[0] === "Safari" && +M[1] < 14.1)) {
    alert("It appears you are using version " + M[1] + " of " + M[0] + ". Please upgrade your browser so that EarSketch functions properly.")
}

// Load the normal React app.
let Content
if (/\/autograder\w*\/?$/.test(location.href)) {
    Content = Autograder
} else if (/\/codeAnalyzerCAI\w*\/?$/.test(location.href)) {
    Content = CodeAnalyzerCAI
} else if (/\/codeAnalyzerContest\w*\/?$/.test(location.href)) {
    Content = CodeAnalyzerContest
} else if (/\/codeAnalyzer\w*\/?$/.test(location.href)) {
    Content = CodeAnalyzer
} else {
    Content = App
}

ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
            <PersistGate persistor={persistor}>
                <Content />
            </PersistGate>
        </Provider>
    </React.StrictMode>,
    document.getElementById("root")
)
