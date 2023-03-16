describe("Accessibility", () => {
    const username = "cypress"
    const scriptName = "RecursiveMelody.py"
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptCurriculumTOC()
        cy.interceptCurriculumContent()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned([{
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: scriptName,
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username: username,
        }])
        cy.interceptScriptsShared()
        cy.visit("/")
        cy.injectAxe()
        cy.checkA11y()
        cy.skipTour()
    })

    it("Has no detectable a11y violations on load in light mode", () => {
        cy.checkA11y()
        cy.login()
        cy.checkA11y()
    })

    it("TOC has no detectable a11y violations in light theme", () => {
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.checkA11y("#curriculum-header")
    })

    it("Has no detectable a11y violations on load in dark mode", () => {
        cy.get("button[title='Switch to dark color theme']").click()
        cy.checkA11y()
    })

    it("TOC has no detectable a11y violations in dark theme", () => {
        cy.get("button[title='Switch to dark color theme']").click()
        cy.get("button").contains("Welcome Students and Teachers!").click()
        cy.checkA11y("#curriculum-header")
    })

    it("Shortucts have no detectable a11y violations in light mode", () => {
        cy.get("button[title='Show/Hide Keyboard Shortcuts']").click()
        // TODO: disabling this rule until axe catches up with focus bumper pattern which headlessui employs
        // see: https://github.com/dequelabs/axe-core/issues/3430
        cy.checkA11y(null, {
            rules: {
                "aria-hidden-focus": { enabled: false },
            },
        })
    })

    it("Report Error Modal has no detectable a11y violations in light mode", () => {
        cy.get("button[title='Settings and Additional Options']").click()
        cy.get("button").contains("Report Error").click()
        // interacting with the form forces cypress to wait for css transitions to finish
        cy.get("div").contains("Report an error").parent().find("input[id='name']").type("test").clear()
        cy.checkA11y()
    })

    function testCreateScriptModal() {
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.get('[data-test="newScript"]').click()
        // interacting with the form forces cypress to wait for css transitions to finish
        cy.get("div").contains("Create a new script").parent().find("input[id='scriptName']").type("test").clear()
        cy.checkA11y()
    }

    it("Create Script Modal has no detectable a11y violations in light mode", () => {
        testCreateScriptModal()
    })

    it("Create Script Modal has no detectable a11y violations in dark mode", () => {
        cy.get("button[title='Switch to dark color theme']").click()
        testCreateScriptModal()
    })

    function testCreateAccountModal() {
        cy.get("button").contains("Create / Reset Account").click()
        cy.get("button").contains("Register a New Account").click()
        // interacting with the form forces cypress to wait for css transitions to finish
        cy.get("div").contains("Create an account").parent().find("input[name='username']").type("test").clear()
        cy.checkA11y()
    }

    it("Create Account Modal has no detectable a11y violations in light mode", () => {
        testCreateAccountModal()
    })

    it("Create Account Modal has no detectable a11y violations in dark mode", () => {
        cy.get("button[title='Switch to dark color theme']").click()
        testCreateAccountModal()
    })

    it("Add Sound modal has no detectable a11y violations on load in light mode", () => {
        cy.interceptFreesoundSearch()
        cy.login(username)
        cy.get("button[title='Open SOUNDS Tab']").click()
        cy.contains("button", "Add sound").click()
        cy.get("div").contains("Add a New Sound").parent().find("input[id='name']").type("test")
        cy.checkA11y()
        cy.get("button").contains("QUICK RECORD").click()
        cy.checkA11y()
        cy.get("button").contains("FREESOUND").click()
        cy.checkA11y()
        cy.get("div").contains("Add a New Sound").parent().find("input[placeholder='Search']").type("birds")
        cy.get("div").contains("Add a New Sound").parent().find("input[value='SEARCH']").click()
        // wait for search to finish
        cy.get("div").contains("Add a New Sound").parent().find("audio")
        cy.checkA11y()
    })

    it("Share Script modal has no detectable a11y violations on load in light mode", () => {
        cy.login(username)
        cy.get('[title="Open SCRIPTS Tab"]').click()
        cy.checkA11y()
        cy.get("div").contains(scriptName).click()
        cy.get("#coder").find("div").contains(scriptName)
        // TODO: uncomment after replacing ace
        // cy.checkA11y()
    })
})
