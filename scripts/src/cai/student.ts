// Analysis module for CAI (Co-creative Artificial Intelligence) Project.

import * as dialogue from "./dialogue"

export const studentModel = {
    codeKnowledge: {},
    musicAttributes: { soundProfile: undefined },
    preferences: {},
}

export function updateModel(property: string, value: any) {
    if (property === "codeKnowledge") {
        Object.assign(studentModel.codeKnowledge, value)
    } else if (property === "musicAttributes") {
        studentModel.musicAttributes.soundProfile = value
    } else if (property === "preferences") {
        Object.assign(studentModel.preferences, value)
    }
    dialogue.addToNodeHistory(["Student Model Update", [property, value]])
}
