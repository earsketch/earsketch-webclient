import type { Script } from "common"
import * as exporter from "./exporter"
import { compile } from "./Autograder"
import { analyzeCode, analyzeMusic, MeasureView, SoundProfile } from "../cai/analysis"
import { getScriptHistory } from "../browser/scriptsThunks"
import { parseLanguage } from "../esutils"
import * as reader from "./reader"

export type InputType = "text" | "csv" | "zip"

export interface Report {
    [key: string]: string | number
}

export interface DepthBreadth {
    depth: number
    breadth: number
    avgDepth: number
}

export interface Reports {
    OVERVIEW: Report
    COUNTS: GradingCounts
    "CODE INDICATOR": reader.CodeFeatures
    "CODE COMPLEXITY": Report
    MEASUREVIEW: MeasureView
    SOUNDPROFILE: SoundProfile
    DEPTHBREADTH: DepthBreadth
}

export interface Result {
    script: Script
    reports?: Reports
    error?: string
    version?: number
    contestID?: string
}

export interface ReportOptions {
    OVERVIEW: boolean
    COUNTS: boolean
    "CODE INDICATOR": boolean
    "CODE COMPLEXITY": boolean
    MEASUREVIEW: boolean
    SOUNDPROFILE: boolean
    DEPTHBREADTH: boolean
}

interface GradingCounts {
    fitMedia: number
    makeBeat: number
    setEffect: number
    setTempo: number
}

const generateCSV = (results: Result[], useContestID: boolean, options: ReportOptions) => {
    const headers = [useContestID ? "contestID" : "username", "script_name", "shareid", "error"]
    const rows: string[] = []
    const colMap: { [key: string]: { [key: string]: number } } = {}

    for (const result of results) {
        if (result.reports) {
            for (const [name, report] of Object.entries(result.reports)) {
                if (options[name as keyof ReportOptions]) {
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
    }

    headers.push("source_code")
    colMap.source_code = { source_code: headers.length - 1 }

    for (const result of results) {
        const row = Array(headers.length).fill("")
        row[0] = useContestID ? result.contestID : result.script.username
        row[1] = result.script.name
        row[2] = result.script.shareid
        row[3] = result.error || ""
        if (result.reports) {
            for (const [name, report] of Object.entries(result.reports)) {
                for (const [key, value] of Object.entries(report)) {
                    row[colMap[name][key]] = JSON.stringify(value).replace(/,/g, " ")
                }
            }
            row[colMap.source_code.source_code] = "\"\"" + JSON.stringify(result.script.source_code) + "\"\""
        }
        rows.push(row.join(","))
    }
    return headers.join(",") + "\n" + rows.join("\n")
}

export const download = (results: Result[], useContestID: boolean, options: ReportOptions) => {
    const file = generateCSV(results, useContestID, options)
    const blob = new Blob([file], { type: "text/plain" })
    exporter.download("code_analyzer_report.csv", blob)
}

// Run a single script and add the result to the results list.
export const runScript = async (script: Script, version?: number) => {
    let result: Result
    try {
        const compilerOutput = await compile(script.source_code, script.name)
        const codeIndicator = reader.analyze(parseLanguage(script.name), script.source_code)
        const codeComplexity: Report = {}
        const complexityOutput = analyzeCode(parseLanguage(script.name), script.source_code)
        for (const category of Object.values(complexityOutput.codeFeatures)) {
            for (const [feature, value] of Object.entries(category)) {
                codeComplexity[feature] = value
            }
        }
        const analyzerReport = analyzeMusic(compilerOutput)

        const gradingCounts = {
            fitMedia: 0,
            makeBeat: 0,
            setEffect: 0,
            setTempo: 0,
        } as GradingCounts

        for (const line of script.source_code.split("\n")) {
            let includesComment = false

            // check for comments
            if (parseLanguage(script.name) === "python") {
                if (line[0] === "#" && line.length > 1) {
                    includesComment = true
                }
            } else {
                if (line[0] + line[1] === "//" && line.length > 2) {
                    includesComment = true
                }
            }
            if (!includesComment) {
                // count makeBeat and setEffect functions
                if (line.includes("fitMedia")) {
                    gradingCounts.fitMedia += 1
                }
                if (line.includes("makeBeat")) {
                    gradingCounts.makeBeat += 1
                }
                if (line.includes("setEffect")) {
                    gradingCounts.setEffect += 1
                }
                if (line.includes("setTempo")) {
                    gradingCounts.setTempo += 1
                }
            }
        }

        const reports: Reports = {
            OVERVIEW: analyzerReport.OVERVIEW,
            COUNTS: gradingCounts,
            "CODE INDICATOR": codeIndicator,
            "CODE COMPLEXITY": codeComplexity,
            MEASUREVIEW: analyzerReport.MEASUREVIEW,
            SOUNDPROFILE: analyzerReport.SOUNDPROFILE,
            DEPTHBREADTH: complexityOutput.depth,
        }
        reports["CODE INDICATOR"]!.variables = analyzerReport.VARIABLES?.length

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
    if (version) {
        result.version = version
    }
    return result
}

export const runScriptHistory = async (script: Script, useHistory?: boolean) => {
    const results: Result[] = []

    try {
        const scriptHistory = await getScriptHistory(script.shareid)

        if (!scriptHistory.length) {
            results.push(await runScript(script))
        } else {
            let versions = Object.keys(scriptHistory) as unknown as number[]
            if (!useHistory) {
                versions = [versions[versions.length - 1]]
            }
            for (const version of versions) {
                // add information from base script to version report.
                scriptHistory[version].name = script.name
                scriptHistory[version].username = script.username
                scriptHistory[version].shareid = script.shareid
                results.push(await runScript(scriptHistory[version], version))
            }
        }
    } catch {
        results.push(await runScript(script))
    }
    return results
}
