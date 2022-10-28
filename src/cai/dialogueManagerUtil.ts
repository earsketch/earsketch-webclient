import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand, GetSessionCommand, PutSessionCommand } from "@aws-sdk/client-lex-runtime-v2"

import * as projectModel from "./projectModel"
import { CAIMessage, setInputDisabled } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"
import { USERNAME } from "./dialogueManager"

const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1000

const INSTRUMENT_REC_NODES: any = {
    "bass": 37,
    "drums": 38,
    "piano": 40,
    "keyboard": 40,
    "sfx": 41,
    "strings": 42,
    "synth": 43,
    "vocal": 44,
    "winds": 45,
}

const GENRE_REC_NODES: any = {
    "alt pop": 46,
    "cinematic scores": 47,
    "dubstep": 48,
    "edm": 49,
    "funk": 52,
    "gospel": 54,
    "hip hop": 55,
    "house": 56,
    "pop": 59,
    "rnb": 60,
    "rock": 62,
    "world": 67,
    "orchestral": 107,
    "latin": 106,
    "makebeat": 105,
    "reggaeton": 104
}

export function makeid(length: number) {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

export function initializeConversation(username: string) {
    const lexParams = {
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: "en_US",
        sessionId: username,
        sessionState: {
            intent: {
                name: "Greet"
            }
        }
    }
    lexClient.send(new PutSessionCommand(lexParams))
}

export function nextAction(username: string, message: any) {
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
            lexToCaiResponse(response)
        }
    })
}

export function updateProjectGoal(username: string) {
    const lexParams = {
        botId: BOT_ID,
        botAliasId: BOT_ALIAS_ID,
        localeId: "en_US",
        sessionId: username,
    }
    lexClient.send(new GetSessionCommand(lexParams))
}

function suggestRandomGenre() {
    const genres = Object.keys(GENRE_REC_NODES)
    return genres[Math.floor(Math.random() * genres.length)]
}

function suggestRandomInstrument() {
    const instruments = Object.keys(INSTRUMENT_REC_NODES)
    return instruments[Math.floor(Math.random() * instruments.length)]
}

async function lexToCaiResponse(lexResponse: any) {
    console.log(lexResponse.messages.length)
    setTimeout(() => {
        store.dispatch(setInputDisabled(false))
    }, ANTHROPOMORPHIC_DELAY * lexResponse.messages.length * 1.25)
    for (let i = 0; i < lexResponse.messages.length; i++) {
        const lexMessage = lexResponse.messages[i]
        let message: any = null
        if (lexMessage.contentType === "PlainText") {
            const text = lexMessage.content.replaceAll("[ ", "[").replaceAll(" ]", "]")
            const text2 = await dialogue.showNextDialogue(text)
            message = {
                sender: "CAI",
                text: text2,
                date: Date.now(),
            } as CAIMessage
        } else if (lexMessage.contentType === "CustomPayload") {
            const customMessage = JSON.parse(lexMessage.content)
            if (customMessage.type === "node") {
                const text = await dialogue.generateOutput(customMessage.node_id + "", true)
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type === "text") {
                const text = customMessage.text.replaceAll("[ ", "[").replaceAll(" ]", "]")
                message = {
                    sender: "CAI",
                    text: dialogue.processUtterance(text),
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type === "track_suggestion") {
                let text: any = null
                if (customMessage.genre === undefined && customMessage.instrument === undefined) {
                    // Open-ended
                    text = await dialogue.generateOutput("4", true)
                } else if (customMessage.genre === undefined) {
                    // Suggest based on instrument
                    const nodeId = INSTRUMENT_REC_NODES[customMessage.instrument.toLowerCase() as string]
                    text = await dialogue.generateOutput(nodeId + "", true)
                    console.log(text)
                } else if (customMessage.instrument == undefined) {
                    // Suggest based on genre
                    text = await dialogue.generateOutput(GENRE_REC_NODES[customMessage.genre.toLowerCase() as string] + "", true)
                } else {
                    // Suggest based on genre OR instrument
                    text = await dialogue.generateOutput(GENRE_REC_NODES[customMessage.genre.toLowerCase() as string] + "", true)
                }
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type === "property_suggestion") {
                if (customMessage.property === "genre") {
                    const randomGenre = suggestRandomGenre()
                    projectModel.updateModel("genre", randomGenre.toLowerCase())
                    const text = await dialogue.showNextDialogue("Alright, let's do " + randomGenre + "!")
                    message = {
                        sender: "CAI",
                        text: text,
                        date: Date.now(),
                    } as CAIMessage
                } else if (customMessage.property === "instrument") {
                    const randomInstrument = suggestRandomInstrument()
                    projectModel.updateModel("instrument", randomInstrument.toLowerCase())
                    const text = await dialogue.showNextDialogue("Alright, let's do " + randomInstrument + "!")
                    message = {
                        sender: "CAI",
                        text: text,
                        date: Date.now(),
                    } as CAIMessage
                }
            } else if (customMessage.type === "set_goal") {
                if (customMessage.genre !== undefined) {
                    projectModel.updateModel("genre", customMessage.genre.toLowerCase())
                } else if (customMessage.instrument !== undefined) {
                    projectModel.updateModel("instrument", customMessage.instrument.toLowerCase())
                }
            } else {
                console.log("Unkown custom message type")
            }
        }
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
