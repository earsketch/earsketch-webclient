import type { Script } from "common"
import * as exporter from "./exporter"
import { compile } from "./Autograder"
import { MeasureView, GenreView, SoundProfile, analyzeCode, analyzeMusic } from "../cai/analysis"
import * as cc from "../cai/complexityCalculator"
import { getScriptHistory } from "../browser/scriptsThunks"
import { parseLanguage } from "../esutils"
import * as reader from "./reader"

export interface Report {
    [key: string]: string | number
}

export interface Reports {
    OVERVIEW?: Report
    COMPLEXITY?: reader.CodeFeatures | cc.CodeFeatures | cc.Results
    EFFECTS?: Report
    MEASUREVIEW?: MeasureView
    GENRE?: GenreView
    SOUNDPROFILE?: SoundProfile
    MIXING?: Report
    APICALLS?: cc.CallObj []
    VARIABLES?: cc.VariableObj []

    // Contest-specific reports
    COMPLEXITY_TOTAL?: {
        total: number
    }
    ARTIST?: {
        numStems: number
        stems: string []
    }
    GRADE?: {
        music: number
        code: number
        musicCode: number
    }
    UNIQUE_STEMS?: {
        stems: string []
    }
}

export interface Result {
    script: Script
    reports?: Reports
    error?: string
    version?: number
    contestID?: string
}

export interface DownloadOptions {
    useContestID: boolean
    allowedKeys?: string[]
    showIndividualResults?: boolean
}

export interface ReportOptions {
    OVERVIEW: boolean
    COMPLEXITY: boolean
    EFFECTS: boolean
    MEASUREVIEW: boolean
    GENRE: boolean
    SOUNDPROFILE: boolean
    MIXING: boolean
    HISTORY: boolean
    APICALLS: boolean
    VARIABLES: boolean
}

export interface ContestEntries {
    [key: string]: {
        id: string
        finished: boolean
        sourceCode?: string
    }
}

export interface ContestOptions {
    artistNames: string
    complexityThreshold: number
    uniqueStems: number
    lengthRequirement: number
    showIndividualGrades: boolean
    startingID: number
}

interface GradingCounts {
    makeBeat: number
    setEffect: number
    setTempo: number
    additional: number
}

const generateCSV = (results: Result[], options: DownloadOptions) => {
    const headers = [options.useContestID ? "contestID" : "username", "script_name", "shareid", "error"]
    const rows: string[] = []
    const colMap: { [key: string]: { [key: string]: number } } = {}

    for (const result of results) {
        if (result.reports) {
            for (const name of Object.keys(result.reports)) {
                if (options.allowedKeys && !options.allowedKeys.includes(name)) {
                    delete result.reports[name as keyof Reports]
                    continue
                }
                const report = result.reports[name as keyof Reports]
                if (!report) {
                    continue
                }
                if (!colMap[name]) {
                    colMap[name] = {}
                }
                for (const key of Object.keys(report)) {
                    const colname = name + "_" + key
                    if (!headers.includes(colname)) {
                        headers.push(colname)
                        colMap[name][key] = headers.length - 1
                    }
                }
            }
        }
    }
    for (const result of results) {
        const row = []
        for (let i = 0; i < headers.length; i++) {
            row[i] = ""
        }
        if (result.script) {
            row[0] = options.useContestID ? result.contestID : result.script.username
            row[1] = result.script.name
            row[2] = result.script.shareid
        }
        if (result.error) {
            row[3] = result.error
        }
        if (result.reports) {
            for (const name of Object.keys(result.reports)) {
                const report = result.reports[name as keyof Reports]
                if (report) {
                    for (const [key, value] of Object.entries(report)) {
                        row[colMap[name][key]] = JSON.stringify(value).replace(/,/g, " ")
                    }
                }
            }
        }
        rows.push(row.join(","))
    }
    return headers.join(",") + "\n" + rows.join("\n")
}

export const download = (results: Result[], options: DownloadOptions) => {
    const file = generateCSV(results, options)
    const blob = new Blob([file], { type: "text/plain" })
    exporter.download("code_analyzer_report.csv", blob)
}

