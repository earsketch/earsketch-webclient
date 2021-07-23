// import * as compiler from "./runner"
// import esconsole from "../esconsole"
// import * as ESUtils from "../esutils"
// import * as reader from "./reader"
// import * as userProject from "./userProject"
// import * as caiAnalysisModule from "../cai/analysis"

import React, { useState } from "react"

// import * as ESUtils from "../esutils"
import { ModalContainer } from "./App"

// import esconsole from "../esconsole"
// import * as userProject from "./userProject"

// import { Script } from "common"

// import * as caiAnalysisModule from "../cai/analysis"

import { Result, Results } from "./CodeAnalyzer"
// import { compile, randomSeed } from "./Autograder"

// let artistName = ""
// let complexityThreshold = 0
// let uniqueStems = 0
// let lengthRequirement = 0
// let showIndividualGrades = false
// let startingID = 0

// let contestDict = {}

// let results = []

// let music_passed = []
// let code_passed = []
// let music_code_passed = []

// let processing = null
// let contest_processing = null

// let prompts = []

// /**
// * Calculate the complexity of a script as python or javascript based on the extension and
// * return the complexity scores.
// */
// const read = (script, filename) => {
//     const ext = ESUtils.parseExt(filename)
//     if (ext == ".py") {
//         return reader.analyzePython(script)
//     } else if (ext == ".js") {
//         return reader.analyzeJavascript(script)
//     } else {
//         return new Promise((resolve, reject) => {
//             reject("Invalid file extension " + ext)
//         })
//     }
// }

// /**
// * Compile a script as python or javascript based on the extension and
// * return the compilation promise.
// */
// const compile = (script, filename) => {
//     const ext = ESUtils.parseExt(filename)
//     if (ext == ".py") {
//         return compiler.runPython(script, quality)
//     } else if (ext == ".js") {
//         return compiler.runJavaScript(script, quality)
//     } else {
//         return new Promise((accept, reject) => {
//             reject("Invalid file extension " + ext)
//         })
//     }
// }

// /**
// * Read all script urls, parse their shareid, and then load and run
// * every script adding the results to the results list.
// */
// const run = () => {
//     processing = null
//     contest_processing = null

//     results = []
//     contestDict = {}

//     music_passed = []
//     code_passed = []
//     music_code_passed = []

//     showIndividualGrades = document.getElementById("showIndividualGrades").checked

//     esconsole("Running code analyzer.", ["DEBUG"])
//     entries = document.querySelector(".output").innerText
//     entrants = document.querySelector(".hiddenOutput").innerText

//     const shareID = entries.split(",")
//     const shareIDArray = []
//     const contestID = entrants.split(",")

//     for (let i = 0; i < shareID.length; i++) {
//         if (Number(contestID[i]) >= Number(startingID)) {
//             if (shareID[i][0] == ",") {
//                 shareID[i] = shareID[i].substring(1)
//             }
//             shareIDArray[i] = shareID[i].replace(/\n|\r/g, "")
//             contestDict[shareIDArray[i]] = contestID[i]
//         }
//     }

//     // start with a promise that resolves immediately
//     let p = new Promise((resolve) => { resolve() })

//     angular.forEach(shareIDArray, (id) => {
//         esconsole("ShareId: " + id, ["DEBUG"])
//         p = p.then(() => {
//             try {
//                 processing = id
//                 contest_processing = contestDict[id]
//                 const ret = userProject.loadScript(id).then(compileScript)

//                 $applyAsync()

//                 if (ret != 0) { return ret }
//             } catch (e) {
//             }
//         })
//     })

//     processing = null
//     contest_processing = null
// }

// const compileScript = (script) => {
//     if (!script) {
//         return 0
//     } else {
//         console.log("compile script", script.name)
//     }

//     if (script.name == undefined) {
//         console.log("Script is incorrectly named.")
//         return 0
//     }

