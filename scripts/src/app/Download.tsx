import React, { useState } from "react"

import * as exporter from "./exporter"
import { Script } from "common"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"

// TODO: switch to a "name" property for non-localized types (wav and mp3)
const EXPORT_TYPES = {
    // Thin wrapper for `exporter.text()` since it breaks the pattern (not async, doesn't take quality).
    script: { nameKey: "script", icon: "file", async function(script: Script, quality: boolean) { exporter.text(script) } },
    wav: { nameKey: "WAV", icon: "music", function: exporter.wav },
    mp3: { nameKey: "MP3", icon: "headphones", function: exporter.mp3 },
    multitrack: { nameKey: "download.multiTrack", icon: "th-list", function: exporter.multiTrack },
}

export const Download = ({ script, quality, close }: { script: Script, quality: boolean, close: () => void }) => {
    const { t } = useTranslation();
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
            await exportFunction(script, quality)
            setLoading({ ...loading, [type]: false })
        } catch (error) {
            setLoading({ ...loading, [type]: false })
            // TODO: Maybe show this error inside the modal?
            userNotification.show(error, "failure1", 3)
        }
    }

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="icon icon-cloud-download"></i>&nbsp;{t('script.download')}&nbsp;"{script.name}"
            </h4>
        </div>
        <div className="modal-body" style={{ textAlign: "center" }}>
            {Object.entries(EXPORT_TYPES).map(([type, { nameKey, icon }]) =>
            <div key={type} className="row vertical-center pb-3 mb-3 border-b border-gray-300">
                <div className="col-md-2">
                    <h3><i className={`glyphicon glyphicon-${icon}`}></i></h3>
                    <h4>{t(nameKey)}</h4>
                </div>
                <div className="col-md-1">
                    <h3>
                        {loading[type as keyof typeof EXPORT_TYPES]
                        ? <i className="inline-block animate-spin icon icon-spinner" />
                        : <a href="#" onClick={e => { e.preventDefault(); save(type as keyof typeof EXPORT_TYPES) }}>
                            <i className="glyphicon glyphicon-download-alt" />
                        </a>}
                    </h3>
                </div>
                <div className="col-md-9">
                    <div>{t('messages:download.' + type)}</div>
                </div>
            </div>)}
        </div>
        <div className="modal-footer">
            <button className="btn btn-primary" onClick={close}>{t('thing.close')}</button>
        </div>
    </>
}
