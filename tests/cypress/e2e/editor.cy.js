describe("Editor", () => {
    beforeEach(() => {
        const testSoundMeta = {
            folder: "STUB FOLDER",
            name: "OS_CLAP01",
            public: 1,
            path: "standard-library/filename/placeholder/here.wav",
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
        cy.get("div").contains("cypress_test.py")
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
        cy.get("div").contains("js_test.js")
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

    it("allows user to login, edit script, and save", () => {
        const username = "cypress"
        const scriptName = "RecursiveMelody.py"

        // Setup intercepts for login and save
        cy.interceptScriptSave(scriptName)
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser([])
        cy.interceptAudioFavorites()
        cy.interceptScriptsShared()
        cy.interceptAudioUpload()

        cy.interceptScriptsOwned([{
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: scriptName,
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username,
        }])

        cy.interceptAudioUser()
        // Login with placeholder username
        cy.login("username")
        // wait for the already created script to be saved during login
        cy.wait("@scripts_save")
        cy.get(`[title="Open ${scriptName} in Code Editor"]`).click()

        const message = "Hello from saved script"
        cy.get("#editor").type(`{moveToEnd}{enter}print("${message}")`)

        cy.get("button").contains("button", scriptName).parent().should("have.class", "text-red-500")

        // NOTE: Clicking "RUN" instead of using Ctrl+Enter because the shortcut is different on Mac.
        cy.get("button").contains("RUN").click()
        // Verify the save API was called
        cy.wait("@scripts_save").then((interception) => {
            expect(interception.request.body).to.contain(`name=${scriptName}`)
            expect(interception.request.body.replaceAll("+", " ")).to.contain(message)
        })

        cy.get("#console-frame").contains(message)
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")

        const message2 = "another message"
        cy.get("#editor").type(`{moveToEnd}{enter}print("${message2}")`)

        cy.get("button").contains("button", scriptName).parent().should("have.class", "text-red-500")

        if (Cypress.platform === "darwin") {
            cy.get("#editor").type("{meta+s}")
        } else {
            cy.get("#editor").type("{ctrl+s}")
        }

        cy.wait("@scripts_save").then((interception) => {
            expect(interception.request.body).to.contain(`name=${scriptName}`)
            expect(interception.request.body.replaceAll("+", " ")).to.contain(message2)
        })

        cy.get("#console-frame").should("not.contain", message2)
    })
})
