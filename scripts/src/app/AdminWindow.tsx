import React from "react"

export const AdminWindow = ({ close }: { close: (info?: any) => void }) => {

    return <>
        <div className="modal-header">
            <h3>Admin Window</h3>
        </div>

        <div className="modal-body">
            <div className="row">
                This is the admin window content
            </div>
        </div>

        <div className="modal-footer">
            <span onClick={close}><a href="#" style={{color: "#d04f4d", marginRight: "14px"}}>
                <i className="icon icon-cross2"></i>CANCEL</a>
            </span>
        </div>
    </>
}