export const sourceCodeReformat = (sourceCode: String, newline: string, comma: string) => {
    if (sourceCode) {
        let formattedCode = sourceCode.replace(new RegExp(newline, "g"), "\n")
        formattedCode = formattedCode.replace(new RegExp(comma, "g"), ",")
        return formattedCode
    } else {
        return ""
    }
}

// Run a single script and add the result to the results list.
const runScript = async (script: Script, options: ReportOptions, seed?: number, useCAI?: boolean, useContest?: boolean, version?: number) => {
    let result: Result
    try {
        const compilerOuptut = await compile(script.source_code, script.name, seed)
        const reports: Reports = analyzeMusic(compilerOuptut)

        if ((useCAI && !useContest)) {
            const outputComplexity = analyzeCode(parseLanguage(script.name), script.source_code)
            reports.COMPLEXITY = outputComplexity.codeFeatures
        } else {
            reports.COMPLEXITY = reader.analyze(parseLanguage(script.name), script.source_code)
        }

        for (const option of Object.keys(reports)) {
            if (!options[option as keyof ReportOptions]) {
                delete reports[option as keyof Reports]
            }
        }
        result = {
            script: script,
            reports: reports,
        }
    } catch (err) {
        result = {
            script: script,
            error: (err.args && err.traceback) ? err.args.v[0].v + " on line " + err.traceback[0].lineno : err.message,
        }
    }
    if (options.HISTORY) {
        result.version = version
    }
    return result
}

export const runScriptHistory = async (script: Script, options: ReportOptions, seed?: number, useCAI?: boolean, useContest?: boolean) => {
    const results: Result[] = []

    try {
        const scriptHistory = await getScriptHistory(script.shareid)

        if (!scriptHistory.length) {
            results.push(await runScript(script, options, seed, useCAI, useContest))
        } else {
            let versions = Object.keys(history) as unknown as number[]
            if (!options.HISTORY) {
                versions = [versions[versions.length - 1]]
            }
            for (const version of versions) {
                // add information from base script to version report.
                scriptHistory[version].name = script.name
                scriptHistory[version].username = script.username
                scriptHistory[version].shareid = script.shareid
                results.push(await runScript(scriptHistory[version], options, seed, useCAI, useContest, version))
            }
        }
    } catch {
        results.push(await runScript(script, options, seed, useCAI, useContest))
    }
    return results
}

export const runSourceCodes = async (sourceCodeEntries: ContestEntries, options: ReportOptions, seed?: number, useCAI?: boolean, useContest?: boolean) => {
    for (const entry of Object.values(sourceCodeEntries)) {
        entry.finished = false
    }

    let results: Result[] = []

    for (const fileName of Object.keys(sourceCodeEntries)) {
        const script = { source_code: sourceCodeEntries[fileName].sourceCode, name: fileName } as Script
        const result = await runScript(script, options, seed, useCAI, useContest)
        if (sourceCodeEntries?.[fileName]) {
            result.contestID = sourceCodeEntries[fileName].id
        }
        results = [...results, result]
    }
    return results
}

// Grade contest entry for length and sound usage requirements.
export const contestGrading = (lengthInSeconds: number, measureView: MeasureView, options: ContestOptions) => {
    const stems: string[] = []

    const reports = {
        ARTIST: { numStems: 0, stems: [] },
        GRADE: { music: 0, code: 0, musicCode: 0 },
        UNIQUE_STEMS: { stems: [] },
    } as Reports

    const artistNames = options.artistNames.split(" ")

    for (const measure in measureView) {
        for (const item in measureView[measure]) {
            if (measureView[measure][item].type === "sound") {
                const sound = measureView[measure][item].name
                if (!stems.includes(sound)) {
                    stems.push(sound)
                }
                for (const artistName of artistNames) {
                    if (reports.ARTIST && sound.includes(artistName)) {
                        if (!reports.ARTIST.stems.includes(sound)) {
                            reports.ARTIST.stems.push(sound)
                            reports.ARTIST.numStems += 1
                        }
                    }
                }
            }
        }
    }

    reports.GRADE = { music: 0, code: 0, musicCode: 0 }
    reports.UNIQUE_STEMS = { stems: stems }

    if (reports.ARTIST && reports.ARTIST.numStems > 0) {
        if (stems.length >= Number(options.uniqueStems)) {
            if (Number(options.lengthRequirement) <= lengthInSeconds) {
                reports.GRADE.music = 1
            }
        }
    }

    return reports
}

