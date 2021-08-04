import React, { useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as userProject from "./userProject"

import { Script } from "common"

import * as caiAnalysisModule from "../cai/analysis"

import { DownloadOptions, Result, Results } from "./CodeAnalyzer"
import { compile, randomSeed, readFile } from "./Autograder"
import { ContestOptions } from "./CodeAnalyzerContest"

export const Options = ({ options, seed, useSeed, showSeed, setOptions, setSeed, setUseSeed }:
    { options: ReportOptions | ContestOptions, seed: number, useSeed: boolean, showSeed: boolean, setOptions: (o: any) => void, setSeed: (s: number) => void, setUseSeed: (s: boolean) => void }) => {
    const updateSeed = (seed: number, useSeed: boolean) => {
        setUseSeed(useSeed)
        if (useSeed) {
            setSeed(seed)
        }
        randomSeed(seed, useSeed)
    }

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
                        <label>
                            <input type="checkbox" checked={useSeed} onChange={e => updateSeed(seed, e.target.checked)}></input>
                            Use the following random seed:
                        </label>
                        <input type="text" value={seed} onChange={e => updateSeed(Number(e.target.value), useSeed)}></input>
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

export const Upload = ({ processing, options, contestDict, setResults, setContestResults, setProcessing, setContestDict }:
    { processing: string | null, options: ReportOptions, contestDict?: { [key: string]: { id: number, finished: boolean } }, setResults: (r: Result[]) => void, setContestResults?: (r: Result[]) => void, setProcessing: (p: string | null) => void, setContestDict?: (d: { [key: string]: { id: number, finished: boolean } }) => void }) => {
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
                    if (values[shareIDColumn] !== "scriptid" && values[contestIDColumn] !== "Competitor ID") {
                        const match = values[shareIDColumn].match(/\?sharing=([^\s.,])+/g)
                        const shareid = match ? match[0].substring(9) : values[shareIDColumn]
                        contestEntries[shareid] = { id: Number(values[contestIDColumn]), finished: false }
                        urlList.push("?sharing=" + shareid)
                    }
                }
            } catch (err) {
                console.error(err)
                return
            }
            setUrls(urlList)
            setContestDict?.(contestEntries)
        }
    }

    // Run a single script and add the result to the results list.
    const runScript = async (script: Script, version: number | null = null) => {
        let result: Result
        try {
            const compilerOuptut = await compile(script.source_code, script.name)
            const reports = caiAnalysisModule.analyzeMusic(compilerOuptut)
            reports.COMPLEXITY = caiAnalysisModule.analyzeCode(ESUtils.parseLanguage(script.name), script.source_code)

            for (const option of Object.keys(reports)) {
                if (!options[option as keyof ReportOptions]) {
                    delete reports[option]
                }
            }
            result = {
                script: script,
                reports: reports,
            }
        } catch (err) {
            console.log("log error", err)
            result = {
                script: script,
                error: (err.args && err.traceback) ? err.args.v[0].v + " on line " + err.traceback[0].lineno : err.message,
            }
        }
        if (options.HISTORY) {
            result.version = version
        }
        setProcessing(null)
        return result
    }

    const runScriptHistory = async (script: Script) => {
        const results: Result[] = []
        const history = await userProject.getScriptHistory(script.shareid)

        let versions = Object.keys(history) as unknown as number[]
        if (!options.HISTORY) {
            versions = [versions[versions.length - 1]]
        }
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

        const matches: RegExpMatchArray | null = []
        const re = /\?sharing=([^\s.,])+/g
        esconsole("Running code analyzer.", ["DEBUG"])

        for (const url of urls) {
            const match = url.match(re)
            if (match) {
                for (const m of match) {
                    matches.push(m)
                }
            }
        }

        let results: Result[] = []

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
                } as Result
                if (contestDict?.[shareId]) {
                    result.contestID = contestDict[shareId].id
                }
                results = [...results, result]
                setResults(results)
                setProcessing(null)
            } else {
                setResults([...results, { script }])
                const result = await runScriptHistory(script)
                for (const r of result) {
                    if (contestDict?.[shareId]) {
                        r.contestID = contestDict[shareId].id
                    }
                    results = [...results, r]
                }
                setResults(results)
            }
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
            </div>
        </div>
    </div>
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

    const [useSeed, setUseSeed] = useState(false)
    const [seed, setSeed] = useState(Date.now())

    return <div>
        <div className="container">
            <h1>EarSketch Code Analyzer - CAI Version</h1>
        </div>
        <Options
            options={options}
            seed={seed}
            useSeed={useSeed}
            showSeed={true}
            setOptions={setOptions}
            setSeed={setSeed}
            setUseSeed={setUseSeed}
        />
        <Upload
            processing={processing}
            options={options}
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
