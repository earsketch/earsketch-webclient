/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("user", () => {
    it("completes login", () => {
        const username = "cypress"
        cy.interceptAudioStandard([
            {
                artist: "RICHARD DEVINE",
                folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
                genre: "DUBSTEP",
                genreGroup: "DUBSTEP",
                instrument: "SYNTH",
                name: "DUBSTEP_BASS_WOBBLE_001",
                path: "filename/placeholder/here.wav",
                public: 1,
                tempo: 140,
                year: 2012,
            },
        ])
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned([{
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: "RecursiveMelody.py",
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username: username,
        }])
        cy.interceptScriptsShared([{
            created: "2022-03-03 07:08:09.0",
            file_location: "",
            id: -1,
            modified: "2022-03-22 10:11:12.0",
            name: "bach_remix.py",
            run_status: 1,
            source_code: "# Created for EarSketch\n",
            shareid: "2222222222222222222222",
            username: "friend_of_cypress",
        }])

        // login
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login(username)

        // verify sound browser
        cy.contains("div", "SOUND COLLECTION (1)")
        cy.contains("div", "DUBSTEP_140_BPM__DUBBASSWOBBLE")

        // verify scripts browser
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "MY SCRIPTS (1)")
        cy.contains("div", "SHARED SCRIPTS (1)")

        // upload a sound
        cy.get("button[title='Open SOUNDS Tab']").click()
        cy.contains("button", "Add sound").click()
        // TODO understand why attachFile() isn't attaching anything
        const fileName = "shh.wav"
        cy.fixture(fileName, "binary")
            .then(Cypress.Blob.binaryStringToBlob)
            .then(fileContent => {
                cy.get("#inputlabel").attachFile({
                    fileContent,
                    fileName,
                    mimeType: "application/octet-string",
                    encoding: "utf8",
                    lastModified: new Date().getTime(),
                })
            })

        // logout
        // cy.get("button").contains(username).click()
        // cy.get("button").contains("Logout").click()
        // cy.get("button[title='Open SCRIPTS Tab']").click()
        // cy.contains("div", "MY SCRIPTS (0)")
    })
})
