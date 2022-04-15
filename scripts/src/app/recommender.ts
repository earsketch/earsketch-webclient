// Recommend audio samples.
import { fillDict } from "../cai/analysis"
import { Script } from "common"
import store from "../reducers"
import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
import AUDIOKEYS_RECOMMENDATIONS_ from "../data/audiokeys_recommendations.json"

const NUMBERS_AUDIOKEYS: { [key: string]: string } = NUMBERS_AUDIOKEYS_
const AUDIOKEYS_RECOMMENDATIONS: { [key: string]: { [key: string]: number[] } } = AUDIOKEYS_RECOMMENDATIONS_

// All the key signatures as a human-readable label.
const partialKeyLabels = [
    "C", "D", "E", "F", "G", "A", "B",
]

// Convert key numbers to labels. TO-DO: use with CAI dialogue.
// const keyLabel = (num: number) => {
//     const keyRoot = (num % 12) / 2.0
//     return partialKeyLabels[Math.floor(keyRoot)] + (keyRoot - Math.floor(keyRoot) ? "#" : "") + " " + ((num > 12) ? "minor" : "major")
// }

const relativeKey = (num: number) => {
    if (num > 12) {
        // minor, relative major
        return (num + 3) % 24
    } else {
        // major key, find relative minor
        return num + 9
    }
}

// Convert key string to number.
const keyNumber = (label: string) => {
    const labelPair = label.split(" ")
    return partialKeyLabels.indexOf(labelPair[0][0]) * 2 + Number(labelPair[0].length > 1) + 12 * Number(labelPair[1] === "minor")
}

// Load lists of numbers and keys
let AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)

let keyGenreDict: { [key: string]: string } = {}
let keyInstrumentDict: { [key: string]: string } = {}

export function setKeyDict(genre: { [key: string]: string }, instrument: { [key: string]: string }) {
    keyGenreDict = genre
    keyInstrumentDict = instrument

    // Update list of audio samples for audio recommendation input/CAI output.
    AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS).filter((key) => {
        return Object.keys(keyGenreDict).includes(key)
    })
}

export function getKeyDict(type: string) {
    if (type === "genre") {
        return keyGenreDict
    } else if (type === "instrument") {
        return keyInstrumentDict
    } else {
        return {}
    }
}

export function addRecInput(recInput: string[], script: Script) {
    // Generate list of input samples
    const lines = script.source_code.split("\n")
    for (const line of lines) {
        for (const name of AUDIOKEYS) {
            // Exclude makeBeat, comments, and samples included in the input list.
            // TODO: This comment check only works for Python, and excludes other scenarios that should be ignored.
            //       This should extract identifiers from the AST (like runner) rather than searching through text.
            const commented = line.includes("#") && line.indexOf(name) > line.indexOf("#")
            const excluded = name.startsWith("OS_") || commented || recInput.includes(name)
            if (!excluded && line.includes(name)) {
                recInput.push(name)
            }
        }
    }
    return recInput
}

export function addRandomRecInput(recInput: string[] = []) {
    let name = ""
    while (!AUDIOKEYS.includes(name) && recInput.length < 5) {
        name = AUDIOKEYS[Math.floor(Math.random() * AUDIOKEYS.length)]
        if (!recInput.includes(name)) {
            recInput.push(name)
        }
    }
    return recInput
}

export function findGenreInstrumentCombinations(genreLimit: string[] = [], instrumentLimit: string[] = []): string[] {
    const sounds = []
    if (Object.keys(keyGenreDict).length < 1) {
        fillDict().then(() => {
            return findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        })
    }
    for (const key in keyGenreDict) {
        const genre = keyGenreDict[key]
        if (genreLimit.length === 0 || keyGenreDict === null || genreLimit.includes(genre)) {
            if (key in keyInstrumentDict) {
                const instrument = keyInstrumentDict[key]
                if (instrumentLimit.length === 0 || keyInstrumentDict === null || instrumentLimit.includes(instrument)) {
                    sounds.push(key)
                }
            }
        }
    }
    return sounds
}

export function recommend(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3,
    useKeyInfo: number | boolean = true) {
    let recs = generateRecommendations(inputSamples, coUsage, similarity)
    let filteredRecs: string[] = []
    if (Object.keys(recs).length === 0) {
        recs = generateRecommendations(addRandomRecInput(), coUsage, similarity, useKeyInfo)
    }
    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }
    filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit,
        previousRecommendations, bestLimit)
    return filteredRecs
}

export function recommendReverse(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3,
    useKeyInfo: number | boolean = true) {
    let filteredRecs: string[] = []
    let useKey: number | undefined

    // add key info for all generated recommendations using original input sample lists.
    switch (useKeyInfo) {
        case true:
            useKey = estimateKeySignature(inputSamples)
            break
        case false:
            useKey = undefined
            break
        default:
            useKey = useKeyInfo
    }

    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }

    while (filteredRecs.length < bestLimit) {
        const recs: { [key: string]: number } = {}
        const outputs = findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        filteredRecs = []
        outputs.forEach((it: string, idx: number) => {
            const outputRecs = generateRecommendations([outputs[idx]], coUsage, similarity, useKey)
            if (!(outputs[idx] in recs)) {
                recs[outputs[idx]] = 0
            }
            for (const key in outputRecs) {
                if (inputSamples.length === 0 || inputSamples.includes(key)) {
                    recs[outputs[idx]] = recs[outputs[idx]] + outputRecs[key]
                }
            }
        })
        filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, [], [],
            previousRecommendations, bestLimit)
        if (genreLimit.length > 0) {
            genreLimit.pop()
        } else if (instrumentLimit.length > 0) {
            instrumentLimit.pop()
        } else {
            return filteredRecs
        }
    }
    return filteredRecs
}

