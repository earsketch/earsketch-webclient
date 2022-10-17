import store from "../reducers"

import { lexClient } from "./lexClient"
import { selectUserName } from "../user/userState"

import { CAIMessage } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"


const BOT_ID = "QKH15P7P87"
const BOT_ALIAS_ID = "2G52T4MCQ0"

const ANTHROPOMORPHIC_DELAY: number = 1500

// const USERNAME: any = selectUserName(store.getState())


export function triggerIntent(message: any) {
    message.sender = "sd"
}

window.addEventListener("load", () => {
    triggerIntent({ name: "restart" })
    triggerIntent({ name: "EXTERNAL_PageLoad" })
})

export function _updateESDialogueState() {
    
}

export async function sendChatMessageToNLU(messageText: string) {
    const message: any = {
        message: messageText,
        sender: selectUserName(store.getState()),
    }
    
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
