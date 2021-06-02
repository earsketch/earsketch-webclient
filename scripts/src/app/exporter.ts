// Export a script as text, audio file, or zip full of audio files.
// Also supports printing scripts and uploading to SoundCloud (which is perplexing because we have another moduled named "uploader").
import { ScriptEntity } from "common"
import * as compiler from "./compiler"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as helpers from "../helpers"
import ESMessages from "../data/messages"
import { DAWData } from "./player"
import * as renderer from "./renderer"

// Make a dummy anchor for downloading the script as text.
let dummyAnchor = document.createElement("a")
document.body.appendChild(dummyAnchor)
dummyAnchor.style.display = "none"

// Export the script as a text file.
export function text(script: ScriptEntity) {
    esconsole("Downloading script locally.", ["debug", "exporter"])
    const blob = new Blob([script.source_code], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    // Download the script.
    dummyAnchor.href = url
    dummyAnchor.download = script.name
    dummyAnchor.target = "_blank"
    esconsole("File location: " + url, ["debug", "exporter"])
    dummyAnchor.click()
}

async function compile(script: ScriptEntity, quality: number) {
    const lang = ESUtils.parseLanguage(script.name)
    let result
    try {
        result = await (lang === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, quality)
    } catch {
        throw ESMessages.download.compileerror
    }
    if (result.length === 0) {
        throw ESMessages.download.emptyerror
    }
    return result
}

// Exports the script as an audio file.
async function exportAudio(script: ScriptEntity, quality: number, type: string, render: (result: DAWData) => Promise<Blob>) {
    const name = ESUtils.parseName(script.name)
    const result = await compile(script, quality)

    let blob
    try {
        blob = await render(result)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw ESMessages.download.rendererror
    }

    esconsole(`Ready to download ${type} file.`, ["debug", "exporter"])
    // save the file locally without sending to the server.
    return {
        path: (window.URL || window.webkitURL).createObjectURL(blob),
        name: `${name}.${type}`,
    }
}

export function wav(script: ScriptEntity, quality: number) {
    return exportAudio(script, quality, "wav", renderer.renderWav)
}

export function mp3(script: ScriptEntity, quality: number) {
    return exportAudio(script, quality, "mp3", renderer.renderMp3)
}

export async function multiTrack(script: ScriptEntity, quality: number) {
    const result = await compile(script, quality)
    const name = ESUtils.parseName(script.name)

    const zip = new JSZip()

    // mute all
    for (const track of result.tracks) {
        for (const clip of track.clips) {
            if (clip.gain !== undefined) {
                clip.gain.gain.setValueAtTime(0.0, 0)
            }
        }
    }

    const renderAndZip = async (trackNum: number) => {
        const copy = Object.assign({}, result)
        // Narrow this down to the target track (plus the mix and metronome tracks to avoid breaking things).
        copy.tracks = [result.tracks[0], result.tracks[trackNum], result.tracks[result.tracks.length-1]]

        let blob
        try {
            blob = await renderer.renderWav(copy)
        } catch (err) {
            esconsole(err, ["error", "exporter"])
            throw ESMessages.download.rendererror
        }
        zip.file(name + "/" + "track_" + trackNum.toString() + ".wav", blob)
    }

    const promises = []
    for (let i = 1; i < result.tracks.length-1; i++) {
        promises.push(renderAndZip(i))
    }
    await Promise.all(promises)

    if (ESUtils.whichBrowser().includes("Safari")) {
        // TODO: Why is this exception here? Does it work? Is it still necessary?
        return zip.generateAsync({ type: "base64" })
    } else {
        const blob = await zip.generateAsync({ type: "blob" })
        return {
            path: (window.URL || window.webkitURL).createObjectURL(blob),
            name: name + ".zip",
        }
    }
}

// Export the script to SoundCloud using the SoundCloud SDK.
export async function soundcloud(script: ScriptEntity, quality: number, scData: any) {
    esconsole("Requesting SoundCloud Access...", ["debug", "exporter"])
    await SC.connect()

    const result = await compile(script, quality)
    let blob
    try {
        blob = renderer.renderWav(result)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw ESMessages.download.rendererror
    }

    esconsole("Uploading to SoundCloud.", "exporter")

    const track = await SC.upload({
        file: blob,
        title: scData.options.name,
        description: scData.options.description,
        sharing: scData.options.sharing,
        downloadable: scData.options.downloadable,
        tag_list: scData.options.tags,
        license: scData.options.license,
    })

    esconsole("SoundCloud upload finished.", "exporter")
    scData.url = track.permalink_url
    scData.button = "VIEW ON SOUNDCLOUD"
    scData.uploaded = true
    scData.message.spinner = false

    if (scData.message.animation) {
        clearInterval(scData.message.animation)
        scData.message.animation = null
    }

    scData.message.text = "Finished uploading!"
    helpers.getNgRootScope().$apply()
}

// Print the source code.
export function print(script: ScriptEntity) {
    let content = script.source_code
    const lines = content.split(/\n/)
    const numlines = lines.length
    esconsole(numlines, "debug")
    const pri = (document.getElementById("ifmcontentstoprint") as HTMLIFrameElement).contentWindow!
    pri.document.open()
    pri.document.writeln('<pre style="-moz-tab-size:2; -o-tab-size:2; tab-size:2;">')
    for (let lineNum = 0; lineNum < numlines; lineNum++) {
        content = lines[lineNum]
        esconsole(content, "debug")
        let lineNumStr = (lineNum+1).toString()
        if (lineNumStr.length === 1) {
            lineNumStr = "  " + lineNumStr
        } else if (lineNumStr.length === 2) {
            lineNumStr = " " + lineNumStr
        }
        pri.document.writeln(lineNumStr + "| " + content)
    }
    pri.document.writeln("</pre>")
    pri.document.close()
    pri.focus()
    pri.print()
}
