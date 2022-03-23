/* eslint-disable no-undef */
describe("user", () => {
    beforeEach(() => {
        const username = "cypress"

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

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/users/token",
            },
            { body: "1111111111111111111111111111111111111111111111111111111111111111" }
        )

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/users/info*", // accounts for "?" append to end
            },
            { body: { created: "2019-04-22 16:13:06.0", email: "", isAdmin: true, username: username } }
        )

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/audio/user?username=*",
            },
            { body: [] }
        )

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/audio/favorites*", // accounts for "?" append to end
            },
            { body: ["DUBSTEP_BASS_WOBBLE_002"] }
        )

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/scripts/owned",
            },
            {
                body: [{
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
                }],
            }
        )

        cy.intercept(
            {
                method: "GET",
                hostname: "api-dev.ersktch.gatech.edu",
                path: "/EarSketchWS/scripts/shared",
            },
            {
                body: [{
                    created: "2022-03-03 07:08:09.0",
                    file_location: "",
                    id: -1,
                    modified: "2022-03-22 10:11:12.0",
                    name: "bach_remix.py",
                    run_status: 1,
                    source_code: "# Created for EarSketch\n",
                    shareid: "2222222222222222222222",
                    username: "friend_of_cypress",
                }],
            }
        )

        cy.visit("http://localhost:8888")
    })

    it("does login", () => {
        // login with mock responses
        cy.get("button").contains("Skip").click()
        cy.get("input[name='username']").type("cypress")
        cy.get("input[name='password']").type("not_a_real_password")
        cy.get("button[title='Login']").click()

        // verify sound browser
        cy.contains("div", "SOUND COLLECTION (1)")
        cy.contains("div", "DUBSTEP_140_BPM__DUBBASSWOBBLE")

        // verify scripts browser
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "MY SCRIPTS (1)")
        cy.contains("div", "SHARED SCRIPTS (1)")
    })
})
