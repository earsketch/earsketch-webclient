// Analysis module for CAI (Co-creative Artificial Intelligence) Project.
import * as audioLibrary from "../app/audiolibrary"
import * as caiStudent from "./student"
import esconsole from "../esconsole"
import { DAWData, SoundEntity } from "common"
import * as recommender from "../app/recommender"
import * as cc from "./complexityCalculator"
import { analyzePython } from "./complexityCalculatorPY"
import { analyzeJavascript } from "./complexityCalculatorJS"

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
import AUDIOKEYS_RECOMMENDATIONS_ from "../data/audiokeys_recommendations.json"
import { TempoMap } from "../app/tempo"

const NUMBERS_AUDIOKEYS: { [key: string]: string } = NUMBERS_AUDIOKEYS_
const AUDIOKEYS_RECOMMENDATIONS: { [key: string]: { [key: string]: number[] } } = AUDIOKEYS_RECOMMENDATIONS_

let librarySounds: SoundEntity[] = []
const librarySoundGenres: string[] = []
const keyGenreDict: { [key: string]: string } = {}
const keyInstrumentDict: { [key: string]: string } = {}
let genreDist: number[][] = []
let savedReport: Report = {} as Report
export let savedAnalysis = {}

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

interface GenreListing {
    name: string
    value: number
}

export interface GenreView {
    [key: number]: GenreListing []
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
    EFFECTS: { [key: string]: string | number }
    MEASUREVIEW: MeasureView
    GENRE: GenreView
    MIXING: { grade: string | number, [key: string]: string | number }
    SOUNDPROFILE: SoundProfile
    APICALLS: cc.CallObj []
    COMPLEXITY?: cc.Results
}

// Populate the sound-browser items
function populateLibrarySounds() {
    librarySounds = []
    return audioLibrary.getStandardSounds().then(sounds => {
        librarySounds = sounds
        for (const sound of librarySounds) {
            keyGenreDict[sound.name] = sound.genre
            if (!librarySoundGenres.includes(sound.genre)) {
                librarySoundGenres.push(sound.genre)
            }
            keyInstrumentDict[sound.name] = sound.instrument
        }
    }).then(() => {
        esconsole("***WS Loading Custom Sounds OK...", ["info", "init"])
        esconsole("Reported load time from this point.", ["info", "init"])
    })
}

function populateGenreDistribution() {
    const genreDist = Array(librarySoundGenres.length).fill(0).map(() => Array(librarySoundGenres.length).fill(0))
    const genreCount = Array(librarySoundGenres.length).fill(0).map(() => Array(librarySoundGenres.length).fill(0))
    for (const keys in AUDIOKEYS_RECOMMENDATIONS) {
        try {
            // this checks to ensure that key is in dictionary
            // necessary because not all keys were labeled
            if (librarySoundGenres.includes(keyGenreDict[NUMBERS_AUDIOKEYS[keys]])) {
                const mainGenre = keyGenreDict[NUMBERS_AUDIOKEYS[keys]]
                const mainInd = librarySoundGenres.indexOf(mainGenre)
                for (const key in AUDIOKEYS_RECOMMENDATIONS[keys]) {
                    if (librarySoundGenres.includes(keyGenreDict[NUMBERS_AUDIOKEYS[key]])) {
                        const subGenre = keyGenreDict[NUMBERS_AUDIOKEYS[key]]
                        const subInd = librarySoundGenres.indexOf(subGenre)
                        genreDist[mainInd][subInd] += AUDIOKEYS_RECOMMENDATIONS[keys][key][0]
                        genreCount[mainInd][subInd] += 1
                    }
                }
            }
        } catch (error) {
            continue
        }
    }
    // iterates through matrix and averages
    for (const num in genreDist) {
        for (const number in genreDist) {
            if (genreCount[num][number] !== 0) {
                genreDist[num][number] = genreDist[num][number] / genreCount[num][number]
            }
        }
    }
    return genreDist
}

export function fillDict() {
    return populateLibrarySounds().then(() => {
        genreDist = populateGenreDistribution()
        recommender.setKeyDict(keyGenreDict, keyInstrumentDict)
    })
}

// Report the code complexity analysis of a script.
export function analyzeCode(language: string, script: string) {
    if (language === "python") {
        return analyzePython(script)
    } else if (language === "javascript") {
        return analyzeJavascript(script)
    } else return cc.emptyResultsObject({} as cc.ModuleNode)
}

// Report the music analysis of a script.
export function analyzeMusic(trackListing: DAWData, apiCalls?: cc.CallObj []) {
    return timelineToEval(trackToTimeline(trackListing, apiCalls))
}

// Report the code complexity and music analysis of a script.
export function analyzeCodeAndMusic(language: string, script: string, trackListing: DAWData) {
    const codeComplexity = analyzeCode(language, script)
    const musicAnalysis = analyzeMusic(trackListing, cc.getApiCalls())
    savedAnalysis = Object.assign({}, { Code: codeComplexity }, { Music: musicAnalysis })
    if (caiStudent && FLAGS.SHOW_CAI) {
        caiStudent.updateModel("musicAttributes", musicAnalysis)
    }
    return Object.assign({}, { Code: codeComplexity }, { Music: musicAnalysis })
}

