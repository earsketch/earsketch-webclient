/* eslint-disable no-undef */
describe("Editor", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
        // Create an new script.
        cy.get("a").contains("Click here to create a new script").click()
        cy.get("#scriptName").type("cypress_test")
        cy.get("input").contains("CREATE").click()
    })

    it("runs template script", () => {
        cy.get("button").contains("RUN").click()
        cy.get(".notificationBar").contains("Script ran successfully")
    })

    it("allows editing, shows script output", () => {
        const message = "Greetings."
        cy.get(".ace_content").type(`{enter}print("${message}"){ctrl+enter}`)
        cy.get("#console-frame").contains(message)
        cy.get(".notificationBar").contains("Script ran successfully")
    })

    it("shows an error for a bad script", () => {
        cy.get(".ace_content").type('{enter}prunt("uh oh"){ctrl+enter}')
        cy.get(".console-error").contains("NameError")
    })
})
