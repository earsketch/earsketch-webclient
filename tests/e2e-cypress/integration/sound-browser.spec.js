/* eslint-disable no-undef */
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
})
