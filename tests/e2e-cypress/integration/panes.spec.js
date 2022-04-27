/* eslint-disable no-undef */
describe("Collapsible Panes", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("toggles panes", () => {
        cy.get("button[title='Close Content Manager']").click() // close browser
        cy.get("div[title='Open CONTENT MANAGER']").click() // re-open browser
        cy.get("button[title='Close Content Manager']") // check if browser is open

        cy.get("button[title='Close Curriculum']").click() // close curriculum
        cy.get("div[title='Open CURRICULUM']").click() // re-open curriculum
        cy.get("button[title='Close Curriculum']") // check if curriculum is open
    })
})
