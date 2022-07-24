import store from "../reducers"
import { CAIMessage } from "./caiState"
import { addCAIMessage } from "../cai/caiThunks"
import * as dialogue from "../cai/dialogue"
import * as editor from "../ide/Editor"
const { io } = require("socket.io-client")

export const IDLENESS_THRESHOLD = 999000 // in milliseconds
export let lastEventTimestamp: number = new Date().getTime()

export enum EventType {
    CHAT_MESSAGE = "chat_message",
    CURRICULUM_PAGE_VISITED = "curriculum_page_visited",
    CODE_COMPILED = "code_compiled",
    IDLE_TIMEOUT = "idle_timeout",
    PERIODIC_STATE_UPDATE = "periodic_state_update",
    UI_CLICK = "ui_click",
    _UNRESOLVED_PERIODIC_STATE_UPDATE = "unresolved_periodic_state_update",
}

const HOST: string = "http://52.23.68.230"
const RASA_PORT: number = 30036

const WS_FORWARDER_URL: string = `${HOST}:5000`
const RASA_SERVER_URL: string = `${HOST}:${RASA_PORT}`

const ANTHROPOMORPHIC_DELAY = 1000

function makeid(length: number) {
    let result = ""
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}
const CONVERSATION_ID = makeid(8) // collaboration.userName
console.log(`Using conversation ID: ${CONVERSATION_ID}`)

const socket = io.connect(WS_FORWARDER_URL)

socket.on("connect", () => {
    triggerIntent({ name: "EXTERNAL_page_load" })
})

socket.on("connect_error", (err: any) => {
    console.log(`connect_error due to ${err.message}`)
})

socket.on("bot_uttered", (...args: any[]) => {
    console.log("bot uttered")
    rasaToCaiResponse(args[0].custom)
})

function triggerIntent(message: any) {
    console.log("Triggering intent", message)
    message.sender = CONVERSATION_ID
    socket.emit("user_did", message)
    console.log("triggered")
}

export function updateDialogueState(
    eventType: EventType,
    eventParams?: any
) {
    console.log("Triggered update of type", eventType)
    const currentTimestamp = new Date().getTime()
    if (eventType === EventType._UNRESOLVED_PERIODIC_STATE_UPDATE) {
        // Change eventType to IDLE_TIMEOUT or PERIODIC_STATE_UPDATE
        // depending on the time elapsed since the last update.
        const millisSinceLastEvent = currentTimestamp - lastEventTimestamp
        console.log("currentTimestamp", currentTimestamp, "lastEventTimestamp", lastEventTimestamp, "millisSinceLastEvent", millisSinceLastEvent)
        console.log("Millis since last event", millisSinceLastEvent)
        eventType = millisSinceLastEvent > IDLENESS_THRESHOLD
            ? EventType.IDLE_TIMEOUT
            : EventType.PERIODIC_STATE_UPDATE
    }
    console.log("Resolved event type", eventType)
    switch (eventType) {
        case EventType.CURRICULUM_PAGE_VISITED:
            curriculumPageVisited(eventParams.page as number)
            break
        case EventType.PERIODIC_STATE_UPDATE:
            periodicStateUpdate()
            break
        case EventType.CODE_COMPILED:
            if ("complexity" in eventParams) { codeCompiled(eventParams.compileSuccess as boolean, eventParams.complexity) } else { codeCompiled(eventParams.compileSuccess as boolean) }
            break
        case EventType.CHAT_MESSAGE:
            sendChatMessageToNLU(eventParams.message as string)
            break
        case EventType.IDLE_TIMEOUT:
            idleTimeout()
            break
        case EventType.UI_CLICK:
            uiClicked(eventParams.uiEvent as string)
            break
    }
    if (eventType !== EventType.PERIODIC_STATE_UPDATE) {
        // Since the periodic state udpate is not triggered by the user,
        // do not reset the idleness timer.  Reset it for all other events.
        lastEventTimestamp = currentTimestamp
    }
}

function uiClicked(uiEvent: string) {
    const [uiEventType, ...uiEventParams] = uiEvent.split(" - ")
    switch (uiEventType) {
        case "project": {
            const message = {
                name: "EXTERNAL_project",
                entities: {
                    // could be either "play" or "pause"
                    es_project_action: uiEventParams[0],
                },
            }
            triggerIntent(message)
            break
        }
        case "sound":
        case "api":
            break
    }
}

let lastEditorValue: string = ""

function periodicStateUpdate() {
    // If the IDLENESS_THRESHOLD hasn't elapsed since the last event,
    // then simply send across a regular "status update" containing the
    // latest snapshot of the code (and potentially other variables of interest (TODO)).
    const message = {
        name: "EXTERNAL_status_update",
        entities: {
            es_source_code: editor.getValue(),
        },
    }
    if (message.entities.es_source_code !== lastEditorValue) {
        triggerIntent(message)
    }
    lastEditorValue = message.entities.es_source_code
}

function codeCompiled(compileSuccess: boolean, complexity?: any) {
    // If updateDialogueState was called because of a compilation event,
    // then send the latest code complexity dictionary along with the
    // source code.
    let message: any
    if (complexity == null) {
        message = {
            name: "EXTERNAL_on_compile",
            entities: {
                es_source_code: editor.getValue(),
                es_compile_success: compileSuccess,
            },
        }
    } else {
        const rasaComplexity = {
            es_lists: complexity.List,
            es_conditionals: complexity.conditionals,
            es_user_functions: complexity.userFunc,
            es_for_loops: complexity.forLoops,
            es_variables: complexity.variables,
            es_console_inputs: complexity.consoleInput,
        }
        message = {
            name: "EXTERNAL_on_compile",
            entities: {
                es_source_code: editor.getValue(),
                es_compile_success: compileSuccess,
                ...rasaComplexity,
            },
        }
    }
    triggerIntent(message)
}

function idleTimeout() {
    // If IDLENESS_THRESHOLD has elapsed since the last event, then
    // trigger an "idle" intent.
    const message = {
        name: "EXTERNAL_idle",
    }
    triggerIntent(message)
}

async function rasaToCaiResponse(rasaResponse: any) {
    if (rasaResponse.type === "node") {
        // Output an existing node from the CAI tree.
        console.log("Responding with node", rasaResponse.node_id, "from the cai tree")
        const messages = await dialogue.generateOutput(rasaResponse.node_id)
        console.log(messages)
        messages.forEach((msg: any) => {
            const message = {
                sender: "CAI",
                text: [msg],
                date: Date.now(),
            } as CAIMessage
            store.dispatch(addCAIMessage([message, { remote: true }]))
        })
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

export function curriculumPageVisited(page: any) {
    const message: any = {
        name: "EXTERNAL_curriculum_page_visited",
        entities: {
            es_curriculum_page: page,
        },
    }
    console.log("Curriculum page opened", message)
    triggerIntent(message)
}
