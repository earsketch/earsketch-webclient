// Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
import * as recommender from "../../app/recommender"
import store from "../../reducers"
import { selectActiveProject } from "../caiState"
import { CodeFeatures } from "../complexityCalculator"

const propertyOptions: { [key: string]: string[] } = {
    genre: [],
    instrument: [],
}

const dropupLabels: { [key: string]: string } = { genre: "genre", form: "Forms", key: "Keys", "code structure": "Code Structures", instrument: "instrument" }

// Initialize empty model.
export interface ProjectModel {
    musicalProperties: {
        genre: string[],
        instrument: string[],
        form: string,
        lengthSeconds: number,
        lengthMeasures: number,
    },
    complexityGoals: CodeFeatures,
    api: {
        makeBeat: number,
        setEffect: number,
    },
}
export const allForms = ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"]

// this project model maps to the assignment we use in CAI summative studies. 0, empty, or "" indicates no goal.

const defaultProjectModel: ProjectModel = {
    musicalProperties: {
        genre: [],
        instrument: [],
        form: "",
        lengthSeconds: 15,
        lengthMeasures: 0,
    },
    complexityGoals: {
        errors: 0,
        variables: 0,
        makeBeat: 1,
        whileLoops: 0,
        forLoopsRange: 0,
        forLoopsIterable: 1,
        iterables: 0,
        nesting: 0,
        conditionals: 1,
        usedInConditionals: 0,
        repeatExecution: 3,
        manipulateValue: 0,
        indexing: 0,
        consoleInput: 1,
        listOps: 0,
        strOps: 0,
        binOps: 0,
        comparisons: 0,
    },
    api: {
        makeBeat: 1,
        setEffect: 0,
    },
}

export const projectModel: { [key: string]: ProjectModel } = {}

export function setActiveProject(projectName: string) {
    if (!projectModel[projectName]) {
        clearModel()
    }
}

// returns a list of all properties that can be set/adjusted
export function getProperties(): ("musicalProperties" | "complexityGoals" | "api")[] {
    return Object.keys(propertyOptions) as ("musicalProperties" | "complexityGoals" | "api")[]
}

export function getOptions(propertyString: string) {
    if (propertyOptions[propertyString]) {
        return propertyOptions[propertyString].slice(0)
    }
    return []
}

export function getDropupLabel(property: string) {
    return dropupLabels[property]
}

// Update model with key/value pair.
export function updateModel(property: string, value: string) {
    const activeProject = selectActiveProject(store.getState())
    switch (property) {
        case "genre":
        case "instrument":
            if (!projectModel[activeProject].musicalProperties[property].includes(value)) {
                projectModel[activeProject].musicalProperties[property].push(value)
            }
            break
    }
}

// Return to empty/default model.
export function clearModel() {
    const activeProject = selectActiveProject(store.getState())
    projectModel[activeProject] = { ...defaultProjectModel }
}

// Empty single property array.
export function clearProperty(property: string) {
    const activeProject = selectActiveProject(store.getState())

    switch (property) {
        case "genre":
        case "instrument":
            projectModel[activeProject].musicalProperties[property] = []
            break
        default:
            break
    }
}

// Remove single property from array.
export function removeProperty(property: string, propertyValue: string) {
    const activeProject = selectActiveProject(store.getState())

    switch (property) {
        case "genre":
        case "instrument":
            if (projectModel[activeProject].musicalProperties[property].includes(propertyValue)) {
                projectModel[activeProject].musicalProperties[property] = projectModel[activeProject].musicalProperties[property].filter((value) => { return value !== propertyValue })
            }
            break
        default:
            break
    }
}

export function getAllProperties(): [string, string][] {
    const activeProject = selectActiveProject(store.getState())
    const properties: [string, string][] = []
    for (const [category, property] of Object.entries(projectModel[activeProject])) {
        if (Array.isArray(property)) {
            for (const value of property) {
                properties.push([category, String(value)])
            }
        } else if (property.length > 0) {
            properties.push([category, String(property)])
        }
    }
    return properties
}

export function hasProperty(property: string) {
    const activeProject = selectActiveProject(store.getState())

    for (const prop of Object.values(projectModel[activeProject])) {
        for (const pVal of prop) {
            if (pVal === property) {
                return true
            }
        }
    }
    return false
}

export function setOptions() {
    propertyOptions.instrument = recommender.findAvailable("instrument")
    propertyOptions.genre = recommender.findAvailable("genre")
}
