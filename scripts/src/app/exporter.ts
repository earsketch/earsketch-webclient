// Export a script as text, audio file, or zip full of audio files.
// Also supports printing scripts and uploading to SoundCloud (which is perplexing because we have another moduled named "uploader").
import { ScriptEntity } from "common"
import * as compiler from "./compiler"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { DAWData } from "./player"
import * as renderer from "./renderer"
import i18n from "i18next"

// Make a dummy anchor for downloading blobs.
let dummyAnchor = document.createElement("a")
document.body.appendChild(dummyAnchor)
dummyAnchor.style.display = "none"

function download(name: string, blob: Blob) {
    const url = window.URL.createObjectURL(blob)
    dummyAnchor.href = url
    dummyAnchor.download = name
    dummyAnchor.target = "_blank"
    esconsole("File location: " + url, ["debug", "exporter"])
    dummyAnchor.click()
}

// Export the script as a text file.
export function text(script: ScriptEntity) {
    esconsole("Downloading script locally.", ["debug", "exporter"])
    const blob = new Blob([script.source_code], { type: "text/plain" })
    download(script.name, blob)
}

async function compile(script: ScriptEntity, quality: boolean) {
    const lang = ESUtils.parseLanguage(script.name)
    let result
    try {
        result = await (lang === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, +quality)
    } catch {
        throw i18n.t('messages:download.compileerror')
    }
    if (result.length === 0) {
        throw i18n.t('messages:download.emptyerror')
    }
    return result
}

// Exports the script as an audio file.
async function exportAudio(script: ScriptEntity, quality: boolean, type: string, render: (result: DAWData) => Promise<Blob>) {
    const name = ESUtils.parseName(script.name)
    const result = await compile(script, quality)
    try {
        const blob = await render(result)
        esconsole(`Ready to download ${type} file.`, ["debug", "exporter"])
        download(`${name}.${type}`, blob)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw i18n.t('messages:download.rendererror')
    }
}

export function wav(script: ScriptEntity, quality: boolean) {
    return exportAudio(script, quality, "wav", renderer.renderWav)
}

export function mp3(script: ScriptEntity, quality: boolean) {
    return exportAudio(script, quality, "mp3", renderer.renderMp3)
}

export async function multiTrack(script: ScriptEntity, quality: boolean) {
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
            throw i18n.t('messages:download.rendererror')
        }
        zip.file(name + "/" + "track_" + trackNum.toString() + ".wav", blob)
    }

    const promises = []
    for (let i = 1; i < result.tracks.length-1; i++) {
        promises.push(renderAndZip(i))
    }
    await Promise.all(promises)

    const blob = await zip.generateAsync({ type: "blob" })
    download(`${name}.zip`, blob)
}

// Export the script to SoundCloud using the SoundCloud SDK.
type SoundCloudOptions = { name: string, description: string, sharing: string, downloadable: boolean, tags: string, license: string }

export async function soundcloud(script: ScriptEntity, quality: boolean, options: SoundCloudOptions) {
    esconsole("Requesting SoundCloud Access...", ["debug", "exporter"])
    await SC.connect()

    const result = await compile(script, quality)
    let blob
    try {
        blob = renderer.renderWav(result)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw i18n.t('messages:download.rendererror')
    }

    esconsole("Uploading to SoundCloud.", "exporter")

    const track = await SC.upload({
        file: blob,
        title: options.name,
        description: options.description,
        sharing: options.sharing,
        downloadable: options.downloadable,
        tag_list: options.tags,
        license: options.license,
    })

    esconsole("SoundCloud upload finished.", "exporter")
    return track.permalink_url
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
