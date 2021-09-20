let ESConsoleTraceLevel = 2
const ESConsoleExcludedTags = ["DEBUG"]
const ESConsoleIncludedTags = ["WARNING", "ERROR", "FATAL"]
const ESLogExcludedTags = ["TEMP", "EXCLUDE", "NOLOG", "META"]
const ESLogIncludedTags = ["INFO", "USER", "WARNING", "ERROR", "FATAL"]

const parseArrayish = (arrayish: string | undefined) => {
    if (arrayish === undefined) {
        return []
    }

    // remove all quotes
    arrayish = arrayish.replace(/['"]+/g, "")

    const array = arrayish.match(/\[.*\]/)

    if (array) {
        return array[0].substring(1, array[0].length - 1).split(",")
    } else {
        return arrayish.split(",")
    }
}

/**
 * A public function that queries URL parameters for setting the esconsole and logging configurations. Called from the main controller at the app initialization. Following parameters are currently supported: trace={number} sets the global trace level, with number between 0 to 4. hide={tag(s)} to temporarily hide console log printing for certain tags. Input can be such as hide=foo, hide='foo', hide=foo,bar, hide=[foo,bar] (Note: double quotes would break: hide=%27foo%27). print/show={tag(s)} for overriding tags to be always printed, even ones already hidden. exclude={tag(s)} for temporarily disabling some tagged messages from being logged (for error report). include={tag(s)} for overriding the excluded tags.
 * @name getURLParameters
 * @function
 * @example
 * // Sets the traceLevel to 1, adds 'TEMP' to the tag list for not printing, adds 'MISC' and 'DEBUG' for the tag list for not logging.
 * // URL:
 * .../EarSketch/webclient/index.html?trace=1&hide=temp&exclude=["misc",DEBUG]
 */
const getURLParameters = () => {
    const query = window.location.hash.substring(2) // replaced with location.search considering # always being used in other URL queries
    const params = query.split("&")

    for (const param of params) {
        const keyVal = param.split("=")
        if (keyVal.length >= 2) {
            const key = keyVal[0].toLowerCase()
            const val = keyVal[1]

            switch (key) {
                case "trace":
                    setESConsoleTraceLevel(decodeURIComponent(val))
                    break
                case "print":
                case "show":
                    addESTagToPrint(parseArrayish(decodeURIComponent(val)))
                    break
                case "hide":
                    addESTagToNotPrint(parseArrayish(decodeURIComponent(val)))
                    break
                case "include":
                    addESTagToLog(parseArrayish(decodeURIComponent(val)))
                    break
                case "exclude":
                    addESTagToNotLog(parseArrayish(decodeURIComponent(val)))
                    break
                default:
                    break
            }
        }
    }
}

/**
 * Adds the esconsole tags to be always included for printing. Included tags override the excluded tags.
 * @name addESTagToPrint
 * @function
 * @param tags {string|array} A string or an array of strings.
 * @example
 * addESTagToPrint('MISC')
 * addESTagToPrint(['this', 'that'])
 */
const addESTagToPrint = (tags: string | string[]) => {
    if (typeof (tags) === "string") {
        ESConsoleIncludedTags.push(tags.toUpperCase())
    } else if (tags instanceof Array) {
        for (const tag of tags) {
            if (typeof (tag) === "string") {
                ESConsoleIncludedTags.push(tag.toUpperCase())
            }
        }
    }
    esconsole("Setting the tags to always show in the esconsole printing: " + ESConsoleIncludedTags.toString(), "meta", 0)
    return ESConsoleIncludedTags
}

/**
 * Sets the esconsole tags to be excluded from printing. Note that the excluded tags may still be overridden by the always-included tags.
 * @name addESTagToNotPrint
 * @function
 * @param tags {string|array} A string or an array of strings.
 * @example
 * addESTagToNotPrint('MISC')
 * addESTagToNotPrint(['this', 'that'])
 */
const addESTagToNotPrint = (tags: string | string[]) => {
    if (typeof (tags) === "string") {
        ESConsoleExcludedTags.push(tags.toUpperCase())
    } else if (tags instanceof Array) {
        for (const tag of tags) {
            if (typeof (tag) === "string") {
                ESConsoleExcludedTags.push(tag.toUpperCase())
            }
        }
    }
    esconsole("Setting the tags to be hidden in the esconsole printing: " + ESConsoleExcludedTags.toString(), "meta", 0)
    return ESConsoleExcludedTags
}

/**
 * Sets the global trace level for the esconsole function. If esconsole() locally specifies a trace level, the global level is ignored.
 * @param traceLevel {number} 0/null: no trace, 1: print caller function name (if availalbe), 2: print caller function name and source code location, 3: print a longer source code location (may be linked), 4: print full stack trace.
 * @param [saveToCookie=false] {boolean} To be implemented.
 * @returns {string}
 */
const setESConsoleTraceLevel = (traceLevel: number | string) => {
    if (typeof (traceLevel) === "number") {
        ESConsoleTraceLevel = traceLevel
    } else if (!isNaN(parseInt(traceLevel))) {
        ESConsoleTraceLevel = parseInt(traceLevel)
    }
    return esconsole("Setting the esconsole trace level: " + traceLevel, "meta", 0)
}

/**
 * A custom console.log function for ES developers. Tags can be set and filtered from being printed as well as being recorded to the developer log.
 * @name esconsole
 * @function
 * @param message {string|number|object|function} A message, value, or object to be printed in the developer console. By default, the message is recorded in the developer log for up to the MAX_LOGMESSAGGES set in the interpreter.js. With certain tags, the message will be skipped from logging.
 * @param [tag='DEV'] {string|array|null} All characters are converted to the upper case. A null value or '<empty>' will hide the tag when printing. Using tags such as 'TEMP', 'EXCLUDE', and 'NOLOG' will prevent the message from being recorded in the developer log, which can be modified with setESTagToLog() or setESTagToNotLog(). When using multiple tags, if any one is set to be filtered out, the message will be not printed or logged.
 * @param [traceLevel=3] {number} 0/null: no trace, 1: print caller function name (if availalbe), 2: print caller function name and source code location, 3: print a longer source code location (may be linked), 4: print full stack trace.
 * @param [logLevel=1] {number} Overrides the logg 0: no logging regardless of the tag filtering. 1 (default): logged with the tag filtering taken into account. 2: always logged regardless of the tag filtering.
 *
 * @example
 * esconsole('hello world')
 * -> [DEV] hello world at (caller:file:line:char)
 *
 * @example
 * esconsole(value, 'debug', 1)
 * -> [DEBUG] {
 *      foo: 123,
 *      bar: 456
 * } @ caller function
 *
 * @example
 * esconsole('just checking', 'temp', 0)
 * -> [TEMP] just checking // This will not be logged.
 *
 * @example
 * esconsole('multiple tags', ['debug', 'util'])
 * -> [DEBUG][UTIL] multiple tags at ...
 *
 * @example
 * addESTagToNotPrint('UTIL')
 * * esconsole('multiple tags', ['debug', 'misc'])
 * -> [DEBUG][MISC] multiple tags at ...
 * esconsole('multiple tags', ['debug', 'util'])
 * -> no output (still logged)
 */
const esconsole = (message: any, tag: string | string[] | null = null, traceLevel: number | null = null, logLevel = 1) => {
    const date = new Date()
    let log = date.toLocaleTimeString("en-GB") + "." + ("000" + date.getMilliseconds()).slice(-3) + " "
    let TAG: string | string[] = ""
    const defaultTraceLevel = 3
    const defaultIndentation = 4
    let messageIsError = false

    const stack = new Error().stack!
    const trace = stack.toString().split(/\r\n|\n/)
    const location = (trace[0] === "Error") ? trace[2] : trace[1]

    // This is intended to get the name of the second function in the stack trace (after esconsole) across browsers.
    // (Different browsers have different formats for error.stack.)
    // Previously, we could use `esconsole.caller`, but this is deprecated and disallowed in strict mode. :-(
    const callerMatch = (/(?:\s*at )?([^\s@]+)(?:@.*)?/).exec(location)
    const caller = callerMatch ? callerMatch[1].split("/")[0] : null

    // TODO: always set the trace level of logs to 2?

    if (message && message.constructor.name.match(/Error/g)) {
        messageIsError = true
    }

    if (tag instanceof Array) {
        if (tag.length === 1) {
            if ([null, ""].includes(tag[0])) {
                TAG = ""
            } else {
                if (typeof (tag[0]) === "string") {
                    TAG = tag[0].toUpperCase()
                } else {
                    TAG = "DEV"
                }
                log += "[" + TAG + "] "
            }
        } else if (tag.length > 1) {
            TAG = []
            for (const t of tag) {
                if (typeof (t) === "string") {
                    log += "[" + t.toUpperCase() + "]";
                    (TAG as string[]).push(t.toUpperCase())
                }
            }
            log += " "
        }
    } else {
        if ([null, ""].includes(tag)) {
            TAG = ""
        } else {
            if (typeof (tag) === "string") {
                TAG = tag.toUpperCase()
            } else {
                TAG = "DEV"
            }
            log += "[" + TAG + "] "
        }
    }

    if (typeof (message) === "object") {
        if (messageIsError) {
            log += message
        } else {
            log += JSON.stringify(message, null, defaultIndentation)
        }
    } else if (typeof (message) === "function") {
        log += message.toString(defaultIndentation)
    } else {
        log += message
    }

    if (traceLevel === undefined || traceLevel === null) {
        if (typeof (ESConsoleTraceLevel) === "number") {
            traceLevel = ESConsoleTraceLevel
        } else {
            traceLevel = defaultTraceLevel
        }
    } else if (typeof traceLevel === "string" && !isNaN(parseInt(traceLevel))) {
        traceLevel = parseInt(traceLevel)
    } else if (typeof traceLevel !== "number") {
        traceLevel = defaultTraceLevel
    }

    if (typeof logLevel === "string" && !isNaN(parseInt(logLevel))) {
        logLevel = parseInt(logLevel)
    }

    if (traceLevel === 1) {
        try {
            if (caller) {
                log += " @ " + caller + "()"
            } else {
                log += " @ " + "<anonymous>"
            }
        } catch (e) {
            console.log(e)
        }
    } else if (traceLevel === 2) {
        try {
            if (caller) {
                log += " @ " + caller + "()"
            } else {
                log += " @ " + "<anonymous>"
            }
        } catch (e) {
            console.log(e)
        }

        const match = location.match(/\/\w+\.js:\d+:\d+/)
        if (match) {
            log += " @ " + match[0].substring(1)
        }
    } else if (traceLevel === 3) {
        log += " " + location
    } else if (traceLevel === 4) {
        if (messageIsError) {
            log += " " + message.stack.toString()
        } else {
            log += " " + stack.toString()
        }
    }

    const output = log

    if (TAG instanceof Array) {
        let willShow = true
        for (const t of TAG) {
            if (ESConsoleExcludedTags.includes(t)) {
                willShow = false
            }
            if (ESConsoleIncludedTags.includes(t)) {
                willShow = true
            }
        }
        if (willShow) {
            // TODO: Use console.trace for getting the line number.
            console.log(output)
        }
    } else {
        if (ESLogIncludedTags.includes(TAG) || !ESLogExcludedTags.indexOf(TAG)) {
            console.log(output)
        }
    }

    switch (logLevel) {
        case 0:
            break
        case 2:
            ESLog(log)
            break
        case 1:
        default:
            ESLog(log, TAG)
            break
    }

    // For directly calling in the interactive dev console.
    return output
}

/**
 * Explicitly adds developer log messages to the internal log array. Note that ESLog() is also called automatically at esconsole(msg, tag) for certain tags, so developers should usually avoid using this function.
 * @name ESLog
 * @function
 * @param logText {string} A message to be recorded in the log.
 * @param [tag=undefined] {string|array} Used mainly by esconsole() to filter the logging. If not present (or undefined), the input is is always logged.
 * @example
 * ESLog('[CAT] meow!')
 * EarSketch.Interpreter.getCompleteLog()
 * -> [..., .., '[CAT] meow!']
 */
export const REPORT_LOG: string[] = []

const ESLog = (logText: string, tag: string | string[] | undefined = undefined) => {
    let TAG
    if (tag === undefined) {
        REPORT_LOG.push(logText)
    } else if (typeof (tag) === "string") {
        TAG = tag.toUpperCase()
        if (ESLogIncludedTags.includes(TAG) || !ESLogExcludedTags.indexOf(TAG)) {
            REPORT_LOG.push(logText)
        }
    } else if (tag instanceof Array) {
        let willLog = true
        for (const t of tag) {
            TAG = t.toUpperCase()
            if (ESLogExcludedTags.includes(TAG)) {
                willLog = false
            }
            if (ESLogIncludedTags.includes(TAG)) {
                willLog = true
            }
        }
        if (willLog) {
            REPORT_LOG.push(logText)
        }
    }
}

/**
 * Sets the esconsole tags to be always included for logging. Included tags override the excluded tags.
 * @name addESTagToLog
 * @function
 * @param tags {string|array} A string or an array of strings.
 * @example
 * addESTagToLog('MISC')
 * addESTagToLog(['this', 'that'])
 */
const addESTagToLog = (tags: string | string[]) => {
    if (typeof (tags) === "string") {
        ESLogIncludedTags.push(tags.toUpperCase())
    } else if (tags instanceof Array) {
        for (const tag of tags) {
            if (typeof (tag) === "string") {
                ESLogIncludedTags.push(tag.toUpperCase())
            }
        }
    }

    return esconsole("Setting the tags to be always logged: " + ESLogIncludedTags, "meta", 0)
}

/**
 * Sets the esconsole tags to be excluded from logging. Note that the excluded tags may still be overridden by the always-included tags.
 * @name addESTagToNotLog
 * @function
 * @param tags {string|array} A string or an array of strings.
 * @example
 * addESTagToNotLog('MISC')
 * addESTagToNotLog(['this', 'that'])
 */
const addESTagToNotLog = (tags: string | string[]) => {
    if (typeof (tags) === "string") {
        ESLogExcludedTags.push(tags.toUpperCase())
    } else if (tags instanceof Array) {
        for (const tag of tags) {
            if (typeof (tag) === "string") {
                ESLogExcludedTags.push(tag.toUpperCase())
            }
        }
    }

    return esconsole("Setting the tags to be excluded from loggin: " + ESLogExcludedTags, "meta", 0)
}

esconsole.getURLParameters = getURLParameters
esconsole.setESConsoleTraceLevel = setESConsoleTraceLevel
esconsole.addESTagToPrint = addESTagToPrint
esconsole.addESTagToNotPrint = addESTagToNotPrint
esconsole.ESLog = ESLog
esconsole.addESTagToLog = addESTagToLog
esconsole.addESTagToNotLog = addESTagToNotLog

export default esconsole
