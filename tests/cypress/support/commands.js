import "cypress-file-upload"
import { makeSearchDoc, makeTOC } from "./curriculum"

const API_HOST = "api-dev.ersktch.gatech.edu"
const TEST_USER = "cypress"
const CLOUDFRONT_HOST = "earsketch-test.ersktch.gatech.edu"

/**
 * @memberOf cy
 * @method visitWithStubWebSocket
 * @param path
 * @param MockWebSocketConstructor
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method incomingWebSocketMessage
 * @param wsServer
 * @param message
 * @returns Chainable
 */
Cypress.Commands.add("incomingWebSocketMessage", (wsServer, message) => {
    // Send a message to the client from the mock websocket server
    cy.wrap(wsServer).then((connection) => {
        message =
            message.constructor.name === "Object" ? JSON.stringify(message) : message
        connection.send(message)
    })
})

/**
 * @memberof cy
 * @method waitForHeadlessDialog
 * @returns Chainable
 */
Cypress.Commands.add("waitForHeadlessDialog", () => {
    cy.get("div[id^='headlessui-dialog-']", { timeout: 10000 }).should("not.exist")
})

/**
 * @memberOf cy
 * @method skipTour
 * @returns Chainable
 */
Cypress.Commands.add("skipTour", () => {
    cy.get("body").find("button").contains("Skip").click()
    // wait for the quick tour modal to disappear
    cy.contains("h2", "Quick tour page 0 out of 10", { timeout: 10000 }).should("not.exist")
    cy.waitForHeadlessDialog()
})

/**
 * @memberOf cy
 * @method createScript
 * @param scriptName
 * @returns Chainable
 */
Cypress.Commands.add("createScript", (scriptName) => {
    // Create a new script.
    cy.get('[title="Open SCRIPTS Tab"]').click()
    cy.get('[data-test="newScript"]').click()
    cy.get("#scriptName").type(scriptName)
    cy.get("input").contains("CREATE").click()
    // wait for modal to disappear
    cy.get("#scriptName", { timeout: 10000 }).should("not.exist")
    cy.get("div[id^='headlessui-dialog-']", { timeout: 10000 }).should("not.exist")
})

/**
 * @memberOf cy
 * @method login
 * @param [username=cypress]
 * @returns Chainable
 */
Cypress.Commands.add("login", (username = TEST_USER) => {
    // login with mock responses
    cy.get("input[name='username']").type(username)
    cy.get("input[name='password']").type("not_a_real_password")
    cy.get("button[title='Login']").click()

    // wait for login to finish
    cy.get("button[title='Login']", { timeout: 15000 }).should("not.exist")
})

/**
 * @memberOf cy
 * @method interceptAudioStandard
 * @param [standardAudioLibrary=DUBSTEP_BASS_WOBBLE_002]
 * @returns Chainable
 */
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
            hostname: CLOUDFRONT_HOST,
            method: "GET",
            path: "/backend-static/audio-standard.json",
        },
        {
            body: standardAudioLibrary,
        }
    ).as("audio_standard")
})

/**
 * @memberOf cy
 * @method interceptFreesoundSearch
 * @returns Chainable
 */
Cypress.Commands.add("interceptFreesoundSearch", () => {
    cy.fixture("freesound.json").then(results => {
        cy.intercept(
            { method: "GET", hostname: API_HOST, path: "/EarSketchWS/audio/freesound/search?query=*" },
            { body: results }
        )
    })
})

/**
 * @memberOf cy
 * @method interceptUsersToken
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptUsersInfo
 * @param [username=cypress]
 * @returns Chainable
 */
Cypress.Commands.add("interceptUsersInfo", (username = TEST_USER) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/users/info*", // accounts for "?" append to end
        },
        { body: { created: "2019-04-22 16:13:06.0", email: "", isAdmin: true, username } }
    ).as("users_info")
})

/**
 * @memberOf cy
 * @method interceptAudioUser
 * @param [userAudio=[]]
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptAudioFavorites
 * @param favorites
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptAudioUpload
 * @returns Chainable
 */
/**
 * @memberOf cy
 * @method interceptAudioRename
 * @returns Chainable
 */
/**
 * @memberOf cy
 * @method interceptAudioDelete
 * @returns Chainable
 */
for (const tag of ["upload", "rename", "delete"]) {
    Cypress.Commands.add("interceptAudio" + tag[0].toUpperCase() + tag.slice(1), () => {
        cy.intercept(
            {
                hostname: API_HOST,
                method: "POST",
                path: "/EarSketchWS/audio/" + tag,
            },
            { statusCode: 204 }
        ).as("audio_" + tag)
    })
}

/**
 * @memberOf cy
 * @method interceptScriptsOwned
 * @param [scripts=[]]
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptScriptsShared
 * @param [sharedScripts=[]]
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptScriptById
 * @param script
 * @returns Chainable
 */
