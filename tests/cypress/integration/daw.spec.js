import * as MockSocket from "mock-socket"

describe("DAW", () => {
    it("Runs script, playback in DAW", () => {
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
            source_code: "from earsketch import *\n\ninit()\nsetTempo(120)\nfitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 1.5)\n\nfinish()\n",
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

        // Load py script
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "playsound.py").click({ force: true })

        // Run script
        cy.get("button[id='run-button']").click()

        // Confirm success from the ES console
        cy.contains("span", "Script ran successfully")

        // Verify DAW has track "1" and "Play" is showing
        cy.contains(".dawTrackName", "1") // indicates track "1" rendered
        cy.get(".dawAudioClipContainer") // indicates timeline waveform rendered
        cy.get("button[title='Play']")

        // Play, loop, rewind, metronome in DAW
        cy.get("button[title='Toggle Metronome']").click()
        cy.get("button[title='Reset']").click()
        cy.get("button[title='Loop Project']").click() // enable loop

        // We could cy.wait(SONG_LENGTH) here to confirm looping, but I'd rather
        // avoid using wait in this way. The best validation I found was to
        // confirm audio playback with the play/pause button.

        // Verify "Play" becomes "Pause" on click
        cy.get("button[title='Play']").click()
        cy.get("button[title='Play']").should("not.exist")
        cy.get("button[title='Pause']")

        // Verify "Pause" becomes play when song playback ends
        cy.get("button[title='Pause']").click()
        cy.get("button[title='Pause']").should("not.exist")
        cy.get("button[title='Play']")
    })
})
