import i18n from "i18next"
import { useTranslation } from "react-i18next"

import { Script } from "common"
import { parseLanguage } from "../esutils"
import * as notification from "../user/notification"
import * as reader from "./reader"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const ScriptAnalysis = ({ script, close }: { script: Script, close: () => void }) => {
    let analysis
    try {
        analysis = reader.analyze(parseLanguage(script.name), script.source_code)
    } catch {
        // We use `setTimeout` here to avoid calling NotificationPopup's setState during ScriptAnalysis render.
        // TODO: Bring popup state into Redux so this can be a dispatch instead.
        setTimeout(() => {
            notification.show(i18n.t("messages:general.complexitySyntaxError"), "failure2", 5)
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
        <ModalHeader><i className="icon-info" ></i> {t("scriptAnalysis.title", { scriptName: script.name })}</ModalHeader>
        <ModalBody>
            <table className="w-full">
                <thead className="font-semibold border-b-2">
                    <tr>
                        <th className="p-2">{t("category")}</th>
                        <th className="p-2">{t("count")}</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(({ nameKey, count, value }) =>
                        <tr key={nameKey} className="border-b">
                            <th className="p-2">{t("scriptAnalysis.category." + nameKey)}</th>
                            <td className="p-2">{count} &times; {value}</td>
                        </tr>)}
                </tbody>
                <tfoot className="font-semibold">
                    <tr>
                        <th className="p-2">{t("total")}</th>
                        <td className="p-2">{score}</td>
                    </tr>
                </tfoot>
            </table>
        </ModalBody>
        <ModalFooter cancel="exit" close={close} />
    </>
}
