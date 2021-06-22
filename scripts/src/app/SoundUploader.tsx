import i18n from "i18next"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import audioContext from "./audiocontext"
import * as audioLibrary from "./audiolibrary"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as recorder from "./esrecorder"
import { LevelMeter, Metronome, Waveform } from "./Recorder"
import store from "../reducers"
import * as sounds from "../browser/soundsState"
import { encodeWAV } from "./renderer"
import * as userConsole from "./userconsole"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"

function cleanKey(key: string) {
    return key.replace(/\W/g, "").toUpperCase()
}

function validateUpload(key: string, tempo: number) {
    const username = userProject.getUsername()
    if (username === null) {
        throw i18n.t("messages:uploadcontroller.userAuth")
    }
    const keys = sounds.selectAllFileKeys(store.getState())
    const fullKey = username.toUpperCase() + "_" + key
    if (keys.some(k => k === fullKey)) {
        throw `${key} (${fullKey})${i18n.t("messages:uploadcontroller.alreadyused")}`
    } else if (tempo > 200 || (tempo > -1 && tempo < 45)) {
        throw i18n.t("messages:esaudio.tempoRange")
    }
}

async function uploadFile(file: Blob, key: string, extension: string, tempo: number, onProgress: (frac: number) => void) {
    validateUpload(key, tempo)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = await audioContext.decodeAudioData(arrayBuffer)
    if (buffer.duration > 30) {
        esconsole("Rejecting the upload of audio file with duration: " + buffer.duration, ["upload", "error"])
        throw i18n.t("messages:uploadcontroller.bigsize")
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
    request.ontimeout = () => userConsole.error(i18n.t("messages:uploadcontroller.timeout"))
    const promise = new Promise<void>((resolve, reject) => {
        request.onload = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    userNotification.show(i18n.t("messages:uploadcontroller.uploadsuccess"), "success")
                    // Clear the cache so it gets reloaded.
                    audioLibrary.clearAudioTagCache()
                    store.dispatch(sounds.resetUserSounds())
                    store.dispatch(sounds.getUserSounds(userProject.getUsername()))
                    resolve()
                } else {
                    reject(i18n.t("messages:uploadcontroller.commerror"))
                }
            } else {
                reject(i18n.t("messages:uploadcontroller.commerror2"))
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
    return <div className="progress flex-grow mb-0 mr-3">
        <div className="progress-bar progress-bar-success" style={{ width: percent }}>{percent}</div>
    </div>
}

const Footer = ({ ready, progress, close }: { ready: boolean, progress?: number | null, close: () => void }) => {
    const { t } = useTranslation()
    return <div className="modal-footer flex items-center">
        {progress !== undefined && progress !== null && <ProgressBar progress={progress} />}
        <input type="button" value={t('cancel').toLocaleUpperCase()} onClick={close} className="btn btn-default" style={{ color: "#d04f4d" }} />
        <input type="submit" value={t('upload').toLocaleUpperCase()} className="btn btn-primary text-white" disabled={!ready} />
    </div>
}

const FileTab = ({ close }: { close: () => void }) => {
    const [file, setFile] = useState(null as File | null)
    const [key, setKey] = useState("")
    const [tempo, setTempo] = useState("")
    const [error, setError] = useState("")
    const [progress, setProgress] = useState(null as number | null)
    const { t } = useTranslation()

    const name = file ? ESUtils.parseName(file.name) : ""
    if (key === "" && name !== "") {
        setKey(name.trim().replace(/\W/g, "_").replace(/_+/g, "_").toUpperCase())
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
                        <span>{name || t('soundUploader.file.prompt')}</span>
                        {extension
                            ? <kbd className="kbd">{extension}</kbd>
                            : <><kbd className="kbd">.wav</kbd><kbd className="kbd">.aiff</kbd><kbd className="kbd">.mp3</kbd></>}
                    </label>
                </div>
                <div className="modal-section-header">
                    <span>{t('soundUploader.constantRequired')}</span>
                    <span>{t('soundUploader.tempoOptional')}</span>
                </div>
                <div className="modal-section-body" id="upload-details">
                    <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control shake" id="key" value={key} onChange={e => setKey(cleanKey(e.target.value))} required />
                    <input type="number" placeholder="e.g. 120" className="form-control shake" id="tempo" value={tempo} onChange={e => setTempo(e.target.value)} />
                </div>
            </div>
        </div>
        <Footer ready={file !== null} progress={progress} close={close} />
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
    const { t } = useTranslation()

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
            const view = encodeWAV(buffer!.getChannelData(0), audioContext.sampleRate, 1)
            const blob = new Blob([view], { type: "audio/wav" })
            await uploadFile(blob, key, ".wav", metronome ? tempo : 120, setProgress)
            close()
        } catch (error) {
            setError(error)
        }
    }

    recorder.callbacks.micAccessBlocked = error => setError(i18n.t("messages:uploadcontroller." + error))

    recorder.callbacks.micReady = () => setMicReady(true)

    useEffect(() => recorder.init(), [])

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            {!micReady &&
                (error
                    ? <input type="button" className="btn btn-primary block m-auto" onClick={() => { setError(""); recorder.init() }} value={t('soundUploader.record.mic.reenable') as string} />
                    : t('soundUploader.record.mic.waiting'))}
            {micReady && <div>
                <div className="modal-section-header">
                    <span>{t('soundUploader.record.measures.title')}</span>
                    {metronome &&
                        <button type="button" className={"btn btn-hollow btn-filter" + (click ? " active" : "")} onClick={() => setClick(!click)}>
                            <span>{t('soundUploader.record.measures.metronomeClick').toLocaleUpperCase()}</span>
                        </button>}
                    <button type="button" className={"btn btn-hollow btn-filter" + (metronome ? " active" : "")}
                        onClick={() => setMetronome(!metronome)}>
                        <span>{t('metronome').toLocaleUpperCase()}</span>
                    </button>
                </div>
                {metronome &&
                    <div className="modal-section-content" id="count-measures-input">
                        <label>
                            {t('soundUploader.record.measures.tempo')}
                        <input type="number" placeholder="e.g. 120" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                            <input id="tempoSlider" type="range" name="rangeTempo" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            {t('soundUploader.record.measures.countoff')}
                        <input type="number" value={countoff} onChange={e => setCountoff(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            {t('soundUploader.record.measures.toRecord')}
                        <input type="number" value={measures} onChange={e => setMeasures(+e.target.value)} required={metronome} />
                        </label>
                    </div>}
                <div className="modal-section-header">
                    <span>{t('soundUploader.record.prompt')}</span>
                    <LevelMeter />
                </div>
                <div className="modal-section-content flex items-center justify-between">
                    <Metronome beat={beat - countoff * 4} hasBuffer={buffer !== null} useMetro={metronome} startRecording={startRecording} />
                    <Waveform buffer={buffer} />
                    {buffer &&
                        <button type="button" id="record-clear-button" className="btn btn-hollow btn-filter" onClick={() => { recorder.clear(); setBuffer(null) }}>
                            <span>{t('clear').toLocaleUpperCase()}</span>
                        </button>}
                </div>
                <div className="modal-section-header">
                    <span>{t('soundUploader.constantRequired')}</span>
                </div>
                <div className="modal-section-content">
                    <input type="text" placeholder="e.g. MYRECORDING_01" className="form-control" value={key} onChange={e => setKey(cleanKey(e.target.value))} required />
                </div>
            </div>}
        </div>
        <Footer ready={buffer !== null} progress={progress} close={close} />
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
    const { t } = useTranslation()

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
        const result = results![selected!]
        try {
            validateUpload(key, result.bpm)
            try {
                // TODO: This endpoint should require authentication.
                await userProject.post("/services/files/uploadfromfreesound", {
                    username,
                    file_key: key,
                    tempo: result.bpm + "",
                    filename: key + ".mp3",
                    creator: result.creator,
                    url: result.downloadURL,
                })
            } catch (error) {
                throw i18n.t("messages:uploadcontroller.commerror")
            }
            userNotification.show(i18n.t("messages:uploadcontroller.uploadsuccess"), "success")
            // Clear the cache so it gets reloaded.
            audioLibrary.clearAudioTagCache()
            store.dispatch(sounds.resetUserSounds())
            store.dispatch(sounds.getUserSounds(username))
            close()
        } catch (error) {
            setError(error)
        }
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <div>
                <a href="https://freesound.org/" target="_blank">Freesound</a> {t('soundUploader.freesound.description')}
            </div>
            <div className="search-block flex">
                <input className="form-control shake form-search flex-grow" placeholder="Search" type="text" value={query}
                    onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") search() }} required />
                <input type="button" onClick={search} className="btn btn-hollow btn-filter" value={t('search').toLocaleUpperCase()} />
            </div>
            {searched && <div className="modal-section-header justify-start mb-3">{t('results')}</div>}
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
                            {result.name}: {result.bpm} bpm. {t('soundUploader.freesound.uploadedBy', { userName: result.creator })}
                        </label>
                        <audio controls preload="none">
                            <source src={result.previewURL} type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                        <hr className="my-3 border-gray-300" />
                    </div>)}
                </div>}
            {searched &&
                (results === null && <div><i className="inline-block animate-spin icon icon-spinner" />{t('soundUploader.freesound.searching')}</div>
                    || results!.length === 0 && <div>{t('noResults')}</div>)}
            <div className="modal-section-header"><span>{t('soundUploader.constantRequired')}</span></div>
            <input type="text" placeholder="e.g. MYSOUND_01" className="form-control" value={key} onChange={e => setKey(cleanKey(e.target.value))} required />
        </div>
        <Footer ready={selected !== null} close={close} />
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
            <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control" value={key} onChange={e => setKey(cleanKey(e.target.value))} required />
        </div>
        <Footer ready={ready} progress={progress} close={close} />
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
                const file = new Blob([message.data.wavData], { type: "audio/wav" })
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
            <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control" value={key} onChange={e => setKey(cleanKey(e.target.value))} required />
        </div>
        <Footer ready={ready} progress={progress} close={close} />
    </form>
}

