describe("top header nav", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumContent()
        cy.visit("/")
        cy.get("button").contains("Skip").click()
    })

    it("changes theme", () => {
        // switch to dark theme
        cy.get("button[title='Settings and Additional Options']").click()
        cy.contains("button", "Switch Theme").click()
        cy.get("div#content-manager")
            .should("have.class", "bg-gray-900")
            .and("have.class", "text-white")

        // switch to light theme
        cy.get("button[title='Settings and Additional Options']").click()
        cy.contains("button", "Switch Theme").click()
        cy.get("div#content-manager")
            .should("have.class", "bg-white")
            .and("have.class", "text-black")
    })

    it("changes font size", () => {
        // Create a new script
        cy.get("[title='Open SCRIPTS Tab']").click()
        cy.get("[data-test='newScript']").click()
        cy.get("#scriptName").type("checking_font_sizes")
        cy.get("input").contains("CREATE").click()
        cy.get(".ace_content").type("{selectAll}{del}\nfrom earsketch import *")
        // Change font size multiple times
        Object.entries({ 10: "10px", 12: "12px", 14: "14px", 18: "18px", 24: "24px", 36: "36px" })
            .forEach(([selectedFontSize, realFontSize]) => {
                cy.get("button[title='Select Font Size']").click()
                cy.contains("button", selectedFontSize).click()
                cy.contains("div.ace_line", "from earsketch import *")
                    .should("have.css", "font-size", realFontSize)
            })
    })
})
