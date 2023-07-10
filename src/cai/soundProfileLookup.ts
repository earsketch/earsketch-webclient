// Analysis module for CAI (Co-creative Artificial Intelligence) Project.
import { SoundProfile, Section } from "./analysis"

type LookupType = "measure" | "line" | "sound" | "effect" | "value"

// Utility Functions: parse SoundProfile.
export function soundProfileLookup(soundProfile: SoundProfile, inputType: LookupType, inputValue: string | number, outputType: LookupType) {
    function pushReturnValue(ret: (string | number)[], section: Section) {
        const returnValue = soundProfileReturn(section, inputType, inputValue, outputType)
        if (Array.isArray(returnValue)) {
            for (const value of returnValue) {
                if (value && !ret.includes(value)) {
                    ret.push(value)
                }
            }
        } else {
            ret.push(returnValue)
        }
    }

    const ret: (string | number)[] = []
    for (const section of Object.values(soundProfile)) {
        pushReturnValue(ret, section)
        if (section.subsections) {
            for (const subsection of Object.values(section.subsections)) {
                pushReturnValue(ret, subsection)
            }
        }
    }
    return ret
}

function soundProfileReturn(section: Section, inputType: LookupType, inputValue: string | number, outputType: LookupType): string | number | string [] | number [] {
    switch (inputType) {
        case "value":
            if (typeof inputValue === "string" && section[inputType][0] === inputValue[0]) {
                switch (outputType) {
                    case "line":
                        return linesForItem(section, "sound", -1).concat(linesForItem(section, "effect", -1))
                    case "measure": {
                        const measures = []
                        for (let idx = section[outputType][0]; idx < section[outputType][1]; idx++) { measures.push(idx) }
                        return measures
                    } case "sound":
                    case "effect":
                        return Object.keys(section[outputType])
                    default:
                        return section[outputType]
                }
            }
            return []
        case "sound":
        case "effect":
            if (section[inputType][inputValue]) {
                switch (outputType) {
                    case "line":
                        return linesForItem(section, inputType, inputValue)
                    case "measure":
                        return section[inputType][inputValue][outputType]
                    case "sound":
                    case "effect":
                        return Object.keys(section[outputType])
                    default:
                        return section[outputType]
                }
            }
            return []
        case "measure":
            if (section[inputType][0] <= Number(inputValue) && Number(inputValue) <= section[inputType][1]) {
                switch (outputType) {
                    case "line":
                        return linesForItem(section, inputType, inputValue)
                    case "sound":
                    case "effect":
                        return Object.keys(section[outputType])
                    default:
                        return section[outputType]
                }
            } else {
                return []
            }
        case "line": {
            const soundAtLine = itemAtLine(section, Number(inputValue), "sound")
            const effectAtLine = itemAtLine(section, Number(inputValue), "effect")
            switch (outputType) {
                case "value":
                case "measure":
                    if (Object.keys(soundAtLine).length > 0 || Object.keys(effectAtLine).length > 0) {
                        return section[outputType]
                    } else {
                        return []
                    }
                case "sound":
                    return soundAtLine
                case "effect":
                    return effectAtLine
            }
            return []
        }
    }
}

function itemAtLine(section: Section, inputValue: number, outputType: LookupType) {
    const ret: string [] = []
    if (outputType === "line") {
        return []
    }
    for (const item of Object.values(section[outputType])) {
        if (item.line && item.line.includes(inputValue)) {
            ret.push(item)
        }
    }
    return ret
}

function linesForItem(section: Section, inputType: LookupType, inputValue: string | number) {
    let ret: number [] = []
    switch (inputType) {
        case "measure":
            for (const sound of Object.values(section.sound)) {
                if (sound.measure.includes(Number(inputValue))) {
                    ret = ret.concat(sound.line)
                }
            }
            for (const effect of Object.values(section.effect)) {
                if (effect.measure.includes(Number(inputValue))) {
                    ret = ret.concat(effect.line)
                }
            }
            break
        case "sound":
        case "effect":
            for (const item of Object.keys(section[inputType])) {
                if (item === inputValue || inputValue === -1) {
                    ret = ret.concat(section[inputType][item].line)
                }
            }
    }
    return ret
}
