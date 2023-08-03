// Automated Creativity Assessment for CAI (Co-creative Artificial Intelligence) Project.
import { Report } from "./analysis"
import { Results } from "./complexityCalculator"
import { audiokeysPromise } from "../app/recommender"
import { getTimestampData } from "../data/recommendationData"
import NUMBERS_AUDIOKEYS from "../data/numbers_audiokeys"
import { Script } from "common"
import { mean } from "lodash"
import { entropy, combinations, hammingDistance, normalize } from "./utils"

type beatTimestampData = {
    beat_timestamps: number[],
    duration: number
}

const beatTimestampsPromise: Promise<{ [key: string]: beatTimestampData }> = getTimestampData()

export interface Assessment {
    fluency: {
        numSounds: number
        numTracks: number
        numInstruments: number
    }

    flexibility: {
        genres: number
    }

    originality: {
        avgSoundsCooccurence: number
    }

    elaboration: {
        lengthSeconds: number
        lengthMeasures: number
    }

    complexity: {
        breadth: number
        avgDepth: number
        rhythmicComplexity: number
        beatComplexity: number
    }

    effort: {
        timeOnTask: number
    }

    divergentThinking: number
    creativeProduct: number
    creativityScore: number
}

interface AudioFeatures{
    name: string,
    beat_track: number[],
}

function emptyAssessment(): Assessment {
    return {
        fluency: {
            numSounds: 0,
            numTracks: 0,
            numInstruments: 0,
        },
        flexibility: {
            genres: 0,
        },
        originality: {
            avgSoundsCooccurence: 0,
        },
        elaboration: {
            lengthSeconds: 0,
            lengthMeasures: 0,
        },
        complexity: {
            breadth: 0,
            avgDepth: 0,
            rhythmicComplexity: 0,
            beatComplexity: 0,
        },
        effort: {
            timeOnTask: 0,
        },
        divergentThinking: 0,
        creativeProduct: 0,
        creativityScore: 0,
    }
}

function average(assessment: Assessment, subfacet: keyof Assessment) {
    const values: number [] = []
    for (const value of Object.values(assessment[subfacet])) {
        values.push(value)
    }
    return mean(values)
}

function createBeatTrack(beatTimestamps: number[], duration: number = 10) {
    const n = 100 * duration
    const beatTrack = []
    for (let i = 0; i < n; i++) {
        beatTrack.push(0)
    }
    for (const beat of beatTimestamps) {
        beatTrack[Math.floor(beat * 100)] = 1
    }
    return beatTrack
}

function rhythmicAnalysis(soundData: AudioFeatures[]) {
    // if there are less than 2 sounds, return 0
    const combos = combinations(soundData, 2)
    const distances = []
    const entropies = []
    for (const sound of soundData) {
        const beatTrack = createBeatTrack(sound.beat_track)
        const normalized = normalize(beatTrack)
        const _entropy = entropy(normalized)
        entropies.push(_entropy)
    }
    if (soundData.length < 2) {
        return { complexity: 0, entropy: 0 }
    }
    for (const combo of combos) {
        const beatTrackA = createBeatTrack(combo[0].beat_track)
        const beatTrackB = createBeatTrack(combo[1].beat_track)
        const distance = hammingDistance(beatTrackA, beatTrackB)
        distances.push(distance)
    }
    const avgDistance = mean(distances)
    const avgEntropy = mean(entropies)
    return { complexity: avgDistance, entropy: avgEntropy }
}

