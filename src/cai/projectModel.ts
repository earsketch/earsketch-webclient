// Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
import * as recommender from "../app/recommender"

let activeProject: string = ""
let availableGenres: string [] = []
const dropupLabel: { [key: string]: string } = { genre: "Genres", form: "Forms", key: "Keys", "code structure": "Code Structures" }

// Initialize empty model.
export interface ProjectModel {
    genre: string []
    form: string
    "code structure": string []
}

const defaultProjectModel: ProjectModel = { genre: [], form: "", "code structure": [] }

const propertyOptions: { [key: string]: string [] } = {
    genre: availableGenres,
    form: ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"],
    "code structure": ["forLoop", "function", "consoleInput", "conditional"],
}

const suggestablePropertyOptions: { [key: string]: string [] } = {
    genre: availableGenres,
    form: ["[FORM]"],
    "code structure": ["forLoop", "function", "consoleInput", "conditional"],
}

const propertyButtons: { [key: string]: string } = {
    genre: "i have a genre I want to include",
    form: "i have a form in mind",
    "code structure": "i need to use a specific code structure",
}

const suggestableProperties = {
    multiple: {
        genre: availableGenres,
    },
    one: {
        form: ["[FORM]"],
    },
}

const projectModel: { [key: string]: ProjectModel } = {}

// returns a list of all properties that can be set/adjusted
export function getProperties(): ("genre" | "form" | "code structure")[] {
    return Object.keys(propertyOptions) as ("genre" | "form" | "code structure")[]
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

export function randomPropertySuggestion() {
    let add: boolean = false
    // gather all properties that can be suggested at the moment (all with multiple options, plus those one-offs that have not yet been filled)
    const possibleProperties: ("genre" | "form") [] = []
    if (projectModel[activeProject].genre.length < availableGenres.length) {
        possibleProperties.push("genre")
    }
    if (projectModel[activeProject].form.length === 0) {
        possibleProperties.push("form")
    }
    if (possibleProperties.length === 0) {
        return {}
    }
    // select a property at random
    const propertyIndex = getRandomInt(0, possibleProperties.length - 1)
    const selectedProperty = possibleProperties[propertyIndex]
    // if this is a property that can hold multiple values, mark if we are adding to an extant list or providing a first value
    if (selectedProperty === "genre" && projectModel[activeProject][selectedProperty].length > 0) {
        add = true
    }
    // list possible values, avoiding repeating existing values in the model
    const possibleValues = []
    for (const valueOption of suggestablePropertyOptions[selectedProperty]) {
        if (!projectModel[activeProject][selectedProperty].includes(valueOption)) {
            possibleValues.push(valueOption)
        }
    }
    // select one at random
    if (possibleValues.length > 0) {
        const valueIndex = getRandomInt(0, possibleValues.length - 1)
        const selectedValue = possibleValues[valueIndex]
        return { property: selectedProperty, value: selectedValue, isAdded: add }
    } else {
        return {}
    }
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

export function getPropertyButtons() {
    return propertyButtons
}

// Update model with key/value pair.
export function updateModel(property: string, value: string) {
    switch (property) {
        case "genre":
        case "code structure":
            if (!projectModel[activeProject][property].includes(value)) {
                projectModel[activeProject][property].push(value)
            } // unlimited number of genres and code structures.
            break
        case "form":
            projectModel[activeProject].form = value // Only one form at a time.
            break
        default:
            break
    }
}

// Return to empty/default model.
export function clearModel() {
    projectModel[activeProject] = { ...defaultProjectModel }
}

// Empty single property array.
export function clearProperty(property: string) {
    switch (property) {
        case "genre":
        case "code structure":
            projectModel[activeProject][property] = []
            break
        case "form":
            projectModel[activeProject][property] = ""
            break
        default:
            break
    }
}

// Remove single property from array.
export function removeProperty(property: string, propertyValue: string) {
    switch (property) {
        case "genre":
        case "code structure": {
            const index = projectModel[activeProject][property].indexOf(propertyValue)
            if (index > -1) {
                projectModel[activeProject][property].splice(index, 1)
            }
        }
            break
        case "form":
            projectModel[activeProject][property] = ""
            break
        default:
            break
    }
}

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
}

export function isEmpty() {
    for (const property of Object.values(projectModel[activeProject])) {
        if (property.length > 0) {
            return false
        }
    }
    return true
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
    propertyOptions.genre = availableGenres
    suggestablePropertyOptions.genre = availableGenres
    suggestableProperties.multiple.genre = availableGenres
}
