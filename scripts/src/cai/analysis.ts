// jscpd:ignore-start

// Analysis module for CAI (Co-creative Artificial Intelligence) Project.
import * as audioLibrary from "../app/audiolibrary"
import * as caiStudent from "./student"
import esconsole from "../esconsole"
import { DAWData } from "../app/player"
import * as recommender from "../app/recommender"
import { SoundEntity } from "common"
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
let genreDist: any = []
let savedReport = {}
export let savedAnalysis = {}

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
    } else return cc.emptyResultsObject({} as cc.AnyNode)
}

// Report the music analysis of a script.
export function analyzeMusic(trackListing: DAWData, apiCalls: any = null) {
    return timelineToEval(trackToTimeline(trackListing, apiCalls))
}

// Report the code complexity and music analysis of a script.
export function analyzeCodeAndMusic(language: string, script: string, trackListing: DAWData) {
    const codeComplexity = analyzeCode(language, script)
    const musicAnalysis = analyzeMusic(trackListing, cc.getApiCalls())
    savedAnalysis = Object.assign({}, { Code: codeComplexity }, { Music: musicAnalysis })
    if (caiStudent !== null && FLAGS.SHOW_CAI) {
        caiStudent.updateModel("musicAttributes", musicAnalysis)
    }
    return Object.assign({}, { Code: codeComplexity }, { Music: musicAnalysis })
}

