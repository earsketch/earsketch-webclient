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
const ANTHROPOMORPHIC_DELAY: number = 1000

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
    .then((res: any) => {
        res.json().slots.forEach((slot: any) => {
            if (slot.slot_name === "code_structure") {
                projectModel.updateModel("code structure", slot.slot_value)
            } else if (slot.slot_name === "musical_form") {
                projectModel.updateModel("form", slot.slot_value)
            } else if (slot.slot_name === "genre") {
                projectModel.updateModel("genre", slot.slot_value)
            }
        })
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
    if (rasaResponse.type === "node") {
        // Output an existing node from the CAI tree.
        console.log("Responding with node", rasaResponse.node_id, "from the cai tree")
        const message = await dialogue.generateOutput(rasaResponse.node_id)
        const outputMessage = {
            sender: "CAI",
            text: message,
            date: Date.now(),
        } as CAIMessage
        store.dispatch(addCAIMessage([outputMessage, { remote: true }]))
    } else if (rasaResponse.type == "slot") {
        // Receive dialogue state update from Rasa
        console.log("Received slot update", rasaResponse.slot_name, ":", rasaResponse.slot_value)
    } else if (rasaResponse.type === "text") {
        // Output raw plaintext.
        const message = {
            sender: "CAI",
            text: [["plaintext", [rasaResponse.text]]],
            date: Date.now(),
        } as CAIMessage
        console.log("Final", message)
        store.dispatch(addCAIMessage([message, { remote: true }]))
    }
}
