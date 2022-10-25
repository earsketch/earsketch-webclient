import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import esconsole from "../esconsole"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as user from "../user/userState"

import { Script } from "common"

import { analyzeMusic, analyzeCode } from "../cai/analysis"
import { fillDict } from "./recommender"

import { DownloadOptions, Result, Results, Reports } from "./CodeAnalyzer"
import { compile, readFile } from "./Autograder"
import { ContestOptions } from "./CodeAnalyzerContest"
import { getStandardSounds } from "./audiolibrary"

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

const FormatButton = ({ label, formatChange, variable, value }: {
    label: string, formatChange: (v: boolean) => void, variable: boolean, value: boolean
}) => {
    return <button className="btn btn-primary" style={{ width: "15%", backgroundColor: variable === value ? "#333" : "lightgray" }} onClick={() => formatChange(value)}> {label} </button>
}

export const Upload = ({ processing, options, seed, contestDict, setResults, setContestResults, setProcessing, setContestDict }: {
    processing: string | null, options: ReportOptions, seed?: number, contestDict?: Entries, setResults: (r: Result[]) => void, setContestResults?: (r: Result[]) => void, setProcessing: (p: string | null) => void, setContestDict?: (d: Entries) => void
}) => {
    const loggedIn = useSelector(user.selectLoggedIn)
    const [urls, setUrls] = useState([] as string[])
    const [csvInput, setCsvInput] = useState(false)
    const [csvText, setCsvText] = useState(false)
    const [contestIDColumn, setContestIDColumn] = useState(0)
    const [shareIDColumn, setShareIDColumn] = useState(1)
    const [fileNameColumn, setFileNameColumn] = useState(0)
    const [sourceCodeColumn, setSourceCodeColumn] = useState(1)

    const [sourceCodeEntries, setSourceCodeEntries] = useState({} as Entries)
    const [newline, setNewline] = useState("NEWLINE")
    const [comma, setComma] = useState("COMMA")

    const sourceCodeReformat = (sourceCode: String) => {
        if (sourceCode) {
            let formattedCode = sourceCode.replace(new RegExp(newline, "g"), "\n")
            formattedCode = formattedCode.replace(new RegExp(comma, "g"), ",")
            return formattedCode
        } else {
            return ""
        }
    }

    const updateCSVFile = async (file: File) => {
        if (file) {
            let script
            const contestEntries: Entries = {}
            const urlList: string [] = []
            try {
                script = await readFile(file)
                console.log("script", script)
                for (const row of script.split("\n")) {
                    const values = row.split(",")
                    if (csvText) {
                        if (values[fileNameColumn] !== "File Name" && values[sourceCodeColumn] !== "Source Code") {
                            contestEntries[values[fileNameColumn]] = { id: values[fileNameColumn], sourceCode: sourceCodeReformat(values[sourceCodeColumn]), finished: false }
                        }
                    } else {
                        if (values[shareIDColumn] !== "scriptid" && values[contestIDColumn] !== "Competitor ID") {
                            const match = values[shareIDColumn].match(/\?sharing=([^\s.,])+/g)
                            const shareid = match ? match[0].substring(9) : values[shareIDColumn]
                            contestEntries[shareid] = { id: values[contestIDColumn], finished: false }
                            urlList.push("?sharing=" + shareid)
                        }
                    }
                }
            } catch (err) {
                console.error(err)
                return
            }
            setUrls(urlList)
            setContestDict?.(contestEntries)

            if (csvText) {
                setSourceCodeEntries(contestEntries)
            }
        }
    }

    // Run a single script and add the result to the results list.
    const runScript = async (script: Script, version?: number) => {
        let result: Result
        try {
            const compilerOuptut = await compile(script.source_code, script.name, seed)
            const reports: Reports = analyzeMusic(compilerOuptut)
            if (options.COMPLEXITY) {
                // Only use CAI code analysis if complexity is required in output report.
                const outputComplexity = analyzeCode(ESUtils.parseLanguage(script.name), script.source_code)
                reports.COMPLEXITY = outputComplexity.codeFeatures
            } else if (options.VARIABLES) {
                // Analyze code anyways to count and store variables.
                analyzeCode(ESUtils.parseLanguage(script.name), script.source_code)
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
        try {
            const scriptHistory = await scriptsThunks.getScriptHistory(script.shareid)

            if (!scriptHistory.length) {
                results.push(await runScript(script))
            } else {
                let versions = Object.keys(scriptHistory) as unknown as number[]
                if (!options.HISTORY) {
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

    const runSourceCodes = async () => {
        const sourceCodeRefresh: Entries = {}
        if (sourceCodeEntries) {
            for (const fileName of Object.keys(sourceCodeEntries)) {
                sourceCodeRefresh[fileName] = { id: sourceCodeEntries[fileName].id, sourceCode: sourceCodeEntries[fileName].sourceCode, finished: false }
            }
            setSourceCodeEntries?.({ ...sourceCodeRefresh })
        }
        setProcessing(null)

        let results: Result[] = []

        if (sourceCodeEntries) {
            for (const fileName of Object.keys(sourceCodeEntries)) {
                const script = { source_code: sourceCodeEntries[fileName].sourceCode, name: fileName } as Script
                setResults([...results, { script }])
                const result = await runScript(script)
                if (sourceCodeEntries?.[fileName]) {
                    result.contestID = sourceCodeEntries[fileName].id
                }
                results = [...results, result]
            }
            setResults(results)
        }
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const run = async () => {
        setResults([])
        setContestResults?.([])

        if (csvText) {
            return runSourceCodes()
        }

        const contestDictRefresh: Entries = {}
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
                script = await scriptsThunks.loadScript(shareId, false)
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
            <div className="panel-heading">
                Step 2:
                {csvInput
                    ? " Upload CSV File"
                    : " Paste share URLs"}
            </div>
            <div className="panel-body">
                <div>
                    <FormatButton label="Text Input" formatChange={setCsvInput} variable={csvInput} value={false} />
                    {" "}
                    {csvInput &&
                        <FormatButton label="Share IDs" formatChange={setCsvText} variable={csvText} value={false} />}
                </div>
                <div>
                    <FormatButton label="CSV Input" formatChange={setCsvInput} variable={csvInput} value={true} />
                    {" "}
                    {csvInput &&
                    <FormatButton label="Source Code" formatChange={setCsvText} variable={csvText} value={true} />}
                </div>
            </div>
            {csvInput
                ? <div className="panel-body">
                    <input type="file" onChange={file => {
                        if (file.target.files) { updateCSVFile(file.target.files[0]) }
                    }} />
                    <label>{csvText ? "Filename Column" : "Contest ID Column"}</label>
                    <input type="text" value={csvText ? fileNameColumn : contestIDColumn} onChange={e => csvText ? setFileNameColumn(Number(e.target.value)) : setContestIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                    <label>{csvText ? "Source Code Column" : "Share ID Column"}</label>
                    <input type="text" value={csvText ? sourceCodeColumn : shareIDColumn} onChange={e => csvText ? setSourceCodeColumn(Number(e.target.value)) : setShareIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                    {csvText &&
                        <div>
                            <label> Newline Character </label>
                            <input type="text" value={newline} onChange={e => setNewline(e.target.value)} style={{ backgroundColor: "lightgray" }} />
                            <label> Comma Character </label>
                            <input type="text" value={comma} onChange={e => setComma(e.target.value)} style={{ backgroundColor: "lightgray" }} />
                        </div>}
                </div>
                : <div className="panel-body">
                    <textarea className="form-textarea w-full" placeholder="One per line..." onChange={e => setUrls(e.target.value.split("\n"))}></textarea>
                </div>}
            <div className="panel-footer">
                {processing
                    ? <button className="btn btn-primary" onClick={run} disabled>
                        <i className="es-spinner animate-spin mr-3"></i> Run
                    </button>
                    : <button className="btn btn-primary" onClick={run}> Run </button>}
                {!loggedIn &&
                <div>This service requires you to be logged in. Please log into EarSketch using a different tab.</div>}
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
    VARIABLES: boolean
}

export interface Entries {
    [key: string]: {
        id: string
        finished: boolean
        sourceCode?: string
    }
}

export const CodeAnalyzerCAI = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    useEffect(() => {
        const fillSoundData = async () => {
            const sounds = await getStandardSounds()
            fillDict(sounds)
        }

        fillSoundData()
    }, [])

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
        VARIABLES: false,
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