// Convert compiler output to timeline representation.
function trackToTimeline(output: DAWData, apiCalls: any = null) {
    const report: any = {}
    // basic music information
    report.OVERVIEW = { measures: output.length, "length (seconds)": new TempoMap(output).measureToTime(output.length + 1) }
    report.EFFECTS = {}
    apiCalls = cc.getApiCalls()
    if (apiCalls !== null) {
        report.APICALLS = apiCalls
    }
    let measureView: { [key: number]: any[] } = {}
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
                    for (const p in Object.keys(measureView[k])) {
                        if (measureView[k][p].name === sample.filekey) {
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
        Object.keys(track.effects).forEach((effectName) => {
            for (const sample of track.effects[effectName]) {
                for (let n = sample.startMeasure; n <= (sample.endMeasure); n++) {
                    // If effect appears at all (level 1)
                    if (measureView[n] === null) {
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
                        measureView[n].push({ type: "effect", track: sample.track, name: sample.name, param: sample.parameter, value: interpValue })
                    }
                }
            }
        })
    }

    // convert to measure-by-measure self-similarity matrix
    const measureKeys = Object.keys(measureView) // store original keys
    const measureDict: any = {}
    let count = 0
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

    report.GENRE = kMeansGenre(measureView)

    const relations = Array(Object.keys(measureView).length).fill(0).map(() => {
        return Array(Object.keys(measureView).length).fill(0)
    })

    for (const overkey in measureView) {
        for (const iterkey in measureView) {
            const i = new Set(measureView[iterkey].map(({ name }) => name))
            const o = new Set(measureView[overkey].map(({ name }) => name))
            const intersect = new Set([...o].filter(x => i.has(x)))
            const merge = new Set([...o, ...i])
            relations[overkey][iterkey] = intersect.size / merge.size
            if (isNaN(relations[overkey][iterkey])) {
                relations[overkey][iterkey] = 0.0
            }
        }
    }

    const soundProfile: any = {}
    const sectionNames = ["A", "B", "C", "D", "E", "F", "G"]
    const thresholds = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
    let sectionDepth = 0
    let numberOfDivisions = 1

    thresholds.forEach((thresh) => {
        // If profile would be empty, create single section.
        if (thresh === 0.1 && Object.keys(soundProfile).length === 0) {
            thresh = 1.0
            numberOfDivisions = 0
        }
        const span = findSections(relations[0], thresh)
        const sectionMeasures = convertToMeasures(span, Object.keys(measureView))
        const sectionValues = sectionMeasures.map((section) => { return section.value })
        const uniqueValues = sectionValues.filter((v, i, a) => a.indexOf(v) === i)
        // TODO: Remove limit on sectionDepth
        if (sectionMeasures.length > numberOfDivisions && uniqueValues.length > 0 && sectionDepth < 3) {
            const sectionPairs: any = {}
            const sectionRepetitions: any = {}
            let sectionUse = 0
            sectionMeasures.forEach((section: any) => {
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
                Object.keys(soundProfile).forEach((profileSection) => {
                    // Subsection TODO: Make recursive for infinite subsections
                    if (Number(section.measure[0]) >= Number(soundProfile[profileSection].measure[0]) && Number(section.measure[1]) <= Number(soundProfile[profileSection].measure[1])) {
                        if (Number(section.measure[0]) > Number(soundProfile[profileSection].measure[0]) || Number(section.measure[1]) < Number(soundProfile[profileSection].measure[1])) {
                            section.sound = {}
                            section.effect = {}
                            for (let i = section.measure[0]; i <= section.measure[1]; i++) {
                                for (const item of measureView[i - 1]) {
                                    const itemType = item.type
                                    if (!section[itemType][item.name]) {
                                        section[itemType][item.name] = { measure: [], line: [] }
                                    }
                                    section[itemType][item.name].measure.push(i)
                                    apiCalls.forEach((codeLine: any) => {
                                        if (codeLine.args && codeLine.args.includes(item.name)) {
                                            if (!section[itemType][item.name].line.includes(codeLine.line)) { section[itemType][item.name].line.push(codeLine.line) }
                                        }
                                    })
                                }
                            }
                            soundProfile[profileSection].numberOfSubsections += 1
                            section.value = soundProfile[profileSection].value + soundProfile[profileSection].numberOfSubsections
                            soundProfile[profileSection].subsections[section.value] = section
                        }
                        filled = true
                    }
                })
                if (!filled) {
                    section.sound = {}
                    section.effect = {}
                    for (let i = section.measure[0]; i <= section.measure[1]; i++) {
                        for (const item of measureView[i - 1]) {
                            const itemType = item.type
                            if (!section[itemType][item.name]) {
                                section[itemType][item.name] = { measure: [], line: [] }
                            }
                            section[itemType][item.name].measure.push(i)
                            apiCalls.forEach((codeLine: any) => {
                                if (codeLine.clips.includes(item.name)) {
                                    if (!section[itemType][item.name].line.includes(codeLine.line)) {
                                        section[itemType][item.name].line.push(codeLine.line)
                                    }
                                }
                            })
                        }
                    }
                    soundProfile[section.value] = section
                    soundProfile[section.value].subsections = {}
                    soundProfile[section.value].numberOfSubsections = 0
                }
            })
            sectionDepth = sectionDepth + 1
            numberOfDivisions = sectionMeasures.length
        }
    })
    report.SOUNDPROFILE = soundProfile
    return report
}

// Convert timeline representation to evaluation checklist.
function timelineToEval(output: any) {
    const report: any = {}

    report.OVERVIEW = output.OVERVIEW
    report.APICALLS = output.APICALLS

    const effectsGrade = ["Does Not Use", "Uses", "Uses Parameter", "Modifies Parameters"]
    const effectsList = ["VOLUME", "GAIN", "FILTER", "DELAY", "REVERB"]
    report.EFFECTS = {}

    report.EFFECTS.BPM = "Sets BPM"
    if (output.OVERVIEW.tempo !== 120) {
        report.EFFECTS.BPM = "Sets nonstandard BPM"
    }

    effectsList.forEach((effectName) => {
        report.EFFECTS[effectName] = effectsGrade[0]
        if (output.EFFECTS[effectName] !== null) {
            report.EFFECTS[effectName] = effectsGrade[output.EFFECTS[effectName]]
        }
    })

    report.MEASUREVIEW = output.MEASUREVIEW
    report.SOUNDPROFILE = output.SOUNDPROFILE
    report.GENRE = output.GENRE

    // Volume Mixing - simultaneous varying gain adjustments in separate tracks.
    report.MIXING = { grade: 0 }

    for (const i in Object.keys(report.MEASUREVIEW)) {
        const volumeMixing: { [key: number]: any } = {}

        report.MEASUREVIEW[i].forEach((item: any) => {
            if (item.type === "effect") {
                if (item.param === "GAIN" && !(item.track in Object.keys(volumeMixing))) {
                    if (!Object.values(volumeMixing).includes(item.value)) {
                        volumeMixing[item.track] = item.value
                    }
                }
            }
        })

        report.MIXING[i] = Object.keys(volumeMixing).length

        if (report.MIXING.grade < report.MIXING[i]) {
            report.MIXING.grade = report.MIXING[i]
        }
    }

    report.MIXING.grade = report.MIXING.grade + " simultaneous unique gains."

    savedReport = Object.assign({}, report)

    return report
}

export const getReport = () => {
    return savedReport
}

// Form Analysis: return list of consecutive lists of numbers from vals (number list).
function findSections(vals: any, threshold: number = 0.25, step: number = 0) {
    let run = []
    const result = []
    const span = []
    let track = 0
    let expect = null

    for (const v in vals) {
        if (expect === null || ((expect + threshold) >= vals[v] && vals[v] >= (expect - threshold))) {
            run.push(vals[v])
        } else {
            result.push(run)
            run = [vals[v]]
        }
        expect = vals[v] + step
    }
    result.push(run)
    for (const l in result) {
        const lis = result[l]
        if (lis.length !== 1) {
            span.push({ value: lis[0], measure: [track, track + lis.length - 1] })
            track += lis.length
        } else {
            track += lis.length
        }
    }
    return span
}

// Form Analysis: convert section number to original measure number.
function convertToMeasures(span: any, intRep: any) {
    const measureSpan = []
    for (const i in span) {
        const tup = span[i].measure
        const newtup = [Number(intRep[tup[0]]) + 1, Number(intRep[tup[1]]) + 1]
        measureSpan.push({ value: span[i].value, measure: newtup })
    }
    return measureSpan
}

// Genre Analysis: return measure-by-measure list of recommended genre using co-usage data.
function kMeansGenre(measureView: any) {
    function getStanNumForSample(sample: string) {
        return librarySoundGenres.indexOf(keyGenreDict[sample])
    }

    function orderedGenreList(sampleList: any) {
        const temp = Array(librarySoundGenres.length).fill(0)
        for (const item in sampleList) {
            temp[librarySoundGenres.indexOf(keyGenreDict[sampleList[item]])] += 1
        }
        let maxi = Math.max(...temp)
        const multi = []
        for (const item in temp) {
            if (temp[item] === maxi) { multi.push(temp[item]) }
        }
        if (multi.length > 0) {
            for (const item in sampleList) {
                for (const num in genreDist[getStanNumForSample(sampleList[item])]) {
                    temp[genreDist[num]] += genreDist[getStanNumForSample(sampleList[item])][num]
                }
            }
        }
        const genreList: { [key: string]: any } = {}
        let genreIdx = 0
        maxi = Math.max(...temp)
        while (maxi > 0) {
            for (const num in temp) {
                if (maxi === 0) {
                    return genreList
                }
                if (temp[num] === maxi && maxi > 0 && !Object.values(genreList).includes({ name: librarySoundGenres[num], value: temp[num] })) {
                    genreList[genreIdx] = { name: librarySoundGenres[num], value: temp[num] }
                    genreIdx += 1
                    temp[num] = 0
                    maxi = Math.max(...temp)
                }
            }
        }
    }

    const genreSampleList: any = []
    for (const measure in measureView) {
        genreSampleList.push([])
        for (const item in measureView[measure]) {
            if (measureView[measure][item].type === "sound") {
                genreSampleList[genreSampleList.length - 1].push(measureView[measure][item].name)
            }
        }
        genreSampleList[genreSampleList.length - 1] = orderedGenreList(genreSampleList[genreSampleList.length - 1])
    }

    return genreSampleList
}

// Utility Functions: parse SoundProfile.
export function soundProfileLookup(soundProfile: any, inputType: string, inputValue: any, outputType: string) {
    if (inputType === "section") {
        inputType = "value"
    }
    const ret: any[] = []
    Object.keys(soundProfile).forEach((sectionKey: string) => {
        const section = soundProfile[sectionKey]
        const returnValue = soundProfileReturn(section, inputType, inputValue, outputType)
        if (returnValue !== undefined) {
            returnValue.forEach((value: any) => {
                if (value !== [] && value !== undefined && !ret.includes(value)) {
                    ret.push(value)
                }
            })
        }
        if (section.subsections) {
            Object.keys(section.subsections).forEach((subsectionKey) => {
                const subsection = section.subsections[subsectionKey]
                const returnValue = soundProfileReturn(subsection, inputType, inputValue, outputType)
                if (returnValue !== undefined) {
                    returnValue.forEach((value: any) => {
                        if (value !== [] && value !== undefined && !ret.includes(value)) { ret.push(value) }
                    })
                }
            })
        }
    })
    return ret
}

function soundProfileReturn(section: any, inputType: string, inputValue: any, outputType: string) {
    switch (inputType) {
        case "value":
            if (section[inputType][0] === inputValue[0]) {
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
            break
        case "sound":
        case "effect":
            if (Object.keys(section[inputType]).includes(inputValue)) {
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
            break
        case "measure":
            if (section[inputType][0] < inputValue < section[inputType][1]) {
                switch (outputType) {
                    case "line":
                        return linesForItem(section, inputType, inputValue)
                    case "sound":
                    case "effect":
                        return Object.keys(section[outputType])
                    default:
                        return section[outputType]
                }
            }
            break
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
            break
        } default:
            return []
    }
}

function itemAtLine(section: any, inputValue: any, outputType: string) {
    const ret: any[] = []
    Object.keys(section[outputType]).forEach((item) => {
        if (section[outputType][item].line.includes(Number(inputValue))) {
            ret.push(item)
        }
    })
    return ret
}

function linesForItem(section: any, inputType: string, inputValue: any) {
    let ret: any[] = []
    if (inputType === "measure") {
        Object.keys(section.sound).forEach((sound) => {
            if (section.sound[sound].measure.includes(inputValue)) {
                ret = ret.concat(section.sound[sound].line)
            }
        })
        Object.keys(section.effect).forEach((effect) => {
            if (section.effect[effect].measure.includes(inputValue)) {
                ret = ret.concat(section.effect[effect].line)
            }
        })
    } else {
        Object.keys(section[inputType]).forEach((item) => {
            if (item === inputValue || inputValue === -1) {
                ret = ret.concat(section[inputType][item].line)
            }
        })
    }
    return ret
}
// jscpd:ignore-end
