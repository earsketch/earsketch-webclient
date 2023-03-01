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
    let responseText: any = null

    if (customMessage.type === "node") {
        responseText = await dialogue.generateOutput(customMessage.node_id + "", true)
    } else if (customMessage.type === "text") {
        responseText = removeSquareBracketSpacing(customMessage)
    } else if (customMessage.type === "track_suggestion") {
        updateLexStateWithGenreOrInstrument(customMessage, username)
        responseText = await dialogue.showNextDialogue()
    } else if (customMessage.type === "property_suggestion") {
        responseText = await getPropertySuggestion(customMessage)
    } else if (customMessage.type == "faq_example") {
        responseText = await handleFaqExamplePayload(customMessage)
    } else {
        throw new Error("Unknown custom payload type: " + customMessage.type)
    }

    return {
        sender: "CAI",
        text: responseText,
        date: Date.now(),
    } as CAIMessage
}

async function handleFaqExamplePayload(customMessage: any) {
    const FAQ_EXAMPLES: any = {
        "fitMedia": "fitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 1, 5)",
        "for loop": "for example, this code:\r\n\r\nfor measure in range(1, 5):\r\n    makeBeat(OS_SNARE03, 1, measure, \"0---0---0-0-0---\")\r\n\r\nputs the same beat in measures 1-5 on track 1",
        "custom functions": "def sectionA(start, end):\r\n    fitMedia(melody2, 1, start, end)\r\n    fitMedia(brass1, 2, start, end)\r\n    setEffect(2, VOLUME, GAIN, -20, start, -10, end)\r\nsectionA(1,5)",
        "makeBeat": "makeBeat(DUBSTEP_FILTERCHORD_002, 1, 1, \"-00-00+++00--0-0\")\r\nmakeBeat(OS_CLOSEDHAT01, 2, 1, \"0--0--000--00-0-\")",
        "conditional": "a = readInput(\"Do you like hip-hop music? Yes\/No.\")\r\n\r\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\"):\r\n    print(\"Hip-hop it is!\")\r\n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9)\r\nelse:\r\n    print(\"Ok, here is some funk.\")\r\nfitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9)",
        "userInput": "answer = readInput(\"What tempo would you like for your music? Choose a number between 45 and 220\")\r\n# converting to a number\r\ntempo = int(answer)\r\n\r\n# setting the tempo\r\nsetTempo(tempo)",
        "setEffect": "something like setEffect(1, VOLUME, GAIN, 2)",
        "setTempo": "for example\r\nsetTempo(120)\r\nsets the tempo to 120"
    }
    return dialogue.processUtterance(FAQ_EXAMPLES[customMessage.FAQType])
}

function removeSquareBracketSpacing(customMessage: any) {
    return dialogue.processUtterance(
        customMessage.text.replaceAll("[ ", "[").replaceAll(" ]", "]")
    )
}

async function getPropertySuggestion(customMessage: any) {
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
    return text
}

function updateLexStateWithGenreOrInstrument(customMessage: any, username: string) {
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
}
