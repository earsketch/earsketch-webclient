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

const scriptInfo: any[] = []
const types: any[] = []

export const Options = ({ options, seed, showSeed, setOptions, setSeed }:
    { options: ReportOptions | ContestOptions, seed?: number, showSeed: boolean, setOptions: (o: any) => void, setSeed: (s?: number) => void }) => {
    return <div className="container">
        <div className="panel panel-primary">
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
            const contestEntries: { [key: string]: { id: number, finished: boolean } } = {}
            const urlList = []
            try {
                script = await readFile(file)
                console.log("script", script)
                for (const row of script.split("\n")) {
                    const values = row.split(",")
                    if (values.length > 4) {
                        urlList.push(values[5])
                        scriptInfo.push(values[0] + "," + values[1] + "," + values[2] + "," + values[3] + "," + values[4])
                        types.push(values[2].substring(2, values[2].length - 1))
                    }

                }
            } catch (err) {
                console.error(err)
                return
            }
            setUrls(urlList)
        }
    }

    // Run a single script and add the result to the results list.
    const runScript = async (script: Script, version: number | null = null) => {
        let result: Result
        const reports: any = {
            COMPLEXITY: {complexity: ""} }
        try {
            if (script.source_code != "\r" && script.source_code != "") {
                // const compilerOuptut = await compile(script.source_code, "script.py", seed)
                while (script.source_code.endsWith("\"") || script.source_code.endsWith("\r") || script.source_code.endsWith("\n")) {
                    script.source_code = script.source_code.substring(0, script.source_code.length - 1);
                }

                while (script.source_code.startsWith("\"\"")) {
                    script.source_code = script.source_code.substring(1);
                }

                if (script.source_code.includes("\"\"")) {
                    script.source_code= script.source_code.split("\"\"").join("\"");
                }
                //caiAnalysisModule.analyzeMusic(compilerOuptut)
                if (script.name.includes(".js")) {
                    reports["COMPLEXITY"]["complexity"] = caiAnalysisModule.analyzeCode("javascript", script.source_code).split(",").join("|")
                }
                else {
                    while (script.source_code.startsWith("\"")) {
                        script.source_code = script.source_code.substring(1);
                    }
                    reports["COMPLEXITY"]["complexity"] = caiAnalysisModule.analyzeCode("python", script.source_code).split(",").join("|")
                }
                console.log(reports["COMPLEXITY"])

                //for (const option of Object.keys(reports)) {
                //    if (!options[option as keyof ReportOptions]) {
                //        delete reports[option]
                //    }
                //}
            }
            result = {
                script: script,
                reports: reports
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

    const runScriptHistory = async (script: Script) => {
        const results: Result[] = []
        const history = await userProject.getScriptHistory(script.shareid)

        let versions = Object.keys(history) as unknown as number[]

        for (const version of versions) {
            // add information from base script to version report.
            history[version].name = script.name
            history[version].username = script.username
            history[version].shareid = script.shareid
            results.push(await runScript(history[version], version))
        }
        return results
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
        let index: number = 0;
        for (const url of urls) {
            const match = url
            esconsole("Grading: " + match, ["DEBUG"])
            let script
            let scriptText


            console.log(index.toString() + "/" + urls.length.toString())
            try {
                if (match != "\r") {
                    scriptText = match.split("NEWLINE").join("\n")
                    scriptText = scriptText.split("\\t").join("\t")
                    scriptText = scriptText.split("|||").join(",")

                    //strip extraneous quotation marks

                    while(scriptText.endsWith("\"") || scriptText.endsWith("\n") ||scriptText.endsWith("\r") ){
                        scriptText = scriptText.substring(0, scriptText.length - 1)
                    }

                    while (scriptText.startsWith("\"\"")) {
                        scriptText = scriptText.substring(1)
                    }
                }
                else {
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
            {csvInput
                ? <div className="panel-heading">
                    Upload CSV File
                    <button className="btn btn-primary" onClick={() => setCsvInput(false)}>Switch to Text Input</button>
                </div>
                : <div className="panel-heading">
                    Paste share URLs
                    <button className="btn btn-primary" onClick={() => setCsvInput(true)}>Switch to CSV Input</button>
                </div>}
            {csvInput
                ? <div className="panel-body">
                    <input type="file" onChange={file => {
                        if (file.target.files) { updateCSVFile(file.target.files[0]) }
                    }} />
                    <input type="text" value={contestIDColumn} onChange={e => setContestIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />Contest ID Column
                    <input type="text" value={shareIDColumn} onChange={e => setShareIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />Share ID Column
                </div>
                : <div className="panel-body">
                    <textarea className="form-control" placeholder="One per line..." onChange={e => setUrls(e.target.value.split("\n"))}></textarea>
                </div>}
            <div className="panel-footer">
                {processing
                    ? <button className="btn btn-primary" onClick={run} disabled>
                        <i className="es-spinner animate-spin mr-3"></i> Run
                    </button>
                    : <button className="btn btn-primary" onClick={run}> Run </button>}
                {!userProject.getToken() &&
                    <div>This service requires you to be logged in. Please log into EarSketch using a different tab.</div>}
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
            options={{ useContestID: false, allowedKeys: ["OVERVIEW", "COMPLEXITY", "EFFECTS"], showIndividualResults: true } as DownloadOptions}
        />
        <ModalContainer />
    </div>
}