export async function assess(script: Script, complexity: Results, analysisReport: Report): Promise<Assessment> {
    const assessment = emptyAssessment()

    const uniqueSounds: string [] = []
    const uniqueTracks: number [] = []
    const uniqueInstruments: string [] = []
    const uniqueGenres: string [] = []
    const soundFeatures: AudioFeatures[] = []

    for (const measure of Object.keys(analysisReport.MEASUREVIEW)) {
        for (const item of analysisReport.MEASUREVIEW[Number(measure)]) {
            if (!uniqueTracks.includes(item.track)) {
                uniqueTracks.push(item.track)
            }
            if (item.type === "sound" && item.instrument && item.genre) {
                if (!uniqueSounds.includes(item.name)) {
                    uniqueSounds.push(item.name)
                }
                if (!uniqueInstruments.includes(item.instrument)) {
                    uniqueInstruments.push(item.instrument)
                }
                if (!uniqueGenres.includes(item.genre)) {
                    uniqueGenres.push(item.genre)
                }
            }
        }
    }
    // map BEAT_TIMESTAMPS to soundFeatures
    for (const sound of uniqueSounds) {
        // const beatTrack = [sound].beat_timestamps
        const beatTrack = (await beatTimestampsPromise)[sound].beat_timestamps
        soundFeatures.push({ name: sound, beat_track: beatTrack })
    }

    const perMeasureScore: Array<{ measure: number, complexity: number, entropy: number }> = []

    for (const measure of Object.keys(analysisReport.MEASUREVIEW)) {
        const items = analysisReport.MEASUREVIEW[Number(measure)]
        // remove effects from items
        const filteredItems = items.filter(item => item.type === "sound")
        // if all the items are sounds, let's proceed to rhythmicAnalysis
        if (filteredItems.length > 1) {
            // get soundFeatures for each item by name
            const subset = soundFeatures.filter(sound => filteredItems.map(item => item.name).includes(sound.name))
            // get rhythmicAnalysis for each sound
            const rhythmicAnalysisResults = rhythmicAnalysis(subset)
            // get rhythmicComplexity and beatComplexity
            const rhythmicComplexity = rhythmicAnalysisResults.complexity
            const beatComplexity = rhythmicAnalysisResults.entropy
            // add to perMeasureScore
            perMeasureScore.push({ measure: Number(measure), complexity: rhythmicComplexity, entropy: beatComplexity })
        }
    }

    // compute average complexity and entropy
    const avgComplexity = mean(perMeasureScore.map(item => item.complexity))
    const avgEntropy = mean(perMeasureScore.map(item => item.entropy))

    // Fluency = Average (z-# of sounds, z-tracks, z-instruments)
    assessment.fluency = {
        numSounds: uniqueSounds.length,
        numTracks: uniqueTracks.length,
        numInstruments: uniqueInstruments.length,
    }

    // Flexibility = z-# of genres
    assessment.flexibility.genres = uniqueGenres.length

    // Originality = z- sound co-occurrence
    let cooccurence = 0
    // let beatComplexity = 0
    // let rhythmicComplexity = 0

    for (const soundA of uniqueSounds) {
        const audioNumberA = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === soundA)
        if (!audioNumberA) { continue }
        const audioRec = (await audiokeysPromise)[audioNumberA]
        if (!audioRec) { continue }
        for (const soundB of uniqueSounds) {
            if (soundA === soundB) { continue }
            const audioNumberB = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === soundB)
            if (audioNumberA && audioNumberB) {
                if (audioRec !== undefined) {
                    for (const [num, value] of Object.entries(audioRec)) {
                        if (num === audioNumberB) {
                            cooccurence += value[1]
                        }
                    }
                }
            }
        }
    }

    assessment.originality.avgSoundsCooccurence = cooccurence / uniqueSounds.length

    // Elaboration = Average (z-length seconds, measures)
    assessment.elaboration = {
        lengthSeconds: analysisReport.OVERVIEW["length (seconds)"],
        lengthMeasures: analysisReport.OVERVIEW.measures,
    }

    // Music Complexity = Average (z-entropy and z-cohesion)
    // Code Complexity = Average (z-breadth and z-Avg. Depth)
    // Complexity = Average (2 & 3)
    assessment.complexity = {
        breadth: complexity.depth.breadth,
        avgDepth: complexity.depth.avgDepth,
        rhythmicComplexity: avgComplexity,
        beatComplexity: avgEntropy,
    }

    // Effort = z-time on task
    assessment.effort.timeOnTask = 0

    // Divergent Thinking = Average (4, 5, 6, 7)
    assessment.divergentThinking = mean([average(assessment, "fluency"), average(assessment, "flexibility"), average(assessment, "originality"), average(assessment, "elaboration")])

    // Creative Product = Average (8, 9)
    assessment.creativeProduct = mean([average(assessment, "complexity"), average(assessment, "effort")])

    // Creativity in ES = Average (10, 11)
    assessment.creativityScore = mean([assessment.divergentThinking, assessment.creativeProduct])

    return assessment
}
