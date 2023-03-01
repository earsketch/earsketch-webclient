import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand, GetSessionCommand, PutSessionCommand } from "@aws-sdk/client-lex-runtime-v2"

import { CAIMessage, setInputDisabled } from "./caiState"
import { addCAIMessage } from "./caiThunks"

import { CaiTreeNode } from "./caitree"
import * as dialogue from "./dialogue"
import * as projectModel from "./projectModel"
import { selectAllGenres, selectAllInstruments } from "../browser/soundsState"

import { handleCustomPayload } from "./dialogueNLResponses"


const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1000

let lexInitialized: boolean = false


export function makeid(length: number) {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

function createSession(username: string) {
    const lexParams = {
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: "en_US",
        sessionId: username + "_" + makeid(4),
        sessionState: {
            intent: {
                name: "Greet"
            }
        }
    }
    lexClient.send(new PutSessionCommand(lexParams))
}

export function initializeConversation(username: string) {
    createSession(username)
    nextAction(username, "Hi")
}

export function nextAction(username: string, message: any) {
    if (!lexInitialized) {
        createSession(username)
    }
    const lexParams = {
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: "en_US",
        text: message,
        sessionId: username,
    }
    lexClient.send(
        new RecognizeTextCommand(lexParams)
    ).then((response: any) => {
        if (response.messages === undefined) {
            // Simply enable input again
            store.dispatch(setInputDisabled(false))
        } else {
            // Post-process response and display it in the UI
            lexToCaiResponse(username, response)
        }
    })
}

export function updateProjectGoal(username: string) {
    if (!lexInitialized) {
        createSession(username)
    }
    const lexParams = {
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: "en_US",
        sessionId: username,
    }
    lexClient.send(new GetSessionCommand(lexParams))
}

async function lexToCaiResponse(username: string, lexResponse: any) {
    // Prevent user from sending messages while CAI is responding.
    setTimeout(() => {
        store.dispatch(setInputDisabled(false))
    }, ANTHROPOMORPHIC_DELAY * lexResponse.messages.length * 1.25)

    // Handle each user message.
    for (let i = 0; i < lexResponse.messages.length; i++) {
        const lexMessage = lexResponse.messages[i]
        let message: any = null
        if (lexMessage.contentType === "PlainText") {
            const text = await dialogue.doUtteranceReplacements(
                lexMessage.content.replaceAll("[ ", "[").replaceAll(" ]", "]")
            )
            const replacedUtterance = await dialogue.showNextDialogue(text)
            message = {
                sender: "CAI",
                text: replacedUtterance,
                date: Date.now(),
            } as CAIMessage
        } else if (lexMessage.contentType === "CustomPayload") {
            const customMessage = JSON.parse(lexMessage.content)
            message = await handleCustomPayload(customMessage, username)
        }
        // Introduce delay between successive messages.
        setTimeout(() => {
            store.dispatch(addCAIMessage([message, { remote: true }]))
        }, ANTHROPOMORPHIC_DELAY * i * 1.25)
    }
}

export async function nudgeUser() {
    const text = await dialogue.generateOutput("34", true)
    const message = {
        sender: "CAI",
        text: text,
        date: Date.now(),
    } as CAIMessage
    store.dispatch(addCAIMessage([message, { remote: true }]))
}
