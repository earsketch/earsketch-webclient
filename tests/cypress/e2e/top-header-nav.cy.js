describe("top header nav", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumTOC()
        cy.interceptCurriculumContent()
        cy.visit("/")
        cy.wait("@getCurriculumTOC", { requestTimeout: 30000 })
        cy.wait("@getCurriculumSearchDoc", { requestTimeout: 30000 })
        cy.wait("@getCurriculumContent", { requestTimeout: 30000 })
        cy.skipTour()
    })

    it("changes theme", () => {
        // switch to dark theme
        cy.get("button[title='Switch to dark color theme']").click()
        cy.get("body")
            .should("have.class", "dark")

        // switch to light theme
        cy.get("button[title='Switch to light color theme']").click()
        cy.get("body")
            .should("not.have.class", "dark")

        // TODO: consider checking the actual colors rather than just the class
    })

    it("changes font size", () => {
        // ensure curriculum has rendered
        cy.contains("h2", "welcome", { timeout: 30000 })
        // change font size multiple times
        Object.entries({ 10: "15px", 12: "18px", 14: "21px", 18: "27px", 24: "36px", 36: "54px" })
            .forEach(([selectedFontSize, h2FontSize]) => {
                cy.get("button[title='Select Font Size']").click()
                cy.contains("button", selectedFontSize).click()
                // verify the curriculum font. future changes could also verify the editor font.
                cy.contains("h2", "welcome")
                    .should("have.css", "font-size", h2FontSize)
                cy.contains("div.sect1", " Landing page body for welcome ")
                    .should("have.css", "font-size", selectedFontSize + "px")
            })
    })
})
