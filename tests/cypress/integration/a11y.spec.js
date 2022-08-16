describe("Accessibility", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumTOC()
        cy.interceptCurriculumContent()
        cy.visit("/")
        cy.injectAxe()
        cy.checkA11y()
        cy.get("button").contains("Skip").click()
    })

    it("Has no detectable a11y violations on load in light mode", () => {
        cy.checkA11y()
    })

    it("TOC has no detectable a11y violations in light theme", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.checkA11y("#curriculum-header")
    })

    it("Has no detectable a11y violations on load in dark mode", () => {
        cy.get("button[title='Switch Theme']").click()
        cy.checkA11y()
    })
    it("TOC has no detectable a11y violations in dark theme", () => {
        cy.get("button[title='Switch Theme']").click()
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.checkA11y("#curriculum-header")
    })
})
