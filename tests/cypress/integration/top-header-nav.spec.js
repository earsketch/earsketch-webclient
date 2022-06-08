describe("top header nav", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("changes theme", () => {
        // switch to dark theme
        cy.get("button[title='Settings and Additional Options']").click()
        cy.contains("button", "Switch Theme").click()
        cy.get("div#content-manager")
            .should("have.class", "bg-gray-900")
            .and("have.class", "text-white")

        // switch to light theme
        cy.get("button[title='Settings and Additional Options']").click()
        cy.contains("button", "Switch Theme").click()
        cy.get("div#content-manager")
            .should("have.class", "bg-white")
            .and("have.class", "text-black")
    })
})
