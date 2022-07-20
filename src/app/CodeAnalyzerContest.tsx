import React, { useEffect, useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import * as reader from "./reader"

import { MeasureView, fillDict } from "../cai/analysis"
import { Reports, Result, Results, DownloadOptions } from "./CodeAnalyzer"
import { Options, Upload, ReportOptions, Entries } from "./CodeAnalyzerCAI"

const ContestGrading = ({ results, contestResults, contestDict, options, setContestResults }: { results: Result[], contestResults: Result[], contestDict: Entries, options: ContestOptions, setContestResults: (r: Result[]) => void }) => {
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

        const artistNames = options.artistNames.split(" ")

        for (const measure in measureView) {
            for (const item in measureView[measure]) {
                if (measureView[measure][item].type === "sound") {
                    const sound = measureView[measure][item].name
                    if (!stems.includes(sound)) {
                        stems.push(sound)
                    }
                    for (const artistName of artistNames) {
                        if (reports.ARTIST && sound.includes(artistName)) {
                            if (!reports.ARTIST.stems.includes(sound)) {
                                reports.ARTIST.stems.push(sound)
                                reports.ARTIST.numStems += 1
                            }
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

    async function resolver() {
    }

    useEffect(() => {
        let cancel = false

        resolver().then(() => {
            for (const result of results) {
                if (cancel) {
                    return
                }

                let complexity: reader.CodeFeatures
                let complexityScore: number
                let complexityPass: number

                try {
                    complexity = reader.analyze(ESUtils.parseLanguage(result.script.name), result.script.source_code)
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

                if (Array.isArray(result.reports?.OVERVIEW) || contestDict[result.script.shareid]?.finished) {
                    continue
                }

                // TODO: process print statements through Skulpt. Temporary removal of print statements.
                if (!result.script || !result.script.source_code) {
                    continue
                }
                const sourceCodeLines = result.script.source_code.split("\n")
                const linesToUse: string[] = []

                const gradingCounts = {
                    makeBeat: 0,
                    setEffect: 0,
                    setTempo: 0,
                    additional: 0,
                }

                let includesComment = false
                const pyHeaderComments = ["python code", "script_name:", "author:", "description:"]
                const jsHeaderComments = ["python code", "script_name:", "author:", "description:"]

                for (const line of sourceCodeLines) {
                    // disable print statements for automatic judging.
                    if (!line.includes("print")) {
                        linesToUse.push(line)
                    }
                    // check for comments
                    if (ESUtils.parseLanguage(result.script.name) === "python") {
                        if (line[0] === "#" && line.length > 1) {
                            for (const comment of pyHeaderComments) {
                                if (!line.includes(comment)) {
                                    includesComment = true
                                }
                            }
                        }
                    } else {
                        if (line[0] + line[1] === "//" && line.length > 2) {
                            for (const comment of jsHeaderComments) {
                                if (!line.includes(comment)) {
                                    includesComment = true
                                }
                            }
                        }
                    }
                    // count makeBeat and setEffect functions
                    if (line.includes("makeBeat")) {
                        gradingCounts.makeBeat += 1
                    }
                    if (line.includes("setEffect")) {
                        gradingCounts.setEffect += 1
                    }
                    if (line.includes("setTempo")) {
                        gradingCounts.setTempo += 1
                    }

                    // count additional functions
                    for (const name of ["createAudioSlice", "analyzeTrack", "insertMediaSection"]) {
                        if (line.includes(name)) {
                            gradingCounts.additional += 1
                        }
                    }
                }
                const sourceCode = linesToUse.join("\n")

                let includesArtistName = false
                const artistNames = options.artistNames.split(" ")

                for (const artistName of artistNames) {
                    if (sourceCode.includes(artistName)) {
                        includesArtistName = true
                    }
                }

                const emptyReports: Reports = {
                    OVERVIEW: { ...result.reports?.OVERVIEW },
                    COMPLEXITY: { ...complexity },
                    COMPLEXITY_TOTAL: { total: complexityScore },
                    GRADE: {
                        code: complexityPass,
                        music: 0,
                        musicCode: 0,
                    },
                }

                if (!includesArtistName) {
                    if (cancel) {
                        return
                    }

                    addResult({
                        script: result.script,
                        contestID: result.contestID,
                        error: "No Contest Samples",
                        reports: emptyReports,
                    })
                    continue
                }

                if (!includesComment) {
                    if (cancel) {
                        return
                    }

                    addResult({
                        script: result.script,
                        contestID: result.contestID,
                        error: "No Comments",
                        reports: emptyReports,
                    })
                    continue
                }

                try {
                    complexity = reader.analyze(ESUtils.parseLanguage(result.script.name), sourceCode)
                    complexityScore = reader.total(complexity)

                    // Custom Functions: 30 for first 3, then 10
                    for (let i = 0; i < complexity.userFunc; i++) {
                        complexityScore += i < 3 ? 30 : 10
                    }

                    // Lists, List/String Operations: 15
                    complexityScore += (complexity.lists + complexity.listOps + complexity.strOps) * 15

                    // Conditionals: 20, Conditionals with Booleans: 25
                    complexityScore += complexity.conditionals * 20
                    complexityScore += complexity.booleanConditionals * 25

                    // Loops: 15
                    complexityScore += complexity.loops * 15

                    // makeBeat: 5
                    complexityScore += gradingCounts.makeBeat * 5

                    // setEffect: 5
                    complexityScore += Math.min(gradingCounts.setEffect, 5) * 5

                    // setTempo: 10
                    complexityScore += Math.min(gradingCounts.setTempo, 5) * 10

                    // Variables: 2
                    if (result.reports?.VARIABLES && Array.isArray(result.reports?.VARIABLES)) {
                        complexityScore += Object.entries(result.reports?.VARIABLES).length * 2
                    }

                    // createAudioSlice, analyzeTrack, insertMediaSection: 10
                    complexityScore += gradingCounts.additional * 10

                    complexityPass = complexityScore >= options.complexityThreshold ? 1 : 0
                } catch (e) {
                    complexity = {
                        booleanConditionals: 0,
                        conditionals: 0,
                        listOps: 0,
                        lists: 0,
                        loops: 0,
                        strOps: 0,
                        userFunc: 0,
                    }
                    complexityScore = 0
                    complexityPass = 0
                }

                if (result.error) {
                    if (cancel) {
                        return
                    }

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

                const length = (result.reports && result.reports.OVERVIEW) ? result.reports.OVERVIEW["length (seconds)"] as number : 0
                const measureView = result.reports ? result.reports.MEASUREVIEW : []

                if (length && measureView) {
                    if (cancel) {
                        return
                    }

                    const reports = Object.assign({}, result.reports, contestGrading(length, measureView))
                    delete reports.MEASUREVIEW
                    delete reports.APICALLS
                    delete reports.VARIABLES
                    reports.COMPLEXITY = { ...complexity }
                    reports.COMPLEXITY_TOTAL = { total: complexityScore }

                    if (cancel) {
                        return
                    }
                    if (reports.GRADE) {
                        if (reports.GRADE.music > 0) {
                            setMusicPassed(musicPassed + 1)
                        }
                        reports.GRADE.code = (complexityPass > 0) ? 1 : 0
                        if (!Array.isArray(reports.COMPLEXITY)) {
                            if (reports.COMPLEXITY.userFunc === 0) {
                                result.error = "No user-defined function"
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
                    }

                    result.reports = reports

                    if (cancel) {
                        return
                    }
                    addResult(result)
                }
            }
        })

        return () => {
            cancel = true
        }
    }, [results])

    return <div className="container">
        {contestResults.length} valid results. {musicPassed} passed music. {codePassed} passed code. {musicCodePassed} passed both.
    </div>
}

export interface ContestOptions {
    artistNames: string
    complexityThreshold: number
    uniqueStems: number
    lengthRequirement: number
    showIndividualGrades: boolean
    startingID: number
}

export const CodeAnalyzerContest = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    useEffect(() => {
        fillDict()
    }, [])

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const [contestDict, setContestDict] = useState({} as Entries)
    const [contestResults, setContestResults] = useState([] as Result[])

    const [options, setOptions] = useState({
        artistNames: "",
        complexityThreshold: 0,
        uniqueStems: 0,
        lengthRequirement: 0,
        startingID: 0,
        showIndividualGrades: false,
    } as ContestOptions)

    return <div>
        <div className="container">
            <h1>EarSketch Code Analyzer - Contest Version</h1>
        </div>
        <Options
            options={options}
            showSeed={false}
            setOptions={setOptions}
            setSeed={() => null}
        />
        <Upload
            processing={processing}
            options={{
                OVERVIEW: true,
                COMPLEXITY: false,
                MEASUREVIEW: true,
                EFFECTS: false,
                MIXING: false,
                HISTORY: false,
                APICALLS: true,
                VARIABLES: true,
            } as ReportOptions}
            contestDict={contestDict}
            setProcessing={setProcessing}
            setResults={setResults}
            setContestResults={setContestResults}
            setContestDict={setContestDict}
        />
        <ContestGrading
            results={results}
            contestResults={contestResults}
            contestDict={contestDict}
            options={options}
            setContestResults={setContestResults}
        />
        <Results
            results={contestResults}
            processing={processing}
            options={{ useContestID: true, allowedKeys: ["OVERVIEW", "COMPLEXITY", "COMPLEXITY_TOTAL", "GRADE"], showIndividualResults: options.showIndividualGrades } as DownloadOptions}
        />
        <ModalContainer />
    </div>
}
