import { fileTypeFromBlob } from "file-type"
import i18n from "i18next"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"

import audioContext from "../audio/context"
import * as audioLibrary from "./audiolibrary"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as recorder from "./esrecorder"
import { LevelMeter, Metronome, Waveform } from "./Recorder"
import store from "../reducers"
import * as sounds from "../browser/soundsState"
import { getUserSounds } from "../browser/soundsThunks"
import { encodeFLAC } from "../audio/renderer"
import * as userConsole from "../ide/console"
import * as userNotification from "../user/notification"
import * as user from "../user/userState"
import * as request from "../request"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"

function cleanName(name: string) {
    return name.replace(/\W/g, "").toUpperCase()
}

function validateUpload(username: string | null, name: string, tempo: number) {
    if (username === null) {
        throw new Error(i18n.t("messages:uploadcontroller.userAuth"))
    }
    const names = sounds.selectAllNames(store.getState())
    const fullName = username.toUpperCase() + "_" + name
    if (names.some(k => k === fullName)) {
        throw new Error(`${name} (${fullName})${i18n.t("messages:uploadcontroller.alreadyused")}`)
    } else if (tempo > 220 || (tempo > -1 && tempo < 45)) {
        throw new Error(i18n.t("messages:esaudio.tempoRange"))
    }
}

const AUDIO_FORMATS = [
    { ext: "wav", mime: "wav" },
    { ext: "mp3", mime: "mpeg" },
    { ext: "ogg", mime: "ogg" },
    { ext: "opus", mime: "ogg; codecs=opus" },
    { ext: "flac", mime: "flac" },
]

