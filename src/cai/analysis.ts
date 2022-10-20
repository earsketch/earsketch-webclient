// Analysis module for CAI (Co-creative Artificial Intelligence) Project.
import { DAWData } from "common"
import { soundDict } from "../app/recommender"
import { CallObj, VariableObj, Results, getApiCalls, emptyResultsObject } from "./complexityCalculator"
import { state } from "./complexityCalculatorState"
import { analyzePython } from "./complexityCalculatorPY"
import { analyzeJavascript } from "./complexityCalculatorJS"
import { studentModel } from "./student"
import { TempoMap } from "../app/tempo"

interface MeasureItem {
    name: string
    type: "sound" | "effect"
    track: number
    // for sounds
    genre?: string
    instrument?: string
    // for effects
    param?: string
    value?: number
}

export interface MeasureView {
    [key: number]: MeasureItem []
}

interface Section {
    value: string
    measure: number[]
    sound: { [key: string]: { line: number[], measure: number[] } }
    effect: { [key: string]: { line: number[], measure: number[] } }
    subsections: { [key: string]: Section }
    numberOfSubsections: number
}

export interface SoundProfile {
    [key: string]: Section
}

export interface Report {
    OVERVIEW: { [key: string]: string | number }
    MEASUREVIEW: MeasureView
    SOUNDPROFILE: SoundProfile
    APICALLS: CallObj []
    COMPLEXITY?: Results
    VARIABLES?: VariableObj []
}

export let savedReport: Report = {
    OVERVIEW: {},
    MEASUREVIEW: {},
    SOUNDPROFILE: {},
    APICALLS: [],
}

// Report the code complexity analysis of a script.
export function analyzeCode(language: string, sourceCode: string) {
    if (language === "python") {
        return analyzePython(sourceCode)
    } else if (language === "javascript") {
        return analyzeJavascript(sourceCode)
    } else return emptyResultsObject()
}

// Report the music analysis of a script.
export function analyzeMusic(trackListing: DAWData, apiCalls?: CallObj [], variables?: VariableObj []) {
    return timelineToEval(trackToTimeline(trackListing, apiCalls, variables))
}

// Report the code complexity and music analysis of a script.
export function analyzeCodeAndMusic(language: string, sourceCode: string, trackListing: DAWData) {
    const codeComplexity = analyzeCode(language, sourceCode)
    const musicAnalysis = analyzeMusic(trackListing, getApiCalls())
    if (FLAGS.SHOW_CAI) {
        studentModel.musicAttributes.soundProfile = musicAnalysis.SOUNDPROFILE
    }
    return Object.assign({}, { Code: codeComplexity }, { Music: musicAnalysis })
}

