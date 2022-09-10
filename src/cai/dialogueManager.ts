import * as editor from "../ide/Editor"
import { sendChatMessageToNLU, triggerIntent, _updateESDialogueState } from "./dialogueManagerUtil"


export enum EventType {
    CHAT_MESSAGE = "chat_message",
    CURRICULUM_PAGE_VISITED = "curriculum_page_visited",
    CODE_COMPILED = "code_compiled",
    IDLE_TIMEOUT = "idle_timeout",
    PERIODIC_STATE_UPDATE = "periodic_state_update",
    UI_CLICK = "ui_click",
    _UNRESOLVED_PERIODIC_STATE_UPDATE = "unresolved_periodic_state_update",
}

const IDLENESS_THRESHOLD = 999000 // in milliseconds

let lastEditorValue: string = ""
let lastEventTimestamp: number = new Date().getTime()


export function updateRasaDialogueState(
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
            if ("complexity" in eventParams) {
                codeCompiled(eventParams.compileSuccess as boolean, eventParams.complexity)
            } else {
                codeCompiled(eventParams.compileSuccess as boolean)
            }
            break
        case EventType.CHAT_MESSAGE:
            sendChatMessageToNLU(eventParams.message as string)
            break
        case EventType.IDLE_TIMEOUT:
            // idleTimeout()
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

export function updateESDialogueState() {
    _updateESDialogueState()
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
    // Update global editor value so that STATUS_UPDATE doesn't register a change for the second time.
    lastEditorValue = editor.getValue()
}

function idleTimeout() {
    // If IDLENESS_THRESHOLD has elapsed since the last event, then
    // trigger an "idle" intent.
    const message = {
        name: "EXTERNAL_idle",
    }
    triggerIntent(message)
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
