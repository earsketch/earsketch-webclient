describe("language", () => {
    it("selects language", () => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.skipTour()

        // select spanish
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "Español").click()
        cy.contains("h2", "GESTOR DE CONTENIDOS")

        // select french
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "Français").click()
        cy.contains("h2", "GESTIONNAIRE DE CONTENU")

        // select english
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "English").click()
        cy.contains("h2", "CONTENT MANAGER")
    })
})
