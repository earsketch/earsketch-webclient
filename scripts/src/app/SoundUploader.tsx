import React, { useCallback, useEffect, useRef, useState } from "react"

import audioContext from './audiocontext'
import * as audioLibrary from './audiolibrary'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import i18n from "i18next"
import * as recorder from './esrecorder'
import * as sounds from '../browser/soundsState'
import { LevelMeter, Metronome, Waveform } from "./Recorder"
import store from "../reducers"
import { encodeWAV } from "./renderer"
import * as userConsole from './userconsole'
import * as userNotification from './userNotification'
import * as userProject from './userProject'

async function uploadFile(file: Blob, key: string, extension: string, tempo: number, onProgress: (frac: number) => void) {
    if (userProject.getUsername() == null) {
        throw i18n.t('messages:uploadcontroller.userAuth')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = await audioContext.decodeAudioData(arrayBuffer)
    if (buffer.duration > 30) {
        esconsole("Rejecting the upload of audio file with duration: " + buffer.duration, ["upload", "error"])
        throw i18n.t('messages:uploadcontroller.bigsize')
    }

    const fileKeys = sounds.selectAllFileKeys(store.getState())
    if (fileKeys.some(fileKey => fileKey === (userProject.getUsername() + '_' + key).toUpperCase())) {
        throw `${key} (${(userProject.getUsername() + '_' + key).toUpperCase()})${i18n.t('messages:uploadcontroller.alreadyused')}`
    }

    if (tempo > 200 || (tempo > -1 && tempo < 45)) {
        throw i18n.t('messages:esaudio.tempoRange')
    }

    // TODO: This endpoint should require authentication.
    const data = userProject.form({
        file,
        username: userProject.getUsername(),
        file_key: key,
        // TODO: I don't think the server should allow arbitrary filenames unrelated to the key. This field should probably be replaced or removed.
        filename: `${key}${extension}`,
        tempo: tempo + "",
    })

    // Sadly, Fetch does not yet support observing upload progress (see https://github.com/github/fetch/issues/89).
    const request = new XMLHttpRequest()
    request.upload.onprogress = e => onProgress(e.loaded / e.total)

    request.timeout = 60000
    request.ontimeout = () => userConsole.error(i18n.t('messages:uploadcontroller.timeout'))
    const promise = new Promise<void>((resolve, reject) => {
        request.onload = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    userNotification.show(i18n.t('messages:uploadcontroller.uploadsuccess'), "success")
                    // Clear the cache so it gets reloaded.
                    audioLibrary.clearAudioTagCache()
                    store.dispatch(sounds.resetUserSounds())
                    store.dispatch(sounds.getUserSounds(userProject.getUsername()))
                    resolve()
                } else {
                    reject(i18n.t('messages:uploadcontroller.commerror'))
                }
            } else {
                reject(i18n.t('messages:uploadcontroller.commerror2'))
            }
        }
    })

    onProgress(0)
    request.open("POST", URL_DOMAIN + "/services/files/upload")
    request.send(data)
    return promise
}

const ProgressBar = ({ progress }: { progress: number }) => {
    const percent = Math.floor(progress * 100) + "%"
    return <div id="progressbar">
        <div className="col-sm-12">
            <div className="progress">
                <div className="progress-bar progress-bar-success" style={{ width: percent }}>{percent}</div>
            </div>
        </div>
    </div>
}

