/* eslint-disable no-unused-expressions */
import * as ESUtils from "../../../src/esutils"
import * as runner from "../../../src/app/runner"

import { CURRICULUM_SCRIPTS } from "./curriculum.scripts"
import { CURRICULUM_RESULTS } from "./curriculum.results"
import { CURRICULUM_V2_SCRIPTS } from "./curriculum-v2.scripts"
import { CURRICULUM_V2_RESULTS } from "./curriculum-v2.results"

const EXCLUDE_LIST = [
    "Simple Console Input", // readInput()
    "Conditionals", // readInput()
    "Which Comes First", // readInput()
    "Random Clip", // randomness in track output
    "Amen Remix", // randomness in track output
    "add-beats-instead-of-this", // demonstrative fragment
    "add-beats-instead-of-this", // demonstrative fragment
    "getting-started-finding-errors", // errors intended
    "getting-started-finding-errors", // errors intended
    "get-user-input-user-input-1", // readInput()
    "get-user-input-user-input-1", // readInput()
    "get-user-input-user-input-2", // readInput()
    "get-user-input-user-input-2", // readInput()
    "get-user-input-what-tempo", // readInput()
    "get-user-input-what-tempo", // readInput()
    "get-user-input-boolean-operations", // readInput()
    "get-user-input-boolean-operations", // readInput()
    "mixing-with-conditionals-condition", // demonstrative fragment
    "mixing-with-conditionals-condition", // demonstrative fragment
    "mixing-with-conditionals-condition1", // demonstrative fragment
    "mixing-with-conditionals-condition1", // demonstrative fragment
]

describe("curriculum.scripts.cy.jsx", () => {
    for (const [filename, script] of Object.entries({ ...CURRICULUM_SCRIPTS, ...CURRICULUM_V2_SCRIPTS })) {
        const name = ESUtils.parseName(filename)
        if (EXCLUDE_LIST.includes(name)) {
            continue
        }
        const language = ESUtils.parseLanguage(filename)

        it(`should compile ${name} correctly in ${language.toUpperCase()}`, function (done) {
            this.timeout(6000)
            runner.run(language, script).then(result => {
                if (filename in CURRICULUM_SCRIPTS) {
                    expect(result).to.matchResult(CURRICULUM_RESULTS[name], script)
                } else if (filename in CURRICULUM_V2_SCRIPTS) {
                    expect(result).to.matchResult(CURRICULUM_V2_RESULTS[name], script)
                }
                done()
            }).catch(err => {
                expect(err).to.be.null
                done()
            })
        })
    }
})
