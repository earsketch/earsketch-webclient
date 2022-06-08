/* eslint-env jasmine */
import * as runner from "../../../src/app/runner"
import * as ide from "../../../src/ide/ideState"
import store from "../../../src/reducers"

import { customMatchers } from "../../setup"
import { API_SCRIPTS } from "./api.scripts"
import { API_RESULTS } from "./api.results"

describe("API function tests", () => {
    beforeEach(() => {
        store.dispatch(ide.setLogs([]))
        jasmine.addMatchers(customMatchers)
    })

    function testPython(name, logs = [], checkResult = true) {
        it(`should compile ${name} correctly in Python`, done => {
            runner.run("python", API_SCRIPTS[`${name}.py`]).then(result => {
                if (checkResult) {
                    expect(result).toMatchResult(API_RESULTS[name], API_SCRIPTS[`${name}.py`])
                }
                // eslint-disable-next-line no-undef
                const expectedLogs = logs.map(text => ({ level: "info", text: Sk.builtin.str(Sk.ffi.remapToPy(text)).v }))
                expect(ide.selectLogs(store.getState())).toEqual(expectedLogs)
                done()
            }).catch(err => {
                expect(err).toBeNull()
                done()
            })
        })
    }

    function testPythonAndJavaScript(name, logs = []) {
        testPython(name, logs)

        it(`should compile ${name} correctly in JavaScript`, done => {
            runner.run("javascript", API_SCRIPTS[`${name}.js`]).then(result => {
                expect(result).toMatchResult(API_RESULTS[name], API_SCRIPTS[`${name}.js`])
                expect(ide.selectLogs(store.getState())).toEqual(logs.map(text => ({ level: "info", text })))
                done()
            }).catch(err => {
                expect(err).toBeNull()
                done()
            })
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
    testPythonAndJavaScript("dur", [2])
    testPythonAndJavaScript("fitMedia")
    testPythonAndJavaScript("importImage1", [[[226, 228, 226, 230, 222, 221, 225, 230, 232, 232], [227, 221, 221, 224, 110, 204, 95, 222, 93, 230], [235, 223, 106, 222, 217, 227, 118, 220, 218, 231], [221, 226, 88, 227, 197, 200, 124, 203, 226, 234], [233, 180, 224, 230, 124, 175, 153, 229, 231, 236], [229, 224, 92, 222, 56, 79, 96, 205, 232, 233], [233, 209, 229, 224, 219, 93, 92, 226, 209, 233], [230, 227, 227, 221, 229, 231, 214, 227, 230, 228], [232, 228, 179, 219, 230, 228, 144, 228, 231, 229], [233, 233, 229, 224, 180, 218, 227, 228, 223, 228]]])
    testPythonAndJavaScript("importImage2", [[[[226, 226, 226], [228, 228, 228], [226, 226, 226], [230, 230, 230], [222, 222, 222], [221, 221, 221], [225, 225, 225], [230, 230, 230], [232, 232, 232], [232, 232, 232]], [[227, 227, 227], [221, 221, 221], [221, 221, 221], [224, 224, 224], [110, 110, 110], [204, 204, 204], [95, 95, 95], [222, 222, 222], [93, 93, 93], [230, 230, 230]], [[235, 235, 235], [223, 223, 223], [106, 106, 106], [222, 222, 222], [217, 217, 217], [227, 227, 227], [118, 118, 118], [220, 220, 220], [218, 218, 218], [231, 231, 231]], [[221, 221, 221], [226, 226, 226], [88, 88, 88], [227, 227, 227], [197, 197, 197], [200, 200, 200], [124, 124, 124], [203, 203, 203], [226, 226, 226], [234, 234, 234]], [[233, 233, 233], [180, 180, 180], [224, 224, 224], [230, 230, 230], [124, 124, 124], [175, 175, 175], [153, 153, 153], [229, 229, 229], [231, 231, 231], [236, 236, 236]], [[229, 229, 229], [224, 224, 224], [92, 92, 92], [222, 222, 222], [56, 56, 56], [79, 79, 79], [96, 96, 96], [205, 205, 205], [232, 232, 232], [233, 233, 233]], [[233, 233, 233], [209, 209, 209], [229, 229, 229], [224, 224, 224], [219, 219, 219], [93, 93, 93], [92, 92, 92], [226, 226, 226], [209, 209, 209], [233, 233, 233]], [[230, 230, 230], [227, 227, 227], [227, 227, 227], [221, 221, 221], [229, 229, 229], [231, 231, 231], [214, 214, 214], [227, 227, 227], [230, 230, 230], [228, 228, 228]], [[232, 232, 232], [228, 228, 228], [179, 179, 179], [219, 219, 219], [230, 230, 230], [228, 228, 228], [144, 144, 144], [228, 228, 228], [231, 231, 231], [229, 229, 229]], [[233, 233, 233], [233, 233, 233], [229, 229, 229], [224, 224, 224], [180, 180, 180], [218, 218, 218], [227, 227, 227], [228, 228, 228], [223, 223, 223], [228, 228, 228]]]])
    testPythonAndJavaScript("importFile", ['Copyright OpenJS Foundation and other contributors, https://openjsf.org/\n\nPermission is hereby granted, free of charge, to any person obtaining\na copy of this software and associated documentation files (the\n"Software"), to deal in the Software without restriction, including\nwithout limitation the rights to use, copy, modify, merge, publish,\ndistribute, sublicense, and/or sell copies of the Software, and to\npermit persons to whom the Software is furnished to do so, subject to\nthe following conditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\nLIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\nOF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\nWITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n'])
    testPythonAndJavaScript("insertMedia1")
    testPythonAndJavaScript("insertMedia2")
    testPythonAndJavaScript("insertMediaSection")
    testPythonAndJavaScript("insertMediaSectionMiddle")
    testPythonAndJavaScript("insertMediaSectionTimeStretch")
    testPythonAndJavaScript("insertMediaSectionTimeStretchMiddle")
    // TODO: makeBeat
    testPythonAndJavaScript("makeBeatSlice")

    testPython("fitMediaReturnsNone", ["None"], false) // #2839
    // TODO: the rest of the API functions
})
