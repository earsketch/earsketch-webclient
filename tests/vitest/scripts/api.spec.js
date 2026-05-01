import { beforeEach, describe, expect, it } from "vitest"

import * as runner from "../../../src/app/runner"
import * as ide from "../../../src/ide/ideState"
import store from "../../../src/reducers"

import { API_SCRIPTS } from "./api.scripts"
import { API_RESULTS } from "./api.results"

describe("API function tests", () => {
    beforeEach(() => {
        store.dispatch(ide.setLogs([]))
    })

    function testPython(name, logs = [], checkResult = true) {
        it(`should compile ${name} correctly in Python`, async () => {
            const result = await runner.run("python", API_SCRIPTS[`${name}.py`])
            if (checkResult) {
                expect(result).toMatchResult(API_RESULTS[name], API_SCRIPTS[`${name}.py`])
            }
            // eslint-disable-next-line no-undef
            const expectedLogs = logs.map(text => ({ level: "info", text: Sk.builtin.str(Sk.ffi.remapToPy(text)).v }))
            expect(ide.selectLogs(store.getState())).toEqual(expectedLogs)
        })
    }

    function testPythonAndJavaScript(name, logs = []) {
        testPython(name, logs)

        it(`should compile ${name} correctly in JavaScript`, async () => {
            const result = await runner.run("javascript", API_SCRIPTS[`${name}.js`])
            expect(result).toMatchResult(API_RESULTS[name], API_SCRIPTS[`${name}.js`])
            const str = obj => typeof obj === "string" ? obj : JSON.stringify(obj)
            expect(ide.selectLogs(store.getState())).toEqual(logs.map(text => ({ level: "info", text: str(text) })))
        })
    }

    // TODO: figure out why this number is different in the browser
    // when not rounded
    // TODO: write tests for RMS_AMPLITUDE as well
    testPythonAndJavaScript("analyze", [0.292])
    testPythonAndJavaScript("analyzeForTime", [0.292])
    testPythonAndJavaScript("analyzeTrack", [0.253])
    testPythonAndJavaScript("analyzeTrackForTime", [0.275])
    testPythonAndJavaScript("createAudioSlice")
    testPythonAndJavaScript("createAudioStretch")
    testPythonAndJavaScript("dur", [2])
    testPythonAndJavaScript("fitMedia")
    testPythonAndJavaScript("importFile", ['Copyright OpenJS Foundation and other contributors, https://openjsf.org/\n\nPermission is hereby granted, free of charge, to any person obtaining\na copy of this software and associated documentation files (the\n"Software"), to deal in the Software without restriction, including\nwithout limitation the rights to use, copy, modify, merge, publish,\ndistribute, sublicense, and/or sell copies of the Software, and to\npermit persons to whom the Software is furnished to do so, subject to\nthe following conditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\nLIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\nOF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\nWITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n'])
    testPythonAndJavaScript("insertMedia1")
    testPythonAndJavaScript("insertMedia2")
    testPythonAndJavaScript("insertMediaSection")
    testPythonAndJavaScript("insertMediaSectionMiddle")
    testPythonAndJavaScript("insertMediaSectionTimeStretch")
    testPythonAndJavaScript("insertMediaSectionTimeStretchMiddle")
    // TODO: makeBeat
    testPythonAndJavaScript("makeBeatSlice")
    testPythonAndJavaScript("rhythmEffects")
    testPython("fitMediaReturnsNone", ["None"], false) // #2839
    testPython("selectRandomFileReturnsNone", ["None"], false) // #2823
    testPython("durWorksOnTransformedSounds", ["4"], false) // #3501
    // TODO: the rest of the API functions
})
