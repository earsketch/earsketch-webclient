/* eslint-disable */
// TODO: Resolve lint issues.

import * as compiler from "./runner"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as reader from "./reader"
import * as userProject from "./userProject"
import * as caiAnalysisModule from "../cai/analysis"

app.controller("codeAnalyzerContestController",
    ["$scope",
        function ($scope) {
            // Loading ogg by default for browsers other than Safari
            // setting default to wav for chrome 58 (May 22, 2017)
            if (ESUtils.whichBrowser().match("Opera|Firefox|Msie|Trident") !== null) {
                $scope.quality = true// false wav, true ogg
            } else {
                $scope.quality = false// false wav, true ogg
            }

            $scope.artistName = ""
            $scope.complexityThreshold = 0
            $scope.uniqueStems = 0
            $scope.lengthRequirement = 0
            $scope.showIndividualGrades = false
            $scope.startingID = 0

            $scope.contestDict = {}

            $scope.results = []

            $scope.music_passed = []
            $scope.code_passed = []
            $scope.music_code_passed = []

            $scope.processing = null
            $scope.contest_processing = null

            $scope.prompts = []

            // overwrite userConsole javascript prompt with a hijackable one
            const nativePrompt = window.esPrompt
            $scope.listenerPrompt = function (text) {
                return nativePrompt(text).then((response) => {
                    $scope.prompts.push(response)
                    return response
                })
            }
            $scope.hijackedPrompt = function () {
                let i = 0
                if ($scope.allowPrompts) {
                    return function (text) {
                        return nativePrompt(text)
                    }
                } else {
                    return function (text) {
                        return new Promise((r) => {
                            r($scope.prompts[i++ % $scope.prompts.length])
                        })
                    }
                }
            }

            // use the hijacked prompt function to input user input
            window.esPrompt = $scope.hijackedPrompt()

            /**
     * Calculate the complexity of a script as python or javascript based on the extension and
     * return the complexity scores.
     */
            $scope.read = function (script, filename) {
                const ext = ESUtils.parseExt(filename)
                if (ext == ".py") {
                    return reader.analyzePython(script)
                } else if (ext == ".js") {
                    return reader.analyzeJavascript(script)
                } else {
                    return new Promise((accept, reject) => {
                        reject("Invalid file extension " + ext)
                    })
                }
            }

            /**
     * Compile a script as python or javascript based on the extension and
     * return the compilation promise.
     */
            $scope.compile = function (script, filename) {
                const ext = ESUtils.parseExt(filename)
                if (ext == ".py") {
                    return compiler.runPython(script, $scope.quality)
                } else if (ext == ".js") {
                    return compiler.runJavaScript(script, $scope.quality)
                } else {
                    return new Promise((accept, reject) => {
                        reject("Invalid file extension " + ext)
                    })
                }
            }

            /**
     * Read all script urls, parse their shareid, and then load and run
     * every script adding the results to the results list.
     */
            $scope.run = function () {
                $scope.processing = null
                $scope.contest_processing = null

                $scope.results = []
                $scope.contestDict = {}

                $scope.music_passed = []
                $scope.code_passed = []
                $scope.music_code_passed = []

                $scope.showIndividualGrades = document.getElementById("showIndividualGrades").checked

                esconsole("Running code analyzer.", ["DEBUG"])
                $scope.entries = document.querySelector(".output").innerText
                $scope.entrants = document.querySelector(".hiddenOutput").innerText

                const shareID = $scope.entries.split(",")
                const shareIDArray = []
                const contestID = $scope.entrants.split(",")

                for (let i = 0; i < shareID.length; i++) {
                    if (Number(contestID[i]) >= Number($scope.startingID)) {
                        if (shareID[i][0] == ",") {
                            shareID[i] = shareID[i].substring(1)
                        }
                        shareIDArray[i] = shareID[i].replace(/\n|\r/g, "")
                        $scope.contestDict[shareIDArray[i]] = contestID[i]
                    }
                }

                // start with a promise that resolves immediately
                let p = new Promise((resolve) => { resolve() })

                angular.forEach(shareIDArray, (id) => {
                    esconsole("ShareId: " + id, ["DEBUG"])
                    p = p.then(() => {
                        try {
                            $scope.processing = id
                            $scope.contest_processing = $scope.contestDict[id]
                            const ret = userProject.loadScript(id).then($scope.compileScript)

                            $scope.$applyAsync()

                            if (ret != 0) { return ret }
                        } catch (e) {
                        }
                    })
                })

                $scope.processing = null
                $scope.contest_processing = null
            }

            $scope.compileScript = function (script) {
                if (!script) {
                    return 0
                } else {
                    console.log("compile script", script.name)
                }

                if (script.name == undefined) {
                    console.log("Script is incorrectly named.")
                    return 0
                }

                // Temporary: removal of readInput.
                if (script.source_code.indexOf("readInput") !== -1 || script.source_code.indexOf("input") !== -1) {
                    console.log("Script contains readInput, cannot analyze.")
                    $scope.results.push({
                        script: script,
                        error: "Contains ReadInput",
                    })
                    return 0
                }

                try {
                    var complexity = $scope.read(script.source_code, script.name)
                    var complexityScore = reader.total(complexity)
                    var complexityPass = complexityScore >= $scope.complexityThreshold
                } catch (e) {
                    var complexity = {
                        booleanConditionals: 0,
                        conditionals: 0,
                        listOps: 0,
                        lists: 0,
                        loops: 0,
                        strOps: 0,
                        userFunc: 0,
                    }
                    var complexityScore = 0
                    var complexityPass = 0
                }

                if (!complexityPass) {
                    var complexityObj = complexity
                    complexityObj.complexityScore = complexityScore
                    $scope.results.push({
                        script: script,
                        error: "Failed Complexity Check",
                        reports: {
                            OVERVIEW: {
                                tempo: 0,
                                measures: 0,
                                "length (seconds)": 0,
                            },
                            COMPLEXITY: complexityObj,
                            GRADE: {
                                code: 0,
                                music: 0,
                                music_code: 0,
                            },
                        },
                    })
                    return 0
                }

                // TODO: process print statements through Skulpt. Temporary removal of print statements.
                const sourceCodeLines = script.source_code.split("\n")
                let sourceCode = []
                for (let i = 0; i < sourceCodeLines.length; i++) {
                    if (sourceCodeLines[i].indexOf("print") === -1) {
                        sourceCode.push(sourceCodeLines[i])
                    }
                }
                sourceCode = sourceCode.join("\n")

                if (!sourceCode.includes($scope.artistName)) {
                    var complexityObj = complexity
                    complexityObj.complexityScore = complexityScore
                    $scope.results.push({
                        script: script,
                        error: "No Contest Samples",
                        reports: {
                            OVERVIEW: {
                                tempo: 0,
                                measures: 0,
                                "length (seconds)": 0,
                            },
                            COMPLEXITY: complexityObj,
                            GRADE: {
                                code: complexityPass,
                                music: 0,
                                music_code: 0,
                            },
                        },
                    })
                    return 0
                }

                return $scope.compile(sourceCode, script.name).then((compiler_output) => {
                    esconsole(compiler_output, ["DEBUG"])

                    const analysis = caiAnalysisModule.analyzeMusic(compiler_output)
                    let reports = {}
                    reports.OVERVIEW = analysis.OVERVIEW
                    reports.COMPLEXITY = complexity
                    reports.COMPLEXITY.complexityScore = complexityScore

                    reports = Object.assign({}, reports, $scope.contestGrading(reports.OVERVIEW["length (seconds)"], analysis.MEASUREVIEW))

                    $scope.results.push({
                        script: script,
                        reports: reports,
                    })

                    if (reports.GRADE.music > 0) {
                        $scope.music_passed.push({
                            script: script,
                            reports: reports,
                        })
                    }
                    reports.GRADE.code = (complexityPass > 0) ? 1 : 0
                    if (reports.COMPLEXITY.userFunc == 0) {
                        reports.GRADE.code = 0
                    }
                    if (reports.GRADE.code > 0) {
                        $scope.code_passed.push({
                            script: script,
                            reports: reports,
                        })
                    }
                    if (reports.GRADE.music + reports.GRADE.code > 1) {
                        reports.GRADE.music_code = 1
                        $scope.music_code_passed.push({
                            script: script,
                            reports: reports,
                        })
                    }
                    $scope.processing = null
                    $scope.contest_processing = null
                }).catch((err) => {
                    $scope.results.push({
                        script: script,
                        error: err,
                    })
                    esconsole(err, ["ERROR"])
                    $scope.processing = null
                    $scope.contest_processing = null
                })
            }

            // /*
            //  * Grade contest entry for length and sound usage requirements.
            // */
            $scope.contestGrading = function (lengthInSeconds, measureView) {
                const report = {}
                report[$scope.artistName] = { numStems: 0, stems: [] }

                const stems = []

                for (const measure in measureView) {
                    for (const item in measureView[measure]) {
                        if (measureView[measure][item].type == "sound") {
                            const sound = measureView[measure][item].name
                            if (!stems.includes(sound)) {
                                stems.push(sound)
                            }
                            if (sound.includes($scope.artistName)) {
                                if (report[$scope.artistName].stems.indexOf(sound) === -1) {
                                    report[$scope.artistName].stems.push(sound)
                                    report[$scope.artistName].numStems += 1
                                }
                            }
                        }
                    }
                }

                report.GRADE = { music: 0, code: 0, music_code: 0 }
                report.UNIQUE_STEMS = { stems: stems }

                if (report[$scope.artistName].numStems > 0) {
                    if (stems.length >= Number($scope.uniqueStems)) {
                        if (Number($scope.lengthRequirement) <= lengthInSeconds) {
                            report.GRADE.music = 1
                        }
                    }
                }

                return report
            }

            $scope.generateCSVAWS = function () {
                const headers = ["#", "username", "script_name", "shareid", "error"]
                const includeReports = ["OVERVIEW", "COMPLEXITY", "GRADE"]
                const rows = []
                const col_map = {}

                for (let i = 0; i < $scope.results.length; i++) {
                    const result = $scope.results[i]
                    if (result.reports) {
                        for (let j = 0; j < Object.keys(result.reports).length; j++) {
                            const name = Object.keys(result.reports)[j]
                            if (includeReports.includes(name)) {
                                const report = result.reports[name]
                                if (col_map[name] === undefined) {
                                    col_map[name] = {}
                                }

                                for (let k = 0; k < Object.keys(report).length; k++) {
                                    const key = Object.keys(report)[k]
                                    const colname = name + "_" + key
                                    if (headers.indexOf(colname) === -1) {
                                        headers.push(colname)
                                        col_map[name][key] = headers.length - 1
                                    }
                                }
                            }
                        }
                    }
                }
                angular.forEach($scope.results, (result) => {
                    const row = []
                    for (let i = 0; i < headers.length; i++) {
                        row[i] = ""
                    }
                    if (result.script) {
                        row[1] = result.script.username
                        row[2] = result.script.name
                        row[3] = result.script.shareid.replace(/\n|\r/g, "")
                        // var frontString = "https://earsketch.gatech.edu/earsketch2/#?sharing=";
                        // var frontString = SITE_BASE_URI + "/earsketch2/?sharing=";
                        row[0] = $scope.contestDict[row[3]]
                    }
                    if (result.error) {
                        console.log(result.error)
                        if (result.error.nativeError) {
                            row[4] = result.error.nativeError.v + " on line " + result.error.traceback[0].lineno
                        } else {
                            row[4] = result.error
                        }
                    }
                    if (result.reports) {
                        angular.forEach(result.reports, (report, name) => {
                            if (includeReports.includes(name)) {
                                angular.forEach(Object.keys(report), (key) => {
                                    row[col_map[name][key]] = report[key]
                                })
                            }
                        })
                    }

                    rows.push(row.join(","))
                })

                return headers.join(",") + "\n" + rows.join("\n")
            }

            $scope.downloadAWS = function () {
                const file = $scope.generateCSVAWS()
                const a = document.createElement("a")
                document.body.appendChild(a)
                a.style = "display: none"

                const aFileParts = [file]
                const blob = new Blob(aFileParts, { type: "text/plain" })
                const url = window.URL.createObjectURL(blob)
                // download the script
                a.href = url
                a.download = "code_analyzer_report.csv"
                a.target = "_blank"
                esconsole("File location: " + a.href, ["debug", "exporter"])
                a.click()
                // window.URL.revokeObjectURL(url);
            }
        }])
