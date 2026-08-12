import { ReactNode } from "react"

import { useAppDispatch as useDispatch } from "../hooks"
import * as layout from "../ide/layoutState"

/** A title bar for side-pane components, with menu icons provided using the `children` prop. */
export const TitleBar = ({ title, closeButtonTitle, position = "east", children }: {
    title: string
    closeButtonTitle: string
    position?: "east" | "west"
    children?: ReactNode
}) => {
    const dispatch = useDispatch()

    return (
        <div className="flex items-center p-2 text-base bg-white text-black dark:bg-gray-900 dark:text-white">
            <div className="ltr:pl-2 ltr:pr-4 rtl:pl-4 rtl:pr-3 font-semibold truncate">
                <h2>{title.toLocaleUpperCase()}</h2>
            </div>
            <div>
                <button
                    className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                    onClick={() => dispatch(position === "east"
                        ? layout.setEast({ open: false })
                        : layout.setWest({ open: false }))}
                    title={closeButtonTitle}
                    aria-label={closeButtonTitle}
                >
                    <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
                </button>
            </div>
            <div className="flex items-center ltr:ml-auto rtl:mr-auto">
                {children}
            </div>
        </div>
    )
}
