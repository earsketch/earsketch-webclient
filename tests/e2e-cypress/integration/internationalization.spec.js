describe("language", () => {
    it("selects language", () => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()

        // select spanish
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "Español").click()
        cy.contains("div", "GESTOR DE CONTENIDOS")

        // select french
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "Français").click()
        cy.contains("div", "GESTIONNAIRE DE CONTENU")

        // select english
        cy.get("button[title='Select Language']").click() // luckily the title is not translated
        cy.contains("button", "English").click()
        cy.contains("h2", "CONTENT MANAGER")
    })
})
