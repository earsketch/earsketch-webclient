import React, { useEffect } from "react"
import { useSelector } from "react-redux"
import store from "../reducers"
import * as appState from "./appState"
import Confetti from "react-confetti"
import useWindowSize from "react-use/lib/useWindowSize"

const CONFETTI_INIT_DELAY_MS = 3000
const CONFETTI_INIT_DUR_MS = 5000
const CONFETTI_DUR_MS = 5000
const CONFETTI_PIECES = 400 // 500 is typical

// coordinate all confetti components for a blast of fixed duration ms
const confettiBlast = (dur: number) => {
    store.dispatch(appState.setConfetti(true))
    setTimeout(() => {
        store.dispatch(appState.setConfetti(false))
    }, dur)
}

// confetti effect and celebratory message for the top header nav
export const MillionthUserHeaderMsg = () => {
    const confettiIsRunning = useSelector(appState.selectConfetti)
    const { width, height } = useWindowSize()

    useEffect(() => {
        // fire the initial blast of confetti
        setTimeout(() => confettiBlast(CONFETTI_INIT_DUR_MS), CONFETTI_INIT_DELAY_MS)
    }, [])

    return (
        <div className="flex items-center text-white" title="YAY">
            <div className="text-3xl">🎉</div>
            <div style={{ transform: "rotate(-7deg)", marginLeft: "-8px" }} className={confettiIsRunning ? "text-lg text-yellow-400" : "text-lg"}>celebrating one million users!</div>
            <Confetti
                width={width}
                height={height}
                style={{ pointerEvents: "none" }}
                numberOfPieces={confettiIsRunning ? CONFETTI_PIECES : 0}
                recycle={confettiIsRunning}
                onConfettiComplete={confetti => { confetti!.reset() }}
            />
        </div>
    )
}

// component for re-triggering the confetti blast
export const MillionthUserNotificationLink = () => {
    return (
        <button style={{ color: "#337ab7" }} onClick={() => confettiBlast(CONFETTI_DUR_MS)}>CELEBRATE</button>
    )
}
