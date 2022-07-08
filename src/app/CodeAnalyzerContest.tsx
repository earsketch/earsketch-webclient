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

export interface ContestOptions {
    artistName: string
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
                COMPLEXITY: false,
                MEASUREVIEW: true,
                EFFECTS: false,
                MIXING: false,
                HISTORY: false,
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
