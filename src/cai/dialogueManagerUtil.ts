import store from "../reducers"
import { CAIMessage } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"
const {io} = require("socket.io-client")
import * as projectModel from "./projectModel"


const ROOT_IP: string = "52.23.68.230"
const WS_FORWARDER_URL: string = `http://${ROOT_IP}:5000`
const RASA_SERVER_URL: string = `http://${ROOT_IP}:30036`
const CONVERSATION_ID: string = makeid(8) //selectUserName(store.getState())
const ANTHROPOMORPHIC_DELAY: number = 1500

let pageLoadCounter: number = 0

export const socket = io.connect(WS_FORWARDER_URL)
socket.on("connect", () => {
    // Add an initial timeout so that the first message doesn't get missed.
    setTimeout(() => {
        if (pageLoadCounter == 0) {
            triggerIntent({ name: "EXTERNAL_page_load" })
            pageLoadCounter += 1
        }
    }, 3500)
})
socket.on("connect_error", (err: any) => {
    console.log(`connect_error due to ${err.message}`)
})
socket.on("bot_uttered", (...args: any[]) => {
    console.log("bot uttered")
    rasaToCaiResponse(args[0].custom)
})


export function makeid(length: number) {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

export function triggerIntent(message: any) {
    message.sender = CONVERSATION_ID
    socket.emit("user_did", message)
}

export function _updateESDialogueState() {
    fetch(`${RASA_SERVER_URL}/conversations/${CONVERSATION_ID}/tracker?token=rasaToken`, {
        method: "GET",
        headers: {
            mode: "cors",
        },
    })
    .then(response => response.json())
    .then(rasaResponse => {
        projectModel.updateModel("instruments", rasaResponse.slots.goal_instruments)
        projectModel.updateModel("genre", rasaResponse.slots.goal_genres)
        console.log("Updated ES state from Rasa")
    })
}

export function sendChatMessageToNLU(messageText: string) {
    const message: any = {
        message: messageText,
        sender: CONVERSATION_ID,
    }
    fetch(`${RASA_SERVER_URL}/webhooks/rest/webhook`, {
        method: "POST",
        headers: {
            mode: "cors",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
    })
        .then(response => response.json())
        .then(rasaResponse => {
            console.log("Received NLU response", rasaResponse)
            rasaResponse.forEach((utt: any, idx: number) => {
                setTimeout(() => rasaToCaiResponse(utt.custom), ANTHROPOMORPHIC_DELAY * (idx + 1))
            })
        })
}

async function rasaToCaiResponse(rasaResponse: any) {
    let text = null
    if(rasaResponse.type === "node") {
        // Output an existing node from the CAI tree
        text = await dialogue.generateOutput(rasaResponse.node_id)
    } else if(rasaResponse.type == "text") {
        // Output raw plaintext 
        text = [["plaintext", [rasaResponse.text]]]
    } else {
        console.log("Unknown response type from Rasa: " + rasaResponse.type)
        return
    }
    const message = {
        sender: "CAI",
        text: text,
        date: Date.now(),
    } as CAIMessage
    store.dispatch(addCAIMessage([message, { remote: true }]))
}

export function nudgeUser() {
    const message = {
        sender: "CAI",
        text: [["plaintext", ["Are you still there?"]]],
        date: Date.now(),
    } as CAIMessage
    store.dispatch(addCAIMessage([message, { remote: true }]))
}
