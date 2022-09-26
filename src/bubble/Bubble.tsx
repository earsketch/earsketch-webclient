import React, { useState, useEffect, LegacyRef, useRef, Ref } from "react"
import { useSelector, useDispatch } from "react-redux"
import { usePopper } from "react-popper"
import { Dialog } from "@headlessui/react"
import { Placement } from "@popperjs/core"
import parse from "html-react-parser"
import { useTranslation } from "react-i18next"

import * as app from "../app/appState"
import { pages } from "./bubbleData"
import * as bubble from "./bubbleState"
import { proceed, dismiss } from "./bubbleThunks"
import { AVAILABLE_LOCALES } from "../locales/AvailableLocales"

const NavButton = ({ tag, primary, name, pref }: { tag: string, primary?: boolean, name: string, pref?: Ref<HTMLButtonElement> }) => {
    const dispatch = useDispatch()
    const action = tag === "proceed" ? proceed : dismiss
    const readyToProceed = useSelector(bubble.selectReadyToProceed)
    const backgroundColor = primary ? (readyToProceed ? "bg-black" : "bg-gray-300") + " text-white" : "bg-white"
    const borderColor = primary && !readyToProceed ? "border-transparent" : "border-black"
    const pointer = primary && !readyToProceed ? "cursor-not-allowed" : "cursor-pointer"

    return (
        <button
            className={`text-sm border-2 ${borderColor} rounded-full p-2 px-4 mx-2 ${backgroundColor} ${pointer}`}
            onClick={() => dispatch(action())}
            tabIndex={0}
            ref={pref}
        >
            {name}
        </button>
    )
}

const MessageFooter = ({ primaryRef }: { primaryRef: Ref<HTMLButtonElement> }) => {
    const currentPage = useSelector(bubble.selectCurrentPage)
    const locale = useSelector(app.selectLocaleCode)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    let buttons
    if (currentPage === 0) {
        buttons = <>
            <NavButton name={t("bubble:buttons.skip")} tag="dismiss" />
            <NavButton name={t("bubble:buttons.start")} tag="proceed" primary pref={primaryRef} />
        </>
    } else if (currentPage === 9) {
        buttons = <>
            <div className="w-40" />
            <NavButton name={t("bubble:buttons.close")} tag="dismiss" primary pref={primaryRef} />
        </>
    } else {
        buttons = <>
            <NavButton name={t("bubble:buttons.skipTour")} tag="dismiss" />
            <NavButton name={t("bubble:buttons.next")} tag="proceed" primary pref={primaryRef} />
        </>
    }

    return (
        <div className="flex justify-between mt-5">
            <div className="w-2/3 flex">
                {currentPage === 0 && <>
                    <div className="mr-4">
                        <div className="text-xs">{t("bubble:userLanguage")}</div>
                        <select
                            className="border-0 border-b-2 border-black outline-none text-sm"
                            tabIndex={0}
                            onChange={e => {
                                dispatch(app.setLocaleCode(e.currentTarget.value))
                            }}
                            value={locale}
                            aria-label={t("ariaDescriptors:header.selectLanguage")}
                        >
                            {Object.entries(AVAILABLE_LOCALES).map(([, locale]) => <option key={locale.localeCode} value={locale.localeCode}>{locale.displayText}</option>)}
                        </select>
                    </div>

                    <div>
                        <div className="text-xs">{t("bubble:defaultProgrammingLanguage")}</div>
                        <select
                            tabIndex={0}
                            className="border-0 border-b-2 border-black outline-none text-sm"
                            onChange={e => dispatch(bubble.setLanguage(e.currentTarget.value))}
                            id="language"
                            aria-label={t("bubble:selectLanguage")}
                            title={t("bubble:selectLanguage")}
                        >
                            <option value="Python">Python</option>
                            <option value="JavaScript">JavaScript</option>
                        </select>
                    </div>
                </>}
            </div>
            <div className="w-1/3 flex justify-evenly">
                {buttons}
            </div>
        </div>
    )
}

const DismissButton = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    return (
        <button
            className="absolute top-0 right-0 m-4 text-lg cursor-pointer"
            tabIndex={0}
            onClick={() => dispatch(dismiss())}
            title={t("bubble.buttons.close")}
        >
            <span className="icon icon-cross2" />
        </button>
    )
}

