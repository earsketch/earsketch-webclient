import { CodeRecommendation } from "./codeRecommendations"

export type Modules = "newCode" | "advanceCode" | "aesthetics"

export interface SuggestionModule {
    name: Modules
    suggestion(): CodeRecommendation | null
}
