/* eslint-disable no-undef */
import { createServer } from "../support/wsServer"
import * as MockSocket from "mock-socket"

describe("shared script", () => {
    const apiHostname = "api-dev.ersktch.gatech.edu"
    const username = "cypress"
    const wsServer = createServer(`wss://${apiHostname}/EarSketchWS/socket/${username}/`)

    const myScriptsShared = [{
        created: "2022-03-03 07:08:09.0",
        file_location: "",
        id: -1,
        modified: "2022-03-22 10:11:12.0",
        name: "bach_remix.py",
        run_status: 1,
        source_code: "# Created for EarSketch\n",
        shareid: "2222222222222222222222",
        username: "friend_of_cypress",
    }]

    const newShared = {
        created: "2022-03-28 17:56:20.0",
        description: "",
        file_location: "",
        id: -1,
        licenseInfo: "CC BY - Creative Commons Attribution: This license lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.",
        license_id: 1,
        modified: "2022-03-28 17:56:44.0",
        name: "mondays.py",
        run_status: 0,
        shareid: "4444444444444444444444",
        soft_delete: false,
        source_code: "# mondays.py\nfrom earsketch import *\n\nsetTempo(144)\n",
        username: "user1",
    }

    it("notification received", () => {
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
        cy.interceptScriptsShared(myScriptsShared)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)

        cy.login(username)

        cy.intercept(
            {
                hostname: apiHostname,
                method: "GET",
                path: "EarSketchWS/scripts/byid?scriptid=4444444444444444444444",
            },
            {
                body: newShared,
            }
        ).as("script_by_id_1C0A")

        cy.intercept(
            {
                hostname: apiHostname,
                method: "POST",
                path: "EarSketchWS/scripts/saveshared",
            },
            {
                body: newShared,
            }
        ).as("script_by_id_1C0A")

        cy.get("button[title='Open SCRIPTS Tab']").click()
        myScriptsShared.push(newShared)

        cy.incomingWebSocketMessage(
            wsServer,
            {
                notification_type: "notifications",
                notifications:
                    [{
                        created: "2022-03-28 17:56:44.0",
                        id: 2,
                        message: {},
                        notification_type: "share_script",
                        script_name: "mondays.py",
                        sender: "user1",
                        shareid: "4444444444444444444444",
                        unread: true,
                        username: "cypress",
                    }],
            }
        )
        cy.contains("div", "SHARED SCRIPTS (2)").click()
        cy.contains("div", "mondays.py")
    })
})
