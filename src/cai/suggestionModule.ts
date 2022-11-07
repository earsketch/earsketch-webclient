import { CodeRecommendation } from "./codeRecommendations"

export type Modules = "newCode" | "advanceCode" | "aesthetics"

export interface SuggestionModule {
    weight: number
    suggestion(): CodeRecommendation
}

export const curriculumProgression: { [key: number]: { [key: string]: { [key: string]: number } } } = {
    0: { variables: { variables: 1 } },
    1: { makeBeat: { makeBeat: 1 } },
    2: { iteration: { forLoopsRange: 2, forLoopsIterable: 1 } }, // needs special handling as is language-dependent. hrm.
    3: { features: { mathOps: 1 } },
    4: { iteration: { forLoopsRange: 3 } },
    5: { conditionals: { conditionals: 1 } },
    6: { conditionals: { conditionals: 3 } },
    7: { features: { comparisons: 1 } },
    8: { functions: { repeatExecution: 1 } },
    9: { functions: { repeatExecution: 3 } },
    10: { functions: { manipulateValue: 3 } },
    11: { features: { consoleInput: 1 } },
    12: { features: { strOps: 1 } },
    13: { features: { indexing: 1 } },
    14: { makeBeat: { makeBeat: 3 } },
}
