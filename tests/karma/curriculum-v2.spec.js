/* eslint-env jasmine */
import * as ESUtils from "../../src/esutils"
import * as runner from "../../src/app/runner"

import { customMatchers } from "../setup"
import { CURRICULUM_SCRIPTS } from "./curriculum-v2.scripts"

describe("Curriculum v2 example scripts", () => {
    beforeEach(() => {
        jasmine.addMatchers(customMatchers)
    })

    const EXCLUDE_LIST = []

    for (const [filename, script] of Object.entries(CURRICULUM_SCRIPTS)) {
        const name = ESUtils.parseName(filename)
        if (EXCLUDE_LIST.includes(name)) {
            continue
        }
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
