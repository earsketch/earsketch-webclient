export interface APIConfig {
    // Does this API function need to wait for something asynchronous (like fetching a sound)?
    async: boolean
    // Does this API function modify the state of the DAW?
    mod: boolean
    // Does this API function return a value for the user?
    return: boolean
}

export const API_FUNCTIONS = {
    // No return value, modify DAW data.
    init: { async: false, mod: true, return: false },
    setTempo: { async: false, mod: true, return: false },
    finish: { async: false, mod: true, return: false },
    fitMedia: { async: false, mod: true, return: false },
    insertMedia: { async: false, mod: true, return: false },
    makeBeat: { async: false, mod: true, return: false },
    rhythmEffects: { async: false, mod: true, return: false },
    setEffect: { async: false, mod: true, return: false },
    // Return value, don't modify DAW data.
    gauss: { async: false, mod: false, return: true },
    println: { async: false, mod: false, return: true },
    replaceListElement: { async: false, mod: false, return: true },
    replaceString: { async: false, mod: false, return: true },
    reverseList: { async: false, mod: false, return: true },
    reverseString: { async: false, mod: false, return: true },
    selectRandomFile: { async: false, mod: false, return: true },
    shuffleList: { async: false, mod: false, return: true },
    shuffleString: { async: false, mod: false, return: true },
    // Both return a value and modify DAW data.
    createAudioSlice: { async: false, mod: true, return: true },
    // Async: no return value, modify DAW data.
    insertMediaSection: { async: true, mod: true, return: false },
    makeBeatSlice: { async: true, mod: true, return: false },
    // Async: return value, don't modify DAW data.
    analyze: { async: true, mod: false, return: true },
    analyzeForTime: { async: true, mod: false, return: true },
    analyzeTrack: { async: true, mod: false, return: true },
    analyzeTrackForTime: { async: true, mod: false, return: true },
    dur: { async: true, mod: false, return: true },
    readInput: { async: true, mod: false, return: true },
    importImage: { async: true, mod: false, return: true },
    importFile: { async: true, mod: false, return: true },
}
