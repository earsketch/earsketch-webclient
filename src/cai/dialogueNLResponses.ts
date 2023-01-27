import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand, GetSessionCommand, PutSessionCommand } from "@aws-sdk/client-lex-runtime-v2"

import { selectAllGenres, selectAllInstruments } from "../browser/soundsState"
import * as projectModel from "./projectModel"
import { CaiTreeNode } from "./caitree"
import * as dialogue from "./dialogue"
import { CAIMessage, setInputDisabled } from "./caiState"


const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"


export async function handleCustomPayload(customMessage: any, username: string) {
    let message: CAIMessage
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