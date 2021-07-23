// Register Ace completer for EarSketch API and audio constants.
import { Ace, require as aceRequire } from "ace-builds"

import { ESApiDoc } from "../data/api_doc"
import * as audioLibrary from "../app/audiolibrary"

const langTools = aceRequire("ace/ext/language_tools")

// Get the list of autocompletions
const apiCompletions: string[] = []
for (const data of Object.values(ESApiDoc)) {
    const entries = Array.isArray(data) ? data : [data]
    apiCompletions.push(...entries.map(entry => entry.autocomplete).filter(a => a !== undefined))
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
        if (audioLibrary.cache.audioTags === null) {
            audioLibrary.getAudioTags()
        }

        if (audioLibrary.cache.audioFolders === null) {
            audioLibrary.getAudioFolders()
        }

        // Combine constants.
        const merged = new Set((audioLibrary.cache.audioTags ?? []).concat(audioLibrary.EFFECT_TAGS, audioLibrary.ANALYSIS_TAGS, audioLibrary.cache.audioFolders ?? []))
        const sorted = Array.from(merged).sort().reverse()
        const constants = sorted
            .filter(tag => tag !== undefined && tag.includes(prefix))
            .map((tag, i) => ({ name: tag, value: tag, score: i, meta: "EarSketch constant" }))

        completions.push(...constants)
        callback(null, completions)
    }
}

// Reset completers to remove Python keyword completer that we don't want to show students.
langTools.setCompleters(null)
langTools.addCompleter(langTools.snippetCompleter)
langTools.addCompleter(earsketchCompleter)