Cypress.Commands.add("interceptScriptById", (script) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "GET",
            path: "/EarSketchWS/scripts/byid?scriptid=*",
        },
        {
            body: script,
        }
    ).as("scripts_by_id")
})

/**
 * @memberOf cy
 * @method interceptAudioMetadata
 * @param testSoundMeta
 * @returns Chainable
 */
Cypress.Commands.add("interceptAudioMetadata", (testSoundMeta) => {
    cy.intercept(
        { method: "GET", hostname: API_HOST, path: "/EarSketchWS/audio/metadata?name=*" },
        { body: testSoundMeta }
    ).as("audio_metadata")
})

/**
 * @memberOf cy
 * @method interceptAudioSample
 * @returns Chainable
 */
Cypress.Commands.add("interceptAudioSample", () => {
    cy.fixture("clink.wav", "binary").then((audio) => {
        const audioArray = Uint8Array.from(audio, c => c.charCodeAt(0))

        cy.intercept(
            { method: "GET", hostname: CLOUDFRONT_HOST, path: "/backend-static/standard-library/**" },
            {
                headers: { "Content-Type": "application/octet-stream" },
                body: audioArray.buffer,
            }
        ).as("audio_sample")
    })
})

/**
 * @memberOf cy
 * @method interceptScriptSave
 * @param scriptName
 * @param [responsePayload]
 * @returns Chainable
 */
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

/**
 * @memberOf cy
 * @method interceptUsersEdit
 * @returns Chainable
 */
Cypress.Commands.add("interceptUsersEdit", () => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "POST",
            path: "/EarSketchWS/users/edit",
        },
        {}
    ).as("users_edit")
})

/**
 * @memberOf cy
 * @method interceptModifyPassword
 * @param userPassword
 * @param [responsePayload]
 * @returns Chainable
 */
Cypress.Commands.add("interceptModifyPassword", (userPassword, responsePayload = {
    password: userPassword,
}) => {
    cy.intercept(
        {
            hostname: API_HOST,
            method: "POST",
            path: "/EarSketchWS/users/modifypwd",
        },
        {
            body: responsePayload,
        }
    ).as("users_modifypwd")
})

/**
 * @memberOf cy
 * @method toggleCurriculumLanguage
 * @returns Chainable
 */
Cypress.Commands.add("toggleCurriculumLanguage", () => {
    cy.get("button[title='Switch script language to javascript']").realClick()
    cy.get("button[title='Switch script language to javascript']", { timeout: 10000 }).should("not.exist")
    // Now we need to verify this
    cy.get("button").contains("Welcome Students and Teachers!").click()
    cy.get("button[title='Expand Unit']").first().click()
    cy.contains("a", "Get Started with EarSketch").click()
})

/**
 * @memberOf cy
 * @method interceptCurriculumTOC
 * @returns Chainable
 */
Cypress.Commands.add("interceptCurriculumTOC", () => {
    cy.intercept(
        { method: "GET", path: "/curriculum/*/curr_toc.json" }, (req) => {
            const locale = req.url.split("/")[4]
            req.reply(makeTOC(locale))
        }
    ).as("getCurriculumTOC")

    cy.intercept(
        { method: "GET", path: "/curriculum/*/curr_searchdoc.json" }, (req) => {
            const locale = req.url.split("/")[4]
            req.reply(makeSearchDoc(locale))
        }
    ).as("getCurriculumSearchDoc")
})

/**
 * @memberOf cy
 * @method interceptCurriculumContent
 * @returns Chainable
 */
Cypress.Commands.add("interceptCurriculumContent", () => {
    cy.intercept(
        { method: "GET", path: "/curriculum/*/*/*.html" }, (req) => {
            const filename = req.url.substring(req.url.lastIndexOf("/") + 1).replace(".html", "")
            const locale = req.url.split("/")[4]
            let sectionBody = `
          <div class="sect2"><h3>Test Section Title 1</h3>from locale ${locale}</div>
          <div class="sect2"><h3>Test Section Title 2</h3>from locale ${locale}</div>
          <div class="sect2"><h3>Test Section Title 3</h3>from locale ${locale}</div>`

            if (filename.startsWith("welcome") || filename.startsWith("unit-")) {
                sectionBody = "Landing page body for " + filename
            }

            const body = `
            <html>
            <head></head>
            <body>
              <div class="sect1"><h2>${filename}</h2>
                ${sectionBody}
              </div>
            </body>
            </html>`
            req.reply(body)
        }
    ).as("getCurriculumContent")

    cy.fixture("getting-started.html").then(gettingStarted => {
        cy.intercept(
            { method: "GET", path: "/curriculum/*/*/getting-started.html" },
            { body: gettingStarted }
        ).as("getCurriculumGettingStarted")
    })
})
