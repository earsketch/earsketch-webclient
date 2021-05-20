interface Log {
    level: string
    text: string
}

export let logs: Log[] = []
// TODO: This can likely be eliminated via Redux after migrating ideController.
export let callbacks = { onUpdate: () => {} }

// Clears the user's error log.
export const clear = () => {
    logs = []
    callbacks.onUpdate()
}

// Use this method for messages that are caused by internal EarSketch functions and not by user scripts.
export const status = (msg: string) => {
    logs.push({
        level: 'status',
        text: String(msg)
    })
    scroll()
    callbacks.onUpdate()
}

// Adds information labeled 'info' to the user's error log.
export const log = (msg: any) => {
    var text = JSON.stringify(msg)
    // remove quotes from strings
    if (text[0] !== undefined && text[0] === '"' &&
        text[text.length-1] !== undefined && text[text.length-1] === '"') {
        text = text.substring(1, text.length-1)
    }
    logs.push({
        level: 'info',
        text: text
    })
    scroll()
    callbacks.onUpdate()
}

// Adds information labeled 'warn' to the user's error log and notifies user on the console.
export const warn = (msg: string) => {
    logs.push({
        level: 'warn',
        text: 'Warning message >> ' + String(msg)
    })
    scroll()
    callbacks.onUpdate()
}

// Adds information labeled 'error' to the user's error log and notifies user on the console.
export const error = (msg: string) => {
    logs.push({
        level: 'error',
        text: 'Error message >> ' + humanize(String(msg))
    })
    scroll()
    callbacks.onUpdate()
}

// Humanizes user warning and error messages printed to the user console. Available cases based on Skulpt's error messages and Node.js's errors.
const humanize = (msg: string) => {
    var parts = msg.split(":")
    switch (parts[0]) {
        // Generic & Python-specific errors from Skulpt (errors.js)
        case "AssertionError":
            parts[0] = "AssertionError: An assert statement failed"
            break
        case "AttributeError":
            parts[0] = "AttributeError: There is a mismatch between the object and the attribute"
            break
        case "ImportError":
            parts[0] = "ImportError: The appropriate packages cannot be found or imported"
            break
        case "IndentationError":
            parts[0] = "IndentationError: There is an indentation error in the code (lack or extra spaces)"
            break
        case "IndexError":
            parts[0] = "IndexError: There is an error using an out of range index"
            break
        case "KeyError":
            parts[0] = "KeyError: There is an error using a dictionary key that does not exist"
            break
        case "NameError":
            parts[0] = "NameError: There is an error with a variable or function name that is not defined"
            break
        case "ParseError":
            parts[0] = "ParseError: There is an error when reading the code"
            break
        case "SyntaxError":
            parts[0] = "SyntaxError: There is an error with the syntax (or arrangement) of code"
            break
        case "TypeError":
            parts[0] = "TypeError: There is an error with the expected data type"
            break
        case "TokenError":
            parts[0] = "TokenError: There is an unexpected token error (extra or missing comma, space, or character) in the code"
            break
        case "ValueError":
            parts[0] = "ValueError: A provided argument is not within the set or range of acceptable values for a function"
            break
        // JS-specific errors
        case "RangeError": 
            parts[0] = "RangeError: A provided argument is not within the set or range of acceptable values for a function"
            break 
        case "ReferenceError": 
            parts[0] = "ReferenceError: There is an error with a variable or function name that is not defined"
            break 
        case "Unknown identifier": 
            parts[0] = "ReferenceError: There is an error with a variable or function name that is not defined"
            break    
        // HTTP errors while communicating with server
        case "NetworkError":  
            parts[0] = msg
            parts[1] = " please try running the code again. If the issue persists, check your internet connection or contact network administrator."
            break
        case "ServerError": 
            parts[0] = msg
            parts[1] = " please try running the code again. If the issue persists, please report the issue using 'Report Error' in the options menu."        
            break
        default:
            return msg
    }
    return parts
}

// TODO: probably should put this in a directive
// autoscroll to the bottom of the console
export const scroll = () => {
    // need defer
    setTimeout(function () {
        var c = document.getElementById('console-frame')
        if (c) {
            c.scrollTop = c.scrollHeight
        }
    })
}