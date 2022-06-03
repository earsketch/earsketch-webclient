describe("Curriculum", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumTOC()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("shows TOC", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
    })

    it("loads a chapter", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.get("button[title='Expand Unit']").first().click()
        cy.contains("a", "Get Started with EarSketch").click()
    })

    it("list chapter sections in TOC", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.get("button[title='Expand Unit']").first().click()
        cy.get("button[title='Expand Chapter']").first().click()
        cy.contains("a", "1.1 Discover EarSketch").should("be.visible")
    })

    it("can navigate to the next chapter and back using the button", () => {
        cy.get("article#curriculum-body").contains("Welcome to EarSketch! Teachers:")
        cy.get("button[title='Next Page']").click()
        cy.get("article#curriculum-body").contains("Unit 1: Compose and Add Beats")
        cy.get("button[title='Previous Page']").click()
        cy.get("article#curriculum-body").contains("Welcome to EarSketch! Teachers:")
    })

    it("shows when langauge is toggled between Python and JavaScript", () => {
        cy.toggleCurriculumLanguage()
        cy.get("button[title='Switch script language to python']").contains("JS")
    })

    it("can toggle language from Python to JavaScript", () => {
        cy.toggleCurriculumLanguage()
        // if curriculum-python is not visible, it means we are in JS
        cy.get(".curriculum-python").should("be.not.visible")
    })

    it("can toggle language from JavaScript to Python", () => {
        cy.toggleCurriculumLanguage()
        cy.get(".curriculum-python").should("be.not.visible")
        // now switch back to Python
        cy.get("button[title='Switch script language to python']").click()
        cy.get(".curriculum-javascript").should("be.not.visible")
    })

    it("should show the correct internationalization", () => {
        cy.get("button[title='Select Language']").click()
        // there is a button that contains "Espanol" as the text. It should have a title indicating it's not been selected
        cy.get("button").contains("Español").should("have.attr", "title", "Not selected")
        // cy.interceptCurriculumTOC("es")
        // click on the button that contains "Espanol"
        cy.get("button").contains("Español").click()
    })
})
