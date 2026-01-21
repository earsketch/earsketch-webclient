import i18n from "i18next"
import type { DAWData } from "common"

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

// TODO handle project-level tempo differences
// Function to compare two DAWData objects and return human-readable differences
export function getDAWDataDifferences(previous: DAWData, current: DAWData): string[] {
    if (!previous || (!previous.tracks && !previous.length)) {
        // First run, no comparison needed
        return []
    }
    console.log(current)
    const differences: string[] = []

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
            // New track added
            const clipsWithTempo = currentTrack.clips?.filter(clip => clip.tempo !== undefined) || []
            const clipsWithoutTempo = currentTrack.clips?.filter(clip => clip.tempo === undefined) || []
            const totalMeasures = clipsWithTempo.reduce((sum, clip) => sum + (clip.end - clip.start), 0)
            const allClips = [...clipsWithTempo, ...clipsWithoutTempo]
            const filekeys = [...new Set(allClips.map(clip => clip.filekey))].join(", ")
            const spanStart = clipsWithTempo.length > 0 ? Math.min(...clipsWithTempo.map(clip => clip.measure)) : 0
            const spanEnd = clipsWithTempo.length > 0 ? Math.max(...clipsWithTempo.map(clip => clip.measure + (clip.end - clip.start))) : 0
            const effectCount = Object.keys(currentTrack.effects || {}).length
            const clipCountInfo = clipsWithTempo.length > 0 ? totalMeasures.toFixed(1) : `${clipsWithoutTempo.length} clips (no tempo)`
            differences.push(i18n.t("messages:idecontroller.trackAddedWithDetails", { trackNum, clipCount: clipCountInfo, filekeys, spanStart, spanEnd, effectCount }))
        } else if (prevTrack && !currentTrack) {
            // Track removed
            differences.push(i18n.t("messages:idecontroller.trackRemoved", { trackNum }))
        } else if (prevTrack && currentTrack) {
            // Compare existing tracks
            const prevClipsWithTempo = prevTrack.clips?.filter(clip => clip.tempo !== undefined) || []
            const currentClipsWithTempo = currentTrack.clips?.filter(clip => clip.tempo !== undefined) || []
            const prevClipsWithoutTempo = prevTrack.clips?.filter(clip => clip.tempo === undefined) || []
            const currentClipsWithoutTempo = currentTrack.clips?.filter(clip => clip.tempo === undefined) || []
            const prevTotalMeasures = prevClipsWithTempo.reduce((sum, clip) => sum + (clip.end - clip.start), 0)
            const currentTotalMeasures = currentClipsWithTempo.reduce((sum, clip) => sum + (clip.end - clip.start), 0)
            const prevEffectCount = Object.keys(prevTrack.effects || {}).length
            const currentEffectCount = Object.keys(currentTrack.effects || {}).length

            // Compare total measures of clips WITH tempo
            if (currentTotalMeasures !== prevTotalMeasures) {
                if (currentTotalMeasures > prevTotalMeasures) {
                    const addedMeasures = (currentTotalMeasures - prevTotalMeasures)
                    const currentFilekeys = [...new Set(currentClipsWithTempo.map(clip => clip.filekey))].join(", ")
                    const spanStart = currentClipsWithTempo.length > 0 ? Math.min(...currentClipsWithTempo.map(clip => clip.measure)) : 0
                    const spanEnd = currentClipsWithTempo.length > 0 ? Math.max(...currentClipsWithTempo.map(clip => clip.measure + (clip.end - clip.start))) : 0
                    differences.push(i18n.t("messages:idecontroller.trackClipsAdded", { trackNum, count: addedMeasures, measures: addedMeasures.toFixed(1), filekeys: currentFilekeys, spanStart, spanEnd }))
                } else {
                    const removedMeasures = (prevTotalMeasures - currentTotalMeasures)
                    const prevFilekeys = [...new Set(prevClipsWithTempo.map(clip => clip.filekey))].join(", ")
                    const spanStart = currentClipsWithTempo.length > 0 ? Math.min(...currentClipsWithTempo.map(clip => clip.measure)) : 0
                    const spanEnd = currentClipsWithTempo.length > 0 ? Math.max(...currentClipsWithTempo.map(clip => clip.measure + (clip.end - clip.start))) : 0
                    differences.push(i18n.t("messages:idecontroller.trackClipsRemoved", { trackNum, count: removedMeasures, measures: removedMeasures.toFixed(1), filekeys: prevFilekeys, spanStart, spanEnd }))
                }
            } else {
                // Check for filekey changes in clips WITH tempo when total measures are the same
                const prevFilekeys = new Set(prevClipsWithTempo.map(clip => clip.filekey))
                const currentFilekeys = new Set(currentClipsWithTempo.map(clip => clip.filekey))

                const addedFilekeys = [...currentFilekeys].filter(key => !prevFilekeys.has(key))
                const removedFilekeys = [...prevFilekeys].filter(key => !currentFilekeys.has(key))

                if (addedFilekeys.length > 0 || removedFilekeys.length > 0) {
                    const spanStart = currentClipsWithTempo.length > 0 ? Math.min(...currentClipsWithTempo.map(clip => clip.measure)) : 0
                    const spanEnd = currentClipsWithTempo.length > 0 ? Math.max(...currentClipsWithTempo.map(clip => clip.measure + (clip.end - clip.start))) : 0

                    const addedText = addedFilekeys.length > 0 ? i18n.t("messages:idecontroller.clipFilesAdded", { filekeys: addedFilekeys.join(", ") }) : ""
                    const removedText = removedFilekeys.length > 0 ? i18n.t("messages:idecontroller.clipFilesRemoved", { filekeys: removedFilekeys.join(", ") }) : ""
                    differences.push(i18n.t("messages:idecontroller.trackClipsChanged", {
                        trackNum,
                        measures: currentTotalMeasures.toFixed(1),
                        addedText,
                        removedText,
                        spanStart,
                        spanEnd,
                    }))
                } else if (prevClipsWithTempo.length > 0 && currentClipsWithTempo.length > 0) {
                    // Check for position changes when filekeys and total measures are the same
                    const prevClipPositions = prevClipsWithTempo.map(clip => `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`).sort()
                    const currentClipPositions = currentClipsWithTempo.map(clip => `${clip.filekey}@${clip.measure}-${clip.measure + (clip.end - clip.start)}`).sort()

                    if (prevClipPositions.join(",") !== currentClipPositions.join(",")) {
                        const spanStart = Math.min(...currentClipsWithTempo.map(clip => clip.measure))
                        const spanEnd = Math.max(...currentClipsWithTempo.map(clip => clip.measure + (clip.end - clip.start)))
                        const allFilekeys = [...new Set(currentClipsWithTempo.map(clip => clip.filekey))].join(", ")
                        differences.push(i18n.t("messages:idecontroller.trackClipsPositionChanged", {
                            trackNum,
                            measures: currentTotalMeasures.toFixed(1),
                            filekeys: allFilekeys,
                            spanStart,
                            spanEnd,
                        }))
                    }
                }
            }

            // Compare clips WITHOUT tempo (count only, not measures)
            if (currentClipsWithoutTempo.length !== prevClipsWithoutTempo.length) {
                if (currentClipsWithoutTempo.length > prevClipsWithoutTempo.length) {
                    const addedCount = currentClipsWithoutTempo.length - prevClipsWithoutTempo.length
                    const currentFilekeys = [...new Set(currentClipsWithoutTempo.map(clip => clip.filekey))].join(", ")
                    differences.push(i18n.t("messages:idecontroller.trackClipsAdded", { trackNum, count: addedCount, filekeys: currentFilekeys, span: "no-tempo clips" }))
                } else {
                    const removedCount = prevClipsWithoutTempo.length - currentClipsWithoutTempo.length
                    const prevFilekeys = [...new Set(prevClipsWithoutTempo.map(clip => clip.filekey))].join(", ")
                    differences.push(i18n.t("messages:idecontroller.trackClipsRemoved", { trackNum, count: removedCount, filekeys: prevFilekeys, span: "no-tempo clips" }))
                }
            } else {
                // Check for filekey changes in clips WITHOUT tempo when count is the same
                const prevFilekeysNoTempo = new Set(prevClipsWithoutTempo.map(clip => clip.filekey))
                const currentFilekeysNoTempo = new Set(currentClipsWithoutTempo.map(clip => clip.filekey))

                const addedFilekeysNoTempo = [...currentFilekeysNoTempo].filter(key => !prevFilekeysNoTempo.has(key))
                const removedFilekeysNoTempo = [...prevFilekeysNoTempo].filter(key => !currentFilekeysNoTempo.has(key))

                if (addedFilekeysNoTempo.length > 0 || removedFilekeysNoTempo.length > 0) {
                    const addedTextNoTempo = addedFilekeysNoTempo.length > 0 ? i18n.t("messages:idecontroller.clipFilesAdded", { filekeys: addedFilekeysNoTempo.join(", ") }) : ""
                    const removedTextNoTempo = removedFilekeysNoTempo.length > 0 ? i18n.t("messages:idecontroller.clipFilesRemoved", { filekeys: removedFilekeysNoTempo.join(", ") }) : ""
                    differences.push(i18n.t("messages:idecontroller.trackClipsChangedNoTempo", {
                        trackNum,
                        count: currentClipsWithoutTempo.length,
                        addedText: addedTextNoTempo,
                        removedText: removedTextNoTempo,
                    }))
                }
            }

            // Compare effects and types
            if (currentEffectCount || prevEffectCount) {
                const prevEffectKeys = new Set(Object.keys(prevTrack.effects || {}))
                const currentEffectKeys = new Set(Object.keys(currentTrack.effects || {}))

                const addedEffectTypes = [...currentEffectKeys].filter(key => !prevEffectKeys.has(key))
                const removedEffectTypes = [...prevEffectKeys].filter(key => !currentEffectKeys.has(key))

                if (addedEffectTypes.length > 0) {
                    differences.push(i18n.t("messages:idecontroller.trackEffectTypesAdded", { trackNum, count: addedEffectTypes.length, effects: addedEffectTypes.join(", ") }))
                }
                if (removedEffectTypes.length > 0) {
                    differences.push(i18n.t("messages:idecontroller.trackEffectTypesRemoved", { trackNum, count: removedEffectTypes.length, effects: removedEffectTypes.join(", ") }))
                }
            }
        }
    }

    return differences
}
