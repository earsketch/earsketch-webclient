import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand, GetSessionCommand, PutSessionCommand } from "@aws-sdk/client-lex-runtime-v2"

import * as projectModel from "./projectModel"
import { CAIMessage, setInputDisabled } from "./caiState"
import { addCAIMessage } from "./caiThunks"
import * as dialogue from "./dialogue"
import { CaiTreeNode } from "./caitree"
import { selectAllGenres, selectAllInstruments } from "../browser/soundsState"

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
        sessionId: username,
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
                const recommendationNode: CaiTreeNode = {
                    id: 150,
                    title: "Sound Recommendation",
                    utterance: "How about [sound_rec]?[WAIT|34]",
                    parameters: {},
                    options: [],
                }
                if (customMessage.genre) {
                    recommendationNode.parameters.genre = customMessage.genre.toUpperCase()
                    // Update session attribute to genre
                    const lexParams = {
                        botId: BOT_ID,
                        botAliasId: BOT_ALIAS_ID,
                        localeId: "en_US",
                        sessionId: username,
                        sessionState: {
                            sessionAttributes: {
                                requestedGenre: customMessage.genre.toUpperCase()
                            }
                        }
                    }
                    lexClient.send(new PutSessionCommand(lexParams))
                }
                if (customMessage.instrument) {
                    recommendationNode.parameters.instrument = customMessage.instrument.toUpperCase()
                    // Update session attribute to instrument
                    const lexParams = {
                        botId: BOT_ID,
                        botAliasId: BOT_ALIAS_ID,
                        localeId: "en_US",
                        sessionId: username,
                        sessionState: {
                            sessionAttributes: {
                                requestedInstrument: customMessage.instrument.toUpperCase()
                            }
                        }
                    }
                    lexClient.send(new PutSessionCommand(lexParams))
                }
                dialogue.setCurrentTreeNode(recommendationNode)
                const text = await dialogue.showNextDialogue()
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
            } else if (customMessage.type === "property_suggestion") {
                let text: [string, string[]][] = []
                if (customMessage.property === "genre") {
                    const genres = selectAllGenres(store.getState())
                    const randomGenre = genres[genres.length * Math.random()]
                    projectModel.updateModel("genre", randomGenre.toLowerCase())
                    text = await dialogue.showNextDialogue("Alright, let's do " + randomGenre + "!")
                } else if (customMessage.property === "instrument") {
                    const instruments = selectAllInstruments(store.getState())
                    const randomInstrument = instruments[instruments.length * Math.random()]
                    projectModel.updateModel("instrument", randomInstrument.toLowerCase())
                    text = await dialogue.showNextDialogue("Alright, let's do " + randomInstrument + "!")
                }
                message = {
                    sender: "CAI",
                    text: text,
                    date: Date.now(),
                } as CAIMessage
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
