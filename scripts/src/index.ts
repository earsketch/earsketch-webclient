// Global imports of CSS
import "../../css/earsketch/allstyles.less"
import "./tailwind.css"
import "./i18n"

import angular from "angular"

import { Question } from "./browser/questions"
(window as any).Question = Question  // Used inside curriculum.

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
import jsWorkerUrl from "file-loader!aceJsWorker"; // Includes ES APIs.
ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl)

import * as helpers from "./helpers"
import esconsole from "./esconsole"
import * as ESUtils from "./esutils"
import reporter from "./app/reporter"

window.droplet = droplet

// NOTE: We import this purely for its side-effects (registering a completer with Ace).
import "./app/completer"

import { react2angular } from "react2angular"

import { App } from "./app/App"
// Now entering: the modal zone.
import { AccountCreator } from "./app/AccountCreator"
import { ChangePassword } from "./app/ChangePassword"
import { CompetitionSubmission } from "./app/CompetitionSubmission"
import { Download } from "./app/Download"
import { ErrorForm } from "./app/ErrorForm"
import { ForgotPassword } from "./app/ForgotPassword"
import { ProfileEditor } from "./app/ProfileEditor"
import { Prompt } from "./app/Prompt"
import { RenameScript, RenameSound } from "./app/Rename"
import { ScriptAnalysis } from "./app/ScriptAnalysis"
import { ScriptCreator } from "./app/ScriptCreator"
import { ScriptHistory } from "./app/ScriptHistory"
import { ScriptShare } from "./app/ScriptShare"
import { SoundUploader } from "./app/SoundUploader"

// TODO: Temporary workaround for autograders 1 & 3, which replace the prompt function.
;(window as any).esPrompt = (message: string) => {
    const $uibModal = helpers.getNgService("$uibModal")
    return new Promise(resolve => $uibModal.open({
        component: "prompt",
        resolve: { message() { return message } },
    }).result.then((input: string) => resolve(input), () => resolve("")))
}

// Initialize SoundCloud.
// TODO: Make these environment variables. And maybe add an entry for default `npm run serve` port of 8080?
const SOUNDCLOUD_ID_MAP = {
    "earsketch.gatech.edu": "595113847a0edfd82dcfadeed2051dca",
    "earsketch-dev.lmc.gatech.edu": "0d5850bd5b161fa72864477f71de2317",
    "localhost:9090": "63b0323e190f967594cdaf5f8151ccf0",
    "localhost/": "cc046c69568c6aa15f4468e5b327b134",
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
    if (/MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(navigator.userAgent) !== null) {
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

// Async loading
(require as any)(["angular"], () => {
    // NPM
    require("bootstrapBundle")
    require("uiBootstrap")
    require("angular-animate")
    require("ngClipboard")
    require("angular-confirm")

    require("skulpt")
    require("skulptStdLib")
    require("js-interpreter")
    require("droplet")
    require("highlight")
    require("jsDiffLib")
    require("jsDiffView")
    require("lodash")
    require("kali")
    require("chance")

    window.app = angular.module("EarSketchApp", [
        "ui.bootstrap",
        "ngAnimate",
        "angular-clipboard",
        "angular-confirm",
    ]).config(["$locationProvider", ($locationProvider: any) => {
        // Prevent legacy hash-bang URL being overwritten by $location.
        $locationProvider.html5Mode(true).hashPrefix("")
    }])

    // In-house modules
    require("recorder")

    // Controllers
    require("adminWindowController")

    app.component("app", react2angular(App))
    app.filter("formatTimer", () => ESUtils.formatTime)
    // Temporary glue from $uibModal to React components.
    app.component("prompt", helpers.wrapModal(Prompt))
    app.component("createScriptController", helpers.wrapModal(ScriptCreator))
    app.component("forgotpasswordController", helpers.wrapModal(ForgotPassword))
    app.component("analyzeScriptController", helpers.wrapModal(ScriptAnalysis))
    app.component("editProfileController", helpers.wrapModal(ProfileEditor))
    app.component("changepasswordController", helpers.wrapModal(ChangePassword))
    app.component("downloadController", helpers.wrapModal(Download))
    app.component("scriptVersionController", helpers.wrapModal(ScriptHistory))
    app.component("renameController", helpers.wrapModal(RenameScript))
    app.component("renameSoundController", helpers.wrapModal(RenameSound))
    app.component("accountController", helpers.wrapModal(AccountCreator))
    app.component("submitCompetitionController", helpers.wrapModal(CompetitionSubmission))
    app.component("shareScriptController", helpers.wrapModal(ScriptShare))
    app.component("uploadSoundController", helpers.wrapModal(SoundUploader))
    app.component("errorController", helpers.wrapModal(ErrorForm))

    // Autograders
    require("autograderController")
    require("autograder2Controller")
    require("autograderAWSController")
    require("autograder3Controller")

    // CAI
    require("caiAnalysisModule")
    require("caiStudentHistoryModule")
    require("caiDialogue")
    require("codeSuggestion")

    app.factory("$exceptionHandler", () => {
        return (exception: any, cause: any) => {
            console.log(exception)
            esconsole(exception, ["error", "angular"])
            // ensures we don't report Skulpt errors to GA
            if (exception.args === undefined) {
                reporter.exception(exception.toString())
            }
        }
    })

    // Angular template cache buster. Uses the BUILD_NUM from main.js
    app.config(["$provide", function($provide: any) {
        return $provide.decorator("$http", ["$delegate", function($delegate: any) {
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