// Global imports of CSS
import "../css/earsketch/allstyles.less"
import "./tailwind.css"
import "../fonts/icomoon_ultimate/style.css"
import "../fonts/roboto/roboto.css"
import "../fonts/lato/lato.css"
import "../fonts/hack/css/hack.css"
import "../lib/jsdifflib/diffview.css"

// TODO: These import globals for now.
import "jsDiffLib"
import "jsDiffView"
import "kali"

import * as ESUtils from "./esutils"

// NOTE: We import these for their side-effects.
import "./i18n"

import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"

import { App } from "./app/App"
import store, { persistor } from "./reducers"

import { Autograder } from "./app/Autograder"
import { CodeAnalyzer } from "./app/CodeAnalyzer"

// For Droplet:
import * as ace from "ace-builds"
import "ace-builds/src-noconflict/theme-chrome"
import "ace-builds/src-noconflict/mode-python"
// eslint-disable-next-line import/no-webpack-loader-syntax
import jsWorkerUrl from "file-loader!ace-builds/src-noconflict/worker-javascript"

(window as any).droplet = droplet
ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)

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
