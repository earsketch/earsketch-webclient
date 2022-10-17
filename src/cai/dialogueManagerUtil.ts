import { LexRuntimeV2Client, RecognizeUtteranceCommand } from "@aws-sdk/client-lex-runtime-v2"

import store from "../reducers"

import { selectUserName } from "../user/userState"
import * as projectModel from "./projectModel"

import { CAIMessage } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"


const { io } = require("socket.io-client")

const LEX = new LexRuntimeV2Client({ region: "us-east-1" })
const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1500


triggerIntent({ name: "restart" })
triggerIntent({ name: "EXTERNAL_PageLoad" })


export function triggerIntent(message: any) {
    message.sender = selectUserName(store.getState())
}

export function _updateESDialogueState() {
    
}

export async function sendChatMessageToNLU(messageText: string) {
    const message: any = {
        message: messageText,
        sender: selectUserName(store.getState()),
    }
    const command = new RecognizeUtteranceCommand(message)
    const response = await LEX.send(command)
}

async function rasaToCaiResponse(rasaResponse: any) {
    // const message = {
    //     sender: "CAI",
    //     text: text,
    //     date: Date.now(),
    // } as CAIMessage
    // store.dispatch(addCAIMessage([message, { remote: true }]))
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
