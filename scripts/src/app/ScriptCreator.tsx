import React, { useState } from "react"

import ESMessages from "../data/messages"
import * as userProject from './userProject'

export const ScriptCreator = ({ language, close }: { language: string, close: (value?: any) => void, dismiss: () => void }) => {
    const [name, setName] = useState("")
    const [error, setError] = useState("")
    const [extension, setExtension] = useState(language === "python" ? ".py" : ".js")
    const fullname = name + extension

    const confirm = () => {
        if (name.length < 3) {
            setError(ESMessages.general.shortname)
        } else if (name.match(/[$-/:-?{-~!"^#`\[\]\\]/g)) {
            // Why are hyphens banned from script names?
            setError(ESMessages.idecontroller.illegalname)
        } else if (Object.values(userProject.scripts).some(script => script.name === fullname)) {
            // Conflict with existing script.
            setError(ESMessages.idecontroller.overwrite)
        } else {
            // Yield the chosen name.
            close(name + extension)
        }
    }

    return <>
        <div className="modal-header">
            <h4 className="modal-title">
                Create a new script
            </h4>
        </div>
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
                                   value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirm() }} />
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
            <button className="btn btn-primary" onClick={confirm} tabIndex={3}>Create</button>
            <button className="btn btn-warning" onClick={() => close()}>Cancel</button>
        </div>
    </>
}