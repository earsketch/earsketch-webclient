import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand } from "@aws-sdk/client-lex-runtime-v2"

import { CAIMessage, setInputDisabled } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"
import { GetSessionCommand } from "@aws-sdk/client-lex-runtime-v2"


const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1000

const INSTRUMENT_REC_NODES: any = {
    "Bass": 37,
    "Drums": 38,
    "Piano": 40,
    "Keyboard": 40,
    "SFX": 41,
    "Strings": 42,
    "Synth": 43,
    "Vocal": 44,
    "Winds": 45,
}

const GENRE_REC_NODES: any = {
    "Alt Pop": 46,
    "Cinematic Scores": 47,
    "Dubstep": 48,
    "EDM": 49,
    "Funk": 52,
    "Gospel": 54,
    "Hip Hop": 55,
    "House": 56,
    "Pop": 59,
    "RNB": 60,
    "Rock": 62,
    "World": 67,
    "Orchestral": 107,
    "Latin": 106,
    "Makebeat": 105,
    "Reggaeton": 104
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
        if (response.messages == undefined) {
            // Do nothing and listen
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
        sessionId: username
    }
    lexClient.send(new GetSessionCommand(lexParams)).then((response: any) => {
        // console.log(response.sessionState)
    })
    // fetch(`${RASA_SERVER_URL}/conversations/${selectUserName(store.getState())}/tracker?token=rasaToken`, {
    //     // fetch(`${RASA_SERVER_URL}/rasa/tracker?conversation_id=${selectUserName(store.getState())}`, {
    //     method: "GET",
    //     headers: {
    //         mode: "cors",
    //     },
    // })
    //     .then(response => response.json())
    //     .then(rasaResponse => {
    //         projectModel.updateModel("instruments", rasaResponse.slots.goal_instruments)
    //         projectModel.updateModel("genre", rasaResponse.slots.goal_genres)
    //         console.log("Updated ES state from Rasa")
    //     })

}

async function lexToCaiResponse(lexResponse: any) {
    const testNode = dialogue.generateOutput("33")
    console.log(testNode)
    for (let i = 0; i < lexResponse.messages.length; i++) {
        const lexMessage = lexResponse.messages[i]
        let message: any = null
        if (lexMessage.contentType == "PlainText") {
            message = {
                sender: "CAI",
                text: dialogue.processUtterance(lexMessage.content),
                date: Date.now(),
            } as CAIMessage
        } else if (lexMessage.contentType == "CustomPayload") {
            const customMessage = JSON.parse(lexMessage.content)
            if (customMessage.type == "node") {
                const text = await dialogue.generateOutput(customMessage.node_id + "")
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type == "text") {
                const text = lexMessage.content.replace("[ ", "[").replace(" ]", "]")
                message = {
                    sender: "CAI",
                    text: dialogue.processUtterance(text),
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type == "track_suggestion") {
                let text: any = null
                if (customMessage.genre == undefined && customMessage.instrument == undefined) {
                    // Open-ended
                    text = await dialogue.generateOutput("73")
                } else if (customMessage.genre == undefined) {
                    // Suggest based on instrument
                    text = await dialogue.generateOutput(INSTRUMENT_REC_NODES[customMessage.instrument as string] + "")
                } else if (customMessage.instrument == undefined) {
                    // Suggest based on genre
                    text = await dialogue.generateOutput(GENRE_REC_NODES[customMessage.genre as string] + "")
                } else {
                    // Suggest based on genre OR instrument
                    text = await dialogue.generateOutput(GENRE_REC_NODES[customMessage.genre as string] + "")
                }
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
            } else {
                console.log("Unkown custom message type")
            }
        }
        setTimeout(() => {
            store.dispatch(addCAIMessage([message, { remote: true }]))
            if (i === lexResponse.messages.length - 1) {
                store.dispatch(setInputDisabled(false))
            }
        }, ANTHROPOMORPHIC_DELAY * i * 1.25)
    }
}

export async function nudgeUser() {
    const text = await dialogue.generateOutput("34")
    const message = {
        sender: "CAI",
        text: text,
        date: Date.now(),
    } as CAIMessage
    store.dispatch(addCAIMessage([message, { remote: true }]))
}
