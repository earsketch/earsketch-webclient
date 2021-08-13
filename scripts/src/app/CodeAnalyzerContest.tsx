import React, { useEffect, useState } from "react"

import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

import * as reader from "./reader"

import { Result, Results, DownloadOptions } from "./CodeAnalyzer"
import { Options, Upload, ReportOptions } from "./CodeAnalyzerCAI"

const ContestGrading = ({ results, contestResults, contestDict, options, setContestResults }: { results: Result[], contestResults: Result[], contestDict: { [key: string]: { id: number, finished: boolean } }, options: ContestOptions, setContestResults: (r: Result[]) => void }) => {
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

    useEffect(() => {
        for (const result of results) {
            if (Array.isArray(result.reports?.OVERVIEW) || contestDict[result.script.shareid]?.finished) {
                continue
            }

            let complexity
            let complexityScore = 0
            let complexityPass = 0

            try {
                complexity = reader.analyze(ESUtils.parseLanguage(result.script.name), result.script.source_code)
                complexityScore = reader.total(complexity)
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
                contestResults.push({
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
                setContestResults([...contestResults])
                if (contestDict[result.script.shareid]) { 
                    contestDict[result.script.shareid].finished = true 
                } else {
                    contestDict[result.script.shareid] = { id: 0, finished: true }
                }
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
                contestResults.push({
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
                setContestResults([...contestResults])
                if (contestDict[result.script.shareid]) { 
                    contestDict[result.script.shareid].finished = true 
                } else {
                    contestDict[result.script.shareid] = { id: 0, finished: true }
                }
                continue
            }

            const length = result.reports ? result.reports.OVERVIEW["length (seconds)"] as number : 0
            const measureView = result.reports ? result.reports.MEASUREVIEW : []

            if (length && measureView) {
                const reports = Object.assign({}, result.reports, contestGrading(length, measureView))
                delete reports.MEASUREVIEW
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
                contestResults.push(result)
                setContestResults([...contestResults])

                if (contestDict[result.script.shareid]) { 
                    contestDict[result.script.shareid].finished = true 
                } else {
                    contestDict[result.script.shareid] = { id: 0, finished: true }
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

    const [processing, setProcessing] = useState(null as string | null)
    const [results, setResults] = useState([] as Result[])

    const [contestDict, setContestDict] = useState({} as { [key: string]: { id: number, finished: boolean } })
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
            seed={0}
            useSeed={false}
            showSeed={false}
            setOptions={setOptions}
            setSeed={() => null}
            setUseSeed={() => null}
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
