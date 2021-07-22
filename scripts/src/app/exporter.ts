// Export a script as text, audio file, or zip full of audio files.
// Also supports printing scripts and uploading to SoundCloud (which is perplexing because we have another moduled named "uploader").
import { Script } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { DAWData } from "./player"
import * as renderer from "./renderer"
import * as runner from "./runner"
import i18n from "i18next"

// Make a dummy anchor for downloading blobs.
const dummyAnchor = document.createElement("a")
document.body.appendChild(dummyAnchor)
dummyAnchor.style.display = "none"

export function download(name: string, blob: Blob) {
    const url = window.URL.createObjectURL(blob)
    dummyAnchor.href = url
    dummyAnchor.download = name
    dummyAnchor.target = "_blank"
    esconsole("File location: " + url, ["debug", "exporter"])
    dummyAnchor.click()
}

// Export the script as a text file.
export function text(script: Script) {
    esconsole("Downloading script locally.", ["debug", "exporter"])
    const blob = new Blob([script.source_code], { type: "text/plain" })
    download(script.name, blob)
}

async function compile(script: Script) {
    const lang = ESUtils.parseLanguage(script.name)
    let result
    try {
        result = await (lang === "python" ? runner.runPython : runner.runJavaScript)(script.source_code)
    } catch {
        throw i18n.t("messages:download.compileerror")
    }
    if (result.length === 0) {
        throw i18n.t("messages:download.emptyerror")
    }
    return result
}

// Exports the script as an audio file.
async function exportAudio(script: Script, type: string, render: (result: DAWData) => Promise<Blob>) {
    const name = ESUtils.parseName(script.name)
    const result = await compile(script)
    try {
        const blob = await render(result)
        esconsole(`Ready to download ${type} file.`, ["debug", "exporter"])
        download(`${name}.${type}`, blob)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw i18n.t("messages:download.rendererror")
    }
}

export function wav(script: Script) {
    return exportAudio(script, "wav", renderer.renderWav)
}

export function mp3(script: Script) {
    return exportAudio(script, "mp3", renderer.renderMp3)
}

export async function multiTrack(script: Script) {
    const result = await compile(script)
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
        copy.tracks = [result.tracks[0], result.tracks[trackNum], result.tracks[result.tracks.length - 1]]

        let blob
        try {
            blob = await renderer.renderWav(copy)
        } catch (err) {
            esconsole(err, ["error", "exporter"])
            throw i18n.t("messages:download.rendererror")
        }
        zip.file(name + "/" + "track_" + trackNum.toString() + ".wav", blob)
    }

    const promises = []
    for (let i = 1; i < result.tracks.length - 1; i++) {
        promises.push(renderAndZip(i))
    }
    await Promise.all(promises)

    const blob = await zip.generateAsync({ type: "blob" })
    download(`${name}.zip`, blob)
}

// Export the script to SoundCloud using the SoundCloud SDK.
type SoundCloudOptions = { name: string, description: string, sharing: string, downloadable: boolean, tags: string, license: string }

export async function soundcloud(script: Script, options: SoundCloudOptions) {
    esconsole("Requesting SoundCloud Access...", ["debug", "exporter"])
    await SC.connect()

    const result = await compile(script)
    let blob
    try {
        blob = await renderer.renderWav(result)
    } catch (err) {
        esconsole(err, ["error", "exporter"])
        throw i18n.t("messages:download.rendererror")
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
export function print(script: Script) {
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
        let lineNumStr = (lineNum + 1).toString()
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
