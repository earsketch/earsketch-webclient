/* eslint-env jasmine */
import * as compiler from "../../../scripts/src/app/runner"

import { customMatchers } from "../../setup"
import { COURSERA_SCRIPTS } from "./coursera.scripts"
import { COURSERA_RESULTS } from "./coursera.results"

describe("Coursera example scripts", () => {
    beforeEach(() => {
        jasmine.addMatchers(customMatchers)
    })

    for (const [section, script] of Object.entries(COURSERA_SCRIPTS)) {
        it(`should compile ${section} correctly.`, done => {
            compiler.run("python", script).then(result => {
                expect(result).toMatchResult(COURSERA_RESULTS[section], script)
                done()
            }).catch(err => {
                expect(err).toEqual(null)
                done()
            })
        })
    }
})
