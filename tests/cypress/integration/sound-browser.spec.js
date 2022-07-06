import * as MockSocket from "mock-socket"

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
        cy.get("button").contains("Skip").click()

        // open sound folder and preview sound
        cy.contains("div", testSoundMeta.folder).click()
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

        // login
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login(username)

        // verify sound browser
        cy.contains("div", "SOUND COLLECTION (1)")

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

        // verify sound exists in the sound browser
        cy.contains("div", "Add a New Sound").should("not.exist")
        cy.contains("div", "SOUND COLLECTION (2)")
        cy.contains("div.truncate", usernameUpper).click({ force: true })
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
        cy.login(username)

        // verify sound exists in the sound browser
        cy.contains("div", "SOUND COLLECTION (2)")
        cy.contains("div.truncate", usernameUpper).click()
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
        cy.contains("div", "SOUND COLLECTION (2)")
        cy.contains("div.truncate", usernameUpper).click()
        cy.contains("div", soundConst + "1")
    })

    it("deletes sound", () => {
        cy.interceptAudioDelete()

        // delete sound
        cy.get("button[title='Delete sound']").click()
        cy.contains("div", "Confirm").should("exist")
        cy.get("input[value='DELETE']").click()

        // verify sound does not exist in the sound browser
        cy.contains("div", "SOUND COLLECTION (1)")
        cy.contains("div.truncate", usernameUpper).should("not.exist")
    })
})
