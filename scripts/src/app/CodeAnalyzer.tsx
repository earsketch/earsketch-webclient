import React, { useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as reader from "./reader"
import * as userProject from "./userProject"

import { Script } from "common"
import { compile } from "./Autograder"
import * as exporter from "./exporter"

export const generateCSV = (results: Result[], options: DownloadOptions) => {
    const headers = [options.useContestID ? "contestID" : "username", "script_name", "shareid", "error"]
    const rows: string[] = []
    const colMap: { [key: string]: { [key: string]: number } } = {}

    for (const result of results) {
        if (result.reports) {
            for (const name of Object.keys(result.reports)) {
                if (options.allowedKeys && !options.allowedKeys.includes(name)) {
                    delete result.reports[name]
                    continue
                }
                const report = result.reports[name]
                if (colMap[name] === undefined) {
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
                const report = result.reports[name]
                if (Array.isArray(report)) {
                    for (const key in report) {
                        row[colMap[name][key]] = report[key]
                    }
                } else {
                    for (const key of Object.keys(report)) {
                        row[colMap[name][key]] = report[key]
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

const Upload = ({ processing, setResults, setProcessing }: { processing: string | null, setResults: (r: Result[]) => void, setProcessing: (p: string | null) => void }) => {
    const [urls, setUrls] = useState("")

    // Run a single script and add the result to the results list.
    const runScript = async (script: Script) => {
        let result
        try {
            // Run the script to check for errors.
            await compile(script.source_code, script.name)
            const report = reader.analyze(ESUtils.parseLanguage(script.name), script.source_code)
            result = {
                script: script,
                reports: { "Code Complexity": { ...report } },
            }
        } catch (err) {
            result = {
                script: script,
                error: err.args.v[0].v + " on line " + err.traceback[0].lineno,
            }
        }
        setProcessing(null)
        return result
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const run = async () => {
        setResults([])
        setProcessing(null)

        esconsole("Running code analyzer.", ["DEBUG"])
        const re = /\?sharing=([^\s.,])+/g
        const matches = urls.match(re)

        const results: Result[] = []

        if (!matches) { return }
        for (const match of matches) {
            esconsole("Grading: " + match, ["DEBUG"])
            const shareId = match.substring(9)
            esconsole("ShareId: " + shareId, ["DEBUG"])
            setProcessing(shareId)
            let script
            try {
                script = await userProject.loadScript(shareId, false)
            } catch {
                continue
            }
            if (!script) {
                const result = {
                    script: { username: "", shareid: shareId } as Script,
                    error: "Script not found.",
                }
                results.push(result)
                setResults(results)
                setProcessing(null)
            } else {
                setResults([...results, { script }])
                const result = await runScript(script)
                results.push(result)
                setResults(results)
            }
        }
    }

    return <div className="container">
        <div className="panel panel-primary">
            <div className="panel-heading">
                Paste share URLs
            </div>
            <div className="panel-body">
                <textarea className="form-control" placeholder="One per line..." onChange={e => setUrls(e.target.value)}></textarea>
            </div>
            <div className="panel-footer">
                {processing
                    ? <button className="btn btn-primary" onClick={() => run()} disabled>
                        <i className="es-spinner animate-spin mr-3"></i> Run
                    </button>
                    : <button className="btn btn-primary" onClick={() => run()}> Run </button>}
            </div>
        </div>
    </div>
}

const ReportDisplay = ({ report }: { report: { [key: string]: string | number } | { [key: string]: string | number }[] }) => {
    return <table className="table">
        <tbody>
            {Object.entries(report).map(([key, value]) =>
                <tr key={key}>
                    <th>{key}</th><td>{JSON.stringify(value)}</td>
                </tr>
            )}
        </tbody>
    </table>
}

const ResultPanel = ({ result }: { result: Result }) => {
    return <div className="container">
        <div className="panel panel-primary">
            {result.script &&
                <div className="panel-heading" style={{ overflow: "auto" }}>
                    {result.script.name &&
                        <b> {result.script.username} ({result.script.name}) </b>}
                    {result.version &&
                        <b> (version {result.version}) </b>}
                    <div className="pull-right">{result.script.shareid}</div>
                </div>}
            {result.error &&
                <div className="panel-body text-danger">
                    <b>{result.error}</b>
                </div>}
            {result.reports &&
                <div className="row" >
                    <div className="col-md-6">
                        <ul>
                            {Object.entries(result.reports).map(([name, report]) =>
                                <li key={name}>
                                    {name}
                                    <ReportDisplay report={report} />
                                </li>
                            )}
                        </ul>
                    </div>
                </div>}
        </div>
    </div>
}

export const Results = ({ results, processing, options }: { results: Result[], processing: string | null, options: DownloadOptions }) => {
    return <div>
        {results.length > 0 && options.showIndividualResults &&
            <ul>
                {results.map((result, index) =>
                    <li key={index}>
                        <ResultPanel result={result} />
                    </li>
                )}
            </ul>}
        {results.length > 0 &&
            <div className="container">
                {processing
                    ? <div className="alert alert-info">
                        Processing script id: {processing}
                    </div>
                    : <div className="alert alert-success">
                        No scripts being processed!
                    </div>}

            </div>}
        {results.length > 0 &&
            <div className="container" style={{ textAlign: "center" }}>
                <button className="btn btn-lg btn-primary" onClick={() => download(results, options)}><i className="glyphicon glyphicon-download-alt"></i> Download Report</button>
            </div>}
    </div>
}

export interface Result {
    script: Script
    reports?: {
        [key: string]: { [key: string]: string | number } | { [key: string]: string | number }[]
    }
    error?: string
    version?: number | null
    contestID?: number
}

export interface DownloadOptions {
    useContestID: boolean
    allowedKeys?: string[]
    showIndividualResults?: boolean
}

export const CodeAnalyzer = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])
    const downloadOptions = { useContestID: false, showIndividualResults: true } as DownloadOptions

    return <div>
        <div className="container">
            <h1>EarSketch Code Analyzer</h1>
        </div>
        <Upload
            processing={processing}
            setProcessing={setProcessing}
            setResults={setResults}
        />
        <Results
            results={results}
            processing={processing}
            options={downloadOptions}
        />
        <ModalContainer />
    </div>
}