const addResult = (contestResults: Result [], contestDict: ContestEntries, result: Result) => {
    contestResults.push(result)
    if (contestDict[result.script.shareid]) {
        contestDict[result.script.shareid].finished = true
    } else {
        contestDict[result.script.shareid] = { id: "0", finished: true }
    }
}

const contestComplexityScore = (complexity: reader.CodeFeatures, gradingCounts: GradingCounts, result: Result) => {
    let complexityScore = reader.total(complexity)

    // Custom Functions: 30 for first 3, then 10
    for (let i = 0; i < complexity.userFunc; i++) {
        complexityScore += i < 3 ? 30 : 10
    }

    // Lists, List/String Operations: 15
    complexityScore += (complexity.lists + complexity.listOps + complexity.strOps) * 15

    // Conditionals: 20, Conditionals with Booleans: 25
    complexityScore += complexity.conditionals * 20
    complexityScore += complexity.booleanConditionals * 25

    // Loops: 15
    complexityScore += complexity.loops * 15

    // makeBeat: 5
    complexityScore += gradingCounts.makeBeat * 5

    // setEffect: 5
    complexityScore += Math.min(gradingCounts.setEffect, 5) * 5

    // setTempo: 10
    complexityScore += Math.min(gradingCounts.setTempo, 5) * 10

    // Variables: 2
    if (result.reports?.VARIABLES && Array.isArray(result.reports?.VARIABLES)) {
        complexityScore += Object.entries(result.reports?.VARIABLES).length * 2
    }

    // createAudioSlice, analyzeTrack, insertMediaSection: 10
    complexityScore += gradingCounts.additional * 10

    return complexityScore
}

