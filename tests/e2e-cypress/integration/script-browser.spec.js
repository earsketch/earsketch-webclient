/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("fitMedia (py) script", () => {
    it("Logs in, creates a new script, runs with fit media", () => {
        const scriptName = "playsound.py"

        // Stubbing
        const scriptData = {
            created: "2021-10-12 20:17:18.0",
            file_location: "",
            id: -1,
            modified: "2021-10-12 20:22:29.0",
            name: scriptName,
            run_status: 1,
            shareid: "qeT7pez_OVHwmxeDVzkT7w",
            soft_delete: false,
            source_code: "from earsketch import *\n\ninit()\nsetTempo(120)\nfitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 5)\n\nfinish()\n",
            username: "cypress",
        }

        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()

        cy.interceptScriptsOwned([scriptData])
        cy.interceptScriptsShared()
        cy.interceptScriptSave(scriptName, scriptData)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        cy.get("#app-title").should("contain", "EarSketch")

        // Load Script
        cy.wait(4000)
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.get("div[aria-label='Script Options for " + scriptName + "']").first().click()
        // cy.get("[aria-label='Rename " + scriptName + "'] > :nth-child(2)")
        // cy.get("[aria-label='Rename " + scriptName + "']")
        // cy.get("button[title='Rename " + scriptName + "']")
        // cy.contains("div", "Script Options for " + ogScriptName).click()
        cy.wait(4000)
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.get("div[aria-label='Script Options for " + scriptName + "']").first().click()
        cy.get("button[title='Rename " + scriptName + "']")
    })
})
