import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { ModalContainer } from "./App"
import { readFile } from "./Autograder"
import {
    download, sourceCodeReformat, runScriptHistory, runSourceCodes, gradeResults,
    Report, Result, DownloadOptions, ReportOptions, ContestOptions, ContestEntries,
} from "./codeAnalyzerFunctions"
import type { Script } from "common"
import esconsole from "../esconsole"
import { loadScript } from "../browser/scriptsThunks"
import { selectLoggedIn } from "../user/userState"
import { fillDict } from "../cai/analysis"

const FormatButton = ({ label, formatChange, variable, value }: {
    label: string, formatChange: (v: boolean) => void, variable: boolean, value: boolean
}) => {
    return <button className="btn btn-primary" style={{ width: "15%", backgroundColor: variable === value ? "#333" : "lightgray" }} onClick={() => formatChange(value)}> {label} </button>
}

const Options = ({ options, seed, showSeed, setOptions, setSeed }: {
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
                    <div className="col-md-4" style={{ float: "right" }}>
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

const Upload = ({ processing, options, seed, contestDict, useContest, results, setResults, setContestResults, setProcessing, setContestDict }: {
    processing: string | null, options: ReportOptions, seed?: number, contestDict: ContestEntries, useContest?: boolean, results: Result [], setResults: (r: Result[]) => void, setContestResults?: (r: Result[]) => void, setProcessing: (p: string | null) => void, setContestDict?: (d: ContestEntries) => void
}) => {
    const loggedIn = useSelector(selectLoggedIn)
    const [urls, setUrls] = useState([] as string[])
    const [csvInput, setCsvInput] = useState(false)
    const [sourceCodeInput, setSourceCodeInput] = useState(false)
    const [contestIDColumn, setContestIDColumn] = useState(0)
    const [shareIDColumn, setShareIDColumn] = useState(1)
    const [fileNameColumn, setFileNameColumn] = useState(0)
    const [sourceCodeColumn, setSourceCodeColumn] = useState(1)

    const [sourceCodeEntries, setSourceCodeEntries] = useState({} as ContestEntries)
    const [newline, setNewline] = useState("NEWLINE")
    const [comma, setComma] = useState("COMMA")

    const [useCAI, setUseCAI] = useState(true)
    const [useHistory, setUseHistory] = useState(false)

    const updateCSVFile = async (file: File) => {
        if (file) {
            const contestEntries: ContestEntries = {}
            const urlList: string [] = []
            const script = await readFile(file)
            console.log("script", script)
            for (const row of script.split("\n")) {
                const values = row.split(",")
                if (sourceCodeInput) {
                    if (values[fileNameColumn] !== "File Name" && values[sourceCodeColumn] !== "Source Code") {
                        contestEntries[values[fileNameColumn]] = {
                            id: values[fileNameColumn],
                            sourceCode: sourceCodeReformat(values[sourceCodeColumn], newline, comma),
                            finished: false,
                        }
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

            setUrls(urlList)
            setContestDict?.(contestEntries)

            if (sourceCodeInput) {
                setSourceCodeEntries(contestEntries)
            }
        }
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const run = async () => {
        setResults([])
        setContestResults?.([])

        if ((sourceCodeInput && !useContest)) {
            setResults(await runSourceCodes(sourceCodeEntries, options, seed, useCAI, useContest))
            setSourceCodeEntries({ ...sourceCodeEntries })
            setProcessing(null)
            return
        }

        for (const entry of Object.values(contestDict)) {
            entry.finished = false
        }
        setContestDict?.({ ...contestDict })
        setProcessing(null)

        const matches: RegExpMatchArray | null = []
        const re = /\?sharing=([^\s.,])+/g
        esconsole("Running code analyzer (" + useCAI ? "CAI" : "original" + ").", ["DEBUG"])

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
                script = await loadScript(shareId, false)
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
                const result = await runScriptHistory(script, options, seed, useCAI, useContest, useHistory)
                for (const r of result) {
                    if (contestDict?.[shareId]) {
                        r.contestID = contestDict[shareId].id
                    }
                    results = [...results, r]
                }
                setResults(results)
            }
        }
        setProcessing(null)
    }

    return <div className="container">
        <div className="panel panel-primary">
            <div className="panel-heading">
                Step 2:
                {csvInput
                    ? " Upload CSV File"
                    : " Paste share URLs"}
            </div>
            {!useContest &&
                <div className="panel-body">
                    <div>
                        <input type="checkbox" checked={useCAI} onChange={e => setUseCAI(e.target.checked)}></input> Use CAI Complexity Calculator
                    </div>
                    <div>
                        <input type="checkbox" checked={useHistory} onChange={e => setUseHistory(e.target.checked)}></input> Use Version History
                    </div>
                    <div>
                        <FormatButton label="Text Input" formatChange={setCsvInput} variable={csvInput} value={false} />
                        {" "}
                        {csvInput &&
                            <FormatButton label="Share IDs" formatChange={setSourceCodeInput} variable={sourceCodeInput} value={false} />}
                    </div>
                    <div>
                        <FormatButton label="CSV Input" formatChange={setCsvInput} variable={csvInput} value={true} />
                        {" "}
                        {csvInput &&
                        <FormatButton label="Source Code" formatChange={setSourceCodeInput} variable={sourceCodeInput} value={true} />}
                    </div>
                </div>}
            {(csvInput || useContest)
                ? <div className="panel-body">
                    <input type="file" onChange={file => {
                        if (file.target.files) { updateCSVFile(file.target.files[0]) }
                    }} />
                    {(sourceCodeInput || useContest) &&
                        <>
                            <label>{(sourceCodeInput && !useContest) ? "Filename Column" : "Contest ID Column"}</label>
                            <input type="text" value={(sourceCodeInput && !useContest) ? fileNameColumn : contestIDColumn} onChange={e => (sourceCodeInput && !useContest) ? setFileNameColumn(Number(e.target.value)) : setContestIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                        </>}
                    <label>{(sourceCodeInput && !useContest) ? "Source Code Column" : "Share ID Column"}</label>
                    <input type="text" value={(sourceCodeInput && !useContest) ? sourceCodeColumn : shareIDColumn} onChange={e => (sourceCodeInput && !useContest) ? setSourceCodeColumn(Number(e.target.value)) : setShareIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                    {(sourceCodeInput && !useContest) &&
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
                        <i className="es-spinner animate-spin mr-3"></i> Run {(urls.length > 0) ? "(" + results.length + "/" + urls.length + ")" : ""}
                    </button>
                    : <button className="btn btn-primary" onClick={run}> Run </button>}
                {!loggedIn &&
                <div>This service requires you to be logged in. Please log into EarSketch using a different tab.</div>}
            </div>
        </div>
    </div>
}

const ContestGrading = ({ results, contestResults, contestDict, options, setContestResults }: { results: Result[], contestResults: Result[], contestDict: ContestEntries, options: ContestOptions, setContestResults: (r: Result[]) => void }) => {
    const [musicPassed, setMusicPassed] = useState(0)
    const [codePassed, setCodePassed] = useState(0)
    const [musicCodePassed, setMusicCodePassed] = useState(0)

    useEffect(() => {
        setMusicPassed(0)
        setCodePassed(0)
        setMusicCodePassed(0)
    }, [contestDict])

    useEffect(() => {
        const outputData = gradeResults(results, [...contestResults], contestDict, options)
        setMusicPassed(musicPassed + outputData.musicPassed)
        setCodePassed(codePassed + outputData.codePassed)
        setMusicCodePassed(musicCodePassed + outputData.musicCodePassed)
        setContestResults(outputData.contestResults)
    }, [results])

    return <div className="container">
        {contestResults.length} valid results. {musicPassed} passed music. {codePassed} passed code. {musicCodePassed} passed both.
    </div>
}

// TODO: add display options for array and object-type reports (example: lists of sounds in measureView).
const ReportDisplay = ({ report }: { report: Report }) => {
    return <table className="table">
        <tbody>
            {Object.entries(report).filter(([key, _]) => !["codeStructure", "ast"].includes(key)).map(([key, value]) =>
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

const Results = ({ results, processing, options }: { results: Result[], processing: string | null, options: DownloadOptions }) => {
    return <div>
        {results.length > 0 &&
            <div className="container" style={{ textAlign: "center" }}>
                <button className="btn btn-lg btn-primary" onClick={() => download(results, options)}><i className="glyphicon glyphicon-download-alt"></i> Download Report</button>
            </div>}
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
    </div>
}

export const CodeAnalyzer = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [useContest, setUseContest] = useState(false)
    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const downloadOptions = {
        useContestID: useContest,
        allowedKeys: ["OVERVIEW", "COMPLEXITY", "EFFECTS"],
        showIndividualResults: true,
    } as DownloadOptions

    // Report Parameters
    const [reportOptions, setReportOptions] = useState({
        OVERVIEW: true,
        COMPLEXITY: true,
        MEASUREVIEW: false,
        SOUNDPROFILE: false,
        APICALLS: false,
        VARIABLES: false,
    } as ReportOptions)
    const [seed, setSeed] = useState(Date.now() as number | undefined)

    // Contest Parameters
    const [contestDict, setContestDict] = useState({} as ContestEntries)
    const [contestResults, setContestResults] = useState([] as Result[])
    const [contestOptions, setContestOptions] = useState({
        artistNames: "",
        complexityThreshold: 0,
        uniqueStems: 0,
        lengthRequirement: 0,
        startingID: 0,
        showIndividualGrades: true,
    } as ContestOptions)

    // On startup, fill sound genre/instrument dictionaries for CAI analysis.
    useEffect(() => {
        fillDict()
    }, [])

    return <div>
        <div className="container">
            <h1 style={{ fontSize: "x-large" }}>EarSketch Code Analyzer</h1>
            <input type="checkbox" checked={useContest} onChange={e => { setUseContest(e.target.checked); downloadOptions.useContestID = e.target.checked }} /> Use Contest Grading
        </div>
        <Options
            options={!useContest ? reportOptions : contestOptions}
            seed={seed}
            showSeed={!useContest}
            setOptions={!useContest ? setReportOptions : setContestOptions}
            setSeed={!useContest ? setSeed : () => null}
        />
        <Upload
            processing={processing}
            options={!useContest
                ? reportOptions
                : {
                    OVERVIEW: true,
                    COMPLEXITY: false,
                    MEASUREVIEW: true,
                    APICALLS: true,
                    VARIABLES: true,
                } as ReportOptions}
            contestDict={contestDict}
            seed={seed}
            results={results}
            setProcessing={setProcessing}
            setResults={setResults}
            setContestResults={setContestResults}
            setContestDict={setContestDict}
            useContest={useContest}
        />
        <div>
            {useContest &&
            <ContestGrading
                results={results}
                contestResults={contestResults}
                contestDict={contestDict}
                options={contestOptions}
                setContestResults={setContestResults}
            />}
        </div>
        <Results
            results={!useContest ? results : contestResults}
            processing={processing}
            options={downloadOptions}
        />
        <ModalContainer />
    </div>
}
