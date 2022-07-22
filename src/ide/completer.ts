// Register Ace completer for EarSketch API and audio constants.
import { Ace, require as aceRequire } from "ace-builds"

import { ESApiDoc } from "../data/api_doc"
import * as audioLibrary from "../app/audiolibrary"

const langTools = aceRequire("ace/ext/language_tools")

// Get the list of autocompletions
const apiCompletions: string[] = []
for (const entries of Object.values(ESApiDoc)) {
    apiCompletions.push(...entries.map(entry => entry.autocomplete))
}

const earsketchCompleter: Ace.Completer = {
    async getCompletions(editor, session, pos, prefix, callback) {
        if (prefix.length < 2) {
            callback(null, [])
            return
        }

        // Include API function completions.
        const completions = apiCompletions.filter(f => f.includes(prefix)).map((f, i) => ({
            name: f, value: f, score: -i, meta: "EarSketch function",
        }))

        // Include audio constants. If they haven't been fetched yet, go ahead and provide whatever completions we can.
        if (audioLibrary.cache.standardSounds === null) {
            audioLibrary.getStandardSounds()
        }

        if (audioLibrary.cache.folders === null) {
            audioLibrary.getStandardFolders()
        }

        // Combine constants.
        const standardConstants = audioLibrary.cache.standardSounds?.map(sound => sound.name)
        const merged = new Set((standardConstants ?? []).concat(audioLibrary.EFFECT_NAMES, audioLibrary.ANALYSIS_NAMES, audioLibrary.cache.folders ?? []))
        const sorted = Array.from(merged).sort().reverse()
        const constants = sorted
            .filter(tag => tag !== undefined && tag.includes(prefix))
            .map((tag, i) => ({ name: tag, value: tag, score: i, meta: "EarSketch constant" }))

        completions.push(...constants)
        callback(null, completions)
    },
}

// Reset completers to remove Python keyword completer that we don't want to show students.
langTools.setCompleters(null)
langTools.addCompleter(langTools.snippetCompleter)
langTools.addCompleter(earsketchCompleter)
