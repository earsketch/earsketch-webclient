//Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
import * as recommender from '../app/recommender'

let activeProject : string = ""
let availableGenres : string[] = []
let availableInstruments : string[] = []

// Initialize empty model.
const defaultProjectModel = { 'genre': [], 'instrument': [], 'form': [], 'code structure': [] }

let propertyOptions : { [key: string]: any } = {
    'genre': availableGenres,
    // 'instrument': availableInstruments,
    'form': ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"],
    'code structure': ['forLoop', 'function', 'consoleInput', 'conditional']
}

let suggestablePropertyOptions : { [key: string]: any } =  {
    'genre': availableGenres,
    // 'instrument': availableInstruments,
    'form': ["[FORM]"],
    'code structure': ['forLoop', 'function', 'consoleInput', 'conditional']
}

let propertyButtons : { [key: string]: string } = {
    'genre': "i have a genre I want to include",
    // 'instrument': "there's an instrument i want to make sure is in the project",
    'form': "i have a form in mind",
    'code structure': "i need to use a specific code structure"
}

let suggestableProperties : { [key: string]: { [key: string]: any} } = {
    'multiple': {
        'genre': availableGenres,
        // 'instrument': availableInstruments,
    },
    'one': {
        'form': ["[FORM]"]
    }
}

let projectModel : { [key: string]: any } = {}

//returns a list of all properties that can be set/adjusted
export function getProperties() {
    return Object.keys(propertyOptions)
}

export function getOptions(propertyString: string) {
    if (Object.keys(propertyOptions).includes(propertyString)) {
        return propertyOptions[propertyString].slice(0)
    } else {
        return []
    }
}

export function randomPropertySuggestion() {
    let add : boolean = false
    let selectedProperty = null
    let selectedValue = null
    //gather all properties that can be suggested at the moment (all with multiple options, plus those one-offs that have not yet been filled)
    let possibleProperties = []
    const multiples = Object.keys(suggestableProperties.multiple)
    const singles = Object.keys(suggestableProperties.one)
    for (let i = 0; i < multiples.length; i++) {
        if (projectModel[activeProject][multiples[i]].length < multiples.length) {
            possibleProperties.push(multiples[i])
        }
    }
    for (let i = 0; i < singles.length; i++) {
        if (projectModel[activeProject][singles[i]].length == 0) {
            possibleProperties.push(singles[i])
        }
    }
    if (possibleProperties.length == 0) {
        return {}
    }
    //select a property at random
    const propertyIndex = getRandomInt(0, possibleProperties.length - 1)
    selectedProperty = possibleProperties[propertyIndex]
    //if this is a property that can hold multiple values, mark if we are adding to an extant list or providing a first value
    if (multiples.includes(selectedProperty) && projectModel[activeProject][selectedProperty].length > 0) {
        add = true
    }
    //list possible values, avoiding repeating existing values in the model
    let possibleValues = []
    for (let i = 0; i < suggestablePropertyOptions[selectedProperty].length; i++) {
        const valueOption = suggestablePropertyOptions[selectedProperty][i]
        if (!projectModel[activeProject][selectedProperty].includes(valueOption)) {
            possibleValues.push(valueOption)
        }
    }
    //select one at random
    if (possibleValues.length > 0) {
        const valueIndex = getRandomInt(0, possibleValues.length - 1)
        selectedValue = possibleValues[valueIndex]
    } else {
        return {}
    }
    return { property: selectedProperty, value: selectedValue, isAdded: add }
}

export function setActiveProject(projectName: string) {
    if (projectName in projectModel) {
        activeProject = projectName
    } else {
        //create empty, default project model
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
export function updateModel(property: string, value: any) {
    switch (property) {
        case 'genre':
        case 'code structure':
        case 'instrument':
            const index = projectModel[activeProject][property].indexOf(value)
            if (index === -1) {
                projectModel[activeProject][property].push(value) // Unlimited number of genres/instruments.
            }
            break
        case 'form':
            projectModel[activeProject]['form'][0] = value // Only one form at a time.
            break
        default:
            console.log('Invalid project model entry.')
    }
    console.log(projectModel)
}

// Return to empty/default model.
export function clearModel() {
    projectModel[activeProject] = {}
    for (let i in defaultProjectModel) {
        projectModel[activeProject][i] = []
    }
}

// Empty single property array.
export function clearProperty(property: string) {
    projectModel[activeProject][property] = []
}

// Remove single property from array.
export function removeProperty(property: string, propertyValue: any) {
    if (projectModel[activeProject][property]) {
        let index = projectModel[activeProject][property].indexOf(propertyValue)
        if (index > -1) {
            projectModel[activeProject][property].splice(index, 1)
        }
    }
}

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
}

export function isEmpty() {
    for(let key in projectModel[activeProject]) {
        if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
            return false
        }
    }
    return true
}

export function getNonEmptyFeatures() {
    let features = []
    for(let key in projectModel[activeProject]) {
        if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
            features.push(key)
        }
    }
    return features
}

export function getAllProperties() {
    let properties = []
    for (let key in projectModel[activeProject]) {
        if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
            for (let pVal in projectModel[activeProject][key]) {
                properties.push([key,projectModel[activeProject][key][pVal]])
            }
        }
    }
    return properties
}

export function hasProperty(property: string) {
    for (let key in projectModel[activeProject]) {
        if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
            for (let pVal in projectModel[activeProject][key]) {
                if (projectModel[activeProject][key][pVal] === property) {
                    return true
                }
            }
        }
    }
    return false
}

export function setOptions() {
    availableGenres = recommender.availableGenres()
    propertyOptions['genre'] = availableGenres
    suggestablePropertyOptions['genre'] = availableGenres
    suggestableProperties['multiple']['genre'] = availableGenres
    // availableInstruments = recommender.availableInstruments()
    // propertyOptions['instrument'] = availableInstruments
    // suggestablePropertyOptions['instrument'] = availableInstruments
    // suggestableProperties['multiple']['instrument'] = availableInstruments
}