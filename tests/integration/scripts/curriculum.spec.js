/* eslint-env jasmine */
import * as ESUtils from "../../../scripts/src/esutils"
import * as runner from "../../../scripts/src/app/runner"

import { customMatchers } from "../../setup"
import { CURRICULUM_SCRIPTS } from "./curriculum.scripts"
import { CURRICULUM_RESULTS } from "./curriculum.results"

describe("Curriculum example scripts", () => {
    beforeEach(() => {
        jasmine.addMatchers(customMatchers)
    })

    // TODO: Old comment: "these use custom modal stuff". See if these are safe to bring back.
    const EXCLUDE_LIST = ["Simple Console Input", "Conditionals", "Which Comes First", "Random Clip", "Amen Remix"]

    for (const [filename, script] of Object.entries(CURRICULUM_SCRIPTS)) {
        const name = ESUtils.parseName(filename)
        if (EXCLUDE_LIST.includes(name)) {
            continue
        }
        const language = ESUtils.parseLanguage(filename)
        const runFn = { python: runner.runPython, javascript: runner.runJavaScript }[language]
        it(`should compile ${name} correctly in ${language.toUpperCase()}`, done => {
            runFn(script).then(result => {
                expect(result).toMatchResult(CURRICULUM_RESULTS[name], script)
                done()
            }).catch(err => {
                expect(err).toBeNull()
                done()
            })
        })
    }
})
