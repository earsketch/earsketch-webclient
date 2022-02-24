import React, { useEffect, useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import * as reader from "./reader"

import { Result, Results, DownloadOptions } from "./CodeAnalyzer"
import { Options, Upload, ReportOptions } from "./CodeAnalyzerCAI"

const ContestGrading = ({ results, contestResults, contestDict, options, setContestResults }: { results: Result[], contestResults: Result[], contestDict: { [key: string]: { id: string | number, finished: boolean } }, options: ContestOptions, setContestResults: (r: Result[]) => void }) => {
    const [musicPassed, setMusicPassed] = useState(0)
    const [codePassed, setCodePassed] = useState(0)
    const [musicCodePassed, setMusicCodePassed] = useState(0)

    // Grade contest entry for length and sound usage requirements.
    const contestGrading = (lengthInSeconds: number, measureView: any) => {
        const stems: string[] = []

        const report: {
            ARTIST: { numStems: number, stems: string[] },
            GRADE: { music: number, code: number, musicCode: number },
            UNIQUE_STEMS: { stems: string[] },
        } = {
            ARTIST: { numStems: 0, stems: [] },
            GRADE: { music: 0, code: 0, musicCode: 0 },
            UNIQUE_STEMS: { stems: [] },
        }

        for (const measure in measureView) {
            for (const item in measureView[measure]) {
                if (measureView[measure][item].type === "sound") {
                    const sound = measureView[measure][item].name
                    if (!stems.includes(sound)) {
                        stems.push(sound)
                    }
                    if (sound.includes(options.artistName)) {
                        if (!report.ARTIST.stems.includes(sound)) {
                            report.ARTIST.stems.push(sound)
                            report.ARTIST.numStems += 1
                        }
                    }
                }
            }
        }

        report.GRADE = { music: 0, code: 0, musicCode: 0 }
        report.UNIQUE_STEMS = { stems: stems }

        if (report.ARTIST.numStems > 0) {
            if (stems.length >= Number(options.uniqueStems)) {
                if (Number(options.lengthRequirement) <= lengthInSeconds) {
                    report.GRADE.music = 1
                }
            }
        }

        return report
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
            contestDict[result.script.shareid] = { id: 0, finished: true }
        }
    }

    useEffect(() => {
        for (const result of results) {
            if (Array.isArray(result.reports?.OVERVIEW) || contestDict[result.script.shareid]?.finished) {
                continue
            }

            let complexity
            let complexityScore = 0
            let complexityPass = 0
            let sourceCode: string[] | string = []

            try {
                // TODO: process print statements through Skulpt. Temporary removal of print statements.
                const sourceCodeLines = result.script.source_code.split("\n")
                const gradingCounts = {
                    makeBeat: 0,
                    setEffect: 0,
                    setTempo: 0,
                    additional: 0,
                }
                for (const line of sourceCodeLines) {
                    // disable print statements for automatic judging.
                    if (!line.includes("print")) {
                        sourceCode.push(line)
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
                sourceCode = sourceCode.join("\n")

                complexity = reader.analyze(ESUtils.parseLanguage(result.script.name), sourceCode)

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

            const length = result.reports ? result.reports.OVERVIEW["length (seconds)"] as number : 0
            const measureView = result.reports ? result.reports.MEASUREVIEW : []

            if (length && measureView) {
                const reports = Object.assign({}, result.reports, contestGrading(length, measureView))
                delete reports.MEASUREVIEW
                delete reports?.APICALLS
                delete reports?.VARIABLES
                reports.COMPLEXITY = { ...complexity }
                reports.COMPLEXITY_TOTAL = { total: complexityScore }

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
    }, [results])

    return <div className="container">
        {contestResults.length} valid results. {musicPassed} passed music. {codePassed} passed code. {musicCodePassed} passed both.
    </div>
}

export interface ContestOptions {
    artistName: string
    complexityThreshold: number
    uniqueStems: number
    lengthRequirement: number
    showIndividualGrades: boolean
    startingID: string | number
}

export const CodeAnalyzerContest = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const [contestDict, setContestDict] = useState({} as { [key: string]: { id: string | number, finished: boolean } })
    const [contestResults, setContestResults] = useState([] as Result[])

    const [options, setOptions] = useState({
        artistName: "",
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
                COMPLEXITY: true,
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