// Convert compiler output to timeline representation.
function trackToTimeline(output: DAWData, apiCalls?: cc.CallObj []) {
    const report: Report = {} as Report
    // basic music information
    report.OVERVIEW = { measures: output.length, "length (seconds)": new TempoMap(output).measureToTime(output.length + 1) }
    report.EFFECTS = {}
    if (!apiCalls) {
        apiCalls = cc.getApiCalls()
    }
    if (apiCalls) {
        report.APICALLS = apiCalls
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
                        measureView[k].push({ type: "sound", track: sample.track, name: sample.filekey, genre: keyGenreDict[sample.filekey], instrument: keyInstrumentDict[sample.filekey] })
                    }
                }
            }
        }
        // report effects used in each track
        for (const effect of Object.values(track.effects)) {
            for (const sample of effect) {
                for (let n = sample.startMeasure; n <= (sample.endMeasure); n++) {
                    // If effect appears at all (level 1)
                    if (!measureView[n]) {
                        measureView[n] = []
                    }
                    if (report.EFFECTS[sample.name] < 1) {
                        report.EFFECTS[sample.name] = 1
                    }
                    if (measureView[n]) {
                        let interpValue = sample.startValue
                        // If effect isn't (level 2)/is modified (level 3)
                        if (sample.endValue === sample.startValue) {
                            if (report.EFFECTS[sample.name] < 2) {
                                report.EFFECTS[sample.name] = 2
                            }
                        } else {
                            // effect is modified (level 3)
                            const interpStep = (n - sample.startMeasure) / (sample.endMeasure - sample.startMeasure)
                            interpValue = (sample.endValue - sample.startValue) * interpStep
                            report.EFFECTS[sample.name] = 3
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
        report.GENRE = []
        report.SOUNDPROFILE = {}
        return report
    }

    report.GENRE = kMeansGenre(measureView)

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
    const report: Report = {} as Report

    report.OVERVIEW = output.OVERVIEW
    report.APICALLS = output.APICALLS

    const effectsGrade = ["Does Not Use", "Uses", "Uses Parameter", "Modifies Parameters"]
    const effectsList = ["VOLUME", "GAIN", "FILTER", "DELAY", "REVERB"]
    report.EFFECTS = {}

    report.EFFECTS.BPM = "Sets BPM"
    if (output.OVERVIEW.tempo !== 120) {
        report.EFFECTS.BPM = "Sets nonstandard BPM"
    }

    for (const effectName of effectsList) {
        report.EFFECTS[effectName] = effectsGrade[0]
        if (output.EFFECTS[effectName]) {
            report.EFFECTS[effectName] = effectsGrade[Number(output.EFFECTS[effectName])]
        }
    }

    report.MEASUREVIEW = output.MEASUREVIEW
    report.SOUNDPROFILE = output.SOUNDPROFILE
    report.GENRE = output.GENRE

    // Volume Mixing - simultaneous varying gain adjustments in separate tracks.
    report.MIXING = { grade: 0 }

    for (const i of Object.keys(report.MEASUREVIEW)) {
        const volumeMixing: { [key: number]: number } = {}

        for (const item of report.MEASUREVIEW[Number(i)]) {
            if (item.type === "effect") {
                if (item.param && item.param === "GAIN" && !volumeMixing[item.track]) {
                    if (item.value && !Object.values(volumeMixing).includes(item.value)) {
                        volumeMixing[item.track] = item.value
                    }
                }
            }
        }

        report.MIXING[i] = Object.keys(volumeMixing).length
        if (report.MIXING.grade < report.MIXING[i]) {
            report.MIXING.grade = report.MIXING[i]
        }
    }

    report.MIXING.grade = report.MIXING.grade + " simultaneous unique gains."

    savedReport = Object.assign({}, report)

    return report
}

export function getReport() {
    return savedReport
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

// Genre Analysis: return measure-by-measure list of recommended genre using co-usage data.
function kMeansGenre(measureView: MeasureView) {
    function getStanNumForSample(sample: string) {
        return librarySoundGenres.indexOf(keyGenreDict[sample])
    }

    function orderedGenreList(sampleList: string[]) {
        const temp: number[] = Array(librarySoundGenres.length).fill(0)
        for (const sample of sampleList) {
            temp[librarySoundGenres.indexOf(keyGenreDict[sample])] += 1
        }
        let maxi = Math.max(...temp)
        const multi = []
        for (const item in temp) {
            if (temp[item] === maxi) { multi.push(temp[item]) }
        }
        if (multi.length > 0) {
            for (const sample of sampleList) {
                for (const num of genreDist[getStanNumForSample(sample)]) {
                    temp[num] += genreDist[getStanNumForSample(sample)][num]
                }
            }
        }
        const genreList: GenreListing [] = []
        maxi = Math.max(...temp)
        while (maxi > 0) {
            for (const num in temp) {
                if (maxi === 0) {
                    return genreList
                }
                if (temp[num] === maxi && maxi > 0) {
                    const genreInList = Object.values(genreList).includes({ name: librarySoundGenres[num], value: temp[num] })
                    if (!genreInList) {
                        genreList.push({ name: librarySoundGenres[num], value: temp[num] })
                        temp[num] = 0
                        maxi = Math.max(...temp)
                    }
                }
            }
        }
        return genreList
    }

    const genreView = {} as GenreView
    for (const [measureIdx, measure] of Object.entries(measureView)) {
        const genreNameList: string[] = []
        for (const item of measure) {
            if (item.type === "sound" && keyGenreDict[item.name]) {
                genreNameList.push(item.name)
            }
        }
        genreView[Number(measureIdx)] = orderedGenreList(genreNameList)
    }

    return genreView
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
