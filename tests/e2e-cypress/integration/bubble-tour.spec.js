/* eslint-disable no-undef */
describe("earsketch client", () => {
    beforeEach(() => {
        cy.visit("http://localhost:8888")
    })

    it("has bubble tour", () => {
        cy.get("button").contains("Start").click()
        cy.get("button").contains("Next").click()
        // make sure next is grayed out until you click run
        cy.get("button").contains("Next").should("have.class", "cursor-not-allowed")
    })
})
