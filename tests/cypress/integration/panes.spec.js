describe("Collapsible Panes", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("toggles panes", () => {
        // Test 1: Content Manager

        // verify content manager pane shows the correct button when expanded
        cy.get("button[title='Open CONTENT MANAGER']").should("not.exist")

        // use button to close content manager
        cy.get("button[title='Close Content Manager']").click()

        // verify content manager pane shows the correct button when collapsed
        cy.get("button[title='Open CONTENT MANAGER']")
        cy.get("button[title='Close Content Manager']").should("not.be.visible")

        // verify content manager pane has a narrow width when collapsed
        cy.get("div#content-manager").invoke("outerWidth").should("be.lte", 45)

        // Test 2: Curriculum

        // verify curriculum pane shows the correct button when expanded
        cy.get("button[title='Open CURRICULUM']").should("not.exist")

        // use button to close curriculum
        cy.get("button[title='Close Curriculum']").click()

        // verify curriculum pane shows the correct button when collapsed
        cy.get("button[title='Open CURRICULUM']")
        cy.get("button[title='Close Curriculum']").should("not.exist")

        // verify curriculum pane has a narrow width when collapsed
        cy.get("div#curriculum-container").invoke("outerWidth").should("be.lte", 45)
    })
})
