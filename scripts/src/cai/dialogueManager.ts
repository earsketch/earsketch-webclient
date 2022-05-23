import store from "../reducers"
import * as cai from "../cai/caiState"
import * as dialogue from "../cai/dialogue"
import * as editor from "../ide/Editor"
import * as student from "../cai/student"
import * as collaboration from "../app/collaboration"


const RASA_SERVER_URL: string = "http://localhost:5005"


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

export function updateDialogueState() {
    const currentComplexity = (student.studentModel.codeKnowledge[
        "currentComplexity" as keyof typeof student.studentModel.codeKnowledge
    ] || {}) as any
    const message: any = {
        name: "EXTERNAL_status_update",
        entities: {
            source_code: editor.getValue(),
            ...currentComplexity,
        }
    }
    console.log("Periodic dialogue state update", message)
    fetch(`${RASA_SERVER_URL}/conversations/${collaboration.userName}/triggerIntent`, {
        method: "POST",
        headers: {
            "mode": "cors",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
}


export function curriculumPageVisited(page: any) {
    const message: any = {
        name: "EXTERNAL_status_update",
        entities: {
            curriculum_page: page
        }
    }
    console.log("Curriculum page opened", message)
    fetch(`${RASA_SERVER_URL}/conversations/${collaboration.userName}/triggerIntent`, {
        method: "POST",
        headers: {
            "mode": "cors",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
    })
}
