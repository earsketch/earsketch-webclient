import React, { useEffect, useState } from "react"
import esconsole from "../esconsole"
import * as userProject from "./userProject"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import * as websocket from "./websocket"
import { Notification } from "../user/userState"

export const AdminWindow = ({ close }: { close: (info?: any) => void }) => {
    return <>
        <ModalHeader>Admin Window</ModalHeader>

        <ModalBody>
            <AdminManageRoles />
            <AdminSendBroadcast />
            <AdminResetUserPassword />
        </ModalBody>

        <ModalFooter cancel="close" close={close} />
    </>
}

const AdminManageRoles = () => {
    const [admins, setAdmins] = useState([] as string[])
    const [newAdmin, setNewAdmin] = useState("")
    const [modifyRoleStatus, setModifyRoleStatus] = useState({ message: "", style: "" })

    useEffect(() => {
        userProject.getAdmins().then((res: { username: string }[]) => {
            setAdmins(res.map(u => u.username).sort((a, b) => a.localeCompare(b)))
        })
    }, [])

    const removeAdmin = async (username: string) => {
        setModifyRoleStatus({ message: "Please wait...", style: "alert alert-secondary" })
        try {
            const data = await userProject.setIsAdmin(username, false)
            if (data !== null) {
                const m = `Successfully demoted ${username} from admin.`
                setModifyRoleStatus({ message: m, style: "alert alert-success" })
                setAdmins(admins.filter(u => u !== username))
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = `Failed to demote ${username} from admin.`
        setModifyRoleStatus({ message: m, style: "alert alert-danger" })
    }

    const addAdmin = async () => {
        const username = newAdmin
        if (username === "") {
            return
        }

        setModifyRoleStatus({ message: "Please wait...", style: "alert alert-secondary" })
        try {
            const data = await userProject.setIsAdmin(newAdmin, true)
            if (data !== null) {
                const m = `Successfully promoted ${username} to admin.`
                setModifyRoleStatus({ message: m, style: "alert alert-success" })
                setAdmins([...admins, username].sort((a, b) => a.localeCompare(b)))
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = `Failed to promote ${username} to admin.`
        setModifyRoleStatus({ message: m, style: "alert alert-danger" })
    }

    return <>
        <div className="modal-section-body">
            <div className="mx-2 px-2 pb-1">
                {modifyRoleStatus.message && <div className={modifyRoleStatus.style}>{modifyRoleStatus.message}</div>}
                <div className="font-bold text-xl p-1">Manage Admins</div>
                <div className="p-1 text-left w-full border border-gray-300 h-24 bg-grey-light overflow-y-scroll">
                    {admins.map(username =>
                        <div key={username} className="my-px mx-1 flex items-center">
                            <button className="flex" title="Remove admin" onClick={() => removeAdmin(username)}><i className="icon icon-cross2" /></button>
                            <div className="my-px mx-2">{username}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="m-2 p-2 py-1">
                <form onSubmit={e => { e.preventDefault(); addAdmin() }} className="flex items-center">
                    <input type="text" className="m-2 w-1/4 form-input"
                        placeholder="Username" required onChange={e => setNewAdmin(e.target.value)}/>
                    <input type="submit" value="ADD ADMIN" className="btn text-sm py-1.5 px-3 ml-2 bg-sky-600 text-white hover:text-white focus:text-white hover:bg-sky-700" />
                </form>
            </div>
        </div>
    </>
}

const AdminSendBroadcast = () => {
    const DEFAULT_EXP_DAYS = 10

    const [message, setMessage] = useState("")
    const [link, setLink] = useState("")
    const [expiration, setExpiration] = useState(DEFAULT_EXP_DAYS)
    const [broadcastStatus, setBroadcastStatus] = useState({ message: "", style: "" })
    const [broadcasts, setBroadcasts] = useState([] as Notification[])

    useEffect(() => {
        userProject.getBroadcasts().then((res: Notification[]) => {
            setBroadcasts(res)
        })
    }, [])

    const sendBroadcast = () => {
        websocket.send({
            notification_type: "broadcast",
            username: userProject.getUsername().toLowerCase(),
            message: {
                text: message,
                hyperlink: link ?? "",
                expiration,
            },
        })
        // always show success message, as we have no indication of failure
        setBroadcastStatus({ message: "Broadcast message sent", style: "alert alert-success" })
        userProject.getBroadcasts().then((res: Notification[]) => setBroadcasts(res))
    }

    const expireBroadcast = async (id: string) => {
        setBroadcastStatus({ message: "Please wait...", style: "alert alert-secondary" })
        try {
            const data = await userProject.expireBroadcastByID(id)
            if (data !== null) {
                const m = `Successfully expired broadcast with ID ${id}.`
                setBroadcastStatus({ message: m, style: "alert alert-success" })
                setBroadcasts(broadcasts.filter(u => u.id !== id))
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = `Failed to expire broadcast with ID ${id}.`
        setBroadcastStatus({ message: m, style: "alert alert-danger" })
    }

    const formatExpDate = (nt: Notification) => {
        const daysUntilExp = parseInt(nt.message.expiration!)
        const expDate = new Date(nt.created!)

        expDate.setDate(expDate.getDate() + daysUntilExp)
        return "Expires " + expDate.toLocaleDateString("en-US")
    }

    const broadcastText = (nt: Notification) => {
        return `${nt.message.text}`
    }

    return <>
        <div className="modal-section-body">
            <div className="m-1 p-2 border-t border-gray-400">
                {broadcastStatus.message && <div className={broadcastStatus.style}>{broadcastStatus.message}</div>}
                <div className="pb-1">
                    <div className="font-bold text-xl p-1">Manage Active Broadcasts</div>
                    <div className="p-1 text-left w-full border border-gray-300 h-24 bg-grey-light overflow-y-scroll">
                        {broadcasts.map(nt =>
                            <div key={nt.id} className="my-px mx-2 flex items-center">
                                <button className="flex" title="Expire broadcast" onClick={() => expireBroadcast(nt.id!)}><i className="icon icon-cross2" /></button>
                                <div className="my-px mx-2 flex-auto w-3/4 ">{broadcastText(nt)}</div>
                                <div className="italic mx-2 my-px flex-auto w-1/4">{formatExpDate(nt)}</div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="font-bold text-lg p-1.5">Send Broadcast</div>
                <form onSubmit={e => { e.preventDefault(); sendBroadcast() }}>
                    <input type="text" className="m-2 w-10/12 form-input"
                        placeholder="Message" required maxLength={500} onChange={e => setMessage(e.target.value)} />
                    <div className="flex items-center">
                        <input type="text" className="m-2 w-1/4 form-input"
                            placeholder="Hyperlink (optional)" maxLength={500} onChange={e => setLink(e.target.value)} />
                        <input type="number" className="m-2 w-1/4 form-input"
                            placeholder="Days until expiration" required min={1} max={14} onChange={e => setExpiration(+e.target.value)} />
                        <input type="submit" value="SEND" className="btn text-sm py-1.5 px-3 ml-2 bg-sky-600 text-white hover:text-white focus:text-white hover:bg-sky-700" />
                    </div>
                </form>
            </div>
        </div>
    </>
}

const AdminResetUserPassword = () => {
    const [username, setUsername] = useState("")
    const [adminPassphrase, setAdminPassphrase] = useState("")
    const [newUserPassword, setNewUserPassword] = useState("")
    const [userDetails, setUserDetails] = useState({ username: "", email: "" })
    const [passwordStatus, setPasswordStatus] = useState({ message: "", style: "" })

    const searchUsers = async () => {
        try {
            const data = await userProject.searchUsers(username.trim())
            if (data !== null) {
                setUserDetails({ username: data.username, email: data.email })
                setPasswordStatus({ message: "", style: "" })
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        setUserDetails({ username: "", email: "" })
        setPasswordStatus({ message: "No such user", style: "alert alert-danger" })
    }

    const setPassword = async () => {
        try {
            const data = await userProject.setPasswordForUser(username, newUserPassword, adminPassphrase)
            if (data !== null) {
                const m = "New password set for " + username
                setPasswordStatus({ message: m, style: "alert alert-success" })
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = "Failed to set password for " + username
        setPasswordStatus({ message: m, style: "alert alert-danger" })
    }

    return <>
        <div className="modal-section-body">
            <div className="m-1 p-2 border-t border-gray-400">
                {passwordStatus.message && <div className={passwordStatus.style}>{passwordStatus.message}</div>}
                <div className="font-bold text-xl p-1">Password Change</div>
                <form onSubmit={e => { e.preventDefault(); searchUsers() }} className="flex items-center">
                    <input type="text" className="m-2 w-1/4 form-input"
                        placeholder="Username or Email" required onChange={e => setUsername(e.target.value)} />
                    <input type="submit" value="SEARCH USERS" className="btn text-sm py-1.5 px-3 ml-2 bg-sky-600 text-white hover:text-white focus:text-white hover:bg-sky-700" />
                </form>
                {userDetails.username.length > 0 && <form onSubmit={e => { e.preventDefault(); setPassword() }}>
                    <div className="p-2">
                        <div className="italic">Username: {userDetails.username}</div>
                        <div className="italic">Email: {userDetails.email}</div>
                    </div>
                    <div className="flex items-center">
                        <input type="password" className="m-2 w-1/4 form-input"
                            placeholder="Admin passphrase" onChange={e => setAdminPassphrase(e.target.value)} />
                        <input type="password" className="m-2 w-1/4 form-input"
                            placeholder="New user password" onChange={e => setNewUserPassword(e.target.value)} />
                        <input type="submit" value="SET PASSWORD" className="btn text-sm py-1.5 px-3 ml-2 bg-sky-600 text-white hover:text-white focus:text-white hover:bg-sky-700" />
                    </div>
                </form>}
            </div>
        </div>
    </>
}