//     // Temporary: removal of readInput.
//     if (script.source_code.indexOf("readInput") !== -1 || script.source_code.indexOf("input") !== -1) {
//         console.log("Script contains readInput, cannot analyze.")
//         results.push({
//             script: script,
//             error: "Contains ReadInput",
//         })
//         return 0
//     }

//     let complexity
//     let complexityScore
//     let complexityPass

//     try {
//         complexity = read(script.source_code, script.name)
//         complexityScore = reader.total(complexity)
//         complexityPass = complexityScore >= complexityThreshold
//     } catch (e) {
//         complexity = {
//             booleanConditionals: 0,
//             conditionals: 0,
//             listOps: 0,
//             lists: 0,
//             loops: 0,
//             strOps: 0,
//             userFunc: 0,
//         }
//         complexityScore = 0
//         complexityPass = 0
//     }

//     if (!complexityPass) {
//         const complexityObj = complexity
//         complexityObj.complexityScore = complexityScore
//         results.push({
//             script: script,
//             error: "Failed Complexity Check",
//             reports: {
//                 OVERVIEW: {
//                     tempo: 0,
//                     measures: 0,
//                     "length (seconds)": 0,
//                 },
//                 COMPLEXITY: complexityObj,
//                 GRADE: {
//                     code: 0,
//                     music: 0,
//                     music_code: 0,
//                 },
//             },
//         })
//         return 0
//     }

//     // TODO: process print statements through Skulpt. Temporary removal of print statements.
//     const sourceCodeLines = script.source_code.split("\n")
//     let sourceCode = []
//     for (const line of sourceCodeLines) {
//         if (!line.includes("print")) {
//             sourceCode.push(line)
//         }
//     }
//     sourceCode = sourceCode.join("\n")

//     if (!sourceCode.includes(artistName)) {
//         const complexityObj = complexity
//         complexityObj.complexityScore = complexityScore
//         results.push({
//             script: script,
//             error: "No Contest Samples",
//             reports: {
//                 OVERVIEW: {
//                     tempo: 0,
//                     measures: 0,
//                     "length (seconds)": 0,
//                 },
//                 COMPLEXITY: complexityObj,
//                 GRADE: {
//                     code: complexityPass,
//                     music: 0,
//                     music_code: 0,
//                 },
//             },
//         })
//         return 0
//     }

//     return compile(sourceCode, script.name).then((compiler_output) => {
//         esconsole(compiler_output, ["DEBUG"])

//         const analysis = caiAnalysisModule.analyzeMusic(compiler_output)
//         let reports = {}
//         reports.OVERVIEW = analysis.OVERVIEW
//         reports.COMPLEXITY = complexity
//         reports.COMPLEXITY.complexityScore = complexityScore

//         reports = Object.assign({}, reports, contestGrading(reports.OVERVIEW["length (seconds)"], analysis.MEASUREVIEW))

//         results.push({
//             script: script,
//             reports: reports,
//         })

//         if (reports.GRADE.music > 0) {
//             music_passed.push({
//                 script: script,
//                 reports: reports,
//             })
//         }
//         reports.GRADE.code = (complexityPass > 0) ? 1 : 0
//         if (reports.COMPLEXITY.userFunc == 0) {
//             reports.GRADE.code = 0
//         }
//         if (reports.GRADE.code > 0) {
//             code_passed.push({
//                 script: script,
//                 reports: reports,
//             })
//         }
//         if (reports.GRADE.music + reports.GRADE.code > 1) {
//             reports.GRADE.music_code = 1
//             music_code_passed.push({
//                 script: script,
//                 reports: reports,
//             })
//         }
//         processing = null
//         contest_processing = null
//     }).catch((err) => {
//         results.push({
//             script: script,
//             error: err,
//         })
//         esconsole(err, ["ERROR"])
//         processing = null
//         contest_processing = null
//     })
// }

