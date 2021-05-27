// Send data to Google Analytics for analysis.
import * as reader from "./reader"

const ACTIONS = {
    user: ["login", "logout", "openHistory", "sidebarTogglesClicked", "toggleColorTheme"],
    script: ["createScript", "deleteScript", "openScript", "openSharedScript", "renameScript", "renameSharedScript", "revertScript", "saveScript", "saveSharedScript"],
}

const module: { [key: string]: Function } = {}

for (const [category, actions] of Object.entries(ACTIONS)) {
    for (const action of actions) {
        module[action] = () => ga("send", {
            hitType: "event",
            eventCategory: category,
            eventAction: action,
        })
    }
}

function exception(msg: string) {
    ga("send", {
        hitType: "exception",
        exDescription: msg
    })
}

function readererror(msg: string) {
    ga("send", {
        hitType: "event",
        eventCategory: "reader",
        eventAction: "error",
        eventLabel: msg
    })
}

// Report script compilation outcome and duration (in milliseconds).
function compile(language: string, success: boolean, errorType: string, duration: number) {
    ga("send", {
        hitType: "event",
        eventCategory: "script",
        eventAction: "compile",
        eventLabel: language,
    })
    
    if (!success) {
        ga("send", {
            hitType: "event",
            eventCategory: "script",
            eventAction: "error",
            eventLabel: errorType,
        })
    }
    
    ga("send", {
        hitType: "timing",
        timingCategory: "script",
        timingVar: "compile",
        timingValue: duration,
    })
}

// Report the complexity score of a script.
function complexity(language: "python" | "javascript", script: string) {
    const features = reader.analyze(language, script)
    const total = reader.total(features)

    for (const [feature, count] of Object.entries(features)) {   
        ga("send", {
            hitType: "event",
            eventCategory: "complexity",
            eventAction: feature,
            eventLabel: count,
        })
    }
    
    ga("send", {
        hitType: "event",
        eventCategory: "complexity",
        eventAction: "total",
        eventLabel: total,
        eventValue: total,
    })
}

// Report a shared script.
function share(method: "link" | "people" | "soundcloud", license: string) {
    ga("send", {
        hitType: "event",
        eventCategory: "share",
        eventAction: "method",
        eventLabel: method,
    })

    ga("send", {
        hitType: "event",
        eventCategory: "share",
        eventAction: "license",
        eventLabel: license,
    })
}

export default { exception, readererror, compile, complexity, share, ...module };

// TODO: Disable in dev builds?
(function(i:any,s,o,g,r:any,a?:any,m?:any){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*(new Date() as any);a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,"script","https://www.google-analytics.com/analytics.js","ga")

ga("create", "UA-33307046-2", "auto")
ga("send", "pageview")

declare var ga: (action: string, data: any, mysterious_third_argument?: string) => void