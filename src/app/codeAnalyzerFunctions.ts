import type { DAWData, Script } from "common"
import { getScriptHistory } from "../browser/scriptsThunks"
import { MeasureView, SoundProfile, analyzeCode, analyzeMusic } from "../cai/analysis"
import { Assessment, CaiHistoryNode, assess, timeOnTask } from "../cai/analysis/creativityAssessment"
import { DepthBreadth, FunctionCounts } from "../cai/complexityCalculator"
import esconsole from "../esconsole"
import { parseLanguage } from "../esutils"
import { getAuth } from "../request"
import { compile } from "./Autograder"
import * as exporter from "./exporter"
import * as reader from "./reader"

export type InputType = "text" | "csv" | "zip"

export interface AnalyzerReport {
    [key: string]: string | number
}

export interface Reports {
    OVERVIEW: AnalyzerReport
    COUNTS: FunctionCounts
    "CODE INDICATOR": reader.CodeFeatures
    "CODE COMPLEXITY": AnalyzerReport
    MEASUREVIEW: MeasureView
    SOUNDPROFILE: SoundProfile
    DEPTHBREADTH: DepthBreadth
    CREATIVITY: Assessment
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
    CREATIVITY: boolean
}

const generateCSV = (results: Result[], useContestID: boolean, options: ReportOptions) => {
    const headers = [useContestID ? "contestID" : "username", "script_name", "shareid", "version", "modified", "error"]
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
        row[3] = result.version
        row[4] = result.script.modified
        row[5] = result.error || ""
        if (result.reports) {
            for (const [name, report] of Object.entries(result.reports)) {
                if (options[name as keyof ReportOptions]) {
                    for (const [key, value] of Object.entries(report)) {
                        row[colMap[name][key]] = JSON.stringify(value).replace(/,/g, " ")
                    }
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
export const runScript = async (script: Script, version?: number, timeOnTaskPercentage?: number): Promise<Result> => {
    const codeComplexity: AnalyzerReport = {}
    let compilerOutput: DAWData

    try {
        compilerOutput = await compile(script.source_code, script.name)
    } catch (err) {
        let error = (err.args && err.traceback) ? err.args.v[0].v : err.message
        if (err.traceback && err.traceback[0]) { error = error + " on line " + err.traceback[0].lineno }
        return {
            script,
            error,
        }
    }

    const codeIndicator = reader.analyze(parseLanguage(script.name), script.source_code)
    const complexityOutput = analyzeCode(parseLanguage(script.name), script.source_code)
    for (const [feature, value] of Object.entries(complexityOutput.codeFeatures)) {
        codeComplexity[feature] = value
    }
    const analyzerReport = analyzeMusic(compilerOutput)

    const creativityAssessment = await assess(complexityOutput, analyzerReport, timeOnTaskPercentage)

    const reports: Reports = {
        OVERVIEW: analyzerReport.OVERVIEW,
        COUNTS: complexityOutput.counts,
        "CODE INDICATOR": codeIndicator,
        "CODE COMPLEXITY": codeComplexity,
        MEASUREVIEW: analyzerReport.MEASUREVIEW,
        SOUNDPROFILE: analyzerReport.SOUNDPROFILE,
        DEPTHBREADTH: complexityOutput.depth,
        CREATIVITY: creativityAssessment,
    }
    reports["CODE INDICATOR"]!.variables = analyzerReport.VARIABLES?.length

    const result: Result = {
        script,
        reports,
    }
    if (version) {
        result.version = version
    }
    return result
}

export const runScriptHistory = async (script: Script, useHistory?: boolean, useCaiHistory?: boolean) => {
    let scriptHistory: Script[] = []
    let caiHistory: CaiHistoryNode[] = []
    let timeOnTaskPercentages: number[] = []

    if (useHistory) {
        try {
            // Retrieve script history.
            scriptHistory = await getScriptHistory(script.shareid)
        } catch (e) {
            console.log(e)
        }
    }

    if (useCaiHistory) {
        try {
            // Retrieve script history.
            caiHistory = await getCaiHistory(script.username, script.name)
            console.log("cai history", caiHistory)
        } catch (e) {
            console.log(e)
        }
    }

    if (!scriptHistory.length) {
        // No history: run current version of script.
        return [await runScript(script)]
    }

    if (useHistory && useCaiHistory) {
        timeOnTaskPercentages = timeOnTask(scriptHistory, caiHistory)
    }

    const results: Result[] = []
    for (const [idx, version] of scriptHistory.entries()) {
        // Add information from base script to version report.
        version.name = script.name
        version.username = script.username
        version.shareid = script.shareid
        results.push(await runScript(version, idx, timeOnTaskPercentages[idx]))
    }

    return results
}

// Fetch a script's history. Resolves to a list of historical scripts.
async function getCaiHistory(username: string, project: string) {
    esconsole("Getting cai history: " + username, ["debug", "user"])
    const history = await getAuth("/studies/caihistory", { username, project })
    return history
}
