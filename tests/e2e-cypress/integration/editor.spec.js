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
        cy.get("button").contains("Skip").click()
        // Create a new script.
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.get('[data-test="newScript"]').click()
        cy.get("#scriptName").type("cypress_test")
        cy.get("input").contains("CREATE").click()
    })

    it("runs template script", () => {
        cy.get("button").contains("RUN").click()
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")
        cy.get("#console").contains("Script ran successfully")
    })

    it("allows editing, shows script output", () => {
        const message = "Greetings."
        cy.get(".ace_content").type(`{enter}print("${message}")`)
        // NOTE: Clicking "RUN" instead of using Ctrl+Enter because the shortcut is different on Mac.
        cy.get("button").contains("RUN").click()
        cy.get("#console-frame").contains(message)
        cy.get('[data-test="notificationBar"]').contains("Script ran successfully")
    })

    it("shows an error for a bad script", () => {
        cy.get(".ace_content").type('{enter}prunt("uh oh")')
        cy.get("button").contains("RUN").click()
        cy.get(".console-error").contains("NameError")
    })

    it("renders code in blocks mode", () => {
        cy.get(".ace_content").type(`{selectAll}{del}
from earsketch import *
fitMedia(OS_CLAP01, 1, 1, 2)
if 100 == 100:
print(5 % 2)
`)
        cy.get("button[title='Blocks Mode']").click() // enable blocks
        cy.get("canvas.droplet-main-canvas").should("be.visible")
        cy.get("div.droplet-palette-element").should("be.visible")
        cy.get("button").contains("RUN").click()

        cy.get("button[title='Blocks Mode']").click() // disable blocks
        cy.get("canvas.droplet-main-canvas").should("not.be.visible")
        cy.get("div.droplet-palette-element").should("not.be.visible")
        cy.get("button").contains("RUN").click()
    })
})
