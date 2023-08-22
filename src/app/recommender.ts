// Recommend audio samples.
import { Script, SoundEntity } from "common"
import NUMBERS_AUDIOKEYS from "../data/numbers_audiokeys"
import { getRecommendationData, getBeatData } from "../data/recommendationData"

export const audiokeysPromise: Promise<{ [key: string]: { [key: string]: number[] } }> = getRecommendationData()
export const beatsPromise: Promise<{ [key: string]: number[] }> = getBeatData()

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

const pitchClassToNote: {
    [key: number]: string,
} = {
    0: "C",
    1: "C#/Db",
    2: "D",
    3: "D#/Eb",
    4: "E",
    5: "F",
    6: "F#/Gb",
    7: "G",
    8: "G#/Ab",
    9: "A",
    10: "A#/Bb",
    11: "B",
}

export const relativeKey = (num: number) => {
    if (num >= 12) {
        // minor, relative major
        return (num + 3) % 12
    } else {
        // major key, find relative minor
        return (num + 9) % 12 + 12
    }
}

// Convert key string to number.
export const keyLabelToNumber = (label: string) => {
    const labelPair = label.split(" ")
    return noteToPitchClass[labelPair[0]] + 12 * Number(["Minor", "minor"].includes(labelPair[1]))
}

export const keyNumberToLabel = (num: number) => {
    const label = num >= 12 ? " minor" : " major"
    return pitchClassToNote[num % 12] + label
}

export const splitEnharmonics = (label: string): [string, string] => {
    const labelPair = label.split(" ")
    const enharmonics = labelPair[0].split("/")
    return [enharmonics[0] + " " + labelPair[1], enharmonics[1] + " " + labelPair[1]]
}

// Load lists of numbers and keys
let AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)

interface KeyInformation {
    keySignature: number | undefined
    relativeKey: number | undefined
    keyConfidence: number
}

interface SoundInformation {
    artist: string
    genre: string
    instrument: string
    key: KeyInformation
}

export const soundDict: { [key: string]: SoundInformation } = {}

// Populate the sound-browser items
export function fillDict(sounds: SoundEntity []) {
    for (const sound of sounds) {
        const keyNumber = sound.keySignature ? keyLabelToNumber(sound.keySignature) : undefined
        soundDict[sound.name] = {
            artist: sound.artist,
            genre: sound.genre,
            instrument: sound.instrument,
            key: {
                keySignature: keyNumber,
                relativeKey: keyNumber ? relativeKey(keyNumber) : undefined,
                keyConfidence: sound.keyConfidence || 0,
            },
        }
    }

    // Update list of audio samples for audio recommendation input/CAI output.
    AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS).filter((key) => {
        return soundDict[key] !== null
    })
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

async function findAvailableSounds(genreLimit: string[] = [], instrumentLimit: string[] = [], keyLimit: (number | undefined)[] = [], artistLimit: string[] = []): Promise<string[]> {
    const sounds = []
    for (const key in soundDict) {
        if (genreLimit.length === 0 || genreLimit.includes(soundDict[key].genre)) {
            if (instrumentLimit.length === 0 || instrumentLimit.includes(soundDict[key].instrument)) {
                if (keyLimit.length === 0 || keyLimit.includes(soundDict[key].key.keySignature)) {
                    if (artistLimit.length === 0 || artistLimit.includes(soundDict[key].artist)) {
                        sounds.push(key)
                    }
                }
            }
        }
    }
    return sounds
}

export async function recommend(inputSamples: string[], coUsage: number = 1, similarity: number = 1,
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3,
    keyOverride?: (number | undefined)[], artistLimit: string[] = []) {
    let filteredRecs: string[] = []
    // add key info for all generated recommendations using original input sample lists.
    const useKeyOverride = keyOverride || [estimateKeySignature(inputSamples)]

    if (previousRecommendations.length === Object.keys(soundDict).length) {
        previousRecommendations = []
    }

    while (filteredRecs.length < bestLimit) {
        const recs: { [key: string]: number } = {}
        const outputs = (await findAvailableSounds(genreLimit, instrumentLimit, useKeyOverride, artistLimit)).sort(() => 0.5 - Math.random()).slice(0, 200)

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
        filteredRecs = Object.keys(recs).filter(r => !previousRecommendations.includes(r)).sort((a, b) => recs[a] - recs[b]).slice(0, bestLimit)

        if (genreLimit.length > 0) {
            genreLimit.pop()
        } else if (instrumentLimit.length > 0) {
            instrumentLimit.pop()
        } else if (keyOverride && keyOverride.length > 0) {
            keyOverride.pop()
        } else if (artistLimit.length > 0) {
            artistLimit.pop()
        } else {
            return filteredRecs
        }
    }
    return filteredRecs
}

async function generateRecommendations(inputSamples: string[], coUsage: number = 1, similarity: number = 1, keyOverride?: (number|undefined)[]) {
    // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
    coUsage = Math.sign(coUsage)
    similarity = Math.sign(similarity)
    // use key signature estimated from input samples or specified key signature.
    const songKeySignatures = keyOverride || [estimateKeySignature(inputSamples)]
    // Generate recommendations for each input sample and add together
    const recs: { [key: string]: number } = Object.create(null)
    for (const inputSample of inputSamples) {
        const audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSample)
        if (audioNumber !== undefined) {
            const audioRec = (await audiokeysPromise)[audioNumber]
            if (audioRec !== undefined) {
                for (const [num, value] of Object.entries(audioRec)) {
                    const soundObj = NUMBERS_AUDIOKEYS[num]
                    let keyScore = 0
                    if (songKeySignatures && soundDict[soundObj]) {
                        const soundKeyInformation = soundDict[soundObj].key
                        if (songKeySignatures.includes(soundKeyInformation.keySignature)) {
                            keyScore = 3 * soundKeyInformation.keyConfidence
                        } else if (songKeySignatures.includes(soundKeyInformation.relativeKey)) {
                            keyScore = 2 * soundKeyInformation.keyConfidence
                        }
                    }
                    const fullVal = value[0] + coUsage * value[1] + similarity * value[2] + keyScore
                    const key = NUMBERS_AUDIOKEYS[num]
                    if (key in recs) {
                        recs[key] = (fullVal + recs[key]) / 1.41
                    } else {
                        recs[key] = fullVal
                    }
                    const bestBeats = (await beatsPromise)[num] as number[]
                    Object.entries(bestBeats).forEach(([idx, value]) => {
                        const key = NUMBERS_AUDIOKEYS[idx]
                        if (key in recs) {
                            recs[key] += 1 - value / 10
                        } else {
                            recs[key] = 1 - value / 10
                        }
                    })
                }
            }
        }
    }
    return recs
}

export function findAvailable(searchType: "genre" | "instrument") {
    const found: string [] = []
    for (const audiokey of AUDIOKEYS) {
        if (!soundDict[audiokey]) { continue }
        const name = soundDict[audiokey][searchType]
        if (!found.includes(name) && ![undefined, "MAKEBEAT"].includes(name)) {
            found.push(name)
        }
    }
    return found
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
    const keyLabels = filenames.map(f => { return soundDict[f].key.keySignature })
    const filteredKeyLabels: number[] = keyLabels.filter(k => k !== undefined) as number[]
    return filteredKeyLabels.length !== 0 ? computeMode(filteredKeyLabels) : undefined
}
