// Recommend audio samples.
import { fillDict } from "../cai/analysis"
import { Script } from "common"

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
import AUDIOKEYS_RECOMMENDATIONS_ from "../data/audiokeys_recommendations.json"
import KEYSIGNATURES_ from "../data/numbers_keysigs.json"
import KEYSIGNATURES_STRING_ from "../data/keysigs2.json"

const NUMBERS_AUDIOKEYS: { [key: string]: string } = NUMBERS_AUDIOKEYS_
const AUDIOKEYS_RECOMMENDATIONS: { [key: string]: { [key: string]: number[] } } = AUDIOKEYS_RECOMMENDATIONS_
const KEYSIGNATURES: { [key: string]: number } = KEYSIGNATURES_
const KEYSIGNATURES_STRING: { [key: string]: { [key: string]: number } } = KEYSIGNATURES_STRING_

// All the key signatures as a human-readable label.
const KEY_LABELS = ["A major", "Bb major", "B major", "C major", "Db major",
    "D major", "Eb major", "E major", "F major", "F# major",
    "G major", "Ab major", "A minor", "Bb minor", "B minor",
    "C minor", "C# minor", "D minor", "D# minor", "E minor",
    "F minor", "F# minor", "G minor", "G# minor"]

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

export function findGenreInstrumentCombinations(genreLimit: string[] = [], instrumentLimit: string[] = []): any {
    const sounds = []
    if (Object.keys(keyGenreDict).length < 1) {
        fillDict().then(() => {
            return findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        })
    } else {
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
}

export function recommend(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3) {
    let recs = generateRecommendations(inputSamples, coUsage, similarity)
    let filteredRecs: string[] = []
    if (Object.keys(recs).length === 0) {
        recs = generateRecommendations(addRandomRecInput(), coUsage, similarity)
    }
    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }
    filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit,
        previousRecommendations, bestLimit)
    return filteredRecs
}

export function recommendReverse(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3) {
    let filteredRecs: string[] = []

    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }

    while (filteredRecs.length < bestLimit) {
        const recs: { [key: string]: number } = {}
        const outputs = findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        filteredRecs = []
        for (const i in outputs) {
            const outputRecs = generateRecommendations([outputs[i]], coUsage, similarity)
            if (!(outputs[i] in recs)) {
                recs[outputs[i]] = 0
            }
            for (const key in outputRecs) {
                if (inputSamples.length === 0 || inputSamples.includes(key)) {
                    recs[outputs[i]] = recs[outputs[i]] + outputRecs[key]
                }
            }
        }
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

function generateRecommendations(inputSamples: string[], coUsage: number = 1, similarity: number = 1, keyStrictness: boolean = true) {
    // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
    coUsage = Math.sign(coUsage)
    similarity = Math.sign(similarity)
    const estimatedKey = estimateKeySignature(inputSamples)
    console.log(`current estimated Key: ${KEY_LABELS[estimatedKey]}`)
    // Generate recommendations for each input sample and add together
    const recs: { [key: string]: number } = Object.create(null)

    for (const inputSample of inputSamples) {
        const audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSample)
        if (audioNumber !== undefined) {
            const audioRec = AUDIOKEYS_RECOMMENDATIONS[audioNumber]
            for (const [num, value] of Object.entries(audioRec)) {
                const soundObj = NUMBERS_AUDIOKEYS[`${num}`]
                // console.log(`soundObj: ${soundObj}, keySignature: ${KEYSIGNATURES_STRING[soundObj].keysig}`)
                const match = KEYSIGNATURES_STRING[soundObj].keysig === estimatedKey
                const keyScore = (keyStrictness ? (match ? 1 : 0) : 0) * 4
                console.log(`The keyscore is: ${keyScore}`)
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
    genreLimit: string[], instrumentLimit: string[], previousRecommendations: string[], bestLimit: number, keyStrictness: boolean = true) {
    const recs: { [key: string]: number } = {}
    const recommendedSignatures = recommendedSounds.map(s => KEY_LABELS[estimateKeySignature([s])])
    console.log("the key signatures in the recommended sounds are: ", recommendedSignatures)
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

export function getKeySignatureString(filename: string) {
    // For a given filename, return the key signature of the file using the KEYSIGNATURES object.
    // If the file is not in the database, return "N/A"
    // const audioNumber = KEYSIGNATURES_STRING
    // if (audioNumber === -1) {
    //     return "N/A"
    // }
    const keyClass = KEYSIGNATURES_STRING[`${filename}`].keysig
    console.log(keyClass)
    if (keyClass !== -1) {
        const keyLabel = KEY_LABELS[keyClass]
        return keyLabel
    } else {
        return "N/A"
    }
}

function computeMode(array: Array<number>) {
    // Given an array of numbers, return the most frequent number in the array.
    // If there is a tie, return the lowest number.
    const counts: { [key: number]: number } = {}
    for (const num of array) {
        if (num in counts) {
            counts[num] = counts[num] + 1
        } else {
            counts[num] = 1
        }
    }
    let maxCount = 0
    let mode = 0
    for (const num in counts) {
        if (counts[num] > maxCount) {
            maxCount = counts[num]
            mode = Number(num)
        }
    }
    return mode
}

function estimateKeySignature(filenames: string[]) {
    // For a given set of files, return an estimated key signature.
    const keyClass = filenames.map(f => KEYSIGNATURES_STRING[`${f}`].keysig)
    // now filter out all the -1's
    const keyClassFiltered = keyClass.filter(k => k !== -1)
    if (keyClassFiltered.length !== 0) {
        const mode = computeMode(keyClassFiltered)
        return mode
    }
    return -1
}