const Tabs = [
    { component: FileTab, titleKey: "soundUploader.title.upload", icon: "cloud-upload" },
    { component: RecordTab, titleKey: "soundUploader.title.record", icon: "microphone" },
    { component: FreesoundTab, titleKey: "FREESOUND", icon: "search", },
    { component: TunepadTab, titleKey: "TUNEPAD", icon: "cloud-upload" },
    { component: GrooveMachineTab, titleKey: "GROOVEMACHINE", icon: "cloud-upload" },
]

export const SoundUploader = ({ close }: { close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const TabBody = Tabs[activeTab].component
    const { t } = useTranslation()

    return <>
        <div className="modal-header">
            <h4 className="modal-title">{t('soundUploader.title')}</h4>
            <hr className="my-4 border-gray-200" />
            <div className="es-modal-tabcontainer">
                <ul className="nav-pills flex flex-row">
                    {Tabs.map(({ titleKey, icon }, index) =>
                        <li key={index} className={"flex-grow" + (activeTab === index ? " active" : "")}>
                            <a href="#" onClick={() => setActiveTab(index)} className="h-full flex justify-center items-center">
                                <i className={`icon icon-${icon} mr-3`}></i>{t(titleKey).toLocaleUpperCase()}
                            </a>
                        </li>)}
                </ul>
            </div>
        </div>
        <div id="upload-sound-tabcontainer"><TabBody close={close} /></div>
    </>
}
