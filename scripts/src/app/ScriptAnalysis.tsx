import React from "react"

import { ScriptEntity } from "common"
import { parseLanguage } from "../esutils"
import * as reader from "./reader"

export const ScriptAnalysis = ({ script, close }: { script: ScriptEntity, close: () => void }) => {
    const analysis = reader.analyze(parseLanguage(script.name), script.source_code)
    const score = reader.total(analysis)

    const categories = [
        { name: "Loops", count: analysis.loops, value: reader.FEATURE_SCORES.loops },
        { name: "Conditionals", count: analysis.conditionals, value: reader.FEATURE_SCORES.conditionals },
        { name: "Conditionals with Booleans", count: analysis.booleanConditionals, value: reader.FEATURE_SCORES.booleanConditionals },
        { name: "Lists", count: analysis.lists, value: reader.FEATURE_SCORES.lists },
        { name: "List and String Operations", count: analysis.listOps + analysis.strOps, value: reader.FEATURE_SCORES.listOps },
        { name: "User-Defined Functions", count: analysis.userFunc, value: reader.FEATURE_SCORES.userFunc },
    ]

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="glyphicon glyphicon-info-sign" ></i> Code-Concept Indicator for {script.name}
            </h4>
        </div>
        <div className="modal-body">
            <table className="table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(({ name, count, value }) => 
                    <tr key={name}>
                        <th>{name}</th>
                        <td>{count} &times; {value}</td>
                    </tr>)}
                </tbody>
                <tfoot>
                    <tr>
                        <th>Total</th>
                        <td>{score}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="modal-footer">
            <button className="btn btn-warning" onClick={close}>Exit</button>
        </div>
    </>
}