export const gradeResults = (results: Result [], contestResults: Result [], contestDict: ContestEntries, options: ContestOptions) => {
    const outputData = { musicPassed: 0, codePassed: 0, musicCodePassed: 0, contestResults: [] as Result [] }

    for (const result of results) {
        let complexity: reader.CodeFeatures
        let complexityScore: number
        let complexityPass: number

        try {
            complexity = reader.analyze(parseLanguage(result.script.name), result.script.source_code)
            complexityScore = reader.total(complexity)
            complexityPass = complexityScore >= options.complexityThreshold ? 1 : 0
        } catch (e) {
            complexity = {
                userFunc: 0,
                booleanConditionals: 0,
                conditionals: 0,
                loops: 0,
                lists: 0,
                listOps: 0,
                strOps: 0,
            }
            complexityScore = 0
            complexityPass = 0
        }

        if (Array.isArray(result.reports?.OVERVIEW) || contestDict[result.script.shareid]?.finished) {
            continue
        }

        // TODO: process print statements through Skulpt. Temporary removal of print statements.
        if (!result.script || !result.script.source_code) {
            continue
        }
        const sourceCodeLines = result.script.source_code.split("\n")
        const linesToUse: string[] = []

        const gradingCounts: GradingCounts = {
            makeBeat: 0,
            setEffect: 0,
            setTempo: 0,
            additional: 0,
        }

        let includesComment = false
        const pyHeaderComments = ["python code", "script_name:", "author:", "description:"]
        const jsHeaderComments = ["python code", "script_name:", "author:", "description:"]

        for (const line of sourceCodeLines) {
            // disable print statements for automatic judging.
            if (!line.includes("print")) {
                linesToUse.push(line)
            }
            // check for comments
            if (parseLanguage(result.script.name) === "python") {
                if (line[0] === "#" && line.length > 1) {
                    for (const comment of pyHeaderComments) {
                        if (!line.includes(comment)) {
                            includesComment = true
                        }
                    }
                }
            } else {
                if (line[0] + line[1] === "//" && line.length > 2) {
                    for (const comment of jsHeaderComments) {
                        if (!line.includes(comment)) {
                            includesComment = true
                        }
                    }
                }
            }
            // count makeBeat and setEffect functions
            if (line.includes("makeBeat")) {
                gradingCounts.makeBeat += 1
            }
            if (line.includes("setEffect")) {
                gradingCounts.setEffect += 1
            }
            if (line.includes("setTempo")) {
                gradingCounts.setTempo += 1
            }

            // count additional functions
            for (const name of ["createAudioSlice", "analyzeTrack", "insertMediaSection"]) {
                if (line.includes(name)) {
                    gradingCounts.additional += 1
                }
            }
        }
        const sourceCode = linesToUse.join("\n")

        let includesArtistName = false
        const artistNames = options.artistNames.split(" ")

        for (const artistName of artistNames) {
            if (sourceCode.includes(artistName)) {
                includesArtistName = true
            }
        }

        const emptyReports: Reports = {
            OVERVIEW: { ...result.reports?.OVERVIEW },
            COMPLEXITY: { ...complexity },
            COMPLEXITY_TOTAL: { total: complexityScore },
            GRADE: {
                code: complexityPass,
                music: 0,
                musicCode: 0,
            },
        }

        if (!includesArtistName) {
            addResult(contestResults, contestDict, {
                script: result.script,
                contestID: result.contestID,
                error: "No Contest Samples",
                reports: emptyReports,
            })
            continue
        }

        if (!includesComment) {
            addResult(contestResults, contestDict, {
                script: result.script,
                contestID: result.contestID,
                error: "No Comments",
                reports: emptyReports,
            })
            continue
        }

        try {
            complexity = reader.analyze(parseLanguage(result.script.name), sourceCode)
            complexityScore = contestComplexityScore(complexity, gradingCounts, result)

            complexityPass = complexityScore >= options.complexityThreshold ? 1 : 0
        } catch (e) {
            complexity = {
                booleanConditionals: 0,
                conditionals: 0,
                listOps: 0,
                lists: 0,
                loops: 0,
                strOps: 0,
                userFunc: 0,
            }
            complexityScore = 0
            complexityPass = 0
        }

        if (result.error) {
            addResult(contestResults, contestDict, {
                script: result.script,
                contestID: result.contestID,
                error: result.error,
                reports: {
                    OVERVIEW: { ...result.reports?.OVERVIEW },
                    COMPLEXITY: { ...complexity },
                    COMPLEXITY_TOTAL: { total: complexityScore },
                    GRADE: {
                        code: 0,
                        music: 0,
                        musicCode: 0,
                    },
                },
            })
            continue
        }

        const length = (result.reports && result.reports.OVERVIEW) ? result.reports.OVERVIEW["length (seconds)"] as number : 0
        const measureView = result.reports ? result.reports.MEASUREVIEW : []

        if (length && measureView) {
            const reports = Object.assign({}, result.reports, contestGrading(length, measureView, options))
            delete reports.MEASUREVIEW
            delete reports.APICALLS
            delete reports.VARIABLES
            reports.COMPLEXITY = { ...complexity }
            reports.COMPLEXITY_TOTAL = { total: complexityScore }

            if (reports.GRADE) {
                if (reports.GRADE.music > 0) {
                    outputData.musicPassed = 1
                }
                reports.GRADE.code = (complexityPass > 0) ? 1 : 0
                if (!Array.isArray(reports.COMPLEXITY)) {
                    if (reports.COMPLEXITY.userFunc === 0) {
                        result.error = "No user-defined function"
                        reports.GRADE.code = 0
                    }
                    if (reports.GRADE.code > 0) {
                        outputData.codePassed = 1
                    }
                    if (reports.GRADE.music + reports.GRADE.code > 1) {
                        reports.GRADE.musicCode = 1
                        outputData.musicCodePassed = 1
                    }
                }
            }

            result.reports = reports
            addResult(contestResults, contestDict, result)
        }
    }

    outputData.contestResults = contestResults
    return outputData
}
