import "cypress-file-upload"

const API_HOST = "api-dev.ersktch.gatech.edu"
const TEST_USER = "cypress"

// WebSocket: visitWithStubWebSocket and incomingWebSocketMessage
// To use, test cases should initialize the ws server first:
//     `describe("test", () => { const wsServer = "wss://api-url-here/socket/endpoint" ... }`
Cypress.Commands.add("visitWithStubWebSocket", (path, MockWebSocketConstructor) => {
    // Replacement for cy.visit(url) that enables the mock websocket
    cy.visit(path, {
        onBeforeLoad(win) {
            // We pass in the MockSocket module, as "import ... mock-socket" is not working
            cy.stub(win, "WebSocket", (url) => new MockWebSocketConstructor(url))
        },
    })
})

Cypress.Commands.add("incomingWebSocketMessage", (wsServer, message) => {
    // Send a message to the client from the mock websocket server
    cy.wrap(wsServer).then((connection) => {
        message =
            message.constructor.name === "Object" ? JSON.stringify(message) : message
        connection.send(message)
    })
})

Cypress.Commands.add("login", (username = TEST_USER) => {
    // login with mock responses
    cy.get("button").contains("Skip").click()
    cy.get("input[name='username']").type(username)
    cy.get("input[name='password']").type("not_a_real_password")
    cy.get("button[title='Login']").click()
})

Cypress.Commands.add("interceptAudioStandard", (standardAudioLibrary = [
    {
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
    },
]) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/audio/standard",
        },
        {
            body: standardAudioLibrary,
        }
    ).as("audio_standard")
})

Cypress.Commands.add("interceptUsersToken", () => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/users/token",
        },
        { body: "1111111111111111111111111111111111111111111111111111111111111111" }
    ).as("users_token")
})

Cypress.Commands.add("interceptUsersInfo", (username = TEST_USER) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/users/info*", // accounts for "?" append to end
        },
        { body: { created: "2019-04-22 16:13:06.0", email: "", isAdmin: true, username: username } }
    ).as("users_info")
})

Cypress.Commands.add("interceptAudioUser", (userAudio = []) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/audio/user?username=*",
        },
        { body: userAudio }
    ).as("audio_user")
})

Cypress.Commands.add("interceptAudioFavorites", (favorites) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/audio/favorites*", // accounts for "?" append to end
        },
        { body: favorites }
    ).as("audio_favorites")
})

Cypress.Commands.add("interceptAudioUpload", () => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "POST",
            path: "/EarSketchWS/audio/upload",
        },
        { statusCode: 204 }
    ).as("audio_upload")
})

Cypress.Commands.add("interceptScriptsOwned", (scripts = []) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/scripts/owned",
        },
        {
            body: scripts,
        }
    ).as("scripts_owned")
})

Cypress.Commands.add("interceptScriptsShared", (sharedScripts = []) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/scripts/shared",
        },
        {
            body: sharedScripts,
        }
    ).as("scripts_shared")
})

Cypress.Commands.add("interceptAudioMetadata", (testSoundMeta) => {
    cy.intercept(
        { method: "GET", hostname: API_HOST, path: "/EarSketchWS/audio/metadata?name=*" },
        { body: testSoundMeta }
    ).as("audio_metadata")
})

Cypress.Commands.add("interceptAudioSample", () => {
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
})

Cypress.Commands.add("interceptScriptSave", (scriptName, responsePayload = {
    created: "2022-04-06 14:53:07.0",
    file_location: "",
    id: -1,
    modified: "2022-04-06 14:53:07.0",
    name: scriptName,
    run_status: 0,
    shareid: "5555555555555555555555",
    soft_delete: false,
    source_code: "#\t\tpython code\n#\t\tscript_name:\n#\n#\t\tauthor:\n#\t\tdescription:\n#\n\nfrom earsketch import *\n\ninit()\nsetTempo(120)\n\n\n\nfinish()\n",
    username: "cypress",
}) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "POST",
            path: "/EarSketchWS/scripts/save",
        },
        {
            body: responsePayload,
        }
    ).as("scripts_save")
})

Cypress.Commands.add("toggleCurriculumLanguage", () => {
    cy.get("button[title='Switch script language to javascript']").click()
    // Now we need to verify this
    cy.get("button").contains("Welcome Students and Teachers!").click()
    cy.get("button[title='Expand ']").eq(1).click()
    cy.contains("a", "Loops and Layers").click()
})