async function uploadFile(username: string | null, file: Blob, name: string, extension: string, tempo: number, onProgress: (frac: number) => void) {
    validateUpload(username, name, tempo)

    if (file.size > 10 * 1024 * 1024) {
        throw new Error(i18n.t("messages:uploadcontroller.toobig"))
    }

    const type = await fileTypeFromBlob(file)
    if (!AUDIO_FORMATS.map(f => `audio/${f.mime}`).includes(type?.mime!)) {
        throw new Error(i18n.t("messages:uploadcontroller.wavsel"))
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = await audioContext.decodeAudioData(arrayBuffer)
    if (buffer.duration > 30) {
        esconsole("Rejecting the upload of audio file with duration: " + buffer.duration, ["upload", "error"])
        throw new Error(i18n.t("messages:uploadcontroller.toolong"))
    }

    if (type!.mime === "audio/wav") {
        const channels = [...new Array(buffer.numberOfChannels)].map((_, i) => buffer.getChannelData(i))
        const flac = encodeFLAC(channels, buffer.sampleRate, buffer.numberOfChannels)
        if (flac.size < file.size) {
            // Ensure the FLAC file is actually smaller before choosing it over the original.
            // (This should practically always be the case, but it's technically possible for WAV to contain compressed audio data.)
            file = flac
            extension = ".flac"
        }
    }

    const data = request.form({
        file,
        name,
        // TODO: I don't think the server should allow arbitrary filenames unrelated to the key. This field should probably be replaced or removed.
        filename: `${name}${extension}`,
        tempo: tempo + "",
    })

    // Sadly, Fetch does not yet support observing upload progress (see https://github.com/github/fetch/issues/89).
    const req = new XMLHttpRequest()
    req.upload.onprogress = e => onProgress(e.loaded / e.total)

    req.timeout = 60000
    req.ontimeout = () => userConsole.error(i18n.t("messages:uploadcontroller.timeout"))
    const promise = new Promise<void>((resolve, reject) => {
        req.onload = () => {
            if (req.readyState === 4) {
                if (req.status === 204) {
                    userNotification.show(i18n.t("messages:uploadcontroller.uploadsuccess"), "success")
                    // Clear the cache so it gets reloaded.
                    audioLibrary.clearCache()
                    store.dispatch(sounds.resetUserSounds())
                    store.dispatch(getUserSounds(username!))
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
    req.open("POST", URL_DOMAIN + "/audio/upload")
    req.setRequestHeader("Authorization", "Bearer " + user.selectToken(store.getState()))
    req.send(data)
    return promise
}

const FileTab = ({ close }: { close: () => void }) => {
    const username = useSelector(user.selectUserName)
    const [file, setFile] = useState(null as File | null)
    const [name, setName] = useState("")
    const [tempo, setTempo] = useState("")
    const [error, setError] = useState("")
    const [progress, setProgress] = useState<number>()
    const { t } = useTranslation()

    const filename = file ? ESUtils.parseName(file.name) : ""
    if (name === "" && filename !== "") {
        setName(filename.trim().replace(/\W/g, "_").replace(/_+/g, "_").toUpperCase())
    }
    const extension = file ? ESUtils.parseExt(file.name) : ""

    const submit = async () => {
        try {
            await uploadFile(username, file!, name, extension, tempo === "" ? -1 : +tempo, setProgress)
            close()
        } catch (error: any) {
            setError(error.message)
        }
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <Alert message={error}></Alert>
            <div>
                <div className="upload-file">
                    <input id="file" className="inputfile" type="file" onChange={e => setFile(e.target.files![0])}
                        accept={AUDIO_FORMATS.map(({ ext, mime }) => `.${ext},audio/${mime}`).join(",")} required/>
                    <label id="inputlabel" htmlFor="file">
                        <span className="pr-2 text-sky-800"><i className="icon icon-cloud-upload"></i></span>
                        <span className="pr-2 text-sky-800">{filename || t("soundUploader.file.prompt")}</span>
                        {extension
                            ? <kbd>{extension}</kbd>
                            : AUDIO_FORMATS.map(({ ext }) => <kbd key={ext}>.{ext}</kbd>)}
                    </label>
                </div>
                <div className="" id="upload-details">
                    <label className="w-1/2 p-2">
                        {t("soundUploader.constantRequired")}
                        <input type="text" placeholder={t("soundUploader.constantPlaceholder.synth")}
                            className="form-input w-full dark:bg-transparent placeholder:text-gray-300" id="name" value={name}
                            onChange={e => setName(cleanName(e.target.value))} required/>
                    </label>

                    <label className="w-1/2 p-2">
                        {t("soundUploader.tempoOptional")}
                        <input type="number" placeholder="e.g. 120" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" id="tempo"
                            value={tempo}
                            onChange={e => setTempo(e.target.value)}/></label>
                </div>
            </div>
        </ModalBody>
        <ModalFooter submit="upload" ready={file !== null} progress={progress} close={close} />
    </form>
}

const RecordTab = ({ close }: { close: () => void }) => {
    const username = useSelector(user.selectUserName)
    const { t } = useTranslation()
    const isMacFirefox = ESUtils.whichBrowser().includes("Firefox") && ESUtils.whichOS() === "MacOS"
    const [name, setName] = useState("")
    const [error, setError] = useState(isMacFirefox ? t("soundUploader.record.firefoxMacError") : "")
    const [progress, setProgress] = useState<number>()
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
            const blob = encodeFLAC(buffer!.getChannelData(0), audioContext.sampleRate, 1)
            await uploadFile(username, blob, name, ".flac", metronome ? tempo : 120, setProgress)
            close()
        } catch (error: any) {
            setError(error.message)
        }
    }

    recorder.callbacks.micAccessBlocked = error => setError(i18n.t("messages:uploadcontroller." + error))

    recorder.callbacks.micReady = () => setMicReady(true)

    useEffect(() => { recorder.init() }, [])

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <Alert message={error}></Alert>
            {!micReady &&
                (error
                    ? <input type="button" className="btn btn-primary block m-auto" onClick={() => { setError(""); recorder.init() }} value={t("soundUploader.record.mic.reenable") as string} />
                    : t("soundUploader.record.mic.waiting"))}
            {micReady && !isMacFirefox && <div>
                <div className="modal-section-header">
                    <span>{t("soundUploader.record.measures.title")}</span>
                    {metronome &&
                        <button type="button" className={"btn-hollow btn-filter text-xs" + (click ? " active" : "")} onClick={() => setClick(!click)}>
                            <span>{t("soundUploader.record.measures.metronomeClick").toLocaleUpperCase()}</span>
                        </button>}
                    <button type="button" className={"btn-hollow btn-filter text-xs" + (metronome ? " active" : "")}
                        onClick={() => setMetronome(!metronome)}>
                        <span>{t("metronome").toLocaleUpperCase()}</span>
                    </button>
                </div>
                {metronome &&
                    <div className="modal-section-content" id="count-measures-input">
                        <label>
                            {t("soundUploader.record.measures.tempo")}
                            <input id="tempoSlider" type="range" name="rangeTempo" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                            <input type="number" className="form-input ml-2 dark:bg-transparent placeholder:text-gray-300" placeholder="e.g. 120" min={45} max={220} value={tempo} onChange={e => setTempo(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            {t("soundUploader.record.measures.countoff")}
                            <input type="number" className="form-input dark:bg-transparent placeholder:text-gray-300" value={countoff} onChange={e => setCountoff(+e.target.value)} required={metronome} />
                        </label>
                        <label>
                            {t("soundUploader.record.measures.toRecord")}
                            <input type="number" className="form-input dark:bg-transparent placeholder:text-gray-300" value={measures} onChange={e => setMeasures(+e.target.value)} required={metronome} />
                        </label>
                    </div>}
                <div className="modal-section-header">
                    <span>{t("soundUploader.record.prompt")}</span>
                    <LevelMeter />
                </div>
                <div className="modal-section-content flex items-center justify-between">
                    <Metronome beat={beat - countoff * 4} hasBuffer={buffer !== null} useMetro={metronome} startRecording={startRecording} />
                    <Waveform buffer={buffer} />
                    {buffer &&
                        <button type="button" id="record-clear-button" className="btn btn-hollow btn-filter" onClick={() => { recorder.clear(); setBuffer(null) }}>
                            <span>{t("clear").toLocaleUpperCase()}</span>
                        </button>}
                </div>
                <div className="modal-section-header">
                    <span>{t("soundUploader.constantRequired")}</span>
                </div>
                <div className="modal-section-content">
                    <input type="text" placeholder={t("soundUploader.constantPlaceholder.recording")} className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={name} onChange={e => setName(cleanName(e.target.value))} required />
                </div>
            </div>}
        </ModalBody>
        <ModalFooter submit="upload" ready={buffer !== null} progress={progress} close={close} />
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
    const [name, setName] = useState("")
    const { t } = useTranslation()

    const username = useSelector(user.selectUserName) ?? ""

    const search = async () => {
        setSearched(true)
        setResults(null)
        setSelected(null)

        const data = await request.get("/audio/freesound/search", { query })
        const results = data.results
            .filter((result: any) => result.analysis?.rhythm?.bpm)
            .map((result: any) => ({
                previewURL: result.previews["preview-lq-mp3"],
                iframe: `https://freesound.org/embed/sound/iframe/${result.id}/simple/small/`,
                downloadURL: result.previews["preview-hq-mp3"],
                creator: result.username,
                name: result.name,
                bpm: Math.round(result.analysis.rhythm.bpm),
            }))
        setResults(results)
    }

    const submit = async () => {
        const result = results![selected!]
        try {
            validateUpload(username, name, result.bpm)
            try {
                await request.postAuth("/audio/freesound/upload", {
                    username,
                    name,
                    tempo: result.bpm + "",
                    filename: name + ".mp3",
                    creator: result.creator,
                    url: result.downloadURL,
                })
            } catch (error) {
                throw new Error(i18n.t("messages:uploadcontroller.commerror"))
            }
            userNotification.show(i18n.t("messages:uploadcontroller.uploadsuccess"), "success")
            // Clear the cache so it gets reloaded.
            audioLibrary.clearCache()
            store.dispatch(sounds.resetUserSounds())
            store.dispatch(getUserSounds(username))
            close()
        } catch (error: any) {
            setError(error.message)
        }
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <Alert message={error}></Alert>
            <div>
                <a href="https://freesound.org/" target="_blank" rel="noreferrer">Freesound</a> {t("soundUploader.freesound.description")}
            </div>
            <div className="search-block flex my-2">
                <input className="form-input shake form-search grow mr-1.5 dark:bg-transparent placeholder:text-gray-300" placeholder="Search" type="text" value={query}
                    onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") search() }} required />
                <input type="button" onClick={search} className="btn-hollow btn-filter" value={t("search").toLocaleUpperCase()} />
            </div>
            {searched && <div className="modal-section-header justify-start mb-3">{t("results")}</div>}
            {results && results.length > 0 &&
                <div className="overflow-y-auto border border-gray-300 dark:border-gray-500" style={{ maxHeight: "300px" }}>
                    {results.map((result, index) => <div key={index} className={"border-b border-gray-300 " + (index === selected ? "bg-blue-200 dark:bg-blue-900" : "")}>
                        <div className="pt-2 px-3">
                            <label className="mb-2 inline-flex items-center">
                                <input type="radio" style={{ marginRight: "0.75rem" }} checked={index === selected}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelected(index)
                                            setName(result.name.replace(/[^A-Za-z0-9]/g, "_").toUpperCase())
                                            setError("")
                                        }
                                    }} />
                                <audio className="ml-2" controls controlsList="nodownload" preload="none">
                                    <source src={result.previewURL} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                                <span className="ml-4 flex-1">{result.name}: {result.bpm} bpm. {t("soundUploader.freesound.uploadedBy", { userName: result.creator })}</span>
                            </label>
                        </div>
                    </div>)}
                </div>}
            {searched &&
                ((results === null && <div><i className="animate-spin es-spinner mr-3" />{t("soundUploader.freesound.searching")}</div>) ||
                    (results!.length === 0 && <div>{t("noResults")}</div>))}
            <div className="modal-section-header"><span>{t("soundUploader.constantRequired")}</span></div>
            <input type="text" placeholder={t("soundUploader.constantPlaceholder.sound")} className="form-input w-full my-2 dark:bg-transparent placeholder:text-gray-300" value={name} onChange={e => setName(cleanName(e.target.value))} required />
        </ModalBody>
        <ModalFooter submit="upload" ready={selected !== null} close={close} />
    </form>
}

const Tabs = [
    { component: FileTab, titleKey: "soundUploader.title.upload", icon: "cloud-upload" },
    { component: RecordTab, titleKey: "soundUploader.title.record", icon: "microphone" },
    { component: FreesoundTab, titleKey: "FREESOUND", icon: "search" },
]

export const SoundUploader = ({ close }: { close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const TabBody = Tabs[activeTab].component
    const { t } = useTranslation()

    return <>
        <ModalHeader>{t("soundUploader.title")}</ModalHeader>
        <div className="mb-2 bg-blue flex">
            {Tabs.map(({ titleKey, icon }, index) =>
                <button key={index} onClick={e => { e.preventDefault(); setActiveTab(index) }} className={"text-sm h-full flex justify-center items-center grow px-1 py-2 w-1/4 cursor-pointer border-b-4 " + (activeTab === index ? "border-b-amber text-amber" : "border-transparent text-white")} style={{ textDecoration: "none" }}>
                    <i className={`icon icon-${icon} mr-3`}></i>{t(titleKey).toLocaleUpperCase()}
                </button>
            )}
        </div>
        <div id="upload-sound-tabcontainer"><TabBody close={close} /></div>

    </>
}
