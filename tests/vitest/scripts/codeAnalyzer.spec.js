import { beforeAll, describe, expect, it } from "vitest"

import { generateCSV, runScript } from "../../../src/app/codeAnalyzerFunctions"
import { getStandardSounds } from "../../../src/browser/soundsThunks"
import store from "../../../src/reducers"

import { CODE_ANALYZER_SCRIPTS } from "./codeAnalyzer.scripts"

const ALL_REPORTS = {
    OVERVIEW: true,
    COUNTS: true,
    "CODE INDICATOR": true,
    "CODE INDICATOR TOTAL": true,
    "CODE COMPLEXITY": true,
    MEASUREVIEW: true,
    SOUNDPROFILE: true,
    DEPTHBREADTH: true,
    CREATIVITY: true,
}

function makeScript(name, sourceCode) {
    return {
        name,
        source_code: sourceCode,
        username: "analyzer_test",
        shareid: "share-" + name,
        modified: "2026-01-01 00:00:00.0",
    }
}

describe("Code Analyzer", () => {
    const results = {}

    beforeAll(async () => {
        // The Code Analyzer page loads the standard sounds on mount, which also fills the recommender's sound data.
        await store.dispatch(getStandardSounds())
        for (const [name, sourceCode] of Object.entries(CODE_ANALYZER_SCRIPTS)) {
            results[name] = await runScript(makeScript(name, sourceCode))
        }
    }, 60000)

    for (const name of Object.keys(CODE_ANALYZER_SCRIPTS)) {
        it(`should produce a stable report for ${name}`, () => {
            const { reports, error } = results[name]
            expect({ reports, error }).toMatchSnapshot()
        })
    }

    it("should produce a stable CSV", () => {
        expect(generateCSV(Object.values(results), false, ALL_REPORTS)).toMatchSnapshot()
    })
})
