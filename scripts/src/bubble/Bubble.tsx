import React, { useState, useEffect, Fragment, LegacyRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { usePopper } from "react-popper"
import { Placement } from "@popperjs/core"
import parse from "html-react-parser"
import { useTranslation } from "react-i18next"

import * as app from "../app/appState"
import { pages } from "./bubbleData"
import * as bubble from "./bubbleState"
import { AVAILABLE_LOCALES } from "../locales/AvailableLocales"

const Backdrop = () => {
    return (
        <div className="w-full h-full z-30 bg-black opacity-60"/>
    )
}

const NavButton = (props: { tag: string, primary?: boolean, name: string }) => {
    const dispatch = useDispatch()
    const action = props.tag === "proceed" ? bubble.proceed : bubble.dismissBubble
    const primary = props.primary
    const readyToProceed = useSelector(bubble.selectReadyToProceed)
    const backgroundColor = primary ? (readyToProceed ? "bg-black" : "bg-gray-300") + " text-white" : "bg-white"
    const borderColor = primary && !readyToProceed ? "border-transparent" : "border-black"
    const pointer = primary && !readyToProceed ? "cursor-not-allowed" : "cursor-pointer"

    return (
        <button
            className={`text-sm border-2 ${borderColor} rounded-full p-2 px-4 mx-2 ${backgroundColor} ${pointer}`}
            onClick={() => dispatch(action())}
            tabIndex={0}
        >
            {props.name}
        </button>
    )
}

const MessageFooter = () => {
    const currentPage = useSelector(bubble.selectCurrentPage)
    const locale = useSelector(app.selectLocaleCode)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    let buttons
    if (currentPage === 0) {
        buttons = (
            <Fragment>
                <NavButton name={t("bubble:buttons.skip")} tag="dismiss" />
                <NavButton name={t("bubble:buttons.start")} tag="proceed" primary />
            </Fragment>
        )
    } else if (currentPage === 9) {
        buttons = (
            <Fragment>
                <div className="w-40" />
                <NavButton name={t("bubble:buttons.close")} tag="dismiss" primary/>
            </Fragment>
        )
    } else {
        buttons = (
            <Fragment>
                <NavButton name={t("bubble:buttons.skipTour")} tag="dismiss" />
                <NavButton name={t("bubble:buttons.next")} tag="proceed" primary />
            </Fragment>
        )
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

    return (
        <button
            className="absolute top-0 right-0 m-4 text-lg cursor-pointer"
            tabIndex={0}
            onClick={() => dispatch(bubble.dismissBubble())}
        >
            <span className="icon icon-cross2" />
        </button>
    )
}

const MessageBox = () => {
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

    // TODO - Where should this go?
    // add elements inside modal that should be focusable
    const focusableElements = 'button, select, textarea, [tabindex]:not([tabindex="-1"])'
    const modal = document.querySelector("#targetModal") // select the modal
    const firstFocusableElement = modal?.querySelectorAll(focusableElements)[0] // get first element to be focused inside modal
    const focusableContent = modal?.querySelectorAll(focusableElements)
    const lastFocusableElement = focusableContent ? focusableContent[focusableContent.length - 1] : null // get last element to be focused inside modal
    let focusIdx = 0

    document.addEventListener("keydown", (e) => {
        const isTabPressed = e.key === "Tab"
        if (!isTabPressed) return

        if (e.shiftKey) { // shift + tab
            focusableContent && focusIdx === 0 ? focusIdx = focusableContent.length - 1 : focusIdx--
            if (document.activeElement === firstFocusableElement) {
                (lastFocusableElement as HTMLElement)?.focus()
                e.preventDefault()
            }
        } else { // tab
            focusableContent && focusIdx === focusableContent.length - 1 ? focusIdx = 0 : focusIdx++
            // focusIdx++
            if (document.activeElement === lastFocusableElement) {
                (firstFocusableElement as HTMLElement)?.focus()
            }
        }
        if (focusableContent) (focusableContent[focusIdx] as HTMLElement)?.focus()
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

    return (
        <div
            className="absolute z-40 w-1/3 bg-white p-5 shadow-xl"
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={pages[currentPage].ref === null ? {} : styles.popper}
            role="dialog"
            aria-modal="true"
            id="targetModal"
            {...attributes.popper}
        >
            {[0, 9].includes(currentPage) && <DismissButton />}
            <div className="text-lg font-black mb-4">
                {t(pages[currentPage].headerKey)}
            </div>
            <div className="text-sm">
                {parse(t(pages[currentPage].bodyKey))}
            </div>
            <MessageFooter />
            <div
                className="w-0 h-0"
                ref={setArrowElement as LegacyRef<HTMLDivElement>}
                style={pages[currentPage].ref === null ? {} : arrowStyle}
            />
        </div>
    )
}

export const Bubble = () => {
    const active = useSelector(bubble.selectActive)
    return (
        <div
            className={`absolute top-0 w-full h-full flex justify-center items-center ${active ? "inline-block" : "hidden"}`}
        >
            <Backdrop />
            <MessageBox />
        </div>
    )
}
