describe("Curriculum", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("shows TOC", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
    })

    it("opens a chapter", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.get("button[title='Expand ']").first().click()
        cy.contains("a", "Get Started with EarSketch").click()
    })

    it("can navigate to the next chapter using the button", () => {
        cy.get("button[title='Next Page']").click()
        cy.get("article#curriculum-body").contains("Get Started with EarSketch")
    })

    it("can navigate to the next chapter and back using the button", () => {
        cy.get("button[title='Next Page']").click()
        cy.get("button[title='Previous Page']").click()
        cy.get("article#curriculum-body").contains("Welcome Students and Teachers!")
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
})
