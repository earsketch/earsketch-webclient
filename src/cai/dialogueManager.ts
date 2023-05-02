import store from "../reducers"
import * as user from "../user/userState"
import {
    nextAction, updateProjectGoal, nudgeUser, makeid, initializeConversation,
} from "./dialogueManagerUtil"

export enum EventType {
    CHAT_MESSAGE = "chat_message",
    CURRICULUM_PAGE_VISITED = "curriculum_page_visited",
    CODE_COMPILED = "code_compiled",
    IDLE_TIMEOUT = "idle_timeout",
    UI_CLICK = "ui_click",
    START = "start"
}

const IGNORE_EVENTS: EventType[] = [EventType.CODE_COMPILED, EventType.UI_CLICK, EventType.CURRICULUM_PAGE_VISITED]
const IDLENESS_THRESHOLD: number = 300000 // in milliseconds
let lastTimeoutID: any = -1
let numConsecutiveTimeouts: any = 0

let USERNAME: any = null

export let INITIATED = false

export function setInitiated(value: boolean) {
    INITIATED = value
}

export function handleEvent(
    eventType: EventType,
    eventParams?: any
) {
    console.log("Triggered update of type", eventType)
    if (!IGNORE_EVENTS.includes(eventType)) {
        switch (eventType) {
            case EventType.START:
                const state = store.getState()
                const esUserName = user.selectUserName(state)
                USERNAME = esUserName + "-" + new Date().toISOString().replace(/[-T:.Z]/g, '')
                console.log("Initializing dialogue with " + USERNAME)
                initializeConversation(USERNAME)
                break
            case EventType.CURRICULUM_PAGE_VISITED:
                curriculumPageVisited()
                break
            case EventType.CODE_COMPILED:
                codeCompiled()
                break
            case EventType.CHAT_MESSAGE:
                nextAction(USERNAME, eventParams.message as string)
                break
            case EventType.IDLE_TIMEOUT:
                idleTimeout()
                break
            case EventType.UI_CLICK:
                uiClicked(eventParams.uiEvent as string)
                break
        }
    }
    if (eventType !== EventType.IDLE_TIMEOUT) {
        // If the student demonstrates activity, then
        // clear the existing timer and start a new one now.
        clearTimeout(lastTimeoutID)
        numConsecutiveTimeouts = 0
    }
    numConsecutiveTimeouts += 1
    lastTimeoutID = setTimeout(() => {
        handleEvent(EventType.IDLE_TIMEOUT)
    }, IDLENESS_THRESHOLD * numConsecutiveTimeouts * 0.75)
}

export function updateESDialogueState() {
    updateProjectGoal(USERNAME)
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
            nextAction(USERNAME, message)
            break
        }
        case "sound":
        case "api":
            break
    }
}

function codeCompiled() {
    nextAction(
        USERNAME,
        "EXTERNAL_on_compile"
    )
}

function idleTimeout() {
    nudgeUser()
}

function curriculumPageVisited() {
    nextAction(
        USERNAME,
        "EXTERNAL_curriculum_page_visited"
    )
}
