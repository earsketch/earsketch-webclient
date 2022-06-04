import store from "../reducers"
import * as cai from "../cai/caiState"
import * as dialogue from "../cai/dialogue"
import * as editor from "../ide/Editor"
import * as student from "../cai/student"
import * as collaboration from "../app/collaboration"

export const IDLENESS_THRESHOLD = 30000 // in milliseconds
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

const RASA_SERVER_URL: string = "http://localhost:5005"

function triggerIntent(message: any) {
    console.log("Triggering intent", message)
    fetch(`${RASA_SERVER_URL}/conversations/${collaboration.userName}/trigger_intent`, {
        method: "POST",
        headers: {
            "mode": "cors",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
}

export function updateDialogueState(
    eventType: EventType,
    eventParams?: any
) {
    console.log("Triggered update of type", eventType)
    const currentTimestamp = new Date().getTime()
    if (eventType == EventType._UNRESOLVED_PERIODIC_STATE_UPDATE) {
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
            if ("complexity" in eventParams)
                codeCompiled(eventParams.compileSuccess as boolean, eventParams.complexity)
            else
                codeCompiled(eventParams.compileSuccess as boolean)
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
    if (eventType != EventType.PERIODIC_STATE_UPDATE) {
        // Since the periodic state udpate is not triggered by the user,
        // do not reset the idleness timer.  Reset it for all other events.
        lastEventTimestamp = currentTimestamp
    }
}

function uiClicked(uiEvent: string) {
    let intent: string
    let entities: any
    let [uiEventType, ...uiEventParams] = uiEvent.split(" - ")
    switch (uiEventType) {
        case "project":
            const message = {
                intent: "EXTERNAL_project",
                entities: {
                    // could be either "play" or "pause"
                    project_action: uiEventParams[0]
                }
            }
            triggerIntent(message)
            break
        case "sound":
        case "api":
            break
    }
}

function periodicStateUpdate() {
    // If the IDLENESS_THRESHOLD hasn't elapsed since the last event,
    // then simply send across a regular "status update" containing the
    // latest snapshot of the code (and potentially other variables of interest (TODO)).
    const message = {
        name: "EXTERNAL_status_update",
        entities: {
            source_code: editor.getValue(),
        }
    }
    triggerIntent(message)
}

function codeCompiled(compileSuccess: boolean, complexity?: any) {
    console.log("Compile success", compileSuccess)
    // If updateDialogueState was called because of a compilation event,
    // then send the latest code complexity dictionary along with the
    // source code.
    const rasaComplexity = {
        lists: complexity.List,
        conditionals: complexity.conditionals,
        user_functions: complexity.userFunc,
        for_loops: complexity.forLoops,
        variables: complexity.variables,
        console_inputs: complexity.consoleInput
    }
    const message = {
        name: "EXTERNAL_compile",
        entities: {
            source_code: editor.getValue(),
            ...rasaComplexity
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

function rasaToCaiResponse(rasaResponse: any) {
    if (rasaResponse.type == "node") {
        // Output an existing node from the CAI tree.
        console.log("Responding with node", rasaResponse.node_id, "from the cai tree")
        dialogue.generateOutput(rasaResponse.node_id)
    } else if (rasaResponse.type == "text") {
        // Output raw plaintext.
        const message = {
            sender: "CAI",
            text: [["plaintext", [rasaResponse.text]]],
            date: Date.now()
        } as cai.CAIMessage
        console.log("Final", message);
        store.dispatch(cai.addCAIMessage([message, true]));
    }
}

export function sendChatMessageToNLU(messageText: string) {
    const message: any = {
        message: messageText,
        sender: collaboration.userName
    }
    fetch(`${RASA_SERVER_URL}/webhooks/rest/webhook`, {
        method: "POST",
        headers: {
            "mode": "cors",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
        .then(response => response.json())
        .then(rasaResponse => {
            console.log("Received NLU response", rasaResponse)
            rasaResponse.forEach((utt: any) => {
                rasaToCaiResponse(utt.custom)
            })
        });
}

export function curriculumPageVisited(page: any) {
    const message: any = {
        name: "EXTERNAL_curriculum_page_visited",
        entities: {
            curriculum_page: page
        }
    }
    console.log("Curriculum page opened", message)
    fetch(`${RASA_SERVER_URL}/conversations/${collaboration.userName}/trigger_intent`, {
        method: "POST",
        headers: {
            "mode": "cors",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
}
