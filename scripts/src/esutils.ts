import { DAWData } from "./app/player"

export const measureToTime = (measure: number, tempo: number, timeSignature=4) => {
    if (tempo === -1) tempo = 120
    //tempo beats in 60 secs
    return (measure - 1.0) * timeSignature * 60.0 / tempo
}

export const timeToMeasure = (time: number, tempo: number, timeSignature=4) => {
    if (tempo === -1) tempo = 120
    // should this return measure + 1?
    // return tempo * 1 / 60 * time / timeSignature  // beat/min * min/sec * sec * measure/beat => measure

    // rounding at the 5th digit
    return toPrecision(time * (tempo/60) / timeSignature)
}

// Parses the language from a file extension using regex. Returns 'python' if
// the extension is '.py' and 'javascript' otherwise.
export const parseLanguage = (filename: string) => {
    const ext = parseExt(filename)
    if (ext === '.py') {
        return 'python'
    } else {
        return 'javascript'
    }
}

// Parse the filename (without extension) from a filename (with extension).
export const parseName = (filename: string) => {
    const match = filename.match(/(.+)\..+$/)
    return match ? match[1] : filename
}

// Parse the extension from a filename. Returns empty string if there is no extension.
export const parseExt = (filename: string) => {
    const match = filename.match(/.[^.]*$/)
    return match ? match[0] : ""
}

export const isMobileBrowser = () => {
    let a = window.navigator.userAgent || window.navigator.vendor || (window as any).opera
    return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
}

export const whichBrowser = () => {
    const ua = window.navigator.userAgent
    let tem, M
    M = ua.match(/edge\/\d+\.\d+/i)
    if (M) {
        M = M[0].split('/')
    } else {
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []

        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || []
            return 'IE ' + (tem[1] || '')
        }

        if (M[1] === 'Chrome') {
            tem = ua.match(/\bOPR\/(\d+)/)
            if (tem !== null) return 'Opera ' + tem[1]
        }

        M = M[2] ? [M[1], M[2]] : [window.navigator.appName, window.navigator.appVersion, '-?']

        if ((tem = ua.match(/version\/(\d+)/i)) !== null) {
            M.splice(1, 1, tem[1])
        }
    }

    return M.join(' ')
}

export const whichOS = () => {
    if (navigator.appVersion.indexOf("Win") !== -1) {
        return "Windows"
    } else if (navigator.appVersion.indexOf("Mac") !== -1) {
        return "MacOS"
    } else if (navigator.appVersion.indexOf("X11") !== -1) {
        return "UNIX"
    } else if (navigator.appVersion.indexOf("Linux") !== -1) {
        return "Linux"
    }
    return "Unknown OS"
}


// Returns a human-readable string that is convenient to copy and paste into
// integration tests. For scripts.
export const formatScriptForTests = (script: string) => {
    const lines = script.replace(/'/g, '"').split('\n')
    let s = '\n'
    let c = 0
    for (const line of lines) {
        if (line.startsWith('//')
            || line.startsWith('#')
            || line == "") {
            continue
        }
        if (c > 0) {
            s += '+ '
        }
        s += "'" + line + "\\n'\n"
        c++
    }
    return s
}

// Returns a human readable string that is convenient to copy and paste into
// integration tests. For script outputs. It returns only the relevant parts
// of the result object.
export const formatResultForTests = (result: DAWData) => {
    let s = '\n{\n'
    s += '    tempo: ' + result.tempo + ',\n'
    s += '    length: ' + result.length + ',\n'
    s += '    tracks: [\n'
    for (const track of result.tracks.slice(0, -1)) {
        s += '        {clips: ['
        if (track.clips.length > 0) {
            s += '\n'
        }
        for (const clip of track.clips) {
            const temp = {
                filekey: clip.filekey,
                measure: clip.measure,
                start: clip.start,
                end: clip.end,
                pitchshift: undefined as any,
            }
            if (clip.pitchshift !== undefined) {
                temp.pitchshift = {}
                temp.pitchshift.start = clip.pitchshift.start
                temp.pitchshift.end = clip.pitchshift.end
            }
            s += '            ' + JSON.stringify(temp) + ',\n'
        }
        if (track.clips.length > 0) {
            s += '        '
        }
        s += '],\n'
        s += '        effects: {'
        if (Object.keys(track.effects).length > 0) {
            s += '\n'
        }
        for (const key in track.effects) {
            s += '            "' + key + '":[\n'
            for (const range of track.effects[key]) {
                s += '                ' + JSON.stringify(range)
                s += ',\n'
            }
            s += '            ],\n'
        }
        if (Object.keys(track.effects).length > 0) {
            s += '        '
        }
        s += '}},\n'
    }
    s += '    ]\n'
    s += '}\n'

    return s
}

export const truncate = (value: number, digits: number) => {
    const sig = value > 0 ? 1 : -1
    return sig * Math.floor(sig * value * Math.pow(10, digits)) / Math.pow(10, digits)
}

export const toPrecision = (value: number, digits=5) => {
    return parseFloat(value.toPrecision(digits))
}

// Checks if the object "b" has the matching structure (properties) as the object "a".
export const compareObjStructure = (a: any, b: any): boolean => {
    if (!(typeof(a) === 'object' && typeof(b) === 'object')) {
        return false
    }

    if (Object.keys(a).length !== Object.keys(b).length) {
        return false
    }

    return Object.keys(a).every(function (v, i) {
        const keyComp = Object.keys(b)[i] === v
        if (keyComp) {
            const aIsObj = typeof(a[v]) === 'object'
            const bIsObj = typeof(b[v]) === 'object'

            if (aIsObj && bIsObj) {
                return compareObjStructure(a[v], b[v])
            } else {
                return !((aIsObj && !bIsObj) || (!aIsObj && bIsObj))
            }
        } else {
            return false
        }
    })
}

export const randomString = (length: number) => {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1)
}

