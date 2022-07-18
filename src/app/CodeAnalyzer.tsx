import React, { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { ModalContainer } from "./App"
import { compile, readFile } from "./Autograder"
import type { Script } from "common"
import { parseLanguage } from "../esutils"
import esconsole from "../esconsole"
import * as exporter from "./exporter"
import { getScriptHistory, loadScript } from "../browser/scriptsThunks"
import { selectLoggedIn } from "../user/userState"
import { MeasureView, GenreView, SoundProfile, analyzeCode, analyzeMusic, fillDict } from "../cai/analysis"
import * as cc from "../cai/complexityCalculator"
import * as reader from "./reader"

interface Report {
    [key: string]: string | number
}

interface Reports {
    // [key: string]: Report
    OVERVIEW?: Report
    COMPLEXITY?: reader.CodeFeatures | cc.CodeFeatures | cc.Results
    EFFECTS?: Report
    MEASUREVIEW?: MeasureView
    GENRE?: GenreView
    SOUNDPROFILE?: SoundProfile
    MIXING?: Report
    APICALLS?: cc.CallObj []

    // Contest-specific reports
    COMPLEXITY_TOTAL?: {
        total: number
    }
    ARTIST?: {
        numStems: number
        stems: string []
    }
    GRADE?: {
        music: number
        code: number
        musicCode: number
    }
    UNIQUE_STEMS?: {
        stems: string []
    }
}

interface Result {
    script: Script
    reports?: Reports
    error?: string
    version?: number
    contestID?: string
}

interface DownloadOptions {
    useContestID: boolean
    allowedKeys?: string[]
    showIndividualResults?: boolean
}

interface ReportOptions {
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

interface ContestEntries {
    [key: string]: {
        id: string
        finished: boolean
        sourceCode?: string
    }
}

interface ContestOptions {
    artistName: string
    complexityThreshold: number
    uniqueStems: number
    lengthRequirement: number
    showIndividualGrades: boolean
    startingID: number
}

const generateCSV = (results: Result[], options: DownloadOptions) => {
    const headers = [options.useContestID ? "contestID" : "username", "script_name", "shareid", "error"]
    const rows: string[] = []
    const colMap: { [key: string]: { [key: string]: number } } = {}

    for (const result of results) {
        if (result.reports) {
            for (const name of Object.keys(result.reports)) {
                if (options.allowedKeys && !options.allowedKeys.includes(name)) {
                    delete result.reports[name as keyof Reports]
                    continue
                }
                const report = result.reports[name as keyof Reports]
                if (!report) {
                    continue
                }
                if (!colMap[name]) {
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
                const report = result.reports[name as keyof Reports]
                if (report) {
                    for (const [key, value] of Object.entries(report)) {
                        row[colMap[name][key]] = JSON.stringify(value).replace(/,/g, " ")
                    }
                }
            }
        }
        rows.push(row.join(","))
    }

    return headers.join(",") + "\n" + rows.join("\n")
}

const download = (results: Result[], options: DownloadOptions) => {
    const file = generateCSV(results, options)
    const blob = new Blob([file], { type: "text/plain" })
    exporter.download("code_analyzer_report.csv", blob)
}

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

const Upload = ({ processing, options, seed, contestDict, setResults, setContestResults, setProcessing, setContestDict }: {
    processing: string | null, options: ReportOptions, seed?: number, contestDict?: ContestEntries, setResults: (r: Result[]) => void, setContestResults?: (r: Result[]) => void, setProcessing: (p: string | null) => void, setContestDict?: (d: ContestEntries) => void
}) => {
    const loggedIn = useSelector(selectLoggedIn)
    const [urls, setUrls] = useState([] as string[])
    const [csvInput, setCsvInput] = useState(false)
    const [csvText, setCsvText] = useState(false)
    const [contestIDColumn, setContestIDColumn] = useState(0)
    const [shareIDColumn, setShareIDColumn] = useState(1)
    const [fileNameColumn, setFileNameColumn] = useState(0)
    const [sourceCodeColumn, setSourceCodeColumn] = useState(1)

    const [sourceCodeEntries, setSourceCodeEntries] = useState({} as ContestEntries)
    const [newline, setNewline] = useState("NEWLINE")
    const [comma, setComma] = useState("COMMA")

    const [useCAI, setUseCAI] = useState(true)

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
            const contestEntries: ContestEntries = {}
            const urlList = []
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

            if (useCAI) {
                const outputComplexity = analyzeCode(parseLanguage(script.name), script.source_code)
                reports.COMPLEXITY = outputComplexity.codeFeatures
            } else {
                reports.COMPLEXITY = reader.analyze(parseLanguage(script.name), script.source_code)
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
        const history = await getScriptHistory(script.shareid)

        if (!history) {
            results.push(await runScript(script))
            return results
        }

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

    const runSourceCodes = async () => {
        const sourceCodeRefresh: ContestEntries = {}
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

        const contestDictRefresh: ContestEntries = {}
        if (contestDict) {
            for (const shareid of Object.keys(contestDict)) {
                contestDictRefresh[shareid] = { id: contestDict[shareid].id, finished: false }
            }
            setContestDict?.({ ...contestDictRefresh })
        }
        setProcessing(null)

        const matches: RegExpMatchArray | null = []
        const re = /\?sharing=([^\s.,])+/g
        esconsole("Running code analyzer (CAI).", ["DEBUG"])

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
            <div className="panel-heading">
                Step 2:
                {csvInput
                    ? " Upload CSV File"
                    : " Paste share URLs"}
            </div>
            <div className="panel-body">
                <input type="checkbox" checked={useCAI} onChange={e => setUseCAI(e.target.checked)}></input> Use CAI
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

const ContestGrading = ({ results, contestResults, contestDict, options, setContestResults }: { results: Result[], contestResults: Result[], contestDict: ContestEntries, options: ContestOptions, setContestResults: (r: Result[]) => void }) => {
    const [musicPassed, setMusicPassed] = useState(0)
    const [codePassed, setCodePassed] = useState(0)
    const [musicCodePassed, setMusicCodePassed] = useState(0)

    // Grade contest entry for length and sound usage requirements.
    const contestGrading = (lengthInSeconds: number, measureView: MeasureView) => {
        const stems: string[] = []

        const reports = {
            ARTIST: { numStems: 0, stems: [] },
            GRADE: { music: 0, code: 0, musicCode: 0 },
            UNIQUE_STEMS: { stems: [] },
        } as Reports

        for (const measure of Object.values(measureView)) {
            for (const item of measure) {
                if (item.type === "sound") {
                    const sound = item.name
                    if (!stems.includes(sound)) {
                        stems.push(sound)
                    }
                    if (reports.ARTIST && sound.includes(options.artistName)) {
                        if (!reports.ARTIST.stems.includes(sound)) {
                            reports.ARTIST.stems.push(sound)
                            reports.ARTIST.numStems += 1
                        }
                    }
                }
            }
        }

        reports.GRADE = { music: 0, code: 0, musicCode: 0 }
        reports.UNIQUE_STEMS = { stems: stems }

        if (reports.ARTIST && reports.ARTIST.numStems > 0) {
            if (stems.length >= Number(options.uniqueStems)) {
                if (Number(options.lengthRequirement) <= lengthInSeconds) {
                    reports.GRADE.music = 1
                }
            }
        }

        return reports
    }

    useEffect(() => {
        setMusicPassed(0)
        setCodePassed(0)
        setMusicCodePassed(0)
    }, [contestDict])

    const addResult = (result: Result) => {
        contestResults.push(result)
        setContestResults([...contestResults])

        if (contestDict[result.script.shareid]) {
            contestDict[result.script.shareid].finished = true
        } else {
            contestDict[result.script.shareid] = { id: "0", finished: true }
        }
    }

    useEffect(() => {
        for (const result of results) {
            if (Array.isArray(result.reports?.OVERVIEW) || contestDict[result.script.shareid]?.finished) {
                continue
            }

            let complexity: reader.CodeFeatures
            let complexityScore: number
            let complexityPass: number

            try {
                complexity = reader.analyze(parseLanguage(result.script.name), result.script.source_code)
                complexityScore = reader.total(complexity)
                complexityPass = complexityScore >= options.complexityThreshold ? 1 : 0
            } catch (e) {
                complexity = {
                    userFunc: 0,
                    booleanConditionals: 0,
                    conditionals: 0,
                    loops: 0,
                    lists: 0,
                    listOps: 0,
                    strOps: 0,
                }
                complexityScore = 0
                complexityPass = 0
            }

            if (result.error) {
                addResult({
                    script: result.script,
                    contestID: result.contestID,
                    error: result.error,
                    reports: {
                        OVERVIEW: { ...result.reports?.OVERVIEW },
                        COMPLEXITY: { ...complexity },
                        COMPLEXITY_TOTAL: { total: complexityScore },
                        GRADE: {
                            code: 0,
                            music: 0,
                            musicCode: 0,
                        },
                    },
                })
                continue
            }

            // TODO: process print statements through Skulpt. Temporary removal of print statements.
            const sourceCodeLines = result.script.source_code.split("\n")
            let sourceCode: string[] | string = []
            for (const line of sourceCodeLines) {
                if (!line.includes("print")) {
                    sourceCode.push(line)
                }
            }
            sourceCode = sourceCode.join("\n")

            if (!sourceCode.includes(options.artistName)) {
                addResult({
                    script: result.script,
                    contestID: result.contestID,
                    error: "No Contest Samples",
                    reports: {
                        OVERVIEW: { ...result.reports?.OVERVIEW },
                        COMPLEXITY: { ...complexity },
                        COMPLEXITY_TOTAL: { total: complexityScore },
                        GRADE: {
                            code: complexityPass,
                            music: 0,
                            musicCode: 0,
                        },
                    },
                })
                continue
            }

            if (result.reports && result.reports.OVERVIEW) {
                const length = result.reports ? result.reports.OVERVIEW["length (seconds)"] as number : 0
                const measureView = result.reports ? result.reports.MEASUREVIEW : {}

                if (length && measureView) {
                    const reports = Object.assign({}, result.reports, contestGrading(length, measureView as MeasureView))
                    delete reports.MEASUREVIEW
                    reports.COMPLEXITY = { ...complexity }
                    reports.COMPLEXITY_TOTAL = { total: complexityScore }

                    if (reports.GRADE) {
                        if (reports.GRADE.music > 0) {
                            setMusicPassed(musicPassed + 1)
                        }
                        reports.GRADE.code = (complexityPass > 0) ? 1 : 0
                        if (!Array.isArray(reports.COMPLEXITY)) {
                            if (reports.COMPLEXITY.userFunc === 0) {
                                reports.GRADE.code = 0
                            }
                            if (reports.GRADE.code > 0) {
                                setCodePassed(codePassed + 1)
                            }
                            if (reports.GRADE.music + reports.GRADE.code > 1) {
                                reports.GRADE.musicCode = 1
                                setMusicCodePassed(musicCodePassed + 1)
                            }
                        }

                        result.reports = reports
                        addResult(result)
                    }
                }
            }
        }
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

    useEffect(() => {
        fillDict()
    }, [])

    // Report Parameters
    const [reportOptions, setReportOptions] = useState({
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

    // Contest Parameters
    const [contestDict, setContestDict] = useState({} as ContestEntries)
    const [contestResults, setContestResults] = useState([] as Result[])
    const [contestOptions, setContestOptions] = useState({
        artistName: "",
        complexityThreshold: 0,
        uniqueStems: 0,
        lengthRequirement: 0,
        startingID: 0,
        showIndividualGrades: true,
    } as ContestOptions)

    return <div>
        <div className="container">
            <h1>EarSketch Code Analyzer</h1>
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
                    EFFECTS: false,
                    MIXING: false,
                    HISTORY: false,
                } as ReportOptions}
            contestDict={contestDict}
            seed={seed}
            setProcessing={setProcessing}
            setResults={setResults}
            setContestResults={setContestResults}
            setContestDict={setContestDict}
        />
        <div>
            <input type="checkbox" checked={useContest} onChange={e => { setUseContest(e.target.checked); downloadOptions.useContestID = e.target.checked }} /> Use Contest
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
