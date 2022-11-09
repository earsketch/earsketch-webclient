import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { ModalContainer } from "./App"
import { readFile } from "./Autograder"
import { download, runScript, runScriptHistory, AnalyzerReport, Result, InputType, ReportOptions } from "./codeAnalyzerFunctions"
import type { Script } from "common"
import esconsole from "../esconsole"
import { loadScript } from "../browser/scriptsThunks"
import { getStandardSounds } from "../browser/soundsThunks"
import { selectLoggedIn } from "../user/userState"
import { parseLanguage } from "../esutils"

const FormatButton = ({ label, formatChange, inputType, value }: {
    label: string, formatChange: (v: InputType) => void, inputType: InputType, value: InputType
}) => {
    return <button className="btn btn-primary" style={{ width: "15%", backgroundColor: inputType === value ? "#333" : "lightgray" }} onClick={() => formatChange(value)}> {label} </button>
}

const Options = ({ options, setOptions }: { options: ReportOptions, setOptions: (o: ReportOptions) => void }) => {
    return <div className="panel panel-primary">
        <div className="panel-body">
            <label>
                Code/Music Analysis Options:
            </label><br></br>
            <ul>
                {Object.entries(options).map(([option, value]) =>
                    <label key={option}>
                        {!option.includes("OVERVIEW") &&
                            <>
                                <input type="checkbox" checked={value} onChange={e => setOptions({ ...options, [option]: e.target.checked })}></input>
                                {option}
                            </>}
                    </label>
                )}
            </ul>
        </div>
    </div>
}

const Upload = ({ processing, useContest, results, setResults, setProcessing, setUseContest }: {
    processing: string | null, useContest: boolean, results: Result [],
    setResults: (r: Result[]) => void, setProcessing: (p: string | null) => void, setUseContest: (d: boolean) => void
}) => {
    const loggedIn = useSelector(selectLoggedIn)
    const [urls, setUrls] = useState({} as { [key: string | number]: string })
    const [inputType, setinputType] = useState("text" as "text" | "csv" | "zip")
    const [contestIDColumn, setContestIDColumn] = useState(0)
    const [shareIDColumn, setShareIDColumn] = useState(1)

    const [useHistory, setUseHistory] = useState(false)

    const updateCSVFile = async (file: File) => {
        if (file) {
            const urlList = {} as { [key: string | number]: string }
            const script = await readFile(file)
            console.log("csv file", script)
            for (const row of script.split("\n")) {
                const values = row.split(",")
                if (values[shareIDColumn] && values[shareIDColumn] !== "scriptid" && values[contestIDColumn] !== "Competitor ID") {
                    const match = values[shareIDColumn].match(/\?sharing=([^\s.,])+/g)
                    const shareid = match ? match[0].substring(9) : values[shareIDColumn]
                    urlList[values[contestIDColumn]] = "?sharing=" + shareid
                }
            }
            setUrls(urlList)
        }
    }

    const updateZipFile = async (file: File) => {
        if (file) {
            const urlList = {} as { [key: string | number]: string }
            const content = await JSZip.loadAsync(file)
            for (const [filename, contents] of Object.entries(content.files)) {
                if (!filename.includes("__MACOSX/")) {
                    const fileContents = contents as any
                    const scriptText = await fileContents.async("text")
                    console.log(filename, parseLanguage(filename), scriptText)
                    urlList[filename] = scriptText
                }
            }
            setUrls(urlList)
        }
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const runURLs = async () => {
        setResults([])
        setProcessing(null)

        let results: Result[] = []
        const re = /\?sharing=([^\s.,])+/g
        esconsole("Running code analyzer", ["DEBUG"])

        for (const [id, url] of Object.entries(urls)) {
            const matches = url.match(re) ?? []
            for (const match of matches) {
                if (!match) { continue }
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
                    result.contestID = id
                    results = [...results, result]
                    setResults(results)
                    setProcessing(null)
                } else {
                    const result = await runScriptHistory(script, useHistory)
                    for (const r of result) {
                        r.contestID = id
                        results = [...results, r]
                    }
                    setResults(results)
                }
                setProcessing(null)
            }
        }
    }

    // Read all script urls, parse their shareid, and then load and run every script adding the results to the results list.
    const runSourceCodes = async () => {
        setResults([])
        setProcessing(null)

        let results: Result[] = []
        esconsole("Running code analyzer", ["DEBUG"])

        for (const [filename, sourceCode] of Object.entries(urls)) {
            esconsole("Grading: " + filename, ["DEBUG"])
            setProcessing(filename)

            const script = { name: filename, source_code: sourceCode } as Script
            const result = await runScript(script)
            results = [...results, result]

            setResults(results)
        }
        setProcessing(null)
    }

    return <div className="panel panel-primary">
        <div className="panel-heading">
            {inputType === "text"
                ? " Paste share URLs"
                : " Upload " + inputType.toLocaleUpperCase() + " File"}
        </div>
        <div className="panel-body">
            <div>
                <FormatButton label="Text Input" formatChange={setinputType} inputType={inputType} value="text" />
                <FormatButton label="CSV Input" formatChange={setinputType} inputType={inputType} value="csv" />
                <FormatButton label="File Input" formatChange={setinputType} inputType={inputType} value="zip" />
            </div>
            {inputType !== "zip" &&
                <div>
                    <input type="checkbox" checked={useHistory} onChange={e => setUseHistory(e.target.checked)}></input> Use Version History
                </div>}
        </div>
        {inputType === "csv"
            ? <div className="panel-body">
                <input type="file" onChange={file => {
                    if (file.target.files) { updateCSVFile(file.target.files[0]) }
                }} />
                <div>
                    <input type="checkbox" checked={useContest} onChange={e => setUseContest(e.target.checked)}></input>
                    <label>Use Contest IDs</label>
                    {useContest &&
                        <div>
                            <label>Contest ID Column</label>
                            <input type="text" value={contestIDColumn} onChange={e => setContestIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                        </div>}
                </div>
                <div>
                    <label>Share ID Column</label>
                    <input type="text" value={shareIDColumn} onChange={e => setShareIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                </div>
            </div>
            : <div className="panel-body">
                {inputType === "zip"
                    ? <input type="file" onChange={file => {
                        if (file.target.files) { updateZipFile(file.target.files[0]) }
                    }} />
                    : <textarea className="form-textarea w-full" placeholder="One per line..." onChange={e => setUrls(e.target.value.split("\n").reduce((obj, url, idx) => ({ ...obj, [idx]: url }), {}))}></textarea>}
            </div>}
        <div className="panel-footer">
            {processing
                ? <button className="btn btn-primary" onClick={inputType === "zip" ? runSourceCodes : runURLs} disabled>
                    <i className="es-spinner animate-spin mr-3"></i> Run {(Object.keys(urls).length > 0) ? "(" + results.length + "/" + Object.keys(urls).length + ")" : ""}
                </button>
                : <button className="btn btn-primary" onClick={inputType === "zip" ? runSourceCodes : runURLs}> Run </button>}
            {!loggedIn &&
            <div>This service requires you to be logged in. Please log into EarSketch using a different tab.</div>}
        </div>
    </div>
}

// TODO: add display options for array and object-type reports (example: lists of sounds in measureView).
const ReportDisplay = ({ report }: { report: AnalyzerReport }) => {
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

const ResultPanel = ({ result, options }: { result: Result, options: ReportOptions }) => {
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
                                <label key={name}>
                                    {options[name as keyof ReportOptions] &&
                                        <li key={name}>
                                            {name}
                                            <ReportDisplay report={report} />
                                        </li>}
                                </label>
                            )}
                        </ul>
                    </div>
                </div>}
        </div>
    </div>
}