export const Bubble = () => {
    const dispatch = useDispatch()
    const active = useSelector(bubble.selectActive)
    const currentPage = useSelector(bubble.selectCurrentPage)
    const { t } = useTranslation()

    const [referenceElement, setReferenceElement] = useState<Element|null>(null)
    const [popperElement, setPopperElement] = useState(null)
    const [arrowElement, setArrowElement] = useState(null)

    const placement = pages[currentPage].placement as Placement
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        placement,
        modifiers: [
            { name: "arrow", options: { element: arrowElement, padding: -25 } },
            { name: "offset", options: { offset: [0, 20] } },
            { name: "flip", options: { fallbackPlacements: [] } },
        ],
    })

    const arrowStyle = { ...styles.arrow }

    switch (placement) {
        case "top":
            Object.assign(arrowStyle, {
                bottom: "-19px",
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderTop: "20px solid white",
            })
            break
        case "bottom":
            Object.assign(arrowStyle, {
                top: "-19px",
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderBottom: "20px solid white",
            })
            break
        case "bottom-start":
            Object.assign(arrowStyle, {
                top: "-19px",
                left: "-270px",
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderBottom: "20px solid white",
            })
            break
        case "left":
            Object.assign(arrowStyle, {
                right: "-19px",
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderLeft: "20px solid white",
            })
            break
        case "left-start":
            Object.assign(arrowStyle, {
                top: "-99px",
                right: "-19px",
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderLeft: "20px solid white",
            })
            break
        case "right":
            Object.assign(arrowStyle, {
                left: "-19px",
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderRight: "20px solid white",
            })
            break
        case "right-start":
            Object.assign(arrowStyle, {
                top: "-99px",
                left: "-19px",
                borderTop: "20px solid transparent",
                borderBottom: "20px solid transparent",
                borderRight: "20px solid white",
            })
            break
        default:
            break
    }

    useEffect(() => {
        const ref = pages[currentPage].ref
        const elem = document.querySelector(ref as string)
        if (ref && elem) setReferenceElement(elem)
        update?.()
    }, [currentPage])

    // Close on escape. Perhaps someday we can avoid reimplementing this.
    // See https://github.com/tailwindlabs/headlessui/issues/621; unfortunately the solution there (from June 23, 2021) no longer works.
    useEffect(() => {
        const escape = (e: KeyboardEvent) => e.key === "Escape" && dispatch(bubble.suspend())
        window.addEventListener("keydown", escape)
        return () => window.removeEventListener("keydown", escape)
    })

    // Workaround for this issue: https://github.com/tailwindlabs/headlessui/issues/259
    const primaryRef = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        if (active) {
            setTimeout(() => primaryRef.current?.focus(), 0)
        }
    }, [active, primaryRef.current])

    return <Dialog
        open={active}
        onClose={() => { /* Disabled so user can click on highlighted elements outside the modal. */ }}
        className="absolute top-0 w-full h-full"
        initialFocus={primaryRef}
    >
        <Dialog.Panel className="h-full flex justify-center items-center">
            <Dialog.Title>{t("bubble:dialogTitle", { page: currentPage, total: pages.length })}</Dialog.Title>
            {/* Backdrop. Reimplements close-on-outside-click, see above comments for details. */}
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={() => dispatch(bubble.suspend())} />
            <div
                className="absolute z-40 w-1/3 bg-white p-5 shadow-xl"
                ref={setPopperElement as LegacyRef<HTMLDivElement>}
                style={pages[currentPage].ref === null ? {} : styles.popper}
                {...attributes.popper}
            >
                {[0, 9].includes(currentPage) && <DismissButton />}
                <h2 className="text-lg font-black mb-4">
                    {t(pages[currentPage].headerKey)}
                </h2>
                <div className="text-sm">
                    {parse(t(pages[currentPage].bodyKey))}
                </div>
                <MessageFooter primaryRef={primaryRef} />
                <div
                    className="w-0 h-0"
                    ref={setArrowElement as LegacyRef<HTMLDivElement>}
                    style={pages[currentPage].ref === null ? {} : arrowStyle}
                />
            </div>
        </Dialog.Panel>
    </Dialog>
}
