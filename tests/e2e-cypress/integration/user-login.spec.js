/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("user", () => {
    it("completes login", () => {
        const username = "cypress"
        const userAudioUploads = []
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
        cy.interceptAudioUser(userAudioUploads)
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
        cy.interceptAudioUpload()

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
        const fileName = "shh.wav"
        const usernameUpper = username.toUpperCase()
        const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
        const soundConst = usernameUpper + "_SHH" + randSuffix
        userAudioUploads.push({
            artist: usernameUpper,
            folder: usernameUpper,
            genre: "USER UPLOAD",
            name: soundConst,
            path: "filename/placeholder/here.wav",
            public: 0,
            tempo: -1,
        })

        // Put the sound file in the "Add sound" modal
        cy.get("button[title='Open SOUNDS Tab']").click()
        cy.contains("button", "Add sound").click()
        cy.fixture(fileName, "binary")
            .then(Cypress.Blob.binaryStringToBlob)
            .then(fileContent => {
                cy.get("input[type='file']").attachFile({
                    fileContent,
                    fileName,
                    mimeType: "application/octet-string",
                    encoding: "utf8",
                    lastModified: new Date().getTime(),
                })
            })

        // Upload sound
        cy.contains("div", "Add a New Sound").should("exist")
        // I'm using a dummy sound constant "SHH_VOX" here, which is sent to the
        // (stubbed) API. The API will prepend the constant with the username
        // and return it to the client. We need to use a dummy sound constant
        // here to avoid the client's duplicate-sound-constant protection.
        cy.get("#name").type("_UNIQUE_STRING_GOES_HERE")
        cy.get("input[value='UPLOAD']").click()

        // Verify sound exists in the sound browser
        cy.contains("div", "Add a New Sound").should("not.exist")
        cy.contains("div", "SOUND COLLECTION (2)")
        cy.contains("div.truncate", usernameUpper).click()
        cy.contains("div", soundConst)

        // logout
        // cy.get("button").contains(username).click()
        // cy.get("button").contains("Logout").click()
        // cy.get("button[title='Open SCRIPTS Tab']").click()
        // cy.contains("div", "MY SCRIPTS (0)")
    })
})
