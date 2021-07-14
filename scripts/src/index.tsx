// Global imports of CSS
import "../../css/earsketch/allstyles.less"
import "./tailwind.css"
import "./i18n"

import angular from "angular"

// TODO: These import globals for now.
import "highlight"
import "jsDiffLib"
import "jsDiffView"
import "kali"
import "skulpt"
import "skulptStdLib"

import { Question } from "./browser/questions" // Used inside curriculum.

import "../../fonts/icomoon_ultimate/style.css"

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
import jsWorkerUrl from "file-loader!aceJsWorker"

import esconsole from "./esconsole"
import * as ESUtils from "./esutils"
import reporter from "./app/reporter"

// NOTE: We import this purely for its side-effects (registering a completer with Ace).
import "./ide/completer"

import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"

import { App } from "./app/App"
import store, { persistor } from "./reducers"
(window as any).Question = Question // Includes ES APIs.
ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)

;(window as any).droplet = droplet

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
if ((M[0] === "Chrome" && +M[1] < 24) || (M[0] === "Firefox" && +M[1] < 25)) {
    alert("It appears you are using version " + M[1] + " of " + M[0] + ". Please upgrade your browser so that EarSketch functions properly.")
}

if (/\/autograder|codeAnalyzer\w*\/?$/.test(location.href)) {
    // Temporary hack for autograders: load angular and don't start the React app on autograder endpoints.
    // TODO: Replace this with normal routing after autograders have been migrated.
    // Async loading
    (require as any)(["angular"], () => {
        // NPM
        require("bootstrapBundle")
        require("ng-file-upload")
        require("chance")

        ;(window as any).app = angular.module("EarSketchApp", ["ngFileUpload"]).config(["$locationProvider", ($locationProvider: any) => {
            // Prevent legacy hash-bang URL being overwritten by $location.
            $locationProvider.html5Mode(true).hashPrefix("")
        }])

        app.filter("formatTimer", () => ESUtils.formatTime)

        // Autograders
        require("autograderController")
        require("codeAnalyzerController")
        require("codeAnalyzerContestController")
        require("codeAnalyzerCAIController")

        app.factory("$exceptionHandler", () => {
            return (exception: any) => {
                console.log(exception)
                esconsole(exception, ["error", "angular"])
                // ensures we don't report Skulpt errors to GA
                if (exception.args === undefined) {
                    reporter.exception(exception.toString())
                }
            }
        })

        // Angular template cache buster. Uses the BUILD_NUM from main.js
        app.config(["$provide", function ($provide: any) {
            return $provide.decorator("$http", ["$delegate", function ($delegate: any) {
                const get = $delegate.get
                $delegate.get = (url: any, config: any) => {
                    // ignore Angular Bootstrap UI templates
                    // also unit tests won't like release numbers added
                    if (!url.includes("template/") && BUILD_NUM !== undefined) {
                        const parser = document.createElement("a")
                        parser.href = url
                        if (!parser.search) {
                            parser.search = "?release=" + BUILD_NUM
                        } else {
                            parser.search += "&release=" + BUILD_NUM
                        }
                        url = parser.href
                    }
                    return get(url, config)
                }
                return $delegate
            }])
        }])

        angular.bootstrap(document, ["EarSketchApp"], { strictDi: true })
    })
} else {
    // Load the normal React app.
    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <PersistGate persistor={persistor}>
                    <App />
                </PersistGate>
            </Provider>
        </React.StrictMode>,
        document.getElementById("root"))
}
