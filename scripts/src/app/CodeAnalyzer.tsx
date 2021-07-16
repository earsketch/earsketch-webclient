import React, { useState } from "react"

import * as compiler from "./compiler"
import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as reader from "./reader"
import * as userProject from "./userProject"

import { Script } from "common"

// Calculate the complexity of a script as python or javascript based on the extension and return the complexity scores.
const read = async (script: string, filename: string) => {
    const ext = ESUtils.parseExt(filename)
    if (ext === ".py") {
        return reader.analyzePython(script)
    } else if (ext === ".js") {
        return reader.analyzeJavascript(script)
    } else {
        throw new Error("Invalid file extension " + ext)
    }
}

// Compile a script as python or javascript based on the extension and return the compilation promise.
const compile = async (script: string, filename: string) => {
    const ext = ESUtils.parseExt(filename)
    if (ext === ".py") {
        return compiler.compilePython(script)
    } else if (ext === ".js") {
        return compiler.compileJavascript(script)
    } else {
        throw new Error("Invalid file extension " + ext)
    }
}

const generateCSV = (results: Result[]) => {
    const headers = ["username", "script_name", "shareid", "error"]
    const rows: any = []
    const colMap: any = {}

    for (const result of results) {
        if (result.reports) {
            for (const name of Object.keys(result.reports)) {
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
            row[0] = result.script.username
            row[1] = result.script.name
            row[2] = result.script.shareid
        }
        if (result.error) {
            if (result.error.nativeError) {
                row[3] = result.error.nativeError.v + " on line " + result.error.traceback[0].lineno
            } else {
                row[3] = result.error
            }
        } else if (result.reports) {
            for (const name of Object.keys(result.reports)) {
                const report = result.reports[name]
                for (const key of Object.keys(report)) {
                    row[colMap[name][key]] = report[key]
                }
            }
        }
        rows.push(row.join(","))
    }

    return headers.join(",") + "\n" + rows.join("\n")
}

const download = (results: Result[]) => {
    const file = generateCSV(results)
    const a = document.createElement("a")
    document.body.appendChild(a)
    // a.style = "display: none"

    const aFileParts = [file]
    const blob = new Blob(aFileParts, { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    // download the script
    a.href = url
    a.download = "code_analyzer_report.csv"
    a.target = "_blank"
    esconsole("File location: " + a.href, ["debug", "exporter"])
    a.click()
    // window.URL.revokeObjectURL(url)
}

const Upload = ({ processing, setResults, setProcessing }: { processing: string | null, setResults: (r: Result[]) => void, setProcessing: (p: string | null) => void }) => {
    const [urls, setUrls] = useState("")

    // Run a single script and add the result to the results list.
    const runScript = async (script: Script) => {
        let result
        let report
        try {
            await compile(script.source_code, script.name)
            report = await read(script.source_code, script.name)
            result = {
                script: script,
                reports: { "Code Complexity": report },
            }
        } catch (err) {
            result = {
                script: script,
                error: err,
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
        // const shareUrls = urls.split("\n")
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
                    error: { message: "Script not found." },
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
                    : <button className="btn btn-primary" onClick={() => run()}> Run </button>
                }
            </div>
        </div>
    </div>
}

const Results = ({ results, processing }: { results: Result[], processing: string | null }) => {
    return <div>
        {results.length > 0 &&
          <ul>
              {results.map((result, index) =>
                  <li key={index}>
                      <div className="container">
                          <div className="panel panel-primary">
                              {result.script &&
                            <div className="panel-heading">
                                <b>{result.script.username}</b> ({result.script.name})
                                <div className="pull-right">{result.script.shareid}</div>
                            </div>
                              }
                              {result.error && result.error.args && result.error.traceback &&
                                <div className="panel-body text-danger">
                                    <b>{result.error.args.v[0].v}</b> on line {result.error.traceback[0].lineno}
                                </div>
                              }
                              {result.error && result.error.message &&
                                <div className="panel-body text-danger">
                                    <b>{result.error.message}</b>
                                </div>
                              }
                              {result.reports &&
                            <div className="row" >
                                <div className="col-md-6">
                                    <ul>
                                        {Object.keys(result.reports).map((name) =>
                                            <li key={name}>
                                                {name}
                                                <table className="table">
                                                    <tbody>
                                                        {Object.keys(result.reports[name]).map((key) =>
                                                            <tr key={key}>
                                                                <th>{key}</th><td>{result.reports[name][key]}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                              }
                          </div>
                      </div>
                  </li>
              )}
          </ul>
        }
        {results.length > 0 &&
        <div className="container">
            {processing
                ? <div className="alert alert-info">
                Processing script id: {processing}
                </div>
                : <div className="alert alert-success">
                No scripts being processed!
                </div>
            }
        </div>
        }
        {results.length > 0 &&
        <div className="container" style={{ textAlign: "center" }}>
            <button className="btn btn-lg btn-primary" onClick={() => download(results)}><i className="glyphicon glyphicon-download-alt"></i> Download Report</button>
        </div>
        }
    </div>
}

interface Result {
  script: Script
  reports?: any
  error?: any
}

export const CodeAnalyzer = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

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
        />
        <ModalContainer />
    </div>
}
