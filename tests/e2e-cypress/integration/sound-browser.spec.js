/* eslint-disable no-undef */
describe("preview sound", () => {
    it("does sound preview", () => {
        const API_HOST = "api-dev.ersktch.gatech.edu"
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

        cy.intercept(
            { method: "GET", hostname: API_HOST, path: "/EarSketchWS/audio/metadata?name=*" },
            { body: testSoundMeta }
        ).as("audio_metadata")

        cy.fixture("shh.wav", "binary").then((audio) => {
            const audioArray = Uint8Array.from(audio, c => c.charCodeAt(0))

            cy.intercept(
                { method: "GET", hostname: API_HOST, path: "/EarSketchWS/audio/sample?name=*" },
                {
                    headers: { "Content-Type": "application/octet-stream" },
                    body: audioArray.buffer,
                }
            ).as("audio_sample")
        })

        cy.visit("/")
        cy.get("button").contains("Skip").click()

        // open default sound folder - DUBSTEP_BASS_WOBBLE
        cy.contains("div", "DUBSTEP_140_BPM__DUBBASSWOBBLE").click()
        cy.get("button[title='Preview sound']").click()
        cy.get(".btn > .animate-spin")

        cy.wait(1000) // allow time for call to /audio/sample (would be better to remove this)
        cy.get("@audio_sample.all").should("have.length", 1)
    })
})
