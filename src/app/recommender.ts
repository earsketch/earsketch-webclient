// Recommend audio samples.
import { fillDict } from "../cai/analysis"
import { Script } from "common"
import store from "../reducers"
import NUMBERS_AUDIOKEYS from "../data/numbers_audiokeys"
import { getRecommendationData } from "../data/recommendationData"

export const audiokeysPromise: Promise<{ [key: string]: { [key: string]: number[] } }> = getRecommendationData()

// All the key signatures as a human-readable label.
const noteToPitchClass: {
    [key: string]: number,
} = {
    C: 0,
    "B#": 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    Fb: 4,
    F: 5,
    "E#": 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
    Cb: 11,
}

const relativeKey = (num: number) => {
    if (num > 12) {
        // minor, relative major
        return (num + 3) % 12
    } else {
        // major key, find relative minor
        return (num + 9) % 12 + 12
    }
}

// Convert key string to number.
const keyLabelToNumber = (label: string) => {
    const labelPair = label.split(" ")
    return noteToPitchClass[labelPair[0]] + 12 * Number(["Minor", "minor"].includes(labelPair[1]))
}

// Load lists of numbers and keys
let AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)

let soundGenreDict: { [key: string]: string } = {}
let soundInstrumentDict: { [key: string]: string } = {}

interface KeyInformation {
    keySignature: number | undefined
    relativeKey: number | undefined
    keyConfidence: number
}

const soundKeyDict: { [key: string]: KeyInformation } = {}

export function setKeyDict(genre: { [key: string]: string }, instrument: { [key: string]: string }) {
    soundGenreDict = genre
    soundInstrumentDict = instrument

    // Update list of audio samples for audio recommendation input/CAI output.
    AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS).filter((key) => {
        return Object.keys(soundGenreDict).includes(key)
    })
}

export function getKeyDict(type: string) {
    if (type === "genre") {
        return soundGenreDict
    } else if (type === "instrument") {
        return soundInstrumentDict
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
    if (Object.keys(soundGenreDict).length < 1) {
        fillDict().then(() => {
            return findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        })
    }
    for (const key in soundGenreDict) {
        const genre = soundGenreDict[key]
        if (genreLimit.length === 0 || soundGenreDict === null || genreLimit.includes(genre)) {
            if (key in soundInstrumentDict) {
                const instrument = soundInstrumentDict[key]
                if (instrumentLimit.length === 0 || soundInstrumentDict === null || instrumentLimit.includes(instrument)) {
                    sounds.push(key)
                }
            }
        }
    }
    return sounds
}

export async function recommend(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3,
    keyOverride?: number) {
    let recs = await generateRecommendations(inputSamples, coUsage, similarity, keyOverride)
    let filteredRecs: string[] = []
    if (Object.keys(recs).length === 0) {
        recs = await generateRecommendations(addRandomRecInput(), coUsage, similarity, keyOverride)
    }
    if (previousRecommendations.length === Object.keys(soundGenreDict).length) {
        previousRecommendations = []
    }
    filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit,
        previousRecommendations, bestLimit)
    return filteredRecs
}

export async function recommendReverse(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3,
    keyOverride?: number) {
    let filteredRecs: string[] = []

    // add key info for all generated recommendations using original input sample lists.
    const useKeyOverride = keyOverride || estimateKeySignature(inputSamples)

    if (previousRecommendations.length === Object.keys(soundGenreDict).length) {
        previousRecommendations = []
    }

    while (filteredRecs.length < bestLimit) {
        const recs: { [key: string]: number } = {}
        const outputs = findGenreInstrumentCombinations(genreLimit, instrumentLimit)
        filteredRecs = []
        for (const output of outputs) {
            const outputRecs = await generateRecommendations([output], coUsage, similarity, useKeyOverride)
            if (!(output in recs)) {
                recs[output] = 0
            }
            for (const key in outputRecs) {
                if (inputSamples.length === 0 || inputSamples.includes(key)) {
                    recs[output] = recs[output] + outputRecs[key]
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

async function generateRecommendations(inputSamples: string[], coUsage: number = 1, similarity: number = 1, keyOverride?: number) {
    // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
    coUsage = Math.sign(coUsage)
    similarity = Math.sign(similarity)

    // use key signature estimated from input samples or specified key signature.
    const songKeySignature = keyOverride || estimateKeySignature(inputSamples)

    // Generate recommendations for each input sample and add together
    const recs: { [key: string]: number } = Object.create(null)
    for (const inputSample of inputSamples) {
        const audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSample)
        if (audioNumber !== undefined) {
            const audioRec = (await audiokeysPromise)[audioNumber]
            for (const [num, value] of Object.entries(audioRec)) {
                const soundObj = NUMBERS_AUDIOKEYS[num]
                let keyScore = 0
                if (songKeySignature) {
                    const soundKeySignature = parseKeySignature(soundObj)
                    if (soundKeySignature.keySignature === songKeySignature) {
                        keyScore = 3 * soundKeySignature.keyConfidence
                    } else if (soundKeySignature.relativeKey === songKeySignature) {
                        keyScore = 2 * soundKeySignature.keyConfidence
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

            if (genreLimit.length === 0 || soundGenreDict === null || genreLimit.includes(soundGenreDict[maxRec])) {
                const s = soundInstrumentDict[maxRec]
                if (instrumentLimit.length === 0 || soundInstrumentDict === null || instrumentLimit.includes(s)) {
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
        const genre = soundGenreDict[name]
        if (!genres.includes(genre) && genre !== undefined && genre !== "MAKEBEAT") {
            genres.push(genre)
        }
    }
    return genres
}

export function availableInstruments() {
    const instruments: string[] = []
    for (const name of AUDIOKEYS) {
        const instrument = soundInstrumentDict[name]
        if (!instruments.includes(instrument) && instrument !== undefined) {
            instruments.push(instrument)
        }
    }
    return instruments
}

function parseKeySignature(filename: string) {
    if (store.getState().sounds.defaultSounds.entities[filename] === undefined) {
        // guard against mismatch of /audio/standard and sounds from json data files
        soundKeyDict[filename] = { keySignature: undefined, relativeKey: undefined, keyConfidence: 0 }
    }

    if (!Object.keys(soundKeyDict).includes(filename)) {
        const keyLabel = store.getState().sounds.defaultSounds.entities[filename].keySignature
        const keyNumber = keyLabel ? keyLabelToNumber(keyLabel) : undefined
        const keyConfidence = store.getState().sounds.defaultSounds.entities[filename].keyConfidence
        soundKeyDict[filename] = {
            keySignature: keyNumber,
            relativeKey: keyNumber ? relativeKey(keyNumber) : undefined,
            keyConfidence: keyConfidence || 0,
        }
    }
    return soundKeyDict[filename]
}

function computeMode(array: number[]) {
    // Given an array of numbers, return the most frequent number in the array.
    // If there is a tie, return the lowest number.
    const mode = [...array].sort((a, b) =>
        array.filter(v => v === a).length - array.filter(v => v === b).length
    ).pop()
    return mode || undefined
}

function estimateKeySignature(filenames: string[]) {
    // For a given set of files, return an estimated key signature.
    const keyLabels = filenames.map(f => parseKeySignature(f).keySignature)
    const filteredKeyLabels: number[] = keyLabels.filter(k => k !== undefined) as number[]
    return filteredKeyLabels.length !== 0 ? computeMode(filteredKeyLabels) : undefined
}
