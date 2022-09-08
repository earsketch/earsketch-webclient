import React, { useEffect } from "react"
import { useSelector } from "react-redux"
import store from "../reducers"
import * as appState from "./appState"
import Confetti from "react-confetti"

const CONFETTI_INIT_DUR_MS = 2000
const CONFETTI_DUR_MS = 5000

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

    useEffect(() => {
        confettiBlast(CONFETTI_INIT_DUR_MS) // fire the initial blast of confetti
    }, [])

    return (
        <div className="flex items-center text-white" title="YAY">
            <div className="text-3xl">🎉</div>
            <div style={{ transform: "rotate(-14deg)", marginLeft: "-8px" }} className={confettiIsRunning ? "text-lg text-yellow-400" : "text-lg"}>OneMillionUsers!</div>
            <Confetti
                style={{ pointerEvents: "none" }}
                numberOfPieces={confettiIsRunning ? 500 : 0}
                recycle={confettiIsRunning}
                onConfettiComplete={confetti => { confetti!.reset() }}
            />
        </div>
    )
}

// component for re-triggering the confetti blast
export const MillionthUserNotificationLink = () => {
    return <a href="#" onClick={() => confettiBlast(CONFETTI_DUR_MS)}>CELEBRATE</a>
}
