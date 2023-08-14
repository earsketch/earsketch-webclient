import { Results, emptyResultsObject } from "../complexityCalculator"
import { CodeRecommendation } from "../suggestion/codeRecommendations"
import { CaiTreeNode } from "./caitree"
import { ProjectModel } from "./projectModel"
import { CodeSuggestion, SoundSuggestion } from "./student"

export type CodeParameters = [string, string | string [] | null] []

type HistoryNode = (string | number | string [] | number [] | ProjectModel | CodeSuggestion | SoundSuggestion | CodeRecommendation | CodeParameters) []

interface DialogueState {
    sourceCode: string
    complexity: Results
    treeNode: CaiTreeNode
    suggestion: CodeRecommendation | null
    parameters: { [key: string]: string }
    recommendationParameters: { genre: string | null, instrument: string | null }
    section: string | null
    property: string
    propertyValue: string
    propertyValueToChange: string
    helpTopic: string
    nodeHistory: HistoryNode []
    recommendationHistory: string[]
    dropup: string
    soundSuggestionsUsed: number
    overlaps: [string, string, number][]
    isDone: boolean
}

const createState = (): DialogueState => ({
    sourceCode: "",
    complexity: emptyResultsObject(),
    treeNode: Object.create(null),
    suggestion: null,
    parameters: {},
    recommendationParameters: { genre: null, instrument: null },
    section: null,
    property: "genre",
    propertyValue: "",
    propertyValueToChange: "",
    helpTopic: "",
    nodeHistory: [],
    recommendationHistory: [],
    dropup: "",
    soundSuggestionsUsed: 0,
    overlaps: [],
    isDone: false,
})

export const state: { [key: string]: DialogueState } = {}

export function resetState(project: string) {
    state[project] = createState()
}

// links to ES curriculum that CAI can use
export const LINKS: { [key: string]: string } = {
    fitMedia: "/en/v2/getting-started.html#fitmedia",
    setTempo: "/en/v2/your-first-song.html#settempo",
    variable: "/en/v2/add-beats.html#variables",
    variables: "/en/v2/add-beats.html#variables",
    var: "/en/v2/add-beats.html#variables",
    makeBeat: "/en/v2/add-beats.html#makebeat",
    loop: "/en/v2/loops-and-layers.html#forloops",
    "for loop": "/en/v2/loops-and-layers.html#forloops",
    for: "/en/v2/loops-and-layers.html#forloops",
    loops: "/en/v2/loops-and-layers.html#forloops",
    range: "/en/v2/loops-and-layers.html#forloops",
    setEffect: "/en/v2/effects-and-envelopes.html#effectsinearsketch",
    "effect ramp": "/en/v2/effects-and-envelopes.html#effectsandenvelopes",
    function: "/en/v2/effects-and-envelopes.html#functionsandmoreeffects",
    functions: "/en/v2/effects-and-envelopes.html#functionsandmoreeffects",
    def: "/en/v2/effects-and-envelopes.html#functionsandmoreeffects",
    "if statement": "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    if: "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    conditional: "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    "conditional statement": "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    section: "/en/v2/custom-functions.html#asongsstructure",
    sections: "/en/v2/custom-functions.html#asongsstructure",
    ABA: "/en/v1/musical-form-and-custom-functions.html#abaform",
    "custom function": "/en/v2/custom-functions.html#creatingyourcustomfunctions",
    parameters: "/en/v1/ch_YVIPModule4.html#_writing_custom_functions",
    "console input": "/en/v2/get-user-input.html#userinput",
    readInput: "/en/v2/get-user-input.html#userinput",
    filter: "/en/v1/every-effect-explained-in-detail.html#filter",
    FILTER: "/en/v1/every-effect-explained-in-detail.html#filter",
    FILTER_FREQ: "/en/v1/every-effect-explained-in-detail.html#filter",
    "volume mixing": "/en/v1/every-effect-explained-in-detail.html#volume",
    importing: "/en/v1/every-error-explained-in-detail.html#importerror",
    indented: "/en/v1/every-error-explained-in-detail.html#indentationerror",
    index: "/en/v1/every-error-explained-in-detail.html#indexerror",
    name: "/en/v1/every-error-explained-in-detail.html#nameerror",
    "parse error": "/en/v1/every-error-explained-in-detail.html#parseerror",
    "syntax error": "/en/v1/every-error-explained-in-detail.html#syntaxerror",
    "type error": "/en/v1/every-error-explained-in-detail.html#typeerror",
    "function arguments": "/en/v1/every-error-explained-in-detail.html#valueerror",
    list: "/en/v1/data-structures.html",
    randomness: "/en/v1/randomness.html",
    "nested loops": "/en/v1/sonification.html#nestedloops",
}
