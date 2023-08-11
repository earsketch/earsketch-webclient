import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { ModalContainer } from "./App"
import { readFile } from "./Autograder"
import { download, runScript, runScriptHistory, AnalyzerReport, Result, InputType, ReportOptions } from "./codeAnalyzerFunctions"
import { cancel } from "./runner"
import type { Script } from "common"
import esconsole from "../esconsole"
import { loadScript } from "../browser/scriptsThunks"
import { getStandardSounds } from "../browser/soundsThunks"
import { selectLoggedIn } from "../user/userState"
import { parseLanguage } from "../esutils"
import { Tab } from "@headlessui/react"

const FormatButton = ({ label, formatChange, inputType, value }: {
    label: string, formatChange: (v: InputType) => void, inputType: InputType, value: InputType
}) => {
    return <button className="py-1 w-1/3" style={{ width: "15%", backgroundColor: inputType === value ? "#333" : "lightgray", color: inputType === value ? "#fff" : "#aaa" }} onClick={() => formatChange(value)}> {label} </button>
}

const Options = ({ options, setOptions }: { options: ReportOptions, setOptions: (o: ReportOptions) => void }) => {
    return <div className="min-h-1/3 w-1/5 border-r">
        <div>
            <label className="mb-2">
                Code/Music Analysis Options
            </label>
            <br/>
            <em className="text-sm"> These options affect the report download. </em>
            <div className="flex flex-col gap-y-1">
                {Object.entries(options).map(([option, value]) =>
                    <label key={option}>
                        {!option.includes("OVERVIEW") &&
                            <>
                                <input type="checkbox" checked={value} onChange={e => setOptions({ ...options, [option]: e.target.checked })}></input>
                                <span className="mx-1"> {option} </span>
                            </>}
                    </label>
                )}
            </div>
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
            esconsole("csv file", script)
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
                    esconsole(filename, parseLanguage(filename), scriptText)
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
                    const result = await runScriptHistory(script, useHistory, true)
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

    return <div className="w-3/5 flex flex-col h-1/3 py-10px ml-2">
        <div className="mb-4">
            <b className="text-lg"> Select input type </b>
            <div>
                <FormatButton label="URL" formatChange={setinputType} inputType={inputType} value="text" />
                <FormatButton label="CSV" formatChange={setinputType} inputType={inputType} value="csv" />
                <FormatButton label="ZIP" formatChange={setinputType} inputType={inputType} value="zip" />
            </div>
        </div>
        <div className="text-lg mb-4">
            <h2>
                {inputType === "text"
                    ? " Paste share URLs"
                    : " Upload " + inputType.toLocaleUpperCase() + " File"}
            </h2>
        </div>
        {inputType === "csv"
            ? <div className="mb-4">
                <input type="file" className="mb-2" onChange={file => {
                    if (file.target.files) { updateCSVFile(file.target.files[0]) }
                }} />
                <div className="grid grid-cols-2 gap-2 w-3/6">
                    <div>
                        <div className="mb-2">
                            <label className="w-6/6">Use Contest IDs</label>
                        </div>
                        {useContest &&
                            <div className="mb-2">
                                <label className="w-6/6">Contest ID Column</label>
                            </div>}
                        <div className="mb-2">
                            <label className="w-6/6">Share ID Column</label>
                        </div>
                    </div>
                    <div>
                        <div className="mb-2">
                            <input type="checkbox" checked={useContest} onChange={e => setUseContest(e.target.checked)}></input>
                        </div>
                        {useContest &&
                            <div className="mb-2">
                                {/* <label>Contest ID Column</label> */}
                                <input type="text" value={contestIDColumn} onChange={e => setContestIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                            </div>}
                        <div className="mb-2">
                            <input type="text" value={shareIDColumn} onChange={e => setShareIDColumn(Number(e.target.value))} style={{ backgroundColor: "lightgray" }} />
                        </div>
                    </div>
                </div>
            </div>
            : <div className="mb-4">
                {inputType === "zip"
                    ? <input type="file" onChange={file => {
                        if (file.target.files) { updateZipFile(file.target.files[0]) }
                    }} />
                    : <textarea className="w-full border-2" placeholder="One URL with ShareID per line. For example:&#10;https://earsketch.gatech.edu/earsketch2/?sharing=w1-hD5TLwdSXM_4CuaCDng&#10;https://earsketch.gatech.edu/earsketch2/?sharing=w1-hD5TLwdSXM_4CuaCDng" onChange={e => setUrls(e.target.value.split("\n").reduce((obj, url, idx) => ({ ...obj, [idx]: url }), {}))}></textarea>}
            </div>}
        {inputType !== "zip" &&
            <div>
                <input type="checkbox" checked={useHistory} onChange={e => setUseHistory(e.target.checked)}></input> Use Version History
            </div>}
        <div className="mb-4">
            {processing
                ? <button className="bg-sky-700 px-2 py-1 text-white" onClick={inputType === "zip" ? runSourceCodes : runURLs} disabled>
                    <i className="es-spinner animate-spin mr-3"></i> Run {(Object.keys(urls).length > 0) ? "(" + results.length + "/" + Object.keys(urls).length + ")" : ""}
                </button>
                : <button className="bg-sky-700 px-2 py-1 text-white" onClick={inputType === "zip" ? runSourceCodes : runURLs}> Run </button>}
            <button className="bg-red-800 px-2 py-1 text-white ml-2" onClick={cancel}> Cancel </button>
            {!loggedIn &&
            <div> <i> This service requires you to be logged in. Please log into EarSketch using a different tab. </i></div>}
        </div>
    </div>
}

// TODO: add display options for array and object-type reports (example: lists of sounds in measureView).
const ReportDisplay = ({ report }: { report: AnalyzerReport }) => {
    return <div className="flex flex-col min-w-s">
        <div className="grid grid-cols-1">
            {Object.entries(report).filter(([key, _]) => !["codeStructure", "ast"].includes(key)).map(([key, value]) =>
                <div key={key} className="grid grid-cols-2 gap-2">
                    <div className="truncate hover:text-clip">{key}</div><div className="font-mono">{JSON.stringify(value, null, 3)}</div>
                </div>
            )}
        </div>
    </div>
}

const ResultPanel = ({ result }: { result: Result }) => {
    return <div className="container">
        <div>
            {result.script &&
                <div className="bg-sky-700 py-4 px-4 text-white flex flex-row" style={{ overflow: "auto" }}>
                    <div className="place-self-start">
                        {result.script.name &&
                            <b> {result.script.username} ({result.script.name}) </b>}
                        <div className="place-self-end">
                            {result.version &&
                                <b> (version {result.version}) </b>}
                        </div>
                    </div>
                    <div className="place-self-end">{result.script.shareid}</div>
                    <div className="place-self-end">{result.script.modified}</div>
                </div>}
            {result.error &&
                <div className="panel-body text-red">
                    <b>{result.error}</b>
                </div>}
            {result.reports &&
                <div className="container">
                    <Tab.Group>
                        {Object.entries(result.reports).map(([name, _]) =>
                            <Tab.List className="inline-flex p-1 space-x-1" key={name}>
                                <Tab className={({ selected }) => `w-fit px-2.5 py-2.5 text-sm font-medium leading-5 text-center rounded-md ${selected ? "bg-sky-700 text-white" : "text-gray-500"}`}>
                                    {name}
                                </Tab>
                            </Tab.List>
                        )}
                        {Object.entries(result.reports).map(([name, report]) =>
                            <Tab.Panels className="mt-2" key={name}>
                                <Tab.Panel className="p-3 bg-gray-100 rounded-md">

                                    <div key={name}>
                                        <ReportDisplay report={report} />
                                    </div>
                                </Tab.Panel>
                            </Tab.Panels>
                        )}
                    </Tab.Group>
                </div>}
        </div>
    </div>
}

const Results = ({ results, processing, useContestID, showIndividualResults, options }: { results: Result[], processing: string | null, useContestID: boolean, showIndividualResults: boolean, options: ReportOptions }) => {
    return <div>
        {results.length > 0 &&
            <div className="container mx-auto" style={{ textAlign: "center" }}>
                <button className="bg-sky-700 px-2 py-2 text-white hover:bg-gray-600" onClick={() => download(results, useContestID, options)}> Download Report</button>
            </div>}
        {results.length > 0 && showIndividualResults &&
            <div>
                {results.map((result, index) =>
                    <div key={index}>
                        <ResultPanel result={result} />
                    </div>
                )}
            </div>}
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
        CREATIVITY: true,
    } as ReportOptions)

    useEffect(() => { dispatch(getStandardSounds()) }, [])

    return <div>
        <div className="container mx-auto">
            <div className="text-xl pt-4 pb-4">
                <h1 style={{ fontSize: "x-large" }}>EarSketch Code Analyzer</h1>
            </div>
            <div className="flex flex-row gap-x-4">
                <Options
                    options={options}
                    setOptions={setOptions}
                />
                <Upload
                    processing={processing}
                    results={results}
                    useContest={useContest}
                    setProcessing={setProcessing}
                    setResults={setResults}
                    setUseContest={setUseContest}
                />
            </div>
            <div className="flex flex-col mx-auto">
                <Results
                    results={results}
                    processing={processing}
                    useContestID={useContest}
                    showIndividualResults={showIndividualResults}
                    options={options}
                />
                <ModalContainer />
            </div>
        </div>
    </div>
}
