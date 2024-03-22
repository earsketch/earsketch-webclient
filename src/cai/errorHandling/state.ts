interface ErrorHandlingState {
    errorMessage: string []
    currentError: any
    errorText: string
    textArray: string []
    errorLine: string
}

const createState = (): ErrorHandlingState => ({
    errorMessage: [],
    currentError: null,
    errorText: "",
    textArray: [],
    errorLine: "",
})

export const state: { [key: string]: ErrorHandlingState } = {}

export function resetState(project: string) {
    state[project] = createState()
}