const FileTab = ({ close }: { close: () => void }) => {
    const [file, setFile] = useState(null as File | null)
    const [key, setKey] = useState("")
    const [tempo, setTempo] = useState("")
    const [error, setError] = useState("")
    const [progress, setProgress] = useState(null as number | null)

    const name = file ? ESUtils.parseName(file.name) : ""
    if (key === "" && name !== "") {
        setKey(name.trim().toUpperCase().replace(/\W/g, "_").replace(/_+/g, "_"))
    }
    const extension = file ? ESUtils.parseExt(file.name) : ""

    const submit = async () => {
        try {
            await uploadFile(file!, key, extension, tempo === "" ? -1 : +tempo, setProgress)
            close()
        } catch (error) {
            setError(error)
        }
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <div>
                <div className="upload-file">
                    <input id="file" className="inputfile" type="file" onChange={e => setFile(e.target.files![0])} accept=".wav,.aiff,.aif,.mp3,audio/wav,audio/aiff,audio/mpeg" required />
                    <label id="inputlabel" htmlFor="file">
                        <span><i className="icon icon-cloud-upload"></i></span>
                        <span>{name || "Choose a file..."}</span>
                        {extension
                            ? <kbd className="kbd">{extension}</kbd>
                            : <><kbd className="kbd">.wav</kbd><kbd className="kbd">.aiff</kbd><kbd className="kbd">.mp3</kbd></>}
                    </label>
                </div>
                <div className="modal-section-header">
                    <span>Constant Name (required)</span>
                    <span>Tempo (Optional)</span>
                </div>
                <div className="modal-section-body" id="upload-details">
                    <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control shake" id="key" value={key} onChange={e => setKey(e.target.value)} pattern="[A-Z0-9_]+" required />
                    <input type="number" placeholder="e.g. 120" className="form-control shake" id="tempo" value={tempo} onChange={e => setTempo(e.target.value)} />
                </div>
            </div>
        </div>
        <div className="modal-footer">
            {progress !== null && <ProgressBar progress={progress} />}
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="UPLOAD" className="btn btn-primary text-white" disabled={file === null} />
        </div>
    </form>
}

const RecordTab = ({ close }: { close: () => void }) => {
    const [key, setKey] = useState("")
    const [error, setError] = useState("")
    const [progress, setProgress] = useState(null as number | null)
    const [buffer, setBuffer] = useState(null as AudioBuffer | null)

    const [tempo, setTempo] = useState(120)
    const [metronome, setMetronome] = useState(true)
    const [click, setClick] = useState(false)
    const [countoff, setCountoff] = useState(1)
    const [measures, setMeasures] = useState(2)
    const [micReady, setMicReady] = useState(false)
    const [beat, setBeat] = useState(0)

    const startRecording = () => {
        recorder.properties.bpm = tempo
        recorder.properties.useMetro = metronome
        recorder.properties.countoff = countoff
        recorder.properties.numMeasures = measures
        recorder.startRecording(click)
    }

    recorder.callbacks.bufferReady = (buffer) => {
        setBeat(0)
        setBuffer(buffer)
    }

    recorder.callbacks.beat = () => setBeat(beat + 1)

    const submit = async () => {
        try {
            const view = encodeWAV(buffer!.getChannelData(0))
            const blob = new Blob([view], { type: "audio/wav" })
            await uploadFile(blob, key, ".wav", metronome ? tempo : 120, setProgress)
            close()
        } catch (error) {
            setError(error)
        }
    }

    const openRecordMenu = () => {
        setError("")
        // TODO: Is this check still valid?
        if (!/Chrome|Firefox/.test(ESUtils.whichBrowser())) {
            setError(i18n.t('messages:uploadcontroller.nosupport'))
        } else {
            recorder.init()
        }
    }

    recorder.callbacks.micAccessBlocked = error => {
        if (error == "chrome_mic_noaccess") {
            setError(i18n.t('messages:uploadcontroller.chrome_mic_noaccess'))
        } else if (error == "ff_mic_noaccess") {
            setError(i18n.t('messages:uploadcontroller.ff_mic_noaccess'))
        }
    }

    recorder.callbacks.micReady = () => setMicReady(true)

    useEffect(() => openRecordMenu(), [])

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            {!micReady &&
                (error
                    ? <input type="button" className="btn btn-primary block m-auto" onClick={openRecordMenu} value="Enable mic and click here to try again." />
                    : "Waiting for microphone access...")}
            {micReady && <div>
                <div className="modal-section-header">
                    <span>Constant Name (required)</span>
                </div>
                <div className="modal-section-content">
                    <input type="text" placeholder="e.g. MYRECORDING_01" className="form-control" value={key} onChange={e => setKey(e.target.value)} pattern="[A-Z0-9_]+" required />
                </div>
                <div className="modal-section-header">
                    <span>Measures Control</span>
                    {metronome &&
                        <button type="button" className={"btn btn-hollow btn-filter" + (click ? " active" : "")} onClick={() => setClick(!click)}>
                            <span>CLICK WHILE RECORDING</span>
                        </button>}
                    <button type="button" className={"btn btn-hollow btn-filter" + (metronome ? " active" : "")}
                        onClick={() => setMetronome(!metronome)}>
                        <span>METRONOME</span>
                    </button>
                </div>
                {metronome &&
                    <div className="modal-section-content" id="count-measures-input">
                        <label>
                            Tempo (beats per minute)
                        <input type="number" placeholder="e.g. 120" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                            <input id="tempoSlider" type="range" name="rangeTempo" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            Countoff Measures
                        <input type="number" value={countoff} onChange={e => setCountoff(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            Measures to Record
                        <input type="number" value={measures} onChange={e => setMeasures(+e.target.value)} required={metronome} />
                        </label>
                    </div>}
                <div className="modal-section-header">
                    <span>Record Sound</span>
                    <LevelMeter />
                </div>
                <div className="modal-section-content flex items-center justify-between">
                    <Metronome beat={beat - countoff * 4} hasBuffer={buffer !== null} useMetro={metronome} startRecording={startRecording} />
                    <Waveform buffer={buffer} />
                    {buffer &&
                        <button type="button" id="record-clear-button" className="btn btn-hollow btn-filter" onClick={() => { recorder.clear(); setBuffer(null) }}>
                            <span>CLEAR</span>
                        </button>}
                </div>
            </div>}
        </div>
        <div className="modal-footer">
            {progress !== null && <ProgressBar progress={progress} />}
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="UPLOAD" className="btn btn-primary text-white" disabled={buffer === null} />
        </div>
    </form>
}

interface FreesoundResult {
    name: string
    bpm: number
    creator: string
    previewURL: string
    downloadURL: string
}

const FreesoundTab = ({ close }: { close: () => void }) => {
    const [error, setError] = useState("")
    const [results, setResults] = useState(null as FreesoundResult[] | null)
    const [searched, setSearched] = useState(false)
    const [query, setQuery] = useState("")
    const [selected, setSelected] = useState(null as number | null)
    const [key, setKey] = useState("")

    const username = userProject.getUsername() ?? ""

    const search = async () => {
        setSearched(true)
        setResults(null)
        setSelected(null)

        const data = await userProject.get("/services/audio/searchfreesound", { query })
        const results = data.results
            .filter((result: any) => result.analysis?.rhythm?.bpm)
            .map((result: any) => ({
                previewURL: result.previews["preview-lq-mp3"],
                iframe: `https://freesound.org/embed/sound/iframe/${result.id}/simple/small/`,
                downloadURL: result.previews["preview-hq-mp3"],
                creator: result.username,
                name: result.name,
                bpm: Math.round(result.analysis.rhythm.bpm)
            }))
        setResults(results)
    }

    const submit = async () => {
        // TODO: Reduce duplication with uploadFile().
        if (username === "") {
            setError(i18n.t('messages:uploadcontroller.userAuth'))
            return
        }

        const result = results![selected!]
        const tempo = result.bpm

        const keys = sounds.selectAllFileKeys(store.getState())
        const fullKey = username.toUpperCase() + '_' + key
        if (keys.some(other => other === fullKey)) {
            setError(`${key} (${fullKey})${i18n.t('messages:uploadcontroller.alreadyused')}`)
            return
        }

        if (tempo > 200 || (tempo > -1 && tempo < 45)) {
            setError(i18n.t('messages:esaudio.tempoRange'))
            return
        }

        // TODO: This endpoint should require authentication.
        await userProject.post("/services/files/uploadfromfreesound", {
            username,
            file_key: key,
            tempo: tempo + "",
            filename: key + ".mp3",
            creator: result.creator,
            url: result.downloadURL,
        })

        userNotification.show(i18n.t('messages:uploadcontroller.uploadsuccess'), "success")
        // clear the cache so it gets reloaded
        audioLibrary.clearAudioTagCache()
        store.dispatch(sounds.resetUserSounds())
        store.dispatch(sounds.getUserSounds(username))
        close()
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <div>
                <a href="https://freesound.org/" target="_blank">Freesound</a> is an online database of thousands of free audio clips, including everything from music to field recordings, all under Creative Commons licenses.
                You can search for clips on Freesound and save them to EarSketch below.
            </div>
            <div className="search-block flex">
                <input className="form-control shake form-search flex-grow" placeholder="Search" type="text" value={query}
                    onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") search() }} required />
                <input type="button" onClick={search} className="btn btn-hollow btn-filter" value="SEARCH" />
            </div>
            {searched && <div className="modal-section-header justify-start mb-3">Results</div>}
            {results && results.length > 0 &&
                <div className="overflow-y-auto border p-3 border-gray-300" style={{ maxHeight: "300px" }}>
                    {results.map((result, index) => <div>
                        <label>
                            <input type="radio" style={{ marginRight: "0.75rem" }} checked={index === selected}
                                onChange={e => {
                                    if (e.target.checked) {
                                        setSelected(index)
                                        setKey(result.name.replace(/[^A-Za-z0-9]/g, "_").toUpperCase())
                                        setError("")
                                    }
                                }} />
                            {result.name}: {result.bpm} bpm. Uploaded by Freesound user {result.creator}
                        </label>
                        <audio controls preload="none">
                            <source src={result.previewURL} type="audio/mpeg" />
                    Your browser does not support the audio element.
                    </audio>
                        <hr className="my-3 border-gray-300" />
                    </div>)}
                </div>}
            {searched &&
                (results === null && <div><i className="inline-block animate-spin icon icon-spinner" /> Searching Freesound...</div>
                    || results!.length === 0 && <div>No results</div>)}
            <div className="modal-section-header"><span>Constant Name (required)</span></div>
            <input type="text" placeholder="e.g. MYSOUND_01" className="form-control" value={key} onChange={e => setKey(e.target.value)} pattern="[A-Z0-9_]+" required />
        </div>
        <div className="modal-footer">
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="SAVE" className="btn btn-primary text-white" disabled={selected === null} />
        </div>
    </form>
}

const TunepadTab = ({ close }: { close: () => void }) => {
    const tunepadWindow = useRef<Window>()
    const tunepadOrigin = useRef("")
    const [ready, setReady] = useState(false)
    const [error, setError] = useState("")
    const [key, setKey] = useState("")
    const [progress, setProgress] = useState(null as number | null)

    const login = useCallback(iframe => {
        if (!iframe) return
        userProject.postAuthForm("/services/scripts/getembeddedtunepadid")
            .then(result => {
                tunepadWindow.current = iframe.contentWindow
                tunepadOrigin.current = new URL(result.url).origin
                iframe.contentWindow.location.replace(result.url.replace("redirect-via-EarSketch/?", "?embedded=true&client=earsketch&"))
            })
    }, [])

    useEffect(() => {
        const handleMessage = async (message: MessageEvent) => {
            if (message.origin !== tunepadOrigin.current || !message.isTrusted) return
            if (message.data === "dropbook-view") {
                setReady(true)
            } else if (message.data === "project-embed-list") {
                setReady(false)
            } else {
                const { wavData: data, bpm: tempo } = JSON.parse(message.data)
                const bytes = Uint8Array.from(data)
                const file = new Blob([bytes], { type: "audio/wav" })
                try {
                    await uploadFile(file, key, ".wav", tempo, setProgress)
                    close()
                } catch (error) {
                    setError(error)
                }
            }
        }
        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [key])

    return <form onSubmit={e => { e.preventDefault(); tunepadWindow.current!.postMessage("save-wav-data", "*") }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <iframe ref={login} name="tunepadIFrame" id="tunepadIFrame" allow="microphone https://tunepad.xyz/ https://tunepad.live/" width="100%" height="500px">IFrames are not supported by your browser.</iframe>
            <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control" value={key} onChange={e => setKey(e.target.value)} pattern="[A-Z0-9_]+" required />
        </div>
        <div className="modal-footer">
            {progress !== null && <ProgressBar progress={progress} />}
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="UPLOAD" className="btn btn-primary text-white" disabled={!ready} />
        </div>
    </form>
}

const GrooveMachineTab = ({ close }: { close: () => void }) => {
    const GROOVEMACHINE_URL = "https://groovemachine.lmc.gatech.edu"
    const [error, setError] = useState("")
    const [key, setKey] = useState("")
    const [progress, setProgress] = useState(null as number | null)
    const [ready, setReady] = useState(false)
    const gmWindow = useRef<Window>()

    useEffect(() => {
        const handleMessage = async (message: MessageEvent) => {
            if (message.origin !== GROOVEMACHINE_URL || !message.isTrusted) return
            if (message.data === 0) {
                setReady(false)
            } else if (message.data == 1) {
                setReady(true)
            } else {
                const file = new Blob([message.data.wavData], { type: 'audio/wav' })
                try {
                    await uploadFile(file, key, ".wav", message.data.tempo, setProgress)
                    close()
                } catch (error) {
                    setError(error)
                }
            }
        }
        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [key])

    return <form onSubmit={e => { e.preventDefault(); gmWindow.current!.postMessage("save-wav-data", "*") }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <iframe ref={el => { if (el) gmWindow.current = el.contentWindow! }} src={GROOVEMACHINE_URL} allow="microphone" width="100%" height="500px">IFrames are not supported by your browser.</iframe>
            <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control" value={key} onChange={e => setKey(e.target.value)} pattern="[A-Z0-9_]+" required />
        </div>
        <div className="modal-footer">
            {progress !== null && <ProgressBar progress={progress} />}
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="UPLOAD" className="btn btn-primary text-white" disabled={!ready} />
        </div>
    </form>
}

const Tabs = [
    { component: FileTab, title: "UPLOAD SOUND", icon: "cloud-upload" },
    { component: RecordTab, title: "QUICK RECORD", icon: "microphone" },
    { component: FreesoundTab, title: "FREESOUND", icon: "search", },
    { component: TunepadTab, title: "TUNEPAD", icon: "cloud-upload" },
    { component: GrooveMachineTab, title: "GROOVEMACHINE", icon: "cloud-upload" },
]

export const SoundUploader = ({ close }: { close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const TabBody = Tabs[activeTab].component

    return <>
        <div className="modal-header">
            <h4 className="modal-title">Add a New Sound</h4>
            <hr className="my-4 border-gray-200" />
            <div className="es-modal-tabcontainer">
                <ul className="nav-pills flex flex-row">
                    {Tabs.map(({ title, icon }, index) =>
                        <li key={index} className={"uib-tab nav-item flex-grow" + (activeTab === index ? " active" : "")}>
                            <a href="" onClick={() => setActiveTab(index)} className="nav-link h-full flex justify-center items-center">
                                <i className={`icon icon-${icon} mr-3`}></i>{title}
                            </a>
                        </li>)}
                </ul>
            </div>
        </div>
        <div id="upload-sound-tabcontainer">
            <TabBody close={close} />
        </div>
    </>
}
