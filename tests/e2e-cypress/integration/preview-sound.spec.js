/* eslint-disable no-undef */
describe("preview sound", () => {
    beforeEach(() => {
        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/audio/standard",
            },
            {
                body: [{
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
                }],
            }
        ).as("audio_standard")

        cy.visit("http://localhost:8888")
    })

    it("does sound preview", () => {
        cy.get("button").contains("Skip").click()

        // open default sound folder - DUBSTEP_BASS_WOBBLE
        cy.contains("div", "DUBSTEP_140_BPM__DUBBASSWOBBLE").click()
        cy.get("button[title='Preview sound']").click()
    })
})
