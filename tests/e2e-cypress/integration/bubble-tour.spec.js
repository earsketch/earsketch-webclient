/* eslint-disable no-undef */
describe("bubble tour", () => {
    it("shows quickstart", () => {
        cy.interceptAudioStandard()
        cy.visit("/")

        // begin tour
        cy.get("button").contains("Start").click()
        cy.get("button").contains("Next").click()

        // make sure next is grayed out until you click run
        cy.get("button").contains("Next").should("have.class", "cursor-not-allowed")
    })
})
