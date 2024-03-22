import i18n from "i18next"
import * as ide from "./ideState"
import store from "../reducers"

// Convenience wrappers for old users of userConsole:
export function clear() {
    store.dispatch(ide.setLogs([]))
}

export function status(text: string) {
    store.dispatch(ide.pushLog({ level: "status", text }))
}

export function log(text: string) {
    store.dispatch(ide.pushLog({ level: "info", text }))
}

export function warn(text: string) {
    store.dispatch(ide.pushLog({ level: "warn", text }))
}

export function error(error: string | Error) {
    store.dispatch(ide.pushLog({ level: "error", text: elaborate(error) }))
}

// Elaborate error messages printed to the user console. Available cases based on Skulpt's error messages and Node.js's errors.
export function elaborate(error: string | Error) {
    const msg = error.toString()
    const parts = msg.split(":")
    switch (parts[0]) {
        // Generic & Python-specific errors from Skulpt (errors.js)
        case "AssertionError":
        case "AttributeError":
        case "ImportError":
        case "IndentationError":
        case "IndexError":
        case "KeyError":
        case "NameError":
        case "SyntaxError":
        case "TypeError":
        case "TokenError":
        case "RangeError":
        case "ReferenceError":
        case "ValueError":
            parts[0] = parts[0] + ": " + i18n.t("console:errors." + parts[0])
            break
        // HTTP errors while communicating with server
        case "NetworkError":
        case "ServerError":
            parts[0] = msg
            parts[1] = " " + i18n.t("console:errors." + parts[0])
            break
        default:
            return msg
    }
    return parts.join(":")
}
