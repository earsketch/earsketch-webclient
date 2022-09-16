describe("script browser", () => {
    beforeEach(() => {
        cy.visit("/")
        cy.get("button").contains("Skip").click()

        cy.interceptAudioStandard([])
        cy.interceptAudioMetadata({})
        cy.interceptAudioSample()
    })

    it("renames script", () => {
        const scriptName = "cypress_test"
        // Create a new script.
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.get('[data-test="newScript"]').click()
        cy.get("#scriptName").type(scriptName)
        cy.get("input").contains("CREATE").click()
        // wait for modal to disappear
        cy.get("#scriptName", { timeout: 10000 }).should("not.exist")

        // Rename
        // NOTE: Cypress clicks are quite finicky with this dropdown menu.
        cy.get(`[title="Script Options for ${scriptName}.py"]`).filter(":visible").trigger("click", "bottom")
        cy.get(`[title="Rename ${scriptName}.py"]`).click()
        cy.get(`input[value="${scriptName}"]`).clear().type("renamed_script")
        cy.get('input[type="submit"]').click()
        cy.contains("renamed_script.py")
    })
})
