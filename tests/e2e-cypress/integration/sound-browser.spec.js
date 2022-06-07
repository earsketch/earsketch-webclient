import * as MockSocket from "mock-socket"

describe("preview sound", () => {
    it("does sound preview", () => {
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

    it("uploads sound", () => {
        const username = "cypress"
        const userAudioUploads = []
        cy.interceptAudioStandard([
            {
                artist: "RICHARD DEVINE",
                folder: "ELECTRO_128_BPM__EABASS",
                genre: "ELECTRO",
                genreGroup: "EDM",
                instrument: "BASS",
                name: "ELECTRO_ANALOGUE_BASS_001",
                path: "filename/placeholder/here.wav",
                public: 1,
                tempo: 128,
                year: 2012,
            },
        ])
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser(userAudioUploads)
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
        const fileName = "shh.wav"
        const usernameUpper = username.toUpperCase()
        const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
        const soundConst = usernameUpper + "_SHH" + randSuffix
        userAudioUploads.push({
            artist: usernameUpper,
            folder: usernameUpper,
            genre: "USER UPLOAD",
            instrument: "VOCALS",
            name: soundConst,
            path: "filename/placeholder/here.wav",
            public: 0,
            tempo: -1,
            year: 2022,
        })

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
