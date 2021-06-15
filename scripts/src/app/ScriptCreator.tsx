import React, { useState } from "react"

import * as userProject from './userProject'
import { useTranslation } from "react-i18next"

export function validateScriptName(name: string, extension: string) {
    const fullname = name + extension
    const { t } = useTranslation()

    if (name.length < 3) {
        throw t('messages:general.shortname')
    } else if (/[$-/:-?{-~!"^#`\[\]\\]/g.test(name)) {
        // Why are hyphens banned from script names?
        throw t('messages:idecontroller.illegalname')
    } else if (Object.values(userProject.scripts).some(script => !script.soft_delete && script.name === fullname)) {
        // Conflict with existing script.
        throw t('messages:idecontroller.overwrite')
    } else {
        // Valid name.
        return name + extension
    }
}

export const ScriptCreator = ({ language, close }: { language: string, close: (value?: any) => void, dismiss: () => void }) => {
    const [name, setName] = useState("")
    const [error, setError] = useState("")
    const [extension, setExtension] = useState(language === "python" ? ".py" : ".js")

    const confirm = () => {
        try {
            close(validateScriptName(name, extension))
        } catch (error) {
            setError(error)
        }
    }

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                Create a new script
            </h4>
        </div>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">
                    {error}
                </div>}
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Script name</label>
                            <p className="small">What should we call your script?</p>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <label>Script language</label>
                            <p className="small">What programming language are you using?</p>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <form>
                            <div className="input-group">
                                <input className="form-control" autoFocus tabIndex={1} autoComplete="off"
                                    value={name} onChange={e => setName(e.target.value)} />
                                <div className="input-group-addon">{extension}</div>
                            </div>
                        </form>
                    </div>

                    <div className="col-md-6">
                        <select className="form-control" value={extension} onChange={e => setExtension(e.target.value)} tabIndex={2}>
                            <option value=".py">Python</option>
                            <option value=".js">JavaScript</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <input type="submit" className="btn btn-primary" tabIndex={3} value="Create" />
                <input type="button" className="btn btn-warning" onClick={() => close()} value="Cancel" />
            </div>
        </form>
    </>
}