const Results = ({ results, processing, useContestID, showIndividualResults, options }: { results: Result[], processing: string | null, useContestID: boolean, showIndividualResults: boolean, options: ReportOptions }) => {
    return <div>
        {results.length > 0 &&
            <div className="container" style={{ textAlign: "center" }}>
                <button className="btn btn-lg btn-primary" onClick={() => download(results, useContestID, options)}><i className="glyphicon glyphicon-download-alt"></i> Download Report</button>
            </div>}
        {results.length > 0 && showIndividualResults &&
            <ul>
                {results.map((result, index) =>
                    <li key={index}>
                        <ResultPanel result={result} options={options} />
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
    const dispatch = useDispatch()
    document.getElementById("loading-screen")!.style.display = "none"

    const [useContest, setUseContest] = useState(false)
    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])
    const [showIndividualResults, _] = useState(true)

    const [options, setOptions] = useState({
        OVERVIEW: true,
        COUNTS: true,
        "CODE INDICATOR": true,
        "CODE COMPLEXITY": true,
        MEASUREVIEW: false,
        SOUNDPROFILE: false,
        DEPTHBREADTH: true,
    } as ReportOptions)

    useEffect(() => { dispatch(getStandardSounds()) }, [])

    return <div>
        <div className="container">
            <h1 style={{ fontSize: "x-large" }}>EarSketch Code Analyzer</h1>
            <Upload
                processing={processing}
                results={results}
                useContest={useContest}
                setProcessing={setProcessing}
                setResults={setResults}
                setUseContest={setUseContest}
            />
            <Options
                options={options}
                setOptions={setOptions}
            />
        </div>
        <Results
            results={results}
            processing={processing}
            useContestID={useContest}
            showIndividualResults={showIndividualResults}
            options={options}
        />
        <ModalContainer />
    </div>
}
