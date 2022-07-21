describe("embedded mode", () => {
    beforeEach(() => {
        cy.interceptAudioStandard()
        cy.interceptScriptById({
            created: "2022-04-20 19:10:00.0",
            file_location: "",
            id: -1,
            modified: "2022-04-20 19:10:00.0",
            name: "test_song.py",
            run_status: 0,
            shareid: "abcabcabcabcabcabcabcabc",
            soft_delete: false,
            source_code: "from earsketch import *\n\nsetTempo(111)\n# todo: music\n",
            username: "cypress",
        })
    })
    it("loads embedded", () => {
        cy.visit("/?sharing=123&embedded=true")
        cy.contains(".embedded-script-info", "test_song.py")
        cy.get("#daw-play-button").click()
    })
    it("loads with hideDaw", () => {
        cy.visit("/?sharing=123&embedded=true&hideDaw")
        cy.contains(".embedded-script-info", "test_song.py")
        cy.get("#daw-play-button").click()
    })
    it("loads with hideCode", () => {
        cy.visit("/?sharing=123&embedded=true&hideCode")
        cy.contains(".embedded-script-info", "test_song.py")
        cy.get("#daw-play-button").click()
    })
    it("loads with hideDaw and hideCode", () => {
        cy.visit("/?sharing=123&embedded=true&hideDaw&hideCode")
        cy.contains(".embedded-script-info", "test_song.py")
        cy.get("#daw-play-button").click()
    })
})
