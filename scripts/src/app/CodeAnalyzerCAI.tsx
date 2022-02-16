import React, { useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as userProject from "./userProject"

import { Script } from "common"

import * as caiAnalysisModule from "../cai/analysis"

import { DownloadOptions, Result, Results } from "./CodeAnalyzer"
import { compile, readFile } from "./Autograder"
import { ContestOptions } from "./CodeAnalyzerContest"
import value from 'file-loader!*'

const scriptInfo: any[] = []
const types: any[] = []
var headers: string = ""

export const Options = ({ options, seed, showSeed, setOptions, setSeed }: {
    options: ReportOptions | ContestOptions, seed?: number, showSeed: boolean, setOptions: (o: any) => void, setSeed: (s?: number) => void
}) => {
    return <div className="container">
        <div className="panel panel-primary">
            <div className="panel-heading">
                Step 1: Select Reporter Options
            </div>
            <div className="panel-body">
                <div className="col-md-4">
                    <label>
                        Code/Music Analysis Options:
                    </label><br></br>
                    <ul>
                        {Object.entries(options).map(([option, value]) =>
                            <label key={option}>
                                {typeof (value) === "boolean" &&
                                    <input type="checkbox" checked={value} onChange={e => setOptions({ ...options, [option]: e.target.checked })}></input>}
                                {option}{" "}
                                {(typeof (value) === "string" || typeof (value) === "number") &&
                                    <input type="text" value={value} onChange={e => setOptions({ ...options, [option]: e.target.value })} style={{ backgroundColor: "lightgray" }}></input>}
                            </label>
                        )}
                    </ul>
                </div>
                {showSeed &&
                    <div className="col-md-4">
                        <h4>Random Seed</h4>
                        <input type="checkbox" checked={seed !== undefined} onChange={e => setSeed(e.target.checked ? Date.now() : undefined)}></input>
                        {seed !== undefined
                            ? <div>Use the following random seed:
                                <input type="text" value={seed} onChange={e => setSeed(Number(e.target.value))}></input>
                            </div>
                            : <div>Use a random seed</div>}
                        <p className="small">
                            This will automatically seed every random function in Python and JavaScript.
                        </p>
                        <p className="small">
                            Disclaimer: Testing randomness is inherently difficult. Only use this in the most trivial of cases.
                        </p>
                    </div>}
            </div>
        </div>
    </div>
}

export const Upload = ({ processing, options, seed, contestDict, setResults, setContestResults, setProcessing, setContestDict }:
{ processing: string | null, options: ReportOptions, seed?: number, contestDict?: { [key: string]: { id: number, finished: boolean } }, setResults: (r: Result[]) => void, setContestResults?: (r: Result[]) => void, setProcessing: (p: string | null) => void, setContestDict?: (d: { [key: string]: { id: number, finished: boolean } }) => void }) => {
    const [urls, setUrls] = useState([] as string[])
    const [csvInput, setCsvInput] = useState(false)
    const [contestIDColumn, setContestIDColumn] = useState(0)
    const [shareIDColumn, setShareIDColumn] = useState(1)

    const updateCSVFile = async (file: File) => {
        if (file) {
            let script
            // const contestEntries: { [key: string]: { id: number, finished: boolean } } = {}
            const urlList = []
            try {
                setProcessing("Uploading")
                script = await readFile(file)
                console.log("script", script)

                setProcessing(null)

                // newline handling that hurts my soul
                // we replace all newline characters that have quotes on either end
                // warning: the code below is cursed.
                script = await cleanupScript(script)

                // headers = script.split("\n")[0] + ",depth"
                for (const row of script.split("\n")) {
                    const values = row.split(",")

                    urlList.push(values[values.length - 1])
                    types.push(values[values.length - 2])
                    let newStr: string = ""
                    for (let k = 0; k < values.length - 2; k++) {
                        newStr += (values[k])
                        if (k !== values.length - 3) {
                            newStr += ","
                        }
                    }
                    scriptInfo.push(newStr)
                }

                setProcessing(null)
            } catch (err) {
                console.error(err)
                return
            }
            setUrls(urlList)
        }
    }

    const cleanupScript = async (script: string) => {
        setProcessing("Pre-Processing")
        var numberOfQuotes: number = 0
        var percentDone: number = 0
        for (var i = 0; i < script.length; i++) {
            if (script[i] === "\"") {
                numberOfQuotes += 1
            }

            if (script[i] === "\n" && (numberOfQuotes % 2 !== 0)) {
                script = script.substring(0, i) + "NEWLINE" + script.substring(i + 1)
            }

            if (script[i] === "\r") {
                script = script.substring(0, i) + script.substring(i + 1)
            }

            if (script[i] === "," && (numberOfQuotes % 2 !== 0)) {
                script = script.substring(0, i) + "|||" + script.substring(i + 1)
            }

            if (Math.floor(i / script.length * 100) > percentDone) {
                percentDone = Math.floor(i / script.length * 100)
                console.log("Pre-Processing: " + percentDone + "%")
            }
        }

        return script
    }
    // Run a single script and add the result to the results list.
    const runScript = async (script: Script, version: number | null = null) => {
        let result: Result
        const reports: any = {
            COMPLEXITY: { complexity: "" },
        }
        try {
            if (script.source_code !== "\r" && script.source_code !== "") {
                while (script.source_code.endsWith("\"") || script.source_code.endsWith("\r") || script.source_code.endsWith("\n")) {
                    script.source_code = script.source_code.substring(0, script.source_code.length - 1);
                }

                while (script.source_code.startsWith("\"\"")) {
                    script.source_code = script.source_code.substring(1)
                }

                if (script.source_code.includes("\"\"")) {
                    script.source_code = script.source_code.split("\"\"").join("\"")
                }

                let compilerOuptut: any
                if (script.name.includes("js")) {
                    compilerOuptut = await compile(script.source_code, "script.js", seed)
                } else {
                    while (script.source_code.startsWith("\"")) {
                        script.source_code = script.source_code.substring(1)
                    }
                    compilerOuptut = await compile(script.source_code, "script.py", seed)
                }
                let complexityString: string = ""
                const analysisOutput = caiAnalysisModule.analyzeMusic(compilerOuptut)
                for (const subobj in analysisOutput) {
                    console.log(subobj)
                    if (subobj === "OVERVIEW" ||subobj === "MEASUREVIEW" || subobj === "GENRE" || subobj === "SOUNDPROFILE") {
                        complexityString += ","
                        complexityString += subobj + "|"
                        complexityString += JSON.stringify(analysisOutput[subobj]).split(",").join("|")
                    }
                }
                reports["COMPLEXITY"]["complexity"] = complexityString.substring(1)

                /* if (script.name.includes(".js")) {
                    reports["COMPLEXITY"]["complexity"] = JSON.stringify(caiAnalysisModule.analyzeCode("javascript", script.source_code))// .split(":").join(",")// .split(",").join("|")
                } else {
                    while (script.source_code.startsWith("\"")) {
                        script.source_code = script.source_code.substring(1);
                    }
                    reports["COMPLEXITY"]["complexity"] = caiAnalysisModule.analyzeCode("python", script.source_code)// .split(":").join(",")// .split(",").join("|")
                }
                console.log(reports["COMPLEXITY"]) */
                result = {
                    script: script,
                    reports: reports,
                }
            }
        } catch (err) {
            console.log("log error", err)
            result = {
                script: script,
                error: (err.args && err.traceback) ? err.args.v[0].v + " on line " + err.traceback[0].lineno : err.message,
            }
        }
        setProcessing(null)

        return result
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const run = async () => {
        setResults([])
        setContestResults?.([])
        const contestDictRefresh: { [key: string]: { id: number, finished: boolean } } = {}
        if (contestDict) {
            for (const shareid of Object.keys(contestDict)) {
                contestDictRefresh[shareid] = { id: contestDict[shareid].id, finished: false }
            }
            setContestDict?.({ ...contestDictRefresh })
        }
        setProcessing(null)

        let results: Result[] = []
        let index: number = 0
        for (const url of urls) {
            setProcessing(index.toString() + "/" + urls.length.toString())
            const match = url

            esconsole("Grading: " + match, ["DEBUG"])
            let script
            let scriptText

            console.log(index.toString() + "/" + urls.length.toString())
            try {
                if (match !== "\r") {
                    scriptText = match.split("NEWLINE").join("\n")
                    scriptText = scriptText.split("\\t").join("\t")
                    scriptText = scriptText.split("|||").join(",")

                    // strip extraneous quotation marks

                    while (scriptText.endsWith("\"") || scriptText.endsWith("\n") || scriptText.endsWith("\r")) {
                        scriptText = scriptText.substring(0, scriptText.length - 1)
                    }

                    while (scriptText.startsWith("\"\"")) {
                        scriptText = scriptText.substring(1)
                    }
                } else {
                    scriptText = ""
                }
            } catch {
                continue
            }
            script = { source_code: scriptText, username: scriptInfo[index], name: types[index] } as Script

            index += 1
            setResults([...results, { script }])
            const result = await runScript(script)
            results = [...results, result]

            setResults(results)
        }
    }

    return <div className="container">
        <div className="panel panel-primary">
            <div className="panel-heading">
                Upload CSV file with script name and code in last two columns
            </div>

            <div className="panel-body">
                <input type="file" onChange={file => {
                    if (file.target.files) { updateCSVFile(file.target.files[0]) }
                }} />
            </div>
            <div className="panel-footer">
                {processing
                    ? <div>
                        <div>{processing}</div>
                        <button className="btn btn-primary" onClick={run} disabled>
                            <i className="es-spinner animate-spin mr-3"></i> Run
                        </button></div>
                    : <button className="btn btn-primary" onClick={run}> Run </button>}
            </div>
        </div>
    </div>
}

export interface ReportOptions {
    COMPLEXITY: boolean
}


export const CodeAnalyzerCAI = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const [options, setOptions] = useState({
        OVERVIEW: true,
        COMPLEXITY: true,
        EFFECTS: false,
        MEASUREVIEW: false,
        GENRE: false,
        SOUNDPROFILE: false,
        MIXING: false,
        HISTORY: false,
        APICALLS: false,
    } as ReportOptions)

    const [seed, setSeed] = useState(Date.now() as number | undefined)

    return <div>
        <div className="container">
            <h1>EarSketch Code Analyzer - CAI Version</h1>
        </div>
        <Options
            options={options}
            seed={seed}
            showSeed={true}
            setOptions={setOptions}
            setSeed={setSeed}
        />
        <Upload
            processing={processing}
            options={options}
            seed={seed}
            setProcessing={setProcessing}
            setResults={setResults}
        />
        <Results
            results={results}
            processing={processing}
            options={{ useContestID: false, allowedKeys: ["OVERVIEW", "COMPLEXITY", "MEASUREVIEW", "GENRE", "SOUNDPROFILE"], showIndividualResults: false } as DownloadOptions}
        />
        <ModalContainer />
    </div>
}
