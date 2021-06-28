import React, { useEffect, useState } from "react"
import esconsole from "../esconsole";
import * as userProject from "./userProject";
import * as websocket from "./websocket";

interface User {
    username: string
    role: "admin" | "teacher"
}

export const AdminWindow = ({ close }: { close: (info?: any) => void }) => {
    return <>
        <div className="modal-header">
            <h3>Admin Window</h3>
        </div>

        <div className="modal-body">
            <AdminManageRoles />
            <AdminSendBroadcast />
            <AdminResetUserPassword />
        </div>

        <div className="modal-footer">
            <input type="button" className="btn btn-default" onClick={close} value="CLOSE" />
        </div>
    </>
}

const AdminManageRoles = () => {

    const [usersWithRoles, setUsersWithRoles] = useState([] as User[])
    const [newAdmin, setNewAdmin] = useState("")
    const [modifyRoleStatus, setModifyRoleStatus] = useState({ message: "", style: "" })

    useEffect(() => {
        userProject.getAllUserRoles().then((res: User[]) => {
            setUsersWithRoles(res
                .filter(usr => usr.role === "admin")
                .sort((a, b) => a.username.localeCompare(b.username))
            )
        })
    }, [])

    const removeRole = async (username: string, role: string) => {
        setModifyRoleStatus({ message: "Please wait...", style: "alert alert-secondary" })
        try {
            const data = await userProject.removeRole(username, role)
            if (data !== null) {
                const m = "Successfully removed " + role + " role from " + username
                setModifyRoleStatus({ message: m, style: "alert alert-success" })
                setUsersWithRoles(usersWithRoles.filter(u => u.username !== username))
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = "Failed to remove " + role + " role from " + username
        setModifyRoleStatus({ message: m, style: "alert alert-danger" })
    }

    const addAdminRoleToUser = async () => {
        const username = newAdmin
        const role = "admin"
        if (username == "") {
            return
        }

        setModifyRoleStatus({ message: "Please wait...", style: "alert alert-secondary" })
        try {
            const data = await userProject.addRole(newAdmin, role)
            if (data !== null) {
                const m = "Successfully added " + role + " role to " + username
                setModifyRoleStatus({ message: m, style: "alert alert-success" })
                const user: User = { username: username, role: role }
                setUsersWithRoles([...usersWithRoles, user]
                  .sort((a, b) => a.username.localeCompare(b.username))
                )
                return
            }
        } catch (error) {
            esconsole(error, ["error", "admin"])
        }
        const m = "Failed to add " + role + " role to " + username
        setModifyRoleStatus({ message: m, style: "alert alert-danger" })
    }

    return <>
        <div className="modal-section-body">
            <div className="m-2 px-4 pt-2 pb-4">
            {modifyRoleStatus.message && <div className={modifyRoleStatus.style}>{modifyRoleStatus.message}</div>}
                <div className="font-bold text-3xl p-2">Remove Roles</div>
                <table className="p-2 text-left w-full border border-gray-300">
                    <tbody className="h-40 bg-grey-light flex flex-col overflow-y-scroll">
                        {usersWithRoles.map(({ username, role }) =>
                            <tr className="flex items-center w-11/12" key={username+role}>
                                <td className="my-px mx-2 w-1/4">{username}</td>
                                <td className="my-px mx-2 w-1/4">{role}&nbsp;
                                    <i onClick={() => removeRole(username, role)}
                                        title="Remove role"
                                        className="icon icon-cross2" />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="modal-section-body">
            <div className="m-2 p-4 border-t border-gray-400">
                <div className="font-bold text-3xl p-2">Add Roles</div>
                <form onSubmit={e => { e.preventDefault(); addAdminRoleToUser() }} className="flex items-center">
                    <input type="text" className="m-2 w-1/4 form-control"
                           placeholder="Username" required onChange={e => setNewAdmin(e.target.value)}/>
                    <input type="submit" value="ADD ADMIN" className="btn btn-primary" />
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

    const sendBroadcast = () => {
        websocket.broadcast(message, userProject.getUsername(), link, expiration);
        // always show success message, as we have no indication of failure
        setBroadcastStatus({ message: "Broadcast message sent", style: "alert alert-success" })
    }

    return <>
        <div className="modal-section-body">
            <div className="m-2 p-4 border-t border-gray-400">
                {broadcastStatus.message && <div className={broadcastStatus.style}>{broadcastStatus.message}</div>}
                <div className="font-bold text-3xl p-2">Send Broadcast</div>
                <form onSubmit={e => { e.preventDefault(); sendBroadcast() }}>
                    <input type="text" className="m-2 w-10/12 form-control"
                           placeholder="Message" required maxLength={500} onChange={e => setMessage(e.target.value)} />
                    <div className="flex items-center">
                        <input type="text" className="m-2 w-1/4 form-control"
                               placeholder="Hyperlink (optional)" maxLength={500} onChange={e => setLink(e.target.value)} />
                        <input type="number" className="m-2 w-1/4 form-control"
                               placeholder="Days until expiration" min={1} max={14} onChange={e => setExpiration(+e.target.value)} />
                        <input type="submit" value="SEND" className="btn btn-primary" />
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
            const data = await userProject.searchUsers(username)
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
            <div className="m-2 p-4 border-t border-gray-400">
                {passwordStatus.message && <div className={passwordStatus.style}>{passwordStatus.message}</div>}
                <div className="font-bold text-3xl p-2">Password Change</div>
                    <form onSubmit={e => {e.preventDefault(); searchUsers()}} className="flex items-center">
                        <input type="text" className="m-2 w-1/4 form-control"
                               placeholder="Username" required onChange={e => setUsername(e.target.value)} />
                        <input type="submit" value="SEARCH USERS" className="btn btn-primary" />
                    </form>
                    {userDetails.username.length > 0 && <form onSubmit={e => {e.preventDefault(); setPassword()}}>
                        <div className="p-4">
                            <div className="italic">Username: {userDetails.username}</div>
                            <div className="italic">Email: {userDetails.email}</div>
                        </div>
                        <div className="flex items-center">
                            <input type="password" className="m-2 w-1/4 form-control"
                                   placeholder="Admin passphrase" onChange={e => setAdminPassphrase(e.target.value)} />
                            <input type="password" className="m-2 w-1/4 form-control"
                                   placeholder="New user password" onChange={e => setNewUserPassword(e.target.value)} />
                            <input type="submit" value="SET PASSWORD" className="btn btn-primary" />
                        </div>
                    </form>}
            </div>
        </div>
    </>
}
