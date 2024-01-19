describe("API browser", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.skipTour()
    })

    it("expands and pastes API entry", () => {
        const scriptName = "api_cypress_test"
        const functionText = "analyze"
        cy.createScript(scriptName)

        // Expands API function
        cy.get('button[title="Open API Tab"]').click()
        cy.get('button[title="Open ' + functionText + ' function details"]').click()
        cy.get('button[title="Close ' + functionText + ' function details"]').click()

        // Pastes API function into editor
        cy.get("#editor").click()
        cy.get('button[title="Paste ' + functionText + ' function into code editor"]').click()
    })
})
