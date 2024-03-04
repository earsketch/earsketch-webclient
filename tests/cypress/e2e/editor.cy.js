describe("Editor", () => {
    beforeEach(() => {
        const testSoundMeta = {
            folder: "STUB FOLDER",
            name: "OS_CLAP01",
            public: 1,
        }

        cy.interceptAudioStandard([testSoundMeta])
        cy.interceptAudioMetadata(testSoundMeta)
        cy.interceptAudioSample()

        cy.visit("/")
        cy.skipTour()
        // Create a new script.
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.get('[data-test="newScript"]').click()
        cy.get("#scriptName").type("cypress_test")
        cy.get("input").contains("CREATE").click()
        cy.waitForHeadlessDialog()
    })

    it("runs template script", () => {
        cy.get("button").contains("RUN").click()
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")
        cy.get("#console").contains("Script ran successfully")
    })

    it("allows editing, shows script output", () => {
        const message = "Greetings."
        cy.get("#editor").type(`{moveToEnd}{enter}print("${message}")`)
        // NOTE: Clicking "RUN" instead of using Ctrl+Enter because the shortcut is different on Mac.
        cy.get("button").contains("RUN").click()
        cy.get("#console-frame").contains(message)
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")
    })

    it("shows an error for a bad script", () => {
        cy.get("#editor").type('{moveToEnd}{enter}prunt("uh oh")')
        cy.get("button").contains("RUN").click()
        cy.get(".console-error").contains("NameError")
    })

    it("toggles autocomplete off", () => {
        cy.get("#editor").type("{moveToEnd}{enter}f")
        cy.get(".cm-tooltip-autocomplete").should("be.visible")
        cy.get(".cm-tooltip-autocomplete > ul").find("li[aria-selected='true']")
            .contains("fitMedia").should("be.visible").click()
        cy.realType("OS_CLAP01")
        cy.get(".cm-line").contains("fitMedia(OS_CLAP01,")
        cy.get("button[title='Editor Settings']").click()
        cy.get("button[title='Disable autocomplete']").click()
        cy.get("#editor").type("{moveToEnd}{enter}m")
        cy.get(".cm-tooltip-autocomplete").should("not.exist")
        cy.realType("{enter}")
        cy.get(".cm-line").contains(/^m$/)
    })

    it("interrupts long-running script", () => {
        const message = "whee"
        cy.get("#editor").type(`{moveToEnd}{enter}while True: print("${message}")`)
        cy.get("button").contains("RUN").click()
        cy.get("#console-frame").contains(message)
        cy.get("button").contains("CANCEL").click()
        cy.get(".console-error").contains("User interrupted execution")
    })

    it("renders code in blocks mode", () => {
        cy.get("#editor").type(`{selectAll}{del}
from earsketch import *
fitMedia(OS_CLAP01, 1, 1, 2)
if 100 == 100:
print(5 % 2)
`)
        cy.get("button[title='Editor Settings']").click()
        cy.get("button[title='Enable blocks mode']").click() // enable blocks
        cy.get("canvas.droplet-main-canvas").should("be.visible")
        cy.get("div.droplet-palette-element").should("be.visible")
        cy.get("button").contains("RUN").click()

        cy.get("button[title='Editor Settings']").click()
        cy.get("button[title='Disable blocks mode']").click() // disable blocks
        cy.get("canvas.droplet-main-canvas").should("not.be.visible")
        cy.get("div.droplet-palette-element").should("not.be.visible")
        cy.get("button").contains("RUN").click()
    })

    it("creates and runs a js script with fitMedia()", () => {
        cy.get('[data-test="newScript"]').click()
        cy.get("select[title='Switch script language']").select("JavaScript")
        cy.get("#scriptName").type("js_test")
        cy.get("input").contains("CREATE").click()
        cy.waitForHeadlessDialog()

        // Enter new text with fitMedia()
        cy.get("#editor").type(`{selectAll}{del}{enter}
fitMedia(OS_CLAP01, 1, 1, 2);
`)
        cy.get("button").contains("RUN").click()
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")
    })

    it("calls fetch exactly once per sound", () => {
        cy.get('[data-test="newScript"]').click()
        cy.get("#scriptName").type("fetch_test")
        cy.get("input").contains("CREATE").click()

        // Use makeBeat() to create multiple clips of the same sound
        cy.get("#editor").type(`{selectAll}{del}{enter}
from earsketch import *
makeBeat(OS_CLAP01, 1, 1, "0000", 4)
`)
        cy.get("button").contains("RUN").click()
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")

        // We expect 3 intercepted calls: METRONOME01, METRONOME02, and OS_CLAP01
        // https://github.com/cypress-io/cypress/issues/16655
        cy.get("@audio_sample.all").should("have.length", 3)
    })
})
