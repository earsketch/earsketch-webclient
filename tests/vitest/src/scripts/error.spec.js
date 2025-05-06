import { expect, it, vi } from "vitest"
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import * as runner from "../../../../src/app/runner"

vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

const scripts = [{
    name: "SyntaxError",
    source: `
1 + 1;
!;
3 + 3;
`,
    lineNumber: 2,
}, {
    name: "ReferenceError",
    source: `
1 + 1
2 + 2
3 + foo
4 + 4
`,
    lineNumber: 3,
}, {
    name: "custom error",
    source: `
"first line"
throw new Error("oh no!")
"last line"
`,
    lineNumber: 2,
}, {
    name: "custom non-Error error",
    source: `
"first line"
throw "a dangerous string"
"last line"
`,
    lineNumber: 2,
}, {
    name: "nested error",
    // NOTE: Intentionally tricky choice of function name: JS-Interpreter also refers to top level as 'code'
    source: `
1+1
function code() {
    2+2
    3+foo
}
code()
`,
    lineNumber: 4,
}]

for (const { name, source, lineNumber } of scripts) {
    it(`should throw exceptions with correct line numbers (${name})`, async () => {
        // TODO: Upgrade Jasmine and do something like this instead:
        // await expectAsync(runner.run("javascript", script)).toBeRejectedWith({ lineNumber: 3 })
        let exception
        try {
            await runner.run("javascript", source.trim())
        } catch (e) {
            exception = e
        }
        expect(exception?.lineNumber).toBe(lineNumber)
    })
}
