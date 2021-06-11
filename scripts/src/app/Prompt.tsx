// Prompt modal used for readInput().
import React, { useState } from "react"

export const Prompt = ({ message, close }: { message: string, close: (input: string) => void }) => {
    const [input, setInput] = useState("")

    return <>
        <div className="modal-header">{message}</div>
        <form onSubmit={e => { e.preventDefault(); close(input) }}>
            <div className="modal-body">
                <div className="form-group">
                    <input type="text" className="form-control" value={input} onChange={e => setInput(e.target.value)} autoFocus />
                </div>
            </div>
            <div className="modal-footer">
                <input type="submit" className="btn btn-primary" value="Okay" />
            </div>
        </form>
    </>
}