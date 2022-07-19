import type { Script } from "common"
import * as exporter from "./exporter"
import { MeasureView, GenreView, SoundProfile } from "../cai/analysis"
import * as cc from "../cai/complexityCalculator"
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
