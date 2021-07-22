import i18n from "i18next"
import React from "react"

import { Script } from "common"
import { parseLanguage } from "../esutils"
import * as notification from "../user/notification"
import * as reader from "./reader"
import { useTranslation } from "react-i18next"

export const ScriptAnalysis = ({ script, close }: { script: Script, close: () => void }) => {
    let analysis
    try {
        analysis = reader.analyze(parseLanguage(script.name), script.source_code)
    } catch {
        // We use `setTimeout` here to avoid calling NotificationPopup's setState during ScriptAnalysis render.
        // TODO: Bring popup state into Redux so this can be a dispatch instead.
        setTimeout(() => {
            notification.show(i18n.t('messages:general.complexitySyntaxError'), 'failure2', 5)
            close()
        })
        return <button>...</button>
    }
    const score = reader.total(analysis)
    const { t } = useTranslation()

    const categories = [
        { nameKey: "loops", count: analysis.loops, value: reader.FEATURE_SCORES.loops },
        { nameKey: "conditionals", count: analysis.conditionals, value: reader.FEATURE_SCORES.conditionals },
        { nameKey: "conditionalsWithBool", count: analysis.booleanConditionals, value: reader.FEATURE_SCORES.booleanConditionals },
        { nameKey: "lists", count: analysis.lists, value: reader.FEATURE_SCORES.lists },
        { nameKey: "listStringOps", count: analysis.listOps + analysis.strOps, value: reader.FEATURE_SCORES.listOps },
        { nameKey: "userFunctions", count: analysis.userFunc, value: reader.FEATURE_SCORES.userFunc },
    ]

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="glyphicon glyphicon-info-sign" ></i> {t('scriptAnalysis.title', { scriptName: script.name })}
            </h4>
        </div>
        <div className="modal-body">
            <table className="table">
                <thead>
                    <tr>
                        <th>{t('category')}</th>
                        <th>{t('count')}</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(({ nameKey, count, value }) =>
                    <tr key={nameKey}>
                        <th>{t('scriptAnalysis.category.' + nameKey)}</th>
                        <td>{count} &times; {value}</td>
                    </tr>)}
                </tbody>
                <tfoot>
                    <tr>
                        <th>{t('total')}</th>
                        <td>{score}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="modal-footer">
            <button className="btn btn-warning" onClick={close}>{t('exit')}</button>
        </div>
    </>
}
