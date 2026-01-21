/* eslint-disable no-unused-expressions */
import * as compiler from "../../../src/app/runner"

import { COURSERA_SCRIPTS } from "./coursera.scripts"
import { COURSERA_RESULTS } from "./coursera.results"

describe("Coursera example scripts", () => {
    for (const [section, script] of Object.entries(COURSERA_SCRIPTS)) {
        it(`should compile ${section} correctly.`, async () => {
            const result = await compiler.run("python", script)
            expect(result).to.matchResult(COURSERA_RESULTS[section], script)
        })
    }
})
