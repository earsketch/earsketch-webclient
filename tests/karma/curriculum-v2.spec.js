/* eslint-env jasmine */
import * as ESUtils from "../../src/esutils"
import * as runner from "../../src/app/runner"

import { customMatchers } from "../setup"
import { CURRICULUM_SCRIPTS } from "./curriculum-v2.scripts"

describe("Curriculum v2 example scripts", () => {
    beforeEach(() => {
        jasmine.addMatchers(customMatchers)
    })

    const EXCLUDE_LIST = [
        "get-user-input-untitled.py", // readInput()
        "get-user-input-untitled.js", // readInput()
        "get-user-input-user-input-1.py", // readInput()
        "get-user-input-user-input-1.js", // readInput()
        "get-user-input-user-input-2.py", // readInput()
        "get-user-input-user-input-2.js", // readInput()
        "get-user-input-boolean-operations.py", // readInput()
        "get-user-input-boolean-operations.js", // readInput()
    ]

    for (const [filename, script] of Object.entries(CURRICULUM_SCRIPTS)) {
        if (EXCLUDE_LIST.includes(filename)) {
            continue
        }
        const name = ESUtils.parseName(filename)
        const language = ESUtils.parseLanguage(filename)
        it(`should compile ${name} correctly in ${language.toUpperCase()}`, done => {
            runner.run(language, script).then(() => {
                // assume success if no errors occurred
                done()
            }).catch(err => {
                expect(err).toBeNull()
                done()
            })
        })
    }
})
