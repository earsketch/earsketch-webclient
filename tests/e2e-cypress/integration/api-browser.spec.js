describe("API browser", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("expands and pastes API entry", () => {
        const scriptName = "api_cypress_test"
        const functionText = "analyze"

        // Creates a new script
        cy.get('button[title="Open SCRIPTS Tab"]').click()
        cy.get('button[data-test="newScript"]').click()
        cy.get("#scriptName").type(scriptName)
        cy.get("input").contains("CREATE").click()

        // Expands API function
        cy.get('button[title="Open API Tab"]').click()
        cy.get('button[title="Open ' + functionText + ' function details"]').click()
        cy.get('button[title="Close ' + functionText + ' function details"]').click()

        // Pastes API function into editor
        cy.get(".ace_content").click()
        cy.get('button[title="Paste ' + functionText + ' function into code editor"]').click()
    })
})
