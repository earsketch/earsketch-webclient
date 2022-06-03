// Send data to Google Analytics for analysis.

const ACTIONS = {
    user: ["login", "logout", "openHistory", "sidebarTogglesClicked", "toggleColorTheme"],
    script: ["createScript", "deleteScript", "openScript", "openSharedScript", "renameScript", "renameSharedScript", "revertScript", "saveScript", "saveSharedScript"],
}

const module: { [key: string]: Function } = {}

const gtag = window.gtag ?? (() => {})

for (const [category, actions] of Object.entries(ACTIONS)) {
    for (const action of actions) {
        module[action] = () => {
            ga("send", {
                hitType: "event",
                eventCategory: category,
                eventAction: action,
            })

            gtag("event", action, {
                event_category: category,
            })
        }
    }
}

function exception(msg: string) {
    ga("send", {
        hitType: "exception",
        exDescription: msg,
    })

    gtag("event", "exception", {
        description: msg,
    })
}

function readererror(msg: string) {
    ga("send", {
        hitType: "event",
        eventCategory: "reader",
        eventAction: "error",
        eventLabel: msg,
    })

    gtag("event", "reader_error", {
        event_category: "reader",
        event_label: msg,
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

    gtag("event", "compile", {
        event_category: "script",
        event_label: language,
    })

    if (!success) {
        ga("send", {
            hitType: "event",
            eventCategory: "script",
            eventAction: "error",
            eventLabel: errorType,
        })

        gtag("event", "script_error", {
            event_category: "script",
            event_label: errorType,
        })
    }

    ga("send", {
        hitType: "timing",
        timingCategory: "script",
        timingVar: "compile",
        timingValue: duration,
    })

    gtag("event", "timing_complete", {
        name: "compile",
        value: duration,
        event_category: "script",
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

    gtag("event", "share", {
        method: method,
    })

    ga("send", {
        hitType: "event",
        eventCategory: "share",
        eventAction: "license",
        eventLabel: license,
    })

    gtag("event", "share_license", {
        event_category: "share",
        event_label: license,
    })
}

function recommendation(name: string) {
    ga("send", {
        hitType: "event",
        eventCategory: "recommendation",
        eventAction: "recommendation",
        eventLabel: name,
    })

    gtag("event", "recommendation", {
        event_category: "recommendation",
        event_label: name,
    })
}

function recommendationUsed(name: string) {
    ga("send", {
        hitType: "event",
        eventCategory: "recommendation",
        eventAction: "recommendationUsed",
        eventLabel: name,
    })

    gtag("event", "recommendation_used", {
        event_category: "recommendation",
        event_label: name,
    })
}

function localeSelection(locale: string, autoDetected: boolean) {
    const action = autoDetected ? "detect_locate" : "select_locale"
    gtag("event", action, {
        event_category: "locale",
        event_label: locale,
    })
}

function localeMiss(detectedLocales: string[]) {
    gtag("event", "locale_miss", {
        event_category: "locale",
        event_label: detectedLocales.join(", "),
    })
}

function blocksMode(enterBlocksMode: boolean) {
    const action = enterBlocksMode ? "enter_blocks_mode" : "leave_blocks_mode"
    gtag("event", action, {
        event_category: "blocks",
    })
}

export default { exception, readererror, compile, share, recommendation, recommendationUsed, localeSelection, localeMiss, blocksMode, ...module } as { [key: string]: Function }

declare let ga: (action: string, data: any, mysteriousThirdArgument?: string) => void

if (FLAGS.ANALYTICS) {
    /* eslint-disable no-unused-expressions, no-sequences */
    (function (i: any, s, o, g, r: any, a?: any, m?: any) {
        i.GoogleAnalyticsObject = r; i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * (new Date() as any); a = s.createElement(o),
        m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
    })(window, document, "script", "https://www.google-analytics.com/analytics.js", "ga")

    gtag("js", new Date())
    gtag("config", "G-XTJQ05LB10")
    /* eslint-enable no-unused-expressions, no-sequences */
} else {
    (window as any).ga = (..._: any[]) => {}
    (window as any)["ga-disable-G-XTJQ05LB10"] = true
}

ga("create", "UA-33307046-2", "auto")
ga("send", "pageview")