// Convert compiler output to timeline representation.
function trackToTimeline(output: DAWData, apiCalls?: CallObj [], variables?: VariableObj []) {
    const report: Report = Object.create(null)
    // basic music information
    report.OVERVIEW = { measures: output.length, "length (seconds)": new TempoMap(output).measureToTime(output.length + 1) }
    if (!apiCalls) {
        apiCalls = getApiCalls()
    }
    if (apiCalls) {
        report.APICALLS = apiCalls
    }
    if (!variables) {
        variables = state.allVariables
    }
    if (variables) {
        report.VARIABLES = variables
    }
    let measureView: MeasureView = {}
    // report sounds used in each track
    for (const track of output.tracks) {
        if (track.clips.length < 1) {
            continue
        }

        for (const sample of track.clips) {
            if (sample.filekey.includes("METRONOME")) {
                continue
            }
            // report sound for every measure it is used in.
            for (let k = Math.floor(sample.measure + sample.start - 1); k < Math.ceil(sample.measure + sample.end - 1); k++) {
                if (!measureView[k]) {
                    measureView[k] = []
                }
                if (measureView[k]) {
                    // check for duplicate
                    let isDupe = false
                    for (const item of Object.values(measureView[k])) {
                        if (item.name === sample.filekey) {
                            isDupe = true
                            break
                        }
                    }
                    if (!isDupe) {
                        const soundInformation = soundDict[sample.filekey]
                        measureView[k].push({ type: "sound", track: sample.track, name: sample.filekey, genre: soundInformation?.genre, instrument: soundInformation?.instrument })
                    }
                }
            }
        }
        // report effects used in each track
        for (const effect of Object.values(track.effects)) {
            for (const sample of effect) {
                for (let n = sample.startMeasure; n <= (sample.endMeasure); n++) {
                    // If effect appears at all
                    if (!measureView[n]) {
                        measureView[n] = []
                    }
                    if (measureView[n]) {
                        let interpValue = sample.startValue
                        if (sample.endValue !== sample.startValue) {
                            // If effect is modified
                            const interpStep = (n - sample.startMeasure) / (sample.endMeasure - sample.startMeasure)
                            interpValue = (sample.endValue - sample.startValue) * interpStep
                        }
                        measureView[n].push({ type: "effect", track: sample.track, name: sample.name, param: sample.parameter, value: interpValue } as MeasureItem)
                    }
                }
            }
        }
    }

    // convert to measure-by-measure self-similarity matrix
    const measureKeys = Object.keys(measureView) // store original keys
    const measureDict: MeasureView = {}
    let count = 1
    for (const key of measureKeys) {
        while (count < Number(key) - 1) {
            measureDict[count] = []
            count += 1
        }
        measureDict[count] = measureView[Number(key)]
        count += 1
    }

    measureView = measureDict
    report.MEASUREVIEW = measureView

    const measureViewLength = Object.keys(measureView).length
    if (measureViewLength === 0) {
        report.SOUNDPROFILE = {}
        return report
    }

    const relations = Array(measureViewLength).fill(0).map(() => {
        return Array(measureViewLength).fill(0)
    })

    for (const overkey in measureView) {
        const row = Number(overkey) - 1
        for (const iterkey in measureView) {
            const column = Number(iterkey) - 1

            const i = new Set(measureView[iterkey].map(({ name }) => name))
            const o = new Set(measureView[overkey].map(({ name }) => name))
            const intersect = new Set([...o].filter(x => i.has(x)))
            const merge = new Set([...o, ...i])
            relations[row][column] = intersect.size / merge.size
            if (isNaN(relations[row][column])) {
                relations[row][column] = 0.0
            }
        }
    }

    const soundProfile: SoundProfile = {}
    const sectionNames = ["A", "B", "C", "D", "E", "F", "G"]
    const thresholds = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
    let sectionDepth = 0
    let numberOfDivisions = 1

    function populateSection(section: Section) {
        section.sound = {}
        section.effect = {}
        for (let i = section.measure[0]; i <= section.measure[1]; i++) {
            for (const item of measureView[i - 1]) {
                if (!section[item.type][item.name]) {
                    section[item.type][item.name] = { measure: [], line: [] }
                }
                section[item.type][item.name].measure.push(i)
                if (apiCalls) {
                    for (const codeLine of apiCalls) {
                        if (codeLine.clips.includes(item.name)) {
                            if (!section[item.type][item.name].line.includes(codeLine.line)) {
                                section[item.type][item.name].line.push(codeLine.line)
                            }
                        }
                    }
                }
            }
        }
    }

    for (let threshold of thresholds) {
        // If profile would be empty, create single section.
        if (threshold === 0.1 && Object.keys(soundProfile).length === 0) {
            threshold = 1.0
            numberOfDivisions = 0
        }
        const span = findSections(relations[0], threshold)
        const sectionMeasures = convertToMeasures(span, Object.keys(measureView))
        const sectionValues = sectionMeasures.map((section) => { return section.value })
        const uniqueValues = sectionValues.filter((v, i, a) => a.indexOf(v) === i)
        // TODO: Remove limit on sectionDepth
        if (sectionMeasures.length > numberOfDivisions && uniqueValues.length > 0 && sectionDepth < 3) {
            const sectionPairs: { [key: string]: string } = {}
            const sectionRepetitions: { [key: string]: number } = {}
            let sectionUse = 0
            for (const section of sectionMeasures) {
                if (!Object.prototype.hasOwnProperty.call(sectionPairs, section.value)) {
                    sectionPairs[section.value] = sectionNames[sectionUse]
                    sectionUse = sectionUse + 1
                    sectionRepetitions[section.value] = 0
                    section.value = sectionPairs[section.value]
                } else {
                    sectionRepetitions[section.value] += 1
                    let prime = ""
                    for (let i = 0; i < sectionRepetitions[section.value]; i++) {
                        prime = prime + "'"
                    }
                    section.value = sectionPairs[section.value] + prime
                }
                if (sectionDepth > 0) {
                    section.value = section.value + sectionDepth
                }
                let filled = false

                for (const profileSection of Object.values(soundProfile)) {
                    // Subsection TODO: Make recursive for infinite subsections
                    if (Number(section.measure[0]) >= Number(profileSection.measure[0]) &&
                        Number(section.measure[1]) <= Number(profileSection.measure[1])) {
                        if (Number(section.measure[0]) > Number(profileSection.measure[0]) ||
                            Number(section.measure[1]) < Number(profileSection.measure[1])) {
                            populateSection(section)
                            profileSection.numberOfSubsections += 1
                            section.value = profileSection.value + profileSection.numberOfSubsections
                            profileSection.subsections[section.value] = section
                        }
                        filled = true
                    }
                }
                if (!filled) {
                    populateSection(section)
                    soundProfile[section.value] = section
                    soundProfile[section.value].subsections = {}
                    soundProfile[section.value].numberOfSubsections = 0
                }
            }
            sectionDepth = sectionDepth + 1
            numberOfDivisions = sectionMeasures.length
        }
    }

    report.SOUNDPROFILE = soundProfile
    return report
}

