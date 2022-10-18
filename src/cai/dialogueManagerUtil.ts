import store from "../reducers"

import { lexClient } from "./lexClient"
import { RecognizeTextCommand } from "@aws-sdk/client-lex-runtime-v2"

import { selectUserName } from "../user/userState"

import { CAIMessage } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"


const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1000


export function nextAction(username: any, message: any) {
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

export function _updateESDialogueState() {

}

async function lexToCaiResponse(lexResponse: any) {
    lexResponse.messages.forEach((lexMessage: any) => {
        setTimeout(() => {
            if (lexMessage.contentType == "PlainText") {
                const message = {
                    sender: "CAI",
                    text: dialogue.processUtterance(lexMessage.content),
                    date: Date.now(),
                } as CAIMessage
                store.dispatch(addCAIMessage([message, { remote: true }]))
            } else if (lexMessage.contentType == "CustomPayload") {
                const customMessage = JSON.parse(lexMessage.content)
                if (customMessage.type == "node") {
                    const text = dialogue.generateOutput(customMessage.nodeId)
                    const message = {
                        sender: "CAI",
                        text: text,
                        date: Date.now(),
                    } as CAIMessage
                    store.dispatch(addCAIMessage([message, { remote: true }]))
                } else {
                    console.log("Unkown custom message type")
                }
            }
        }, ANTHROPOMORPHIC_DELAY)
    })
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
