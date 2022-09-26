import * as editor from "../ide/Editor"
import { sendChatMessageToNLU, triggerIntent, _updateESDialogueState } from "./dialogueManagerUtil"


export enum EventType {
    CHAT_MESSAGE = "chat_message",
    CURRICULUM_PAGE_VISITED = "curriculum_page_visited",
    CODE_COMPILED = "code_compiled",
    IDLE_TIMEOUT = "idle_timeout",
    UI_CLICK = "ui_click",
}

const IDLENESS_THRESHOLD: number = 999000 // in milliseconds
let lastTimeoutID: number = -1

export function updateRasaDialogueState(
    eventType: EventType,
    eventParams?: any
) {
    console.log("Triggered update of type", eventType)
    switch (eventType) {
        case EventType.CURRICULUM_PAGE_VISITED:
            curriculumPageVisited(eventParams.page as number)
            break
        case EventType.CODE_COMPILED:
            codeCompiled()
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
    if (eventType != EventType.IDLE_TIMEOUT) {
        clearTimeout(lastTimeoutID)
    } else {
        lastTimeoutID = setTimeout(() => {
            updateRasaDialogueState(EventType.IDLE_TIMEOUT)
        }, IDLENESS_THRESHOLD)
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

function codeCompiled() {
    triggerIntent({
        name: "EXTERNAL_on_compile"
    })
}

function idleTimeout() {
    triggerIntent({
        name: "EXTERNAL_idle",
    })
}

export function curriculumPageVisited(page: any) {
    triggerIntent({
        name: "EXTERNAL_curriculum_page_visited"
    })
}
