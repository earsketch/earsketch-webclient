import React, { useEffect, useRef, useState } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { Collapsed } from "../browser/Utils"

import * as appState from "../app/appState"
import * as curriculum from "../browser/curriculumState"
import * as sounds from "../browser/soundsState"
import { previewSound } from "../browser/soundsThunks"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as tabs from "../ide/tabState"
import * as cai from "./caiState"
import * as caiThunks from "./caiThunks"
import * as dialogue from "./dialogue"
import * as student from "./dialogue/student"
import { addToNodeHistory } from "./dialogue/upload"

import { useTranslation } from "react-i18next"
import * as editor from "../ide/Editor"
import store from "../reducers"
import * as user from "../user/userState"
import { CAI_TREE_NODES } from "./dialogue/caitree"

export const CaiHeader = () => {
    const activeProject = useSelector(cai.selectActiveProject)

    return (
        <div id="chat-header">
            <div id="chatroom-title">
                <div>
                    Talk {FLAGS.SHOW_CAI && "to CAI"} about {" "}
                    {(activeProject && activeProject.length > 0)
                        ? <span id="chat-script-name">{activeProject}</span>
                        : <span>a project, when one is open</span>}
                    .
                </div>
            </div>
        </div>
    )
}

const SoundPreviewContent = ({ name }: { name: string }) => {
    const previewNode = useSelector(sounds.selectPreviewNode)
    const previewFileName = useSelector(sounds.selectPreviewName)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const wizardMode = cai.selectWizard(store.getState())

    return (
        <div style={{ display: "inline" }}>
            <div className="flex grow truncate left-justify py-2 lightgray border border-gray-300">
                <div className="pl-2 pr-4 h-1">
                    <button
                        className="btn btn-xs btn-action"
                        onClick={e => { e.preventDefault(); dispatch(previewSound(name)); student.addUIClick("sound preview - " + name + (previewNode ? " stop" : " play") + " (CAI)") }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                    >
                        {previewFileName === name
                            ? (previewNode ? <i className="icon icon-stop2" /> : <i className="animate-spin es-spinner" />)
                            : <i className="icon icon-play4" />}
                    </button>
                    {tabsOpen && !wizardMode &&
                        (
                            <button
                                className="btn btn-xs btn-action"
                                onClick={() => { editor.pasteCode(name); student.addUIClick("sound copy - " + name + " (CAI)") }}
                                title={t("soundBrowser.clip.tooltip.paste")}
                            >
                                <i className="icon icon-paste2" />
                            </button>
                        )}
                </div>
                <span id="text" className="chat-message-text truncate pl-5">{name}</span>
            </div>
        </div>
    )
}

const CaiMessageView = ({ message }: { message: cai.CaiMessage }) => {
    const dispatch = useDispatch()
    const userName = useSelector(user.selectUserName)

    const wholeMessage = message.text.map((phrase: [string, string], index) => {
        switch (phrase[0]) {
            case "plaintext":
                return <span key={index}>{phrase[1][0]}</span>
            case "LINK":
                return <a key={index} className="hover:text-yellow-500 text-blue-500 underline" href="#" onClick={e => { e.preventDefault(); dispatch(curriculum.open(phrase[1][1])); addToNodeHistory(["curriculum", phrase[1][1]]) }}>{phrase[1][0]}</a>
            case "sound_rec":
                return <span key={index}><SoundPreviewContent name={phrase[1][0]}/></span>
            default:
                return <span key={index}> error </span>
        }
    })

    return (
        <div className="chat-message">
            <div className="chat-message-bubble" style={{
                float: message.sender === userName ? "right" : "left",
                backgroundColor: message.sender === userName ? "darkgray" : "lightgray",
            }}>
                <div className="chat-message-sender">{message.sender}</div>
                <div id="text" className="chat-message-text">
                    {wholeMessage}
                </div>
            </div>
            <div className="chat-message-date" style={{
                float: message.sender === userName ? "right" : "left",
                textAlign: message.sender === userName ? "right" : "left",
                width: "80%",
            }}>
                {ESUtils.formatTime(Date.now() - message.date)}
            </div>
        </div>
    )
}

export const CaiBody = () => {
    const messageList = useSelector(cai.selectMessageList)
    const vidRef = useRef<HTMLVideoElement>(null)

    const onPlayPress = (event: { type: any }) => {
        student.addUIClick(`video - ${event.type} - cai`)
    }

    useEffect(() => {
        ["play", "pause", "seeked", "ended"].forEach(event => {
            if (vidRef.current) {
                vidRef.current.addEventListener(event, onPlayPress)
            }
        })
    }, [vidRef])

    return (
        <div id="cai-body">
            {FLAGS.SHOW_CAI &&
                <div>
                    <video ref={vidRef} src="https://earsketch.gatech.edu/videoMedia/cai_denoise.mp4" controls style={{ width: "100%", maxWidth: "webkit-fill-available" }} onClick={onPlayPress}></video>
                </div>}
            <div className="chat-message-container text-sm">
                <ul>
                    {messageList.length &&
                    messageList.map((message: cai.CaiMessage, idx: number) =>
                        <li key={idx}>
                            <CaiMessageView message={message} />
                        </li>)}
                </ul>
            </div>
        </div>
    )
}

const CaiInputButtons = ({ inputOptions }: { inputOptions: cai.CaiButton[] }) => {
    const dispatch = useDispatch()

    return <ul>
        {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CaiButton]) =>
            <li key={inputIdx}>
                <button type="button" className="btn btn-cai" onClick={() => dispatch(caiThunks.sendCaiMessage([input, false]))}>
                    {input.label}
                </button>
            </li>)}
    </ul>
}

