import React, { MutableRefObject, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { Dialog } from "@headlessui/react"

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

interface Props {
    children: React.ReactNode
}

export const ModalHeader: React.FC<Props> = ({ children }) => {
    return <Dialog.Title className="border-b p-3.5 text-gray-900 dark:text-white">{children}</Dialog.Title>
}

export const ModalBody: React.FC<Props> = ({ children }) => {
    return <div className="p-3.5 text-gray-800 dark:text-white">{children}</div>
}

export const ModalSectionHeader: React.FC<Props> = ({ children }) => {
    return <div className="p-3.5 bg-gray-300 text-black">{children}</div>
}

export const ModalFooter = ({ submit, cancel, ready, progress, type, close }: {
    submit?: string, cancel?: string, ready?: boolean, progress?: number, type?: string, close?: () => void
}) => {
    const { t } = useTranslation()
    const btnClass = classNames({
        "btn text-sm py-1.5 px-3 ml-2": true,
        "bg-sky-700 text-white hover:text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-75": !type,
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
        <form onSubmit={e => { e.preventDefault(); close(input) }}>
            <ModalBody>
                <input type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={input} onChange={e => setInput(e.target.value)} autoFocus />
            </ModalBody>
            <ModalFooter submit="ok" />
        </form>
    </>
}

export const CheckboxButton = ({ value = 0, label = value.toString(), fullWidth = false, onClick, selected = false, submitOnClick = true, selectedColor = "amber" }: { value?: number, label?: string, fullWidth?: boolean, onClick: (input: number) => void, selected?: boolean, submitOnClick?: boolean, selectedColor?: "amber" | "green" }) => {
    const classnames = classNames({
        "rounded cursor-pointer p-1 mt-1 mr-2": true,
        "hover:bg-amber-50 dark:hover:bg-amber-900 hover:text-black dark:text-white": selectedColor === "amber",
        "hover:bg-green-50 dark:hover:bg-green-900 hover:text-black dark:text-white": selectedColor === "green",
        "text-gray-500 border border-gray-500": !selected,
        "bg-amber-400 hover:bg-amber-400 dark:bg-amber-500 text-black dark:text-white": selected && selectedColor === "amber",
        "bg-green-400 hover:bg-green-400 dark:bg-green-500 text-black dark:text-white": selected && selectedColor === "green",
        "w-full": fullWidth,
    })

    return <button
        role="option"
        className={classnames}
        onClick={e => {
            if (!submitOnClick) { e.preventDefault() }
            onClick(value)
        }}
        aria-selected={selected}
    >
        <div className="flex flex-row gap-x-1">
            <span className="rounded-full inline-flex w-1 mr-2">
                <i className={`icon-checkmark3 text-sm w-full ${selected ? "block" : "hidden"}`} />
            </span>
            <div className="text-xs select-none mr-4">
                {label}
            </div>
        </div>
    </button>
}

export const PromptChoice = ({ message, choices, allowMultiple, close }: { message: string, choices: string[], allowMultiple: boolean, close: (input: number | number[]) => void }) => {
    const [currentChoice, setInput] = useState(-1)
    const [currentChoices, setInputs] = useState<number[]>([])
    const classnameForSubmit = classNames({
        "btn text-sm py-1.5 px-3 ml-2 bg-sky-700 text-white hover:text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-75": true,
    })
    const { t } = useTranslation()
    return <>
        <ModalHeader>{message}</ModalHeader>
        <form onSubmit={e => { e.preventDefault() }}>
            <ModalBody>
                <div className="flex flex-row flex-wrap" style={{ maxHeight: "40vh", overflowY: "scroll" }}>
                    {choices.map((choice, index) =>
                        <div key={index}>
                            <CheckboxButton
                                value={index}
                                label={choice + "" /* coerce to string, for booleans */}
                                onClick={(value) => {
                                    if (allowMultiple) {
                                        if (currentChoices.includes(value)) {
                                            setInputs(currentChoices.filter(choice => choice !== value))
                                        } else {
                                            setInputs([...currentChoices, value])
                                        }
                                    } else {
                                        setInput(value)
                                    }
                                }}
                                selected={allowMultiple ? currentChoices.includes(index) : (currentChoice === index)}></CheckboxButton>
                        </div>
                    )}
                </div>
                <div className="flex flex-row justify-end mt-1">
                    <button type="button" className={classnameForSubmit} onClick={() => close(allowMultiple ? currentChoices : currentChoice)} disabled={currentChoice < 0 && (currentChoices.length === 0)}>
                        {t("ok").toLocaleUpperCase()}
                    </button>
                </div>
            </ModalBody>
        </form>
    </>
}