function generateRecommendations(inputSamples: string[], coUsage: number = 1, similarity: number = 1, useKeyInfo: number | boolean = true) {
    // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
    coUsage = Math.sign(coUsage)
    similarity = Math.sign(similarity)
    let estimatedKey: number | undefined

    switch (useKeyInfo) {
        case true:
            // use key estimated input samples.
            estimatedKey = estimateKeySignature(inputSamples)
            break
        case false:
            // ignore key signature.
            estimatedKey = undefined
            break
        default:
            // use specified key.
            estimatedKey = useKeyInfo
    }

    // Generate recommendations for each input sample and add together
    const recs: { [key: string]: number } = Object.create(null)
    for (const inputSample of inputSamples) {
        const audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSample)
        if (audioNumber !== undefined) {
            const audioRec = AUDIOKEYS_RECOMMENDATIONS[audioNumber]
            for (const [num, value] of Object.entries(audioRec)) {
                const soundObj = NUMBERS_AUDIOKEYS[`${num}`]
                let keyScore = 0
                if (estimatedKey) {
                    const keySignature = getKeySignature(soundObj)
                    if (keySignature === estimatedKey) {
                        keyScore = 1.5
                    } else if (keySignature === relativeKey(estimatedKey)) {
                        keyScore = 1
                    }
                }
                const fullVal = value[0] + coUsage * value[1] + similarity * value[2] + keyScore
                const key = NUMBERS_AUDIOKEYS[num]
                if (key in recs) {
                    recs[key] = (fullVal + recs[key]) / 1.41
                } else {
                    recs[key] = fullVal
                }
            }
        }
    }
    return recs
}

function filterRecommendations(inputRecs: { [key: string]: number }, recommendedSounds: string[], inputSamples: string[],
    genreLimit: string[], instrumentLimit: string[], previousRecommendations: string[], bestLimit: number) {
    const recs: { [key: string]: number } = {}
    for (const key in inputRecs) {
        if (!recommendedSounds.includes(key) && !inputSamples.includes(key) &&
            !previousRecommendations.includes(key) && key.slice(0, 3) !== "OS_") {
            recs[key] = inputRecs[key]
        }
    }
    if (inputSamples.length > 0) {
        let i: number = 0
        while (i < bestLimit) {
            const maxScore = Object.values(recs).reduce((a, b) => a > b ? a : b)
            const maxRecs = []
            for (const key in recs) {
                if (recs[key] === maxScore) {
                    maxRecs.push(key)
                }
            }
            const maxRec = maxRecs[Math.floor(Math.random() * maxRecs.length)]
            if (!maxRec) {
                return recommendedSounds
            }

            if (genreLimit.length === 0 || keyGenreDict === null || genreLimit.includes(keyGenreDict[maxRec])) {
                const s = keyInstrumentDict[maxRec]
                if (instrumentLimit.length === 0 || keyInstrumentDict === null || instrumentLimit.includes(s)) {
                    if (!previousRecommendations.includes(maxRec)) {
                        recommendedSounds.push(maxRec)
                        i += 1
                    }
                }
            }
            delete recs[maxRec]
        }
    }
    return recommendedSounds
}

export function availableGenres() {
    const genres: string[] = []
    for (const name of AUDIOKEYS) {
        const genre = keyGenreDict[name]
        if (!genres.includes(genre) && genre !== undefined && genre !== "MAKEBEAT") {
            genres.push(genre)
        }
    }
    return genres
}

export function availableInstruments() {
    const instruments: string[] = []
    for (const name of AUDIOKEYS) {
        const instrument = keyInstrumentDict[name]
        if (!instruments.includes(instrument) && instrument !== undefined) {
            instruments.push(instrument)
        }
    }
    return instruments
}

function getKeySignature(filename: string) {
    const keySig = store.getState().sounds.defaultSounds.entities[filename].keySignature
    return keySig ? keyNumber(keySig) : -1
}

function computeMode(array: number[]): number {
    // Given an array of numbers, return the most frequent number in the array.
    // If there is a tie, return the lowest number.
    const mode = [...array].sort((a, b) =>
        array.filter(v => v === a).length - array.filter(v => v === b).length
    ).pop()
    return mode || -1
}

function estimateKeySignature(filenames: string[]) {
    // For a given set of files, return an estimated key signature.
    const keyClass = filenames.map(f => getKeySignature(f))
    const keyClassFiltered = keyClass.filter(k => k !== -1).filter(k => k !== undefined)
    return keyClassFiltered.length !== 0 ? computeMode(keyClassFiltered) : -1
}
