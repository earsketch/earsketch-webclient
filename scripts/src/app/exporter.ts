// Export a script as text, audio file, or zip full of audio files.
// Also supports uploading to SoundCloud, which is perplexing because we have another moduled named "uploader".
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

// Exports the script as a WAV file. Returns a promise.
export function wav(script: ScriptEntity, quality: number) {
    const lang = ESUtils.parseLanguage(script.name)
    const p = (lang === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, quality)
    const name = ESUtils.parseName(script.name)

    return p.then((result) => {
        return result
    }).catch(() => {
        throw ESMessages.download.compileerror
    }).then(result => {
        if (result.length === 0) {
        throw ESMessages.download.emptyerror
        }
        return renderer.renderWav(result)
    }).catch(err => {
        esconsole(err, ["error", "exporter"])
        throw err
    }).then(blob => {
        try {
            esconsole("Ready to download wav file.", ["debug", "exporter"])

            // save the file locally without sending to the server.
            const data = {
                path: (window.URL || window.webkitURL).createObjectURL(blob),
                name: name + ".wav",
            }
            return data
        } catch (e) {
            esconsole(e, ["error", "exporter"])
            throw ESMessages.download.rendererror
        }
    })
}

// Exports the script as an MP3 file. Returns a promise.
export function mp3(script: ScriptEntity, quality: number) {
    const lang = ESUtils.parseLanguage(script.name)
    const p = (lang === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, quality)
    const name = ESUtils.parseName(script.name)

    return p.then(result => {
        return result
    }).catch(err => {
        throw ESMessages.download.compileerror
    }).then((result) => {
        if (result.length === 0) {
        throw ESMessages.download.emptyerror
        }
        return renderer.renderMp3(result)
    }).catch(err => {
        esconsole(err, ["error", "exporter"])
        throw err
    }).then(blob => {
        try {
            esconsole("Ready to download MP3 file.", ["DEBUG", "IDE"])

            // save the file locally without sending to the server.
            const data = {
                path: (window.URL || window.webkitURL).createObjectURL(blob),
                name: name + ".mp3",
            }
            return data
        } catch (e) {
            esconsole(e, ["error", "exporter"])
            throw ESMessages.download.rendererror
        }
    })
}

export function multiTrack(script: ScriptEntity, quality: number) {
    const lang = ESUtils.parseLanguage(script.name)
    const p = (lang === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, quality)
    const name = ESUtils.parseName(script.name)

    return new Promise((resolve, reject) => {
        p.then((result: DAWData) => {
            if (result.length === 0) {
                throw ESMessages.download.emptyerror
            }

            const zip = new JSZip()

            // mute all
            for (const track of result.tracks) {
                for (const clip of track.clips) {
                    if (clip.gain !== undefined) {
                        clip.gain.gain.setValueAtTime(0.0, 0)
                    }
                }
            }

            let countRendered = 0  // there should be a better way to synchronize promises

            function excludeTracks(resLocal: DAWData, targetNum: number) {
                const numTracks = resLocal.tracks.length
                resLocal.tracks = resLocal.tracks.filter((v, i) => i === 0 || i === targetNum || i === numTracks-1)
            }

            // closure for keeping the track number as local
            function renderAndZip(zip: any, trackNum: number, resolver: Function) {
                // clone the result object
                const resLocal = Object.assign({}, result)

                // leave the target track and delete the rest
                excludeTracks(resLocal, trackNum)

                renderer.renderWav(resLocal).then((blob) => {
                    zip.file(name + "/" + "track_" + trackNum.toString() + ".wav", blob)
                    countRendered++

                    if (countRendered === result.tracks.length-2) {
                        if (ESUtils.whichBrowser().match("Safari") !== null) {
                            zip.generateAsync({type:"base64"}).then((base64: string) => {
                                resolver(base64)
                            })
                        } else {
                            zip.generateAsync({type: "blob"}).then((blob: Blob) => {
                                const data = {
                                    path: (window.URL || window.webkitURL).createObjectURL(blob),
                                    name: name + ".zip",
                                }
                                resolver(data)
                            })
                        }
                    }
                }).catch(err => {
                    esconsole(err, ["error", "ide"])
                    throw ESMessages.download.rendererror
                })
            }

            for (let i = 1; i < result.tracks.length-1; i++) {
                renderAndZip(zip, i, resolve)
            }
        }).catch(err => {
            esconsole(err, ["error", "exporter"])
            reject(err)
        })
    })
}

// Export the script to SoundCloud using the SoundCloud SDK.
export function soundcloud(script: ScriptEntity, quality: number, scData: any) {
    esconsole("Requesting SoundCloud Access...", ["debug", "exporter"])
    return SC.connect().then(() => {
        let p
        const lang = ESUtils.parseLanguage(script.name)
        if (lang == "python") {
            p = compiler.compilePython(script.source_code, quality)
        } else {
            p = compiler.compileJavascript(script.source_code, quality)
        }
        return p.then(result => {
            renderer.renderWav(result).then(blob => {
                esconsole("Uploading to SoundCloud.", "exporter")

                const upload = SC.upload({
                    file: blob,
                    title: scData.options.name,
                    description: scData.options.description,
                    sharing: scData.options.sharing,
                    downloadable: scData.options.downloadable,
                    tag_list: scData.options.tags,
                    license: scData.options.license,
                })

                upload.then((track: any) => {
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
                })
            })
        }).catch(err => {
            esconsole(err, ["DEBUG", "IDE"])
            throw err
        })
    })
}

// Print the source code.
export function print(script: ScriptEntity) {
    let content = script.source_code
    const lines = content.split(/\n/)
    const numlines = lines.length
    esconsole(numlines, "debug")
    let lineNum = 0
    const pri = (document.getElementById("ifmcontentstoprint") as any).contentWindow
    pri.document.open()
    pri.document.writeln('<pre style="-moz-tab-size:2; -o-tab-size:2; tab-size:2;">')
    while (lineNum < numlines) {
        content = lines[lineNum]
        esconsole(content, "debug")
        let lineNumStr = (lineNum+1).toString()
        if (lineNumStr.length === 1) {
            lineNumStr = "  " + lineNumStr
        } else if (lineNumStr.length === 2) {
            lineNumStr = " " + lineNumStr
        }
        pri.document.writeln(lineNumStr + "| " + content)
        lineNum++
    }
    pri.document.writeln("</pre>")
    pri.document.close()
    pri.focus()
    pri.print()
}