const MenuSelector = ({ label, isSelected, setActiveSubmenu }: { label: string, isSelected: boolean, setActiveSubmenu: (e: any) => void }) => {
    return (
        <button
            className={`w-1/3 px-1 py-2 w-1/3 cursor-pointer ${isSelected ? "border-b-4" : "border-b-4 border-transparent"} truncate capitalize`}
            style={{ color: isSelected ? "#F5AE3C" : "#bbb", backgroundColor: isSelected ? "#282828" : "#111", borderColor: isSelected ? "#F5AE3C" : "#181818" }}
            onClick={() => setActiveSubmenu(!isSelected ? label : null)}>
            {label}
        </button>
    )
}

const caiButtonCSS = "break-words bg-[#d3d25a] px-1 py-2 text-black w-full h-full rounded-md text-xs text-center"

const MenuPanel = ({ title, options, cols, setActiveSubmenu }: { title: string, options: number[], cols: number, setActiveSubmenu: (e: any) => void }) => {
    const dispatch = useDispatch()
    return (
        <>
            <div className="text-sm font-semibold uppercase text-slate-300 my-3"> {title} </div>
            <div className={`grid grid-cols-${cols} gap-2`}>
                {Object.entries(options).map(([_, input]: [string, number]) =>
                    <div key={options.indexOf(input)}>
                        <button className={caiButtonCSS} title={CAI_TREE_NODES[input].title} onClick={() => [dispatch(caiThunks.sendCaiMessage([{ label: CAI_TREE_NODES[input].title, value: String(input) }, true])), setActiveSubmenu(null)]}>{CAI_TREE_NODES[input].title}</button>
                    </div>
                )}
            </div>
        </>
    )
}

const MusicMenu = ({ setActiveSubmenu }: { setActiveSubmenu: (e: any) => void }) => {
    const menuOptions = dialogue.menuOptions.music.options
    // render the first two menuOptions and then the last three
    return (
        <div className="mr-4 mb-2">
            <MenuPanel title="CAI should suggest" options={menuOptions.slice(0, 2)} cols={2} setActiveSubmenu={setActiveSubmenu}></MenuPanel>
            <MenuPanel title="I would like to" options={menuOptions.slice(2, 4)} cols={2} setActiveSubmenu={setActiveSubmenu}></MenuPanel>
        </div>
    )
}

const HelpMenu = ({ setActiveSubmenu }: { setActiveSubmenu: (e: any) => void }) => {
    const activeProject = useSelector(cai.selectActiveProject)
    const language = ESUtils.parseLanguage(activeProject)
    const menuOptions = dialogue.menuOptions.help.options.filter(o => o !== (language === "python" ? 116 : 115))
    return (
        <div className="mr-4 mb-2">
            <MenuPanel title="Can you help me with..." options={menuOptions} cols={3} setActiveSubmenu={setActiveSubmenu}></MenuPanel>
        </div>
    )
}

