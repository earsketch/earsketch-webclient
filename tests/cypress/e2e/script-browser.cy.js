describe("script browser", () => {
    beforeEach(() => {
        cy.interceptAudioStandard([])
        cy.interceptAudioMetadata({})
        cy.interceptAudioSample()
        cy.interceptCurriculumTOC()
        cy.interceptCurriculumContent()

        cy.visit("/")
        cy.skipTour()
    })

    it("renames script", () => {
        const scriptName = "cypress_test"
        cy.createScript(scriptName)
        // Rename
        cy.get(`[title="Script Options for ${scriptName}.py"]`).click()

        cy.get(`[title="Rename ${scriptName}.py"]`).click()
        cy.get(`input[value="${scriptName}"]`).clear()
        cy.get("span").contains("Enter the new name for this script:").siblings().find("input").type("renamed_script")
        cy.get('input[type="submit"]').click()
        cy.contains("renamed_script.py")
    })

    it("delete script", () => {
        const scriptName1 = "first_cypress_test"
        const scriptName2 = "second_cypress_test"
        cy.createScript(scriptName1)
        cy.createScript(scriptName2)

        // Delete
        cy.get(`[title="Script Options for ${scriptName1}.py"]`).click()
        cy.get(`[title="Delete ${scriptName1}.py"]`).click()
        cy.get('input[type="submit"]').click()
        cy.contains(scriptName1, { timeout: 10000 }).should("not.exist")

        // Attempt to rename to a deleted script name
        cy.get(`[title="Script Options for ${scriptName2}.py"]`).click()
        cy.get(`[title="Rename ${scriptName2}.py"]`).click()
        cy.get(`input[value="${scriptName2}"]`).clear()
        cy.get("span").contains("Enter the new name for this script:").siblings().find("input").type(scriptName1)
        cy.get('input[type="submit"]').click()
        cy.contains(scriptName2)
        cy.contains("That name already exists in your deleted scripts")
    })
})
