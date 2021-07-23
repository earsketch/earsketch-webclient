import React, { useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as userProject from "./userProject"

import { Script } from "common"

import * as caiAnalysisModule from "../cai/analysis"

import { Result, Results } from "./CodeAnalyzer"
import { compile, randomSeed } from "./Autograder"


const Options = ({ options, seed, useSeed, setOptions, setSeed, setUseSeed }:
    { options: ReportOptions, seed: number, useSeed: boolean, setOptions: (o: ReportOptions) => void, setSeed: (s: number) => void, setUseSeed: (s: boolean) => void }) => {

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
                                <input type="checkbox" checked={value} onChange={e => setOptions({ ...options, [option]: e.target.checked })}></input>
                                {option}
                            </label>
                        )}
                    </ul>
                </div>
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
                </div>
                <div className="col-md-4">
                    <label>
                        Warning:
                    </label>
                    This site uses login information from EarSketch, so make sure you are logged in on another tab or window.
                </div>
            </div>
        </div>
    </div>
}

const Upload = ({ processing, options, setResults, setProcessing }:
    { processing: string | null, options: ReportOptions, setResults: (r: Result[]) => void, setProcessing: (p: string | null) => void }) => {
    const [urls, setUrls] = useState("")
    // const [csvInput, setCsvInput] = useState(false)

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
            result = {
                script: script,
                error: err.args.v[0].v + " on line " + err.traceback[0].lineno,
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
                const result = await runScriptHistory(script)
                for (const r of result) {
                    results.push(r)
                }
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

interface ReportOptions {
    OVERVIEW: boolean,
    COMPLEXITY: boolean,
    EFFECTS: boolean,
    // MEASUREVIEW: boolean,
    // GENRE: boolean,
    // SOUNDPROFILE: boolean,
    MIXING: boolean,
    HISTORY: boolean,
    // APICALLS: boolean,
}

export const CodeAnalyzerCAI = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const [options, setOptions] = useState({
        OVERVIEW: true,
        COMPLEXITY: true,
        EFFECTS: false,
        // MEASUREVIEW: false,
        // GENRE: false,
        // SOUNDPROFILE: false,
        MIXING: false,
        HISTORY: false,
        // APICALLS: false,
    } as ReportOptions)

    const [useSeed, setUseSeed] = useState(false)
    const [seed, setSeed] = useState(Date.now())

    return <div>
        <h1>Code Analyzer - CAI</h1>
        <Options
            options={options}
            seed={seed}
            useSeed={useSeed}
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
        />
        <ModalContainer />
    </div>
}

