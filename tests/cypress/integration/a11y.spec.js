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

    it("Shortucts have no detectable a11y violations in light mode", () => {
        cy.get("button[title='Show/Hide Keyboard Shortcuts']").click()
        cy.checkA11y()
    })

    it("Report Error Modal has no detectable a11y violations in light mode", () => {
        cy.get("button[title='Settings and Additional Options']").click()
        cy.get("button").contains("Report Error").click()
        // interacting with the form forces cypress to wait for css transitions to finish
        cy.get("div").contains("Report an error").parent().find("input[id='name']").type("test")
        cy.checkA11y()
    })

    it("Create Account Modal has no detectable a11y violations in light mode", () => {
        cy.get("button").contains("Create / Reset Account").click()
        cy.get("button").contains("Register a New Account").click()
        // interacting with the form forces cypress to wait for css transitions to finish
        cy.get("div").contains("Create an account").parent().find("input[name='username']").type("test")
        cy.checkA11y()
    })
})
