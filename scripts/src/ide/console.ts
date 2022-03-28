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
    store.dispatch(ide.pushLog({ level: "warn", text: i18n.t("console:warningHeading") + " >> " + text }))
}

export function error(error: string | Error) {
    store.dispatch(ide.pushLog({ level: "error", text: i18n.t("console:errorHeading") + " >> " + elaborate(error) }))
}

// Elaborate error messages printed to the user console. Available cases based on Skulpt's error messages and Node.js's errors.
export function elaborate(error: string | Error) {
    const msg = error.toString()
    const parts = msg.split(":")
    switch (parts[0]) {
        // Generic & Python-specific errors from Skulpt (errors.js)
        case "AssertionError":
            parts[0] = "AssertionError: " + i18n.t("console:errors.AssertionError")
            break
        case "AttributeError":
            parts[0] = "AttributeError: " + i18n.t("console:errors.AttributeError")
            break
        case "ImportError":
            parts[0] = "ImportError: " + i18n.t("console:errors.ImportError")
            break
        case "IndentationError":
            parts[0] = "IndentationError: " + i18n.t("console:errors.IndentationError")
            break
        case "IndexError":
            parts[0] = "IndexError: " + i18n.t("console:errors.IndexError")
            break
        case "KeyError":
            parts[0] = "KeyError: " + i18n.t("console:errors.KeyError")
            break
        case "NameError":
            parts[0] = "NameError: " + i18n.t("console:errors.NameError")
            break
        case "ParseError":
            parts[0] = "ParseError: " + i18n.t("console:errors.ParseError")
            break
        case "SyntaxError":
            parts[0] = "SyntaxError: " + i18n.t("console:errors.SyntaxError")
            break
        case "TypeError":
            parts[0] = "TypeError: " + i18n.t("console:errors.TypeError")
            break
        case "TokenError":
            parts[0] = "TokenError: " + i18n.t("console:errors.TokenError")
            break
        case "ValueError":
            parts[0] = "ValueError: " + i18n.t("console:errors.ValueError")
            break
        // JS-specific errors
        case "RangeError":
            parts[0] = "RangeError: " + i18n.t("console:errors.RangeError")
            break
        case "ReferenceError":
            parts[0] = "ReferenceError: " + i18n.t("console:errors.ReferenceError")
            break
        case "Unknown identifier":
            parts[0] = "Unknown identifier: " + i18n.t("console:errors.UnknownIdentifier")
            break
        // HTTP errors while communicating with server
        case "NetworkError":
            parts[0] = msg
            parts[1] = " " + i18n.t("console:errors.NetworkError")
            break
        case "ServerError":
            parts[0] = msg
            parts[1] = " " + i18n.t("console:errors.ServerError")
            break
        default:
            return msg
    }
    return parts
}
