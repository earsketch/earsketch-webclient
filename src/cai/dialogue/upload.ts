import esconsole from "../../esconsole"
import store from "../../reducers"
import { post } from "../../request"
import { selectUserName } from "../../user/userState"
import { selectActiveProject } from "../caiState"
import { state } from "./state"

async function uploadCaiHistory(project: string, node: any, sourceCode?: string) {
    const data: { [key: string]: string } = { username: selectUserName(store.getState())!, project, node: JSON.stringify(node) }
    if (sourceCode) {
        data.source = sourceCode
    }

    data.ui = "standard"
    if (ES_WEB_SHOW_CAI) {
        if (ES_WEB_SHOW_CHAT) {
            data.ui = "Wizard"
        } else {
            data.ui = "CAI"
        }
    } else if (ES_WEB_SHOW_CHAT) {
        data.ui = "Chat"
    }

    await post("/studies/caihistory", data)
    esconsole(["saved to CAI history:", project, node])
}

export function addToNodeHistory(nodeObj: any, sourceCode?: string, project?: string) {
    project = project || selectActiveProject(store.getState())

    if (location.href.includes("wizard") && nodeObj[0] !== "Slash") {
        return
    } // Disabled for Wizard of Oz operators.
    if ((ES_WEB_SHOW_CAI || ES_WEB_SHOW_CHAT || ES_WEB_UPLOAD_CAI_HISTORY) && state[project] && state[project].nodeHistory) {
        state[project].nodeHistory.push(nodeObj)
        if (ES_WEB_UPLOAD_CAI_HISTORY && nodeObj[0] !== 0) {
            uploadCaiHistory(project, state[project].nodeHistory[state[project].nodeHistory.length - 1], sourceCode)
        }
        esconsole(["node history", String(state[project].nodeHistory)])
    }
}
