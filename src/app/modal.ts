import { useEffect } from "react"

import * as appState from "./appState"
import store from "../reducers"

// There is a little type magic here to accomplish three things:
// 1. Make the compiler check that `props` really matches the props expected by `modal`.
// 2. Allow omitting the `props` argument when the modal only expects `close`, but require it if the modal expects additional props.
// 3. Provide the correct return value: the Promise should resolve to whatever type that `modal` says `close` takes.
//    For example, if `modal` specifies that close has type `(foo?: number) => void`, then this should return `Promise<number | undefined>`.
//    Note that the promise can always resolve to `undefined`, because the user can always dismiss the modal without completing it.
type NoPropModal = (props: { close: (payload?: any) => void } & { [key: string]: never }) => JSX.Element

export function openModal<T extends NoPropModal>(modal: T, props?: undefined): Promise<Parameters<Parameters<T>[0]["close"]>[0]>
export function openModal<T extends appState.Modal>(modal: T, props: Omit<Parameters<T>[0], "close">): Promise<Parameters<Parameters<T>[0]["close"]>[0]>
export function openModal<T extends appState.Modal>(modal: T, props?: Omit<Parameters<T>[0], "close">): Promise<Parameters<Parameters<T>[0]["close"]>[0]> {
    return new Promise(resolve => {
        const wrappedModal = ({ close }: { close: (payload?: any) => void }) => {
            let closed = false
            const closeWrapper = (payload?: any) => {
                if (!closed) {
                    closed = true
                    resolve(payload)
                    close()
                }
            }
            // Close with no payload on unmount (i.e. modal was dismissed without completion).
            useEffect(() => closeWrapper, [])
            return modal({ ...props, close: closeWrapper })
        }
        store.dispatch(appState.setModal(wrappedModal))
    })
}
