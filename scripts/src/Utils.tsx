import React, { MutableRefObject, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

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
    return <div className="progress flex-grow mb-0 mr-3">
        <div className="progress-bar progress-bar-success" style={{ width: percent }}>{percent}</div>
    </div>
}

export const ModalFooter = ({ submit, cancel, ready, progress, type, close }: {
    submit?: string, cancel?: string, ready?: boolean, progress?: number, type?: string, close?: () => void
}) => {
    const { t } = useTranslation()

    return <div className="modal-footer flex items-center justify-end">
        {progress !== undefined && <ProgressBar progress={progress} />}
        {close !== undefined && <input type="button" className="btn btn-default" onClick={() => close()} value={t(cancel ?? "cancel").toLocaleUpperCase()} />}
        {submit && <input type="submit" className={`btn btn-${type ?? "primary"}`} value={t(submit).toLocaleUpperCase()} disabled={!(ready ?? true)}/>}
    </div>
}

// Prompt modal used for readInput().
export const Prompt = ({ message, close }: { message: string, close: (input: string) => void }) => {
    const [input, setInput] = useState("")

    return <>
        <div className="modal-header">{message}</div>
        <form onSubmit={e => { e.preventDefault(); close(input) }}>
            <div className="modal-body">
                <div className="form-group">
                    <input type="text" className="form-control" value={input} onChange={e => setInput(e.target.value)} autoFocus />
                </div>
            </div>
            <ModalFooter submit="ok" />
        </form>
    </>
}
