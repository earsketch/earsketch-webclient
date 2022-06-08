import React, { useState } from "react"
import { useTranslation } from "react-i18next"

import * as exporter from "./exporter"
import { Script } from "common"
import * as userNotification from "../user/notification"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

// TODO: switch to a "name" property for non-localized types (wav and mp3)
const EXPORT_TYPES = {
    // Thin wrapper for `exporter.text()` since it breaks the pattern (not async).
    script: { nameKey: "script", icon: "icon-file-empty2", async function(script: Script) { exporter.text(script) } },
    wav: { nameKey: "WAV", icon: "icon-music", function: exporter.wav },
    mp3: { nameKey: "MP3", icon: "icon-headphones2", function: exporter.mp3 },
    multitrack: { nameKey: "download.multiTrack", icon: "icon-list", function: exporter.multiTrack },
}

export const Download = ({ script, close }: { script: Script, close: () => void }) => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState({
        script: false,
        wav: false,
        mp3: false,
        multitrack: false,
    })

    const save = async (type: keyof typeof EXPORT_TYPES) => {
        setLoading({ ...loading, [type]: true })
        const exportFunction = EXPORT_TYPES[type].function
        try {
            await exportFunction(script)
            setLoading({ ...loading, [type]: false })
        } catch (error) {
            setLoading({ ...loading, [type]: false })
            // TODO: Maybe show this error inside the modal?
            userNotification.show(error, "failure1", 3)
        }
    }

    return <>
        <ModalHeader><i className="icon icon-cloud-download"></i>&nbsp;{t("script.download")}&nbsp;&quot;{script.name}&quot;</ModalHeader>
        <ModalBody>
            {Object.entries(EXPORT_TYPES).map(([type, { nameKey, icon }]) =>
                <div key={type} className="vertical-center pb-3 mb-3 border-b border-gray-300 text-sm">
                    <div className="w-32 text-center">
                        <h3><i className={icon}></i></h3>
                        <h4>{t(nameKey)}</h4>
                    </div>
                    <div className="w-32 text-center text-lg">
                        {loading[type as keyof typeof EXPORT_TYPES]
                            ? <i className="animate-spin es-spinner" />
                            : <a href="#" onClick={e => { e.preventDefault(); save(type as keyof typeof EXPORT_TYPES) }}>
                                <i className="icon-file-download" />
                            </a>}
                    </div>
                    <div className="w-full text-sm">
                        <div>{t("messages:download." + type)}</div>
                    </div>
                </div>)}
        </ModalBody>
        <ModalFooter cancel="thing.close" close={close} />
    </>
}
