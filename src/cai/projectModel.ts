// Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
import * as recommender from "../app/recommender"
import { CodeFeatures } from "./complexityCalculator"

let activeProject: string = ""
let availableGenres: string [] = []
let availableInstruments: string [] = []
const dropupLabel: { [key: string]: string } = { genre: "Genres", form: "Forms", key: "Keys", "code structure": "Code Structures", instrument: "instruments" }

// Initialize empty model.
export interface ProjectModel {
    musicalProperties: {
        genre: string[],
        form: string,
        lengthSeconds: number,
        lengthMeasures: number,
        instruments: string[],
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
        form: "",
        lengthSeconds: 15,
        lengthMeasures: 0,
        instruments: [],
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

const propertyOptions: { [key: string]: string[] } = {
    genre: availableGenres,
    instrument: availableInstruments,
}

const suggestableProperties = {
    multiple: {
        genre: availableGenres,
        instrument: availableInstruments,
    },
}

const projectModel: { [key: string]: ProjectModel } = {}

// returns a list of all properties that can be set/adjusted
export function getProperties(): ("musicalProperties" | "complexityGoals" | "api")[] {
    return Object.keys(propertyOptions) as ("musicalProperties" | "complexityGoals" | "api")[]
}

export function getOptions(propertyString: string) {
    if (propertyOptions[propertyString]) {
        return propertyOptions[propertyString].slice(0)
    } else {
        return []
    }
}

export function getDropupLabel(property: string) {
    return dropupLabel[property]
}

export function setActiveProject(projectName: string) {
    if (projectName in projectModel) {
        activeProject = projectName
    } else {
        // create empty, default project model
        activeProject = projectName
        clearModel()
    }
}

// Public getters.
export function getModel() {
    return projectModel[activeProject]
}

// Update model with key/value pair.
export function updateModel(property: string, value: string) {
    switch (property) {
        case "genre":
            if (!projectModel[activeProject].musicalProperties.genre.includes(value)) {
                projectModel[activeProject].musicalProperties.genre.push(value)
            }
            break
        case "instrument":
            if (!projectModel[activeProject].musicalProperties.instruments.includes(value)) {
                projectModel[activeProject].musicalProperties.instruments.push(value)
            }
            break
    }
    // console.log(projectModel)
}

// Return to empty/default model.
export function clearModel() {
    projectModel[activeProject] = { ...defaultProjectModel }
}

// Empty single property array.
export function clearProperty(property: string) {
    switch (property) {
        case "genre":
            projectModel[activeProject].musicalProperties.genre = []
            break
        default:
            break
    }
}

// Remove single property from array.
export function removeProperty(property: string, propertyValue: string) {
    switch (property) {
        case "genre":
            if (projectModel[activeProject].musicalProperties.genre.includes(propertyValue)) {
                projectModel[activeProject].musicalProperties.genre.splice(projectModel[activeProject].musicalProperties.genre.indexOf(propertyValue, 0), 1)
            }
            break
        case "instrument":
            if (projectModel[activeProject].musicalProperties.instruments.includes(propertyValue)) {
                projectModel[activeProject].musicalProperties.instruments.splice(projectModel[activeProject].musicalProperties.instruments.indexOf(propertyValue, 0), 1)
            }
            break
        default:
            break
    }
}

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
}

export function getAllProperties(): [string, string][] {
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
    availableGenres = recommender.availableGenres()
    availableInstruments = recommender.availableInstruments()
    propertyOptions.instrument = availableInstruments
    propertyOptions.genre = availableGenres
    suggestableProperties.multiple.genre = availableGenres
    suggestableProperties.multiple.instrument = availableInstruments
}
