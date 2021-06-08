import React from "react"

import esconsole from "../esconsole"
import ESMessages from "../data/messages"
import * as ESUtils from "../esutils"
import * as exporter from "./exporter"
import * as helpers from "../helpers"
import { ScriptEntity } from "common"
import * as userNotification from "./userNotification"

export const Download = ({ script, quality, close }: { script: ScriptEntity, quality: boolean, close: () => void }) => {
    // TODO: Are all of these Safari exceptions still necessary?
    const isSafari = ESUtils.whichBrowser().match("Safari") !== null
    let dataUrlDl: any = null
    const loadingScreen = document.getElementById("download-loader")!
    const $uibModal = helpers.getNgService("$uibModal")

    const saveToLocal = () => exporter.text(script)

    const saveMP3 = () => {
        loadingScreen.style.display = "block"
        exporter.mp3(script, +quality).then(data => {
            loadingScreen.style.display = "none"
            $uibModal.open({
                component: "downloadFile",
                resolve: {
                    data() { return data },
                    // TODO: may need modification in the future for safari file download problem
                    meta() {
                        return { isSafari: false, dataUrlDl }
                    }
                }
            })
        }).catch(error => {
            loadingScreen.style.display = "none"
            userNotification.show(error, "failure1", 3)
        })
        close()
    }

    const saveWAV = () => {
        loadingScreen.style.display = "block"
        exporter.wav(script, +quality).then(data => {
            loadingScreen.style.display = "none"

            $uibModal.open({
                component: "downloadFile",
                resolve: {
                    data() { return data },
                    // TODO: may need modification in the future for safari file download problem
                    meta() {
                        return { isSafari: false, dataUrlDl }
                    }
                }
            })
        }).catch(error => {
            loadingScreen.style.display = "none"
            userNotification.show(error, "failure1", 3)
        })
        close()
    }

    const saveMultiTrack = () => {
        loadingScreen.style.display = "block"
        exporter.multiTrack(script, +quality).then(data => {
            loadingScreen.style.display = "none"

            if (isSafari) {
                dataUrlDl = (base64: string) => {
                    (window as any).location = "data:application/zip;base64," + base64
                }
            }

            $uibModal.open({
                controller: "downloadFile",
                resolve: {
                    data() { return data },
                    meta() {
                        return { isSafari, dataUrlDl }
                    }
                }
            })
        }).catch(error => {
            esconsole(error, ["error", "download"])
            loadingScreen.style.display = "none"
            userNotification.show(error, "failure1", 3)
        })
        close()
    }

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="icon icon-cloud-download"></i>&nbsp;Download&nbsp;"{script.name}"
            </h4>
        </div>
        <div className="modal-body" style={{ textAlign: "center" }}>
            <div className="row vertical-center">
                <div className="col-md-2">
                    <h3><i className="icon icon-file-xml2"></i></h3>
                    <h4>Script</h4>
                </div>
                <div className="col-md-2">
                    <h3><a href="#" onClick={saveToLocal}><i className="glyphicon glyphicon-download-alt"></i></a></h3>
                </div>
                <div className="col-md-8">
                    <div>{ESMessages.download.script}</div>
                </div>
            </div>
            <div className="row vertical-center">
                <div className="col-md-2">
                    <h3><i className="glyphicon glyphicon-music"></i></h3>
                    <h4>WAV</h4>
                </div>
                <div className="col-md-2">
                    <h3><a href="#" onClick={saveWAV}><i className="glyphicon glyphicon-download-alt"></i></a></h3>
                </div>
                <div className="col-md-8">
                    <div>{ESMessages.download.wav}</div>
                </div>
            </div>
            <div className="row vertical-center">
                <div className="col-md-2">
                    <h3><i className="glyphicon glyphicon-headphones"></i></h3>
                    <h4>MP3</h4>
                </div>
                <div className="col-md-2">
                    <h3><a href="#" onClick={saveMP3}><i className="glyphicon glyphicon-download-alt"></i></a></h3>
                </div>
                <div className="col-md-8">
                    <div>{ESMessages.download.mp3}</div>
                </div>
            </div>
            {!isSafari && <div className="row vertical-center">
                <div className="col-md-2">
                    <h3><i className="glyphicon glyphicon-share"></i></h3>
                    <h4>Multi Track</h4>
                </div>
                <div className="col-md-2">
                    <h3><a href="#" onClick={saveMultiTrack}><i className="glyphicon glyphicon-download-alt"></i></a></h3>
                </div>
                <div className="col-md-8">
                    <div>{ESMessages.download.multitrack}</div>
                </div>
            </div>}
        </div>
        <div className="modal-footer">
            <button className="btn btn-primary" onClick={close}>Close</button>
        </div>
    </>
}

export const DownloadFile = ({ data, meta, close }: { data: any, meta: any, close: () => void }) => {
    return <div className="modal-body download">
        {meta.isSafari
        ? <div onClick={() => { meta.dataUrlDl(data); close() }} className="btn btn-warning">
            <i className="glyphicon glyphicon-download-alt"></i> Download Zip File
        </div>
        : <div onClick={close} className="btn btn-warning">
            <a href={data.path} download={data.name} target="_blank" className="ng-binding">
                <i className="glyphicon glyphicon-download-alt"></i> Download {data.name}
            </a>
        </div>}
        <div className="modal-footer" style={{ textAlign: "center" }}>
            Please click above to begin your download
            {meta.isSafari && <div><br />{ESMessages.download.safari_zip}</div>}
        </div>
    </div>
}

app.component("downloadFile", helpers.wrapModal(DownloadFile))
