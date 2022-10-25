import * as MockSocket from "mock-socket"
import "cypress-network-idle"

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

describe("preview sound", () => {
    it("does sound preview", () => {
        cy.interceptAudioStandard([testSoundMeta])
        cy.interceptAudioMetadata(testSoundMeta)
        cy.interceptAudioSample()

        cy.visit("/")
        cy.skipTour()

        // wait for all audio library api calls to finish
        cy.waitForNetworkIdle("/EarSketchWS/audio/standard", 2000)
        // preview sound
        cy.get("i.icon.icon-play4") // confirms audio is not playing
        cy.get("button[title='Preview sound']").click()

        // verify audio playback
        // todo: confirm audio is playing, which is difficult in cypress
        cy.get("i.icon.icon-play4") // confirms audio is done playing
    })
})

describe("add a sound", () => {
    it("uploads sound", () => {
        const username = "cypress"
        const fileName = "clink.wav"
        const usernameUpper = username.toUpperCase()
        const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
        const soundConst = usernameUpper + "_SHH" + randSuffix

        cy.interceptAudioStandard([testSoundMeta])
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser([])
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()
        cy.interceptAudioUpload()

        // upload a sound
        cy.interceptAudioUser([{
            artist: usernameUpper,
            folder: usernameUpper,
            genre: "USER UPLOAD",
            instrument: "VOCALS",
            name: soundConst,
            path: "filename/placeholder/here.wav",
            public: 0,
            tempo: -1,
            year: 2022,
        }])

        // login
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login(username)

        // put the sound file in the "Add sound" modal
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

        // upload sound
        cy.contains("div", "Add a New Sound").should("exist")
        // I'm using a dummy sound constant "SHH_..." here, which is sent to the
        // (stubbed) API. The API will prepend the constant with the username
        // and return it to the client. We need to use a dummy sound constant
        // here to avoid the client's duplicate-sound-constant protection.
        cy.get("#name").type("_UNIQUE_STRING_GOES_HERE")
        cy.get("input[value='UPLOAD']").click()

        // wait for the sound upload modal to disappear
        cy.contains("div", "Add a New Sound", { timeout: 10000 }).should("not.exist")
        // verify sound exists in the sound browser
        cy.contains("div", soundConst)
    })
})

describe("edit sound uploads", () => {
    const username = "cypress"
    const usernameUpper = username.toUpperCase()
    const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
    const soundConst = usernameUpper + "_SHH" + randSuffix

    beforeEach(() => {
        cy.interceptAudioStandard([testSoundMeta])
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser([
            {
                artist: usernameUpper,
                folder: usernameUpper,
                genre: "USER UPLOAD",
                instrument: "VOCALS",
                name: soundConst,
                path: "filename/placeholder/here.wav",
                public: 0,
                tempo: -1,
                year: 2022,
            },
        ])

        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()

        // login
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login(username)

        // verify sound exists in the sound browser
        cy.contains("div", soundConst)
    })

    it("renames sound", () => {
        cy.interceptAudioRename()

        // rename sound
        cy.get("button[title='Rename sound']").click()
        cy.contains("div", "Rename Sound").should("exist")
        cy.get("input[value='" + "SHH" + randSuffix + "']").type("1")
        cy.get("input[value='RENAME']").click()

        // verify renamed sound exists in the sound browser
        cy.contains("div", "Rename Sound").should("not.exist")
        cy.contains("div", soundConst + "1")
    })

    it("deletes sound", () => {
        cy.interceptAudioDelete()

        // delete sound
        cy.get("button[title='Delete sound']").click()
        cy.contains("div", "Confirm").should("exist")
        cy.get("input[value='DELETE']").click()

        // verify sound does not exist in the sound browser
        cy.contains("div", soundConst).should("not.exist")
    })
})
