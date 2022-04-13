/* eslint-disable no-undef */
describe("Curriculum", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("shows TOC", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
    })

    it("opens a chapter", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.get("button[title='Expand ']").first().click()
        cy.contains("a", "Get Started with EarSketch").click()
    })
})
