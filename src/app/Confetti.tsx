import React, { useEffect } from "react"
import { useSelector } from "react-redux"
import store from "../reducers"
import * as appState from "./appState"
import Confetti from "react-confetti"
import useWindowSize from "react-use/lib/useWindowSize"

const CONFETTI_INIT_DUR_MS = 5000
const CONFETTI_INIT_DELAY_MS = 3000
const CONFETTI_PIECES = 400 // 500 is typical

// coordinate all confetti components for a blast of fixed duration ms
export const blastConfetti = (dur = CONFETTI_INIT_DUR_MS) => {
    store.dispatch(appState.setConfetti(true))
    setTimeout(() => {
        store.dispatch(appState.setConfetti(false))
    }, dur)
}

// confetti component works best from the top header nav
export const ConfettiLauncher = ({ blastOnLoad = false }: { blastOnLoad?: boolean }) => {
    const confettiIsBlasting = useSelector(appState.selectConfetti)
    const { width, height } = useWindowSize()

    if (blastOnLoad) {
        useEffect(() => {
            // fire the initial blast of confetti
            setTimeout(() => blastConfetti(CONFETTI_INIT_DUR_MS), CONFETTI_INIT_DELAY_MS)
        }, [])
    }

    return (
        <div className="flex items-center text-white" title="YAY">
            {confettiIsBlasting &&
                <div style={{ color: "#B3A369", transform: "rotate(-7deg)", marginLeft: "8px" }} className="text-xs">Go Tech!</div>}
            <Confetti
                width={width}
                height={height}
                style={{ pointerEvents: "none" }}
                numberOfPieces={confettiIsBlasting ? CONFETTI_PIECES : 0}
                recycle={confettiIsBlasting}
                onConfettiComplete={confetti => { confetti!.reset() }}
                confettiSource={{ x: 0, y: height, w: width, h: height }}
                initialVelocityY={20}
                colors={["#D6D6D6", "#B3A369", "#003057"]}
            />
        </div>
    )
}
