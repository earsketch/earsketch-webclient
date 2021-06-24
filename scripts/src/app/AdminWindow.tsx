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
            <AdminManageRoles></AdminManageRoles>
            <AdminSendBroadcast></AdminSendBroadcast>
            <AdminResetUserPassword></AdminResetUserPassword>
        </div>

        <div className="modal-footer">
            <span onClick={close}>
                <a href="#" style={{color: "#d04f4d", marginRight: "14px"}}><i className="icon icon-cross2" />CLOSE</a>
            </span>
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
                // on success, update list of users with roles
                setUsersWithRoles(usersWithRoles.filter(u => u.username !== username))
            } else {
                const m = "Failed to remove " + role + " role from " + username
                setModifyRoleStatus({ message: m, style: "alert alert-danger" })
            }
        } catch (error) {
            const m = "Failed to remove " + role + " role from " + username
            setModifyRoleStatus({ message: m, style: "alert alert-danger" })
            esconsole(error, "error")
        }
    }

    const applyAdminRoleToUser = async () => {
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
                // on success, update list of users with roles
                const user: User = {username: username, role: role}
                setUsersWithRoles([...usersWithRoles, user]
                  .sort((a, b) => a.username.localeCompare(b.username))
                )
            } else {
                const m = "Failed to add " + role + " role to " + username
                setModifyRoleStatus({ message: m, style: "alert alert-danger" })
            }
        } catch (error) {
            const m = "Failed to add " + role + " role to " + username
            setModifyRoleStatus({ message: m, style: "alert alert-danger" })
            esconsole(error, "error")
        }
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 px-4 pt-2 pb-4">
                    {
                        modifyRoleStatus.message &&
                        <div className={modifyRoleStatus.style}>{modifyRoleStatus.message}</div>
                    }
                    <div className="font-bold text-3xl p-2">Remove Roles</div>
                    <table className="p-2 text-left w-full">
                        <tbody className="h-40 bg-grey-light flex flex-col overflow-y-scroll">
                            {usersWithRoles.map(({username, role}) =>
                                <tr className="flex w-11/12" key={username+role}>
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
                    <input type="text" placeholder="username" onChange={e => setNewAdmin(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={applyAdminRoleToUser}>APPLY ADMIN ROLE</a>
                </div>
            </div>
        </>
    )
}

const AdminSendBroadcast = () => {
    const DEFAULT_EXP_DAYS = 10

    const [message, setMessage] = useState("")
    const [link, setLink] = useState("")
    const [expiration, setExpiration] = useState(DEFAULT_EXP_DAYS)
    const [broadcastStatus, setBroadcastStatus] = useState({message: "", style: ""})

    const sendBroadcast = () => {
        websocket.broadcast(message, userProject.getUsername(), link, expiration);
        // always show 'message sent', as we have no indication of success or failure
        setBroadcastStatus({ message: "Broadcast message sent", style: "alert alert-success" })
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 p-4 border-t border-gray-400">
                    {
                        broadcastStatus.message &&
                        <div className={broadcastStatus.style}>{broadcastStatus.message}</div>
                    }
                    <div className="font-bold text-3xl p-2">Send Broadcast</div>
                    <input type="text" placeholder="message" maxLength={500} onChange={e => setMessage(e.target.value)} className="m-2 w-10/12 border-2 border-gray-200 text-black" />
                    <input type="text" placeholder="hyperlink (optional)" maxLength={500} onChange={e => setLink(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <input type="number" placeholder="days until expiration" min={1} max={14} onChange={e => setExpiration(+e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={sendBroadcast}>SEND</a>
                </div>
            </div>
        </>
  );
}

const AdminResetUserPassword = () => {
    const [username, setUsername] = useState("")
    const [adminPassphrase, setAdminPassphrase] = useState("")
    const [newUserPassword, setNewUserPassword] = useState("")
    const [showResetControls, setShowResetControls] = useState(false)
    const [userDetails, setUserDetails] = useState({ username: "", email: "" })
    const [passwordStatus, setPasswordStatus] = useState({ message: "", style: "" })

    const searchForUser = async () => {
        try {
            const data = await userProject.searchUsers(username)
            if (data !== null) {
                setUserDetails({ username: data.username, email: data.email })
                setShowResetControls(true)
            } else {
                setUserDetails({ username: "", email: "" })
                setShowResetControls(false)
            }
        } catch (error) {
            setShowResetControls(false)
            esconsole(error, "error")
        }
    }

    const setPassword = async () => {
        try {
            const data = await userProject.setPasswordForUser(username, newUserPassword, adminPassphrase)
            if (data !== null) {
                const m = "New password set for " + username
                // todo 401 is not handled, so for now this always returns success
                setPasswordStatus({ message: "Done", style: "alert alert-success" })
            } else {
                const m = "Failed to set password for " + username
                setPasswordStatus({ message: m, style: "alert alert-danger" })
            }
        } catch (error) {
            const m = "Failed to set password for " + username
            setPasswordStatus({ message: m, style: "alert alert-danger" })
            esconsole(error, "error")
        }
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 p-4 border-t border-gray-400">
                    {
                        passwordStatus.message &&
                        <div className={passwordStatus.style}>{passwordStatus.message}</div>
                    }
                    <div className="font-bold text-3xl p-2">Password Change</div>
                    <input type="text" placeholder="username" onChange={e => setUsername(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={searchForUser}>SEARCH USERS</a>
                    {
                        // show password reset controls only after a valid username is entered
                        showResetControls &&
                        <div>
                            <div className="p-4">
                                <div className="italic">Username: {userDetails.username}</div>
                            <div className="italic">Email: {userDetails.email}</div>
                            </div>
                            <div>
                                <input type="text" placeholder="admin passphrase" onChange={e => setAdminPassphrase(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                                <input type="text" placeholder="new user password" onChange={e => setNewUserPassword(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                                <a href="#" onClick={setPassword}>SET PASSWORD</a>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </>
    );
}
