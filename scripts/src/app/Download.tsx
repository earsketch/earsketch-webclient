import React, { useState } from "react"

import * as exporter from "./exporter"
import { ScriptEntity } from "common"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"

const EXPORT_TYPES = {
    // Thin wrapper for `exporter.text()` since it breaks the pattern (not async, doesn't take quality).
    script: { name: "Script", async function(script: ScriptEntity, quality: boolean) { exporter.text(script) } },
    wav: { name: "WAV", function: exporter.wav },
    mp3: { name: "MP3", function: exporter.mp3 },
    multitrack: { name: "Multi Track", function: exporter.multiTrack },
}

export const Download = ({ script, quality, close }: { script: ScriptEntity, quality: boolean, close: () => void }) => {
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
                <i className="icon icon-cloud-download"></i>&nbsp;Download&nbsp;"{script.name}"
            </h4>
        </div>
        <div className="modal-body" style={{ textAlign: "center" }}>
            {Object.entries(EXPORT_TYPES).map(([type, { name }]) =>
            <div key={type} className="row vertical-center">
                <div className="col-md-2">
                    <h3><i className="glyphicon glyphicon-music"></i></h3>
                    <h4>{name}</h4>
                </div>
                <div className="col-md-1">
                    <h3>
                        {loading[type as keyof typeof EXPORT_TYPES]
                        ? <i className="inline-block animate-spin icon icon-spinner" />
                        : <a href="#" onClick={() => save(type as keyof typeof EXPORT_TYPES)}>
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
            <button className="btn btn-primary" onClick={close}>Close</button>
        </div>
    </>
}
