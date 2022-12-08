describe("script browser", () => {
    beforeEach(() => {
        cy.visit("/")
        cy.skipTour()

        cy.interceptAudioStandard([])
        cy.interceptAudioMetadata({})
        cy.interceptAudioSample()
    })

    const createScript = (scriptName) => {
        // Create a new script.
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.get('[data-test="newScript"]').click()
        cy.get("#scriptName").type(scriptName)
        cy.get("input").contains("CREATE").click()
        // wait for modal to disappear
        cy.get("#scriptName", { timeout: 10000 }).should("not.exist")
    }

    it("renames script", () => {
        const scriptName = "cypress_test"
        createScript(scriptName)

        // Rename
        // NOTE: Cypress clicks are quite finicky with this dropdown menu.
        cy.get(`[title="Script Options for ${scriptName}.py"]`).filter(":visible").trigger("click", "bottom")
        cy.get(`[title="Rename ${scriptName}.py"]`).click()
        cy.get(`input[value="${scriptName}"]`).clear().type("renamed_script")
        cy.get('input[type="submit"]').click()
        cy.contains("renamed_script.py")
    })

    it("delete script", () => {
        const scriptName1 = "first_cypress_test"
        const scriptName2 = "second_cypress_test"
        createScript(scriptName1)
        createScript(scriptName2)

        // Delete
        // NOTE: Cypress clicks are quite finicky with this dropdown menu.
        // TODO: remove force click in Cypress 12: this is a workaround since the script browser re-renders multiple times and original button gets detached from DOM
        cy.get(`[title="Script Options for ${scriptName1}.py"]`).filter(":visible").trigger("click", "bottom", { force: true })
        cy.get(`[title="Delete ${scriptName1}.py"]`).click()
        cy.get('input[type="submit"]').click()
        cy.contains(scriptName1, { timeout: 10000 }).should("not.exist")

        // Attempt to rename to a deleted script name
        // TODO: remove force click in Cypress 12: this is a workaround since the script browser re-renders multiple times and original button gets detached from DOM
        cy.get(`[title="Script Options for ${scriptName2}.py"]`).filter(":visible").trigger("click", "bottom", { force: true })
        cy.get(`[title="Rename ${scriptName2}.py"]`).click()
        cy.get(`input[value="${scriptName2}"]`).clear().type(scriptName1)
        cy.get('input[type="submit"]').click()
        cy.contains(scriptName2)
        cy.contains("That name already exists in your deleted scripts")
    })
})
