/* eslint-disable no-undef */
describe("bubble tour", () => {
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
        cy.visit("http://localhost:8888")
    })

    it("shows quickstart", () => {
        cy.get("button").contains("Start").click()
        cy.get("button").contains("Next").click()
        // make sure next is grayed out until you click run
        cy.get("button").contains("Next").should("have.class", "cursor-not-allowed")
    })
})
