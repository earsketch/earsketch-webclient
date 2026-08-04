import * as appState from "../app/appState"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { selectExtensionIcon32, selectExtensionName } from "./extensionState"
import { ExtensionLaunchButton } from "./ExtensionLaunchButton"

/** Launch icon for the extension currently loaded in Redux. */
export const ActiveExtension = () => {
    const dispatch = useDispatch()
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const extensionName = useSelector(selectExtensionName)

    return (
        <ExtensionLaunchButton
            extensionName={extensionName}
            onClick={() => { dispatch(appState.setEastContent("extension")) }}
        >
            <img src={extensionIcon32} alt="" className="w-5 h-5" />
        </ExtensionLaunchButton>
    )
}