// Convert timeline representation to evaluation checklist.
function timelineToEval(output: Report) {
    const report: Report = Object.create(null)

    report.OVERVIEW = output.OVERVIEW
    report.APICALLS = output.APICALLS
    report.VARIABLES = output.VARIABLES
    report.MEASUREVIEW = output.MEASUREVIEW
    report.SOUNDPROFILE = output.SOUNDPROFILE

    savedReport = Object.assign({}, report)

    return report
}

// Form Analysis: return list of consecutive lists of numbers from vals (number list).
function findSections(vals: number [], threshold: number = 0.25, step: number = 0) {
    let run: number[] = []
    const result = []
    const span = []
    let track = 0
    let expect = null

    for (const v of vals) {
        if (!expect || ((expect + threshold) >= v && v >= (expect - threshold))) {
            run.push(v)
        } else {
            result.push(run)
            run = [v]
        }
        expect = v + step
    }
    result.push(run)

    for (const lis of result) {
        if (lis.length !== 1) {
            span.push({ value: String(lis[0]), measure: [track, track + lis.length - 1], sound: {}, effect: {} } as Section)
            track += lis.length
        } else {
            track += lis.length
        }
    }
    return span
}

// Form Analysis: convert section number to original measure number.
function convertToMeasures(span: Section[], intRep: string[]) {
    const measureSpan: Section[] = []
    for (const i in span) {
        const tup = span[i].measure
        const newtup = [Number(intRep[tup[0]]) + 1, Number(intRep[tup[1]]) + 1]
        measureSpan.push({ value: span[i].value, measure: newtup } as Section)
    }
    return measureSpan
}

// Utility Functions: parse SoundProfile.
export function soundProfileLookup(soundProfile: SoundProfile, inputType: "section" | "value" | "measure", inputValue: string | number, outputType: "line" | "measure" | "sound" | "effect" | "value") {
    if (inputType === "section") {
        inputType = "value"
    }

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

function soundProfileReturn(section: Section, inputType: string, inputValue: string | number, outputType: "line" | "measure" | "sound" | "effect" | "value"): string | number | string [] | number [] {
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
            const soundAtLine = itemAtLine(section, inputValue, "sound")
            const effectAtLine = itemAtLine(section, inputValue, "effect")
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
        } default:
            return []
    }
}

function itemAtLine(section: Section, inputValue: string | number, outputType: "measure" | "sound" | "effect" | "value") {
    const ret: string [] = []
    for (const item of Object.values(section[outputType])) {
        if (item.line && item.line.includes(inputValue)) {
            ret.push(item)
        }
    }
    return ret
}

function linesForItem(section: Section, inputType: "measure" | "sound" | "effect", inputValue: string | number) {
    let ret: number [] = []
    if (inputType === "measure") {
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
    } else {
        for (const item of Object.keys(section[inputType])) {
            if (item === inputValue || inputValue === -1) {
                ret = ret.concat(section[inputType][item].line)
            }
        }
    }
    return ret
}
