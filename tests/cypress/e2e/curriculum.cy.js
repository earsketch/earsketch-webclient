describe("Curriculum", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumTOC()
        cy.interceptCurriculumContent()
        cy.visit("/")
        cy.wait("@getCurriculumTOC", { requestTimeout: 30000 })
        cy.wait("@getCurriculumSearchDoc", { requestTimeout: 30000 })
        cy.wait("@getCurriculumContent", { requestTimeout: 30000 })
        cy.skipTour()
        // ensure curriculum has rendered
        cy.contains("h2", "welcome", { timeout: 30000 })
    })

    it("shows TOC", () => {
        cy.get("button[title='Show Table of Contents']").click()
    })

    it("loads a chapter", () => {
        cy.get("button[title='Show Table of Contents']").click()
        cy.get("button[title='Expand Unit']").first().click()
        cy.contains("a", "Get Started with EarSketch").click()
        cy.get("article#curriculum-body").contains("In this chapter you will learn how EarSketch works")
    })

    it("list chapter sections in TOC", () => {
        cy.get("button[title='Show Table of Contents']").click()
        cy.get("button[title='Expand Unit']").first().click()
        cy.get("button[title='Expand Chapter']").first().click()
        cy.contains("a", "1.1 Discover EarSketch").should("be.visible")
    })

    it("can navigate to the next chapter and back using the button", () => {
        cy.get("article#curriculum-body").contains("Landing page body for welcome")
        cy.get("button[title='Next Page']").click()
        cy.get("article#curriculum-body").contains("Landing page body for unit-1")
        cy.get("button[title='Previous Page']").click()
        cy.get("article#curriculum-body").contains("Landing page body for welcome")
    })

    it("shows when langauge is toggled between Python and JavaScript", () => {
        cy.toggleCurriculumLanguage()
        cy.get("button[title='Switch script language to python']").contains("JS")
    })

    it("can toggle language from Python to JavaScript", () => {
        cy.toggleCurriculumLanguage()
        // if curriculum-python is not visible, it means we are in JS
        cy.get(".curriculum-javascript").scrollIntoView().should("be.visible")
        cy.get(".curriculum-python").scrollIntoView().should("be.not.visible")
    })

    it("can toggle language from JavaScript to Python", () => {
        cy.toggleCurriculumLanguage()
        cy.get(".curriculum-javascript").scrollIntoView().should("be.visible")
        cy.get(".curriculum-python").scrollIntoView().should("be.not.visible")
        // now switch back to Python
        cy.get("button[title='Switch script language to python']").click()
        cy.get(".curriculum-python").scrollIntoView().should("be.visible")
        cy.get(".curriculum-javascript").scrollIntoView().should("be.not.visible")
    })

    it("should show the correct internationalization", () => {
        cy.get("button[title='Show Table of Contents']").click()
        cy.get("button[title='Expand Unit']").eq(1).click()
        cy.contains("a", "Loops and Layers").click()
        // the curriculum html file intercept will include the fetched locale in the body of the html as "from locale xx"
        cy.get("article#curriculum-body").contains("from locale en")
        cy.get("button[title='Select Language']").click()
        // there is a button that contains "Espanol" as the text. It should have a title indicating it's not been selected
        cy.get("button").contains("Español").should("have.attr", "title", "Not selected")
        cy.get("button").contains("Español").click()
        cy.get("article#curriculum-body").contains("from locale es")
    })

    it("imports a script from the curriculum", () => {
        cy.get("button[title='Show Table of Contents']").click()
        cy.get("button[title='Expand Unit']").first().click()
        cy.get("button[title='Expand Chapter']").first().click()
        cy.contains("a", "The fitMedia() function").click()
        cy.get("i[title='Open the example code in the editor']").first().click()
        cy.contains("IMPORT TO EDIT").should("exist")
        // Toggle blocks mode without crashing (#2742).
        cy.get("button[title='Editor Settings']").click() // switch to blocks mode
        cy.get("button[title='Enable blocks mode']").click() // switch to blocks mode
        cy.get("button[title='Disable blocks mode']").click() // switch back
    })
})
