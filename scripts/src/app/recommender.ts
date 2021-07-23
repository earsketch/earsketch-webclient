// Recommend audio samples.
import { fillDict } from "../cai/analysis"
import { Script } from "common"

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
import AUDIOKEYS_RECOMMENDATIONS_ from "../data/audiokeys_recommendations.json"

const NUMBERS_AUDIOKEYS: { [key: string]: string } = NUMBERS_AUDIOKEYS_
const AUDIOKEYS_RECOMMENDATIONS: { [key: string]: { [key: string]: number[] } } = AUDIOKEYS_RECOMMENDATIONS_

// Load lists of numbers and keys
let AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)

let keyGenreDict: { [key: string]: string } = {}
let keyInstrumentDict: { [key: string]: string } = {}

export function setKeyDict(genre: { [key: string]: string }, instrument: { [key: string]: string }) {
    keyGenreDict = genre
    keyInstrumentDict = instrument

    // Update list of audio samples for audio recommendation input/CAI output.
    AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS).filter(function(key) {
        return Object.keys(keyGenreDict).includes(key)
    });
}

export function getKeyDict(type: string) {
    if (type === 'genre') { 
        return keyGenreDict 
    } else if (type === 'instrument') { 
        return keyInstrumentDict 
    } else { 
        return {}
    }
}

export function addRecInput(recInput: string[], script: Script) {
    // Generate list of input samples
    let lines = script.source_code.split('\n')
    for (let line = 0; line < lines.length; line++) {
        for (let idx = 0; idx < AUDIOKEYS.length; idx++) {
            let name = AUDIOKEYS[idx]
            // exclude makebeat
            if (name.slice(0, 3) !== 'OS_' && lines[line].includes(name) && !recInput.includes(name)) {
                // exclude comments
                if (lines[line].indexOf('#') === -1 || lines[line].indexOf(name) < lines[line].indexOf('#')) {
                    recInput.push(name)
                }
            }
        }
    }
    return recInput;
}

export function addRandomRecInput(recInput: string[] = []) {
    let name = "";
    while(!AUDIOKEYS.includes(name) && recInput.length < 5) {
        name = AUDIOKEYS[Math.floor(Math.random()*AUDIOKEYS.length)]
        if (!recInput.includes(name)) {
            recInput.push(name)
        }
    }
    return recInput
}

export function findGenreInstrumentCombinations(genreLimit: string[] = [], instrumentLimit: string[] = []) : any {
    let sounds = []
    if (Object.keys(keyGenreDict).length < 1) { 
        fillDict().then(function() {
            return findGenreInstrumentCombinations(genreLimit, instrumentLimit) 
        })
    } else {
        for (let key in keyGenreDict) {
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
    let filteredRecs : string[] = []
    if (Object.keys(recs).length === 0) {
        recs = generateRecommendations(addRandomRecInput(), coUsage, similarity)
    }
    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }
    filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit, 
        previousRecommendations, bestLimit)
    return filteredRecs;
}

export function recommendReverse(recommendedSounds: string[], inputSamples: string[], coUsage: number = 1, similarity: number = 1, 
    genreLimit: string[] = [], instrumentLimit: string[] = [], previousRecommendations: string[] = [], bestLimit: number = 3) {

    let filteredRecs : string[] = []

    if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
        previousRecommendations = []
    }

    while (filteredRecs.length < bestLimit) {
        let recs : { [key:string]: number } = {}
        let outputs = findGenreInstrumentCombinations(genreLimit, instrumentLimit);
        filteredRecs = []
        for (let i in outputs) {
            let outputRecs = generateRecommendations([outputs[i]], coUsage, similarity);
            if (!(outputs[i] in recs)) {
                recs[outputs[i]] = 0
            }
            for (let key in outputRecs) {
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

function generateRecommendations(inputSamples: string[], coUsage: number = 1, similarity: number = 1) {
    // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
    coUsage = Math.sign(coUsage)
    similarity = Math.sign(similarity)
    // Generate recommendations for each input sample and add together
    let recs: { [key: string] : number } = {}
    for (let idx = 0; idx < inputSamples.length; idx++) {
        let audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSamples[idx])
        if (audioNumber !== undefined) {
            let audioRec = AUDIOKEYS_RECOMMENDATIONS[audioNumber]
            for (let num in audioRec) {
                if (!audioRec.hasOwnProperty(num)) {
                    throw new Error('Error enumerating the recommendation audioKeys')
                }
                const value = audioRec[num]
                const full_val = value[0] + coUsage * value[1] + similarity * value[2]
                const key = NUMBERS_AUDIOKEYS[num]

                if (Object.keys(recs).includes(key)) {
                    recs[key] = (full_val + recs[key]) / 1.41
                } else {
                    recs[key] = full_val
                }
            }
        }
    }
    return recs
}

function filterRecommendations(inputRecs: { [key: string]: number }, recommendedSounds: string[], inputSamples: string[], 
    genreLimit: string[], instrumentLimit: string[], previousRecommendations: string[], bestLimit: number) {
    let recs: { [key: string]: number } = {}
    for (let key in inputRecs) {
        if (!recommendedSounds.includes(key) && !inputSamples.includes(key) &&
            !previousRecommendations.includes(key) && key.slice(0,3) !== 'OS_') {
            recs[key] = inputRecs[key]
        }
    }
    if (inputSamples.length > 0) {
        let i : number = 0
        while (i < bestLimit) {
            const maxScore = Object.values(recs).reduce((a, b) => a > b ? a : b);
            let maxRecs = []
            for (let key in recs) {
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
                        i += 1;
                    }
                }
            }
            delete recs[maxRec];
        }
    }
    return recommendedSounds;
}

export function availableGenres() {
    let genres : string[] = []
    for (let idx = 0; idx < AUDIOKEYS.length; idx++) {
        const name = AUDIOKEYS[idx]
        const genre = keyGenreDict[name]
        if (!genres.includes(genre) && genre !== undefined && genre !== "MAKEBEAT") {
            genres.push(genre)
        }
    }
    return genres
}

export function availableInstruments() {
    let instruments : string[] = []
    for (let idx = 0; idx < AUDIOKEYS.length; idx++) {
        const name = AUDIOKEYS[idx]
        const instrument = keyInstrumentDict[name]
        if (!instruments.includes(instrument) && instrument !== undefined) {
            instruments.push(instrument)
        }
    }
    return instruments
}
