import i18n from "i18next"
import type { DAWData } from "common"
import { TempoMap } from "../app/tempo"

// Function to clone DAWData without AudioBuffer properties (which can't be cloned)
export function cloneDAWDataForComparison(data: DAWData): DAWData {
    return {
        length: data.length,
        tracks: data.tracks?.map(track => ({
            ...track,
            clips: track.clips?.map(clip => ({
                ...clip,
                // Exclude AudioBuffer properties that can't be cloned
                audio: undefined as any,
                sourceAudio: undefined as any,
            })) || [],
        })) || [],
        transformedClips: { ...data.transformedClips },
    }
}

export function roundToDecimalPlaces(num: number, places: number) {
    const factor = 10 ** places
    return Math.round(num * factor) / factor
}

// Function to compare two DAWData objects and return human-readable differences
export function getDAWDataDifferences(previous: DAWData, current: DAWData): string[] {
    if (!previous || (!previous.tracks && !previous.length)) {
        // First run, no comparison needed
        return []
    }
    const differences: string[] = []

    // Compare tempo changes
    const previousTempo = new TempoMap(previous)
    const currentTempo = new TempoMap(current)

    // Compare tempo points arrays properly
    const prevTempoStr = JSON.stringify(previousTempo.points)
    const currentTempoStr = JSON.stringify(currentTempo.points)

    if (prevTempoStr !== currentTempoStr) {
        differences.push(i18n.t("messages:idecontroller.tempoChanged"))
    }

    // Compare number of tracks (excluding first track which is metronome)
    const prevTrackCount = Math.max(0, (previous.tracks?.length || 0) - 1)
    const currentTrackCount = Math.max(0, (current.tracks?.length || 0) - 1)

    if (currentTrackCount > prevTrackCount) {
        differences.push(i18n.t("messages:idecontroller.tracksAdded", { count: currentTrackCount - prevTrackCount }))
    } else if (currentTrackCount < prevTrackCount) {
        differences.push(i18n.t("messages:idecontroller.tracksRemoved", { count: prevTrackCount - currentTrackCount }))
    }

    // Compare project length
    if (previous.length !== current.length) {
        if (current.length > previous.length) {
            differences.push(i18n.t("messages:idecontroller.projectLengthIncreased", { from: previous.length, to: current.length }))
        } else {
            differences.push(i18n.t("messages:idecontroller.projectLengthDecreased", { from: previous.length, to: current.length }))
        }
    }

    // Compare tracks in detail (skip first track which is metronome)
    const maxTracks = Math.max((previous.tracks?.length || 0), (current.tracks?.length || 0))
    for (let trackIndex = 1; trackIndex < maxTracks; trackIndex++) {
        const prevTrack = previous.tracks?.[trackIndex]
        const currentTrack = current.tracks?.[trackIndex]
        const trackNum = trackIndex

        if (!prevTrack && currentTrack) {
            // New track added - details already reported in track count
            continue
        } else if (prevTrack && !currentTrack) {
            // Track removed - details already reported in track count
            continue
        } else if (prevTrack && currentTrack) {
            // Compare existing tracks
            const prevClips = prevTrack.clips || []
            const currentClips = currentTrack.clips || []
            const prevEffectCount = Object.keys(prevTrack.effects || {}).length
            const currentEffectCount = Object.keys(currentTrack.effects || {}).length

            // Get clip filekeys
            const prevFilekeys = new Set(prevClips.map(clip => clip.filekey))
            const currentFilekeys = new Set(currentClips.map(clip => clip.filekey))

            const addedFilekeys = [...currentFilekeys].filter(key => !prevFilekeys.has(key))
            const removedFilekeys = [...prevFilekeys].filter(key => !currentFilekeys.has(key))

            // Calculate track spans
            const currentSpanStart = currentClips.length > 0 ? Math.min(...currentClips.map(clip => clip.measure)) : 0
            const currentSpanEnd = currentClips.length > 0 ? Math.ceil(Math.max(...currentClips.map(clip => clip.measure + (clip.end - clip.start)))) : 0

            // Check if clips changed (added or removed filekeys)
            if (addedFilekeys.length > 0 || removedFilekeys.length > 0) {
                if (addedFilekeys.length > 0 && removedFilekeys.length === 0) {
                    // Only additions - use current span
                    differences.push(i18n.t("messages:idecontroller.trackClipsAdded", {
                        trackNum,
                        filekeys: addedFilekeys.join(", "),
                        spanStart: currentSpanStart,
                        spanEnd: currentSpanEnd
                    }))
                } else if (removedFilekeys.length > 0 && addedFilekeys.length === 0) {
                    // Only removals - use current span to show where the track is now
                    differences.push(i18n.t("messages:idecontroller.trackClipsRemoved", {
                        trackNum,
                        filekeys: removedFilekeys.join(", "),
                        spanStart: currentSpanStart,
                        spanEnd: currentSpanEnd
                    }))
                } else {
                    // Both added and removed - use current span
                    const addedText = i18n.t("messages:idecontroller.clipFilesAdded", { filekeys: addedFilekeys.join(", ") })
                    const removedText = i18n.t("messages:idecontroller.clipFilesRemoved", { filekeys: removedFilekeys.join(", ") })
                    differences.push(i18n.t("messages:idecontroller.trackClipsChanged", {
                        trackNum,
                        addedText,
                        removedText,
                        spanStart: currentSpanStart,
                        spanEnd: currentSpanEnd,
                    }))
                }
            } else if (prevClips.length > 0 && currentClips.length > 0) {
                // Same filekeys - check if positions or span changed
                const prevClipPositions = prevClips.map(clip => `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`)
                const currentClipPositions = currentClips.map(clip => `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`)

                const prevPositionSet = new Set(prevClipPositions)
                const currentPositionSet = new Set(currentClipPositions)

                if (prevClipPositions.sort().join(",") !== currentClipPositions.sort().join(",")) {
                    // Find filekeys whose positions changed
                    const changedFilekeys = new Set<string>()

                    // Check current clips against previous
                    currentClips.forEach(clip => {
                        const currentPos = `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`
                        if (!prevPositionSet.has(currentPos)) {
                            changedFilekeys.add(clip.filekey)
                        }
                    })

                    // Check previous clips against current
                    prevClips.forEach(clip => {
                        const prevPos = `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`
                        if (!currentPositionSet.has(prevPos)) {
                            changedFilekeys.add(clip.filekey)
                        }
                    })

                    differences.push(i18n.t("messages:idecontroller.trackClipsPositionChanged", {
                        trackNum,
                        filekeys: [...changedFilekeys].join(", "),
                        spanStart: currentSpanStart,
                        spanEnd: currentSpanEnd,
                    }))
                }
            }

            // Compare effects
            if (currentEffectCount !== prevEffectCount || currentEffectCount > 0) {
                const prevEffectKeys = new Set(Object.keys(prevTrack.effects || {}))
                const currentEffectKeys = new Set(Object.keys(currentTrack.effects || {}))

                const addedEffectTypes = [...currentEffectKeys].filter(key => !prevEffectKeys.has(key))
                const removedEffectTypes = [...prevEffectKeys].filter(key => !currentEffectKeys.has(key))

                if (addedEffectTypes.length > 0) {
                    differences.push(i18n.t("messages:idecontroller.trackEffectTypesAdded", {
                        trackNum,
                        count: addedEffectTypes.length,
                        effects: addedEffectTypes.join(", ")
                    }))
                }
                if (removedEffectTypes.length > 0) {
                    differences.push(i18n.t("messages:idecontroller.trackEffectTypesRemoved", {
                        trackNum,
                        count: removedEffectTypes.length,
                        effects: removedEffectTypes.join(", ")
                    }))
                }
            }
        }
    }

    return differences
}
