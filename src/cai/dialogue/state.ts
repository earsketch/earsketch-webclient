// Dialogue module for CAI (Co-creative Artificial Intelligence) Project.
import { CodeRecommendation } from "../suggestion/codeRecommendations"
import { CaiTreeNode } from "./caitree"
import { ProjectModel } from "./projectModel"
import { CodeSuggestion, SoundSuggestion } from "./student"

export type CodeParameters = [string, string | string []] []

export type HistoryNode = (string | number | string [] | number [] | ProjectModel | CodeSuggestion | SoundSuggestion | CodeRecommendation | CodeParameters) []

export interface DialogueState {
    currentTreeNode: CaiTreeNode
    currentSuggestion: CodeRecommendation | null
    nodeHistory: HistoryNode []
    recommendationHistory: string[]
    currentDropup: string
    soundSuggestionsUsed: number
    overlaps: [string, string, number][]
    isDone: boolean
}

const createState = (): DialogueState => ({
    currentTreeNode: Object.create(null),
    currentSuggestion: null,
    nodeHistory: [],
    recommendationHistory: [],
    currentDropup: "",
    soundSuggestionsUsed: 0,
    overlaps: [],
    isDone: false,
})

export const state: { [key: string]: DialogueState } = {}

export function resetState(project: string) {
    state[project] = createState()
}