const ControlsMenu = ({ setActiveSubmenu }: { setActiveSubmenu: (e: any) => void }) => {
    const menuOptions = dialogue.menuOptions.controls.options
    return (
        <div className="mr-4 mb-2">
            <MenuPanel title="How do I..." options={menuOptions} cols={2} setActiveSubmenu={setActiveSubmenu}></MenuPanel>
        </div>
    )
}

const musicSubMenuRenderer = (activeSubMenu: string, setActiveSubmenu: (e: any) => void) => {
    switch (activeSubMenu) {
        case "music":
            return <MusicMenu setActiveSubmenu={setActiveSubmenu} />
        case "help":
            return <HelpMenu setActiveSubmenu={setActiveSubmenu} />
        case "controls":
            return <ControlsMenu setActiveSubmenu={setActiveSubmenu} />
        case "null":
            return null
        default:
            return <div> Unknown menu option </div>
    }
}

const CaiFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const errorOptions = useSelector(cai.selectErrorOptions)
    const dropupLabel = useSelector(cai.selectDropupLabel)
    const [activeSubmenu, setActiveSubmenu] = useState(null as (keyof typeof dialogue.menuOptions | null))

    return (
        <div id="chat-footer" className="bg-[#111111]">
            <div className="flex">
                <div className="inline-flex items-center px-4 bg-[#222] mr-1">
                    {activeSubmenu != null && <button className="icon icon-arrow-left2 text-slate-300" onClick={() => setActiveSubmenu(null)}/>}
                </div>
                <ul className="w-full">
                    {activeSubmenu != null
                        ? musicSubMenuRenderer(activeSubmenu, setActiveSubmenu)
                        : <div>
                            {!dropupLabel.length
                                ? <CaiInputButtons inputOptions={inputOptions}/>
                                : <div className="list-cai-content">
                                    <ul className="min-w-full">
                                        {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CaiButton]) =>
                                            <li key={inputIdx}>
                                                <button className="btn break-all text-left w-full" title={input.label} onClick={() => dispatch(caiThunks.sendCaiMessage([input, false]))}>{input.label}</button>
                                            </li>)}
                                    </ul>
                                </div>}
                        </div>}
                </ul>
            </div>
            <div style={{ flex: "auto" }}>
                {errorOptions.length > 0 &&
                <CaiInputButtons inputOptions={errorOptions}/>}
            </div>
            <div className="w-full">
                {inputOptions.length > 0 &&
                    Object.entries(dialogue.menuOptions).map(([menuIdx, _]: [string, any]) =>
                        <MenuSelector key={menuIdx} label={menuIdx} isSelected={activeSubmenu === menuIdx} setActiveSubmenu={setActiveSubmenu}/>)}
            </div>
        </div>
    )
}

export const CAI = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const activeScript = useSelector(tabs.selectActiveTabScript)?.name
    const curriculumLocation = useSelector(curriculum.selectCurrentLocation)
    const curriculumPage = useSelector(curriculum.selectPageTitle)

    useEffect(() => {
        dispatch(caiThunks.caiSwapTab(activeScript || ""))
    }, [activeScript])

    useEffect(() => {
        dispatch(caiThunks.curriculumPage([curriculumLocation, curriculumPage]))
    }, [curriculumPage])

    return paneIsOpen
        ? (
            <div className={`font-sans h-full flex flex-col ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}>
                <CaiHeader />
                <CaiBody />
                <CaiFooter />
            </div>
        )
        : <Collapsed title="CAI" position="east" />
}

if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT || FLAGS.UPLOAD_CAI_HISTORY) {
    // TODO: Moved out of userProject, should probably go in a useEffect.
    window.onfocus = () => student.addOnPageStatus(1)
    window.onblur = () => student.addOnPageStatus(0)

    window.addEventListener("load", () => {
        student.addPageLoad(1)
    })

    window.addEventListener("beforeunload", () => {
        // the absence of a returnValue property on the event will guarantee the browser unload happens
        student.addPageLoad(0)
    })

    document.addEventListener("copy", e => {
        addToNodeHistory([e.type, e.clipboardData!.getData("Text")])
    })

    document.addEventListener("cut", e => {
        addToNodeHistory([e.type, e.clipboardData!.getData("Text")])
    })

    document.addEventListener("paste", e => {
        addToNodeHistory([e.type, e.clipboardData!.getData("Text")])
    })
}