// // /*
// //  * Grade contest entry for length and sound usage requirements.
// // */
// const contestGrading = (lengthInSeconds, measureView) => {
//     const report = {}
//     report[artistName] = { numStems: 0, stems: [] }

//     const stems = []

//     for (const measure in measureView) {
//         for (const item in measureView[measure]) {
//             if (measureView[measure][item].type == "sound") {
//                 const sound = measureView[measure][item].name
//                 if (!stems.includes(sound)) {
//                     stems.push(sound)
//                 }
//                 if (sound.includes(artistName)) {
//                     if (report[artistName].stems.indexOf(sound) === -1) {
//                         report[artistName].stems.push(sound)
//                         report[artistName].numStems += 1
//                     }
//                 }
//             }
//         }
//     }

//     report.GRADE = { music: 0, code: 0, music_code: 0 }
//     report.UNIQUE_STEMS = { stems: stems }

//     if (report[artistName].numStems > 0) {
//         if (stems.length >= Number(uniqueStems)) {
//             if (Number(lengthRequirement) <= lengthInSeconds) {
//                 report.GRADE.music = 1
//             }
//         }
//     }

//     return report
// }

// const generateCSVAWS = () => {
//     const headers = ["#", "username", "script_name", "shareid", "error"]
//     const includeReports = ["OVERVIEW", "COMPLEXITY", "GRADE"]
//     const rows = []
//     const colMap = {}

//     for (const result of results) {
//         if (result.reports) {
//             for (const name of Object.keys(result.reports)) {
//                 if (includeReports.includes(name)) {
//                     const report = result.reports[name]
//                     if (colMap[name] === undefined) {
//                         colMap[name] = {}
//                     }

//                     for (const key of Object.keys(report)) {
//                         const colname = name + "_" + key
//                         if (!headers.includes(colname)) {
//                             headers.push(colname)
//                             colMap[name][key] = headers.length - 1
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     angular.forEach(results, (result) => {
//         const row = []
//         for (let i = 0; i < headers.length; i++) {
//             row[i] = ""
//         }
//         if (result.script) {
//             row[1] = result.script.username
//             row[2] = result.script.name
//             row[3] = result.script.shareid.replace(/\n|\r/g, "")
//             // var frontString = "https://earsketch.gatech.edu/earsketch2/#?sharing=";
//             // var frontString = SITE_BASE_URI + "/earsketch2/?sharing=";
//             row[0] = contestDict[row[3]]
//         }
//         if (result.error) {
//             console.log(result.error)
//             if (result.error.nativeError) {
//                 row[4] = result.error.nativeError.v + " on line " + result.error.traceback[0].lineno
//             } else {
//                 row[4] = result.error
//             }
//         }
//         if (result.reports) {
//             angular.forEach(result.reports, (report, name) => {
//                 if (includeReports.includes(name)) {
//                     angular.forEach(Object.keys(report), (key) => {
//                         row[colMap[name][key]] = report[key]
//                     })
//                 }
//             })
//         }

//         rows.push(row.join(","))
//     })

//     return headers.join(",") + "\n" + rows.join("\n")
// }

// const downloadAWS = () => {
//     const file = generateCSVAWS()
//     const a = document.createElement("a")
//     document.body.appendChild(a)
//     a.style = "display: none"

//     const aFileParts = [file]
//     const blob = new Blob(aFileParts, { type: "text/plain" })
//     const url = window.URL.createObjectURL(blob)
//     // download the script
//     a.href = url
//     a.download = "code_analyzer_report.csv"
//     a.target = "_blank"
//     esconsole("File location: " + a.href, ["debug", "exporter"])
//     a.click()
//     // window.URL.revokeObjectURL(url);
// }

export const CodeAnalyzerContest = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [processing] = useState(null as string | null)
    const [results] = useState([] as Result[])

    return <div>
        <Results
            results={results}
            processing={processing}
        />
        <ModalContainer />
    </div>
}