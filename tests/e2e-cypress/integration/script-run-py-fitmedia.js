import * as MockSocket from "mock-socket"

describe("fitMedia (py) script", () => {
    it("Logs in, creates a new script, runs with fit media", () => {
        // Stubbing
        const testSoundMeta = {
            artist: "RICHARD DEVINE",
            folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
            genre: "DUBSTEP",
            genreGroup: "DUBSTEP",
            instrument: "SYNTH",
            name: "DUBSTEP_BASS_WOBBLE_002",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 140,
            year: 2012,
        }
        const scriptData = {
            created: "2021-10-12 20:17:18.0",
            file_location: "",
            id: -1,
            modified: "2021-10-12 20:22:29.0",
            name: "playsound.py",
            run_status: 1,
            shareid: "qeT7pez_OVHwmxeDVzkT7w",
            soft_delete: false,
            source_code: "from earsketch import *\n\ninit()\nsetTempo(120)\nfitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 5)\n\nfinish()\n",
            username: "cypress",
        }

        cy.interceptAudioStandard([testSoundMeta])
        cy.interceptAudioMetadata(testSoundMeta)
        cy.interceptAudioSample()

        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()

        cy.interceptScriptsOwned([scriptData])
        cy.interceptScriptsShared()
        cy.interceptScriptSave("playsound.py", scriptData)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        cy.get("#app-title").should("contain", "EarSketch")

        // Load Script
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "playsound.py").click()

        // Run new Script
        cy.get("button[id='run-button']").click()

        // Confirm success from the ES console
        cy.contains("span", "Script ran successfully")
    })
})
