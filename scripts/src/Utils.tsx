import React, { MutableRefObject, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"

// Useful for preventing absolute-positioned elements from exceeding window height.
export const useHeightLimiter = (show: boolean, marginBottom: string|null = null): [MutableRefObject<HTMLDivElement|null>, React.CSSProperties] => {
    const [height, setHeight] = useState("100vh")
    const el = useRef<HTMLDivElement|null>(null)

    const handleResize = () => {
        const elem = el.current
        elem && setHeight(`calc(100vh - ${elem.getBoundingClientRect().top}px${marginBottom ? " - " + marginBottom : ""})`)
    }

    useEffect(() => {
        if (show) {
            window.addEventListener("resize", handleResize)
            handleResize()
            return () => window.removeEventListener("resize", handleResize)
        }
    }, [show])

    return [el, { maxHeight: height, overflowY: "auto" }]
}

const ProgressBar = ({ progress }: { progress: number }) => {
    const percent = Math.floor(progress * 100) + "%"
    return <div className="progress grow mb-0 mr-3">
        <div className="progress-bar progress-bar-success" style={{ width: percent }}>{percent}</div>
    </div>
}

export const Alert = ({ message }: { message: string }) => {
    return <> {message &&
    <div className="text-sm text-red-800 bg-red-100 p-4 mb-4 rounded border border-red-200">{message}</div>}
    </>
}

export const ModalHeader: React.FC = ({ children }) => {
    return <>
        <div className="border-b p-3.5 text-gray-900 dark:text-white">{children}</div>
    </>
}

export const ModalBody: React.FC = ({ children }) => {
    return <>
        <div className="p-3.5 text-gray-800 dark:text-white">{children}</div>
    </>
}

export const ModalSectionHeader: React.FC = ({ children }) => {
    return <>
        <div className="p-3.5 bg-gray-300 text-black">{children}</div>
    </>
}

export const ModalFooter = ({ submit, cancel, ready, progress, type, close }: {
    submit?: string, cancel?: string, ready?: boolean, progress?: number, type?: string, close?: () => void
}) => {
    const { t } = useTranslation()
    const btnClass = classNames({
        "btn text-sm py-1.5 px-3 ml-2": true,
        "bg-sky-600 text-white hover:text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-75": !type,
        "bg-red-600 text-white hover:text-white hover:bg-red-700": type === "danger",
    })
    return <div className="flex items-center justify-end border-t p-3.5">
        {progress !== undefined && <ProgressBar progress={progress} />}
        {close !== undefined && <input type="button" className="btn text-sm py-1.5 px-3 bg-white text-black hover:text-black hover:bg-gray-200" onClick={() => close()} value={t(cancel ?? "cancel").toLocaleUpperCase()} />}
        {submit && <input type="submit" className={btnClass} value={t(submit).toLocaleUpperCase()} disabled={!(ready ?? true)}/>}
    </div>
}

// Prompt modal used for readInput().
export const Prompt = ({ message, close }: { message: string, close: (input: string) => void }) => {
    const [input, setInput] = useState("")

    return <>
        <ModalHeader>{message}</ModalHeader>
        <ModalBody>
            <form onSubmit={e => { e.preventDefault(); close(input) }}>
                <div className="modal-body">
                    <div className="form-group">
                        <input type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={input} onChange={e => setInput(e.target.value)} autoFocus />
                    </div>
                </div>
            </form>
        </ModalBody>
        <ModalFooter submit="ok" />
    </>
}
