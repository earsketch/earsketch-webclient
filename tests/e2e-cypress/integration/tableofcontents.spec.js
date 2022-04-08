/* eslint-disable no-undef */
describe("Table of content", () => {
    beforeEach(() => {
        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/audio/standard",
            },
            {
                body: [],
            }
        )
        cy.visit("/")
    })

    it("shows TOC", () => {
        cy.get("button").contains("Skip").click()
        cy.get("button").contains("Welcome Students and Teachers!").click()
    })

    it("opens a chapter", () => {
        cy.get("button").contains("Skip").click()
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.get("a").contains("Unit 1: Compose and Add Beats").parent(".flex .items-start").get("button[title='Expand ']").first().click()
        cy.get("a").contains("Get Started with EarSketch").click()
    })
})