// Returns the matching value or a null value if the parameter does not exist.
export const getURLParameter = (key: string) => {
    const params = new URLSearchParams(window.location.search + window.location.hash)
    return params.get(key)
}

export const checkIllegalCharacters = (input: string) => {
    const matchPattern = /[$-/:-?{-~!"^#`\[\]\\]/g
    return input.match(matchPattern)
}

// Calculates last modified time unit (previously in scriptBrowserController & mainController).
export const formatTimer = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30.5)
    const years = Math.floor(days / 365)

    switch (true) {
        case seconds < 1: return 'just now'
        case minutes < 1: return 'recently'
        case minutes < 2: return '1 minute ago'
        case hours < 1: return minutes + ' minutes ago'
        case hours < 2: return '1 hour ago'
        case days < 1: return hours + ' hours ago'
        case days < 2: return 'yesterday'
        case weeks < 1: return days + ' days ago'
        case weeks < 2: return 'last week'
        case months < 1: return weeks + ' weeks ago'
        case months < 2: return 'last month'
        case years < 1: return months + ' months ago'
        case years < 2: return 'last year'
        default: return years + ' years ago'
    }
}


const defaultTo = (value: number, defaultValue: number) => {
    return isNaN(value) ? defaultValue : value
}

/**
 * Returns a Gaussian Random Number around a normal distribution defined by the mean
 * and standard deviation parameters.
 *
 * Uses the algorithm used in Java's random class, which in turn comes from
 * Donald Knuth's implementation of the BoxÐMuller transform.
 *
 * @param {Number} [mean = 0.0] The mean value, default 0.0
 * @param {Number} [standardDeviation = 1.0] The standard deviation, default 1.0
 * @return {Number} A random number
 */
declare global {
    interface Math {
        randomGaussian: ((a: number, b: number) => number) & {nextGaussian?: number}
    }
}

Math.randomGaussian = (mean, standardDeviation) => {
    mean = defaultTo(mean, 0.0)
    standardDeviation = defaultTo(standardDeviation, 1.0)

    if (Math.randomGaussian.nextGaussian !== undefined) {
        const nextGaussian = Math.randomGaussian.nextGaussian
        delete Math.randomGaussian.nextGaussian
        return (nextGaussian * standardDeviation) + mean
    } else {
        let v1, v2, s
        do {
            v1 = 2 * Math.random() - 1 // between -1 and 1
            v2 = 2 * Math.random() - 1 // between -1 and 1
            s = v1 * v1 + v2 * v2
        } while (s >= 1 || s == 0)
        const multiplier = Math.sqrt(-2 * Math.log(s) / s)
        Math.randomGaussian.nextGaussian = v2 * multiplier
        return (v1 * multiplier * standardDeviation) + mean
    }
}