/* eslint-disable */
// TODO: Resolve lint issues.

import * as compiler from "./runner"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as userConsole from "../ide/console"
import * as userProject from "./userProject"
import * as caiAnalysisModule from "../cai/analysis"

app.controller("codeAnalyzerCAIController",
    ["$scope",
        function ($scope) {
            $scope.prompts = [0]
            $scope.allowPrompts = false
            $scope.seed = Date.now()
            $scope.useSeed = true

            // overwrite prompt with a hijackable one
            const nativePrompt = window.esPrompt

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
            // overwrite JavaScript random implementations with seedable one
            $scope.$watch("seed", () => {
                Math.random = function () {
                    if ($scope.useSeed) {
                        var rng = new Chance($scope.seed)
                    } else {
                        var rng = new Chance(Date.now())
                    }
                    return rng.random()
                }
            })

            // Loading ogg by default for browsers other than Safari
            // setting default to wav for chrome 58 (May 22, 2017)
            if (ESUtils.whichBrowser().match("Opera|Firefox|Msie|Trident") !== null) {
                $scope.quality = true// false wav, true ogg
            } else {
                $scope.quality = false// false wav, true ogg
            }

            $scope.csvInputMode = false

            $scope.options = {
                OVERVIEW: true,
                COMPLEXITY: true,
                EFFECTS: false,
                MEASUREVIEW: false,
                GENRE: false,
                SOUNDPROFILE: false,
                MIXING: false,
                HISTORY: false,
                APICALLS: false,
            }

            $scope.results = []
            $scope.processing = null

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
                $scope.results = []
                $scope.processing = null

                esconsole("Running code analyzer.", ["DEBUG"])

                if ($scope.csvInputMode) {
                    $scope.urls = document.querySelector(".output").innerText
                    $scope.urls = $scope.urls.replace(/,/, "\n")
                }

                const re = /\?sharing=([^\s.,;])+/g
                const matches = $scope.urls.match(re)

                // start with a promise that resolves immediately
                let p = new Promise((resolve) => { resolve() })

                angular.forEach(matches, (match) => {
                    esconsole("Grading: " + match, ["DEBUG"])
                    const shareId = match.substring(9)
                    esconsole("ShareId: " + shareId, ["DEBUG"])
                    p = p.then(() => {
                        $scope.processing = shareId
                        $scope.$apply()
                        const ret = userProject.loadScript(shareId).then($scope.runScriptHistory)
                        if (ret != 0) { return ret }
                    })
                })
            }

            $scope.runScriptHistory = function (script) {
                console.log("run script history", script.name)

                return userProject.getScriptHistory(script.shareid).then((scriptHistory) => {
                    let scriptVersions = Object.keys(scriptHistory)
                    if (!$scope.options.HISTORY) { scriptVersions = [scriptVersions[scriptVersions.length - 1]] }
                    let p = new Promise((resolve) => { resolve() })
                    angular.forEach(scriptVersions, (version) => {
                        p = p.then(() => {
                            scriptHistory[version].name = script.name
                            return $scope.runScript(scriptHistory[version], version).then((result) => {
                                return result
                            })
                        })
                    })
                })
            }

            /**
     * Run a single script and add the result to the results list.
     */
            $scope.runScript = function (script, version = 0) {
                const sourceCode = script.source_code

                if (sourceCode.indexOf("readInput") !== -1 || sourceCode.indexOf("input") !== -1) {
                    const sourceCodeLines = sourceCode.split("\n")
                    for (let i = 0; i < sourceCodeLines.length; i++) {
                        if (sourceCodeLines[i].indexOf("readInput") !== -1) {
                            console.log("read input", sourceCodeLines[i])
                        }
                    }
                    window.esPrompt = $scope.hijackedPrompt()
                }

                return $scope.compile(sourceCode, script.name).then((compiler_output) => {
                    esconsole(compiler_output, ["DEBUG"])
                    let language = "python"
                    if (ESUtils.parseExt(script.name) == ".js") { language = "javascript" }
                    const complexity = caiAnalysisModule.analyzeCode(language, sourceCode)
                    const reports = caiAnalysisModule.analyzeMusic(compiler_output)
                    reports.COMPLEXITY = complexity
                    Object.keys($scope.options).forEach((option) => {
                        if (reports[option] && !$scope.options[option]) { delete reports[option] }
                    })
                    console.log(script.name, reports)
                    $scope.results.push({
                        script: script,
                        version: version,
                        reports: Object.assign({}, reports),
                    })
                    $scope.processing = null
                    $scope.$apply()
                }).catch((err) => {
                    esconsole(err, ["ERROR"])
                    $scope.results.push({
                        script: script,
                        version: version,
                        error: err,
                    })
                    $scope.processing = null
                    $scope.$apply()
                })
            }

            /**
     * Function to pipe Skulpt's stdout to the EarSketch console.
     *
     * @private
     */
            function outf(text) {
                // For some reason, skulpt prints a newline character after every
                // call to print(), so let's ignore those
                // TODO: users can't print newline characters...ugh
                if (text == "\n") {
                    return
                }
                esconsole("outf text is " + text, ["INFO", "IDE"])
                userConsole.log(text)
            }

            /**
     *
     * @private
     */
            function builtinRead(x) {
                if (Sk.builtinFiles === undefined ||
            Sk.builtinFiles.files[x] === undefined) {
                    throw "File not found: '" + x + "'"
                }

                return Sk.builtinFiles.files[x]
            }

            Sk.pre = "output"
            Sk.configure({ output: outf, read: builtinRead })

            Sk.onAfterImport = function (library) {
                switch (library) {
                    case "random":
                        // Use the given seed for Skulpt
                        var seedfunc = Sk.sysmodules["string random"].items[0].rhs.$d.seed
                        if ($scope.useSeed) {
                            // Seed Skulpt's RNG implementation
                            Sk.misceval.callsim(seedfunc, $scope.seed)
                        }
                        break
                }
            }

            $scope.generateCSV = function () {
                const headers = ["#", "username", "script_name", "version", "shareid", "error"]
                const rows = []
                const col_map = {}

                for (let i = 0; i < $scope.results.length; i++) {
                    const result = $scope.results[i]
                    if (result.reports) {
                        for (let j = 0; j < Object.keys(result.reports).length; j++) {
                            const name = Object.keys(result.reports)[j]
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

                let idx = 1

                angular.forEach($scope.results, (result) => {
                    const row = []
                    for (let i = 0; i < headers.length; i++) {
                        row[i] = ""
                    }
                    if (result.script) {
                        row[0] = idx
                        row[1] = result.script.username
                        row[2] = result.script.name
                        row[3] = result.version
                        row[4] = result.script.shareid
                    }
                    if (result.error) {
                        console.log(result.error)
                        if (result.error.nativeError) {
                            row[5] = result.error.nativeError.v + " on line " + result.error.traceback[0].lineno
                        } else {
                            row[5] = result.error
                        }
                    } else if (result.reports) {
                        angular.forEach(result.reports, (report, name) => {
                            angular.forEach(Object.keys(report), (key) => {
                                row[col_map[name][key]] = report[key]
                            })
                        })
                    }

                    rows.push(row.join(","))

                    idx += 1
                })

                return headers.join(",") + "\n" + rows.join("\n") + "\n"
            }

            $scope.downloadCSV = function () {
                const file = $scope.generateCSV()
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
            }

            $scope.changeInputMode = function () {
                $scope.csvInputMode = !$scope.csvInputMode
            }

            $scope.setOption = function (option) {
                $scope.options[option] = !$scope.options[option]
            }
        }])
