import React, { useState } from "react"
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
            <AdminManageRoles></AdminManageRoles><br />
            <AdminSendBroadcast></AdminSendBroadcast><br />
            <AdminResetUserPassword></AdminResetUserPassword><br />
        </div>

        <div className="modal-footer">
            <span onClick={close}><a href="#" style={{color: "#d04f4d", marginRight: "14px"}}>
                <i className="icon icon-cross2"></i>CANCEL</a>
            </span>
        </div>
    </>
}

const AdminManageRoles = () => {

    const usersWithRolesTest: User[] = [
        {username: "music_user_1", role: "admin"},
        {username: "music_user_2", role: "admin"},
        {username: "music_user_3", role: "admin"},
        {username: "music_user_4", role: "admin"},
        {username: "music_user_5", role: "admin"},
        {username: "music_user_6", role: "admin"},
        {username: "music_user_7", role: "admin"},
        {username: "music_user_8", role: "admin"},
        {username: "music_user_9", role: "admin"},
        {username: "music_user_10", role: "admin"},
        {username: "music_user_11", role: "admin"},
        {username: "music_user_12", role: "admin"},
        {username: "music_user_13", role: "teacher"},
        {username: "music_user_14", role: "teacher"},
        {username: "music_user_15", role: "teacher"},
    ]
    const [usersWithRoles, setUsersWithRoles] = useState(usersWithRolesTest)

    // infinite loop!
    //const [usersWithRoles, setUsersWithRoles] = useState([] as User[])
    //userProject.getAllUserRoles().then((res: User[]) => {
    //    setUsersWithRoles(res.filter(usr => usr.role != "teacher"))
    //})

    const removeRole = (username: string, role: string) => {
        userProject.removeRole(username, role)
        // todo: should check if the call above was successful
        setUsersWithRoles(usersWithRoles.filter(user => user.username !== username))
    }

    const [newAdmin, setNewAdmin] = useState("")

    const applyAdminRoleToNewAdmin = () => {
        console.log("Apply admin role to user: " + newAdmin)
        if (newAdmin == "") {
            return
        }

        userProject.addRole(newAdmin, "admin")
        // todo: should check if the call above was successful
        usersWithRoles.push({username: newAdmin, role: "admin"})  // is this working?
        setUsersWithRoles(usersWithRoles)
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 p-4 border-4 border-gray-400">
                    <div className="font-bold text-3xl p-2">Remove Roles</div>
                    <table className="p-2 text-left w-full">
                        <tbody className="h-40 bg-grey-light flex flex-col overflow-y-scroll">
                            {/* loop through list of users with roles */}
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
                <div className="mt-10 mb-2 mx-2 p-4 border-4 border-gray-400">
                    <div className="font-bold text-3xl p-2">Add Roles</div>
                    <input type="text" placeholder="username" onChange={e => setNewAdmin(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={applyAdminRoleToNewAdmin}>ADD ADMIN ROLE</a>
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

    const sendBroadcast = () => {
        //console.log("Sending broadcast... " + message + ", " + link + ", " + expiration)
        websocket.broadcast(message, userProject.getUsername(), link, expiration);
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 p-4 border-4 border-gray-400">
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

    const searchForUser = () => {
        console.log("Searching for user... " + username)
        //function checkIdExists(id) {
        //    var url = URL_DOMAIN + '/services/scripts/searchuser';
        //    var opts = { params: {'query': id} };
        //    return $http.get(url, opts);
        //}
    }

    const setPassword = () => {
        console.log("Setting password for " + username + "... (" + adminPassphrase + ") " + newUserPassword)
        userProject.setPasswordForUser(username, newUserPassword, adminPassphrase)
        //  .then(function () {
        //      $scope.showPasswordResetResult = true;
        //      $scope.passwordResetResult = 'Successfully set a new password for user: ' + $scope.userToReset.id + ' with password: ' + $scope.userToReset.newPassword;
        //      $scope.$applyAsync();
        //  }).catch(function () {
        //    $scope.showPasswordResetResult = true;
        //    $scope.passwordResetResult = 'Error setting a new password for user: ' + $scope.userToReset.id;
        //    $scope.$applyAsync();
        //});
    }

    return (
        <>
            <div className="modal-section-body">
                <div className="m-2 p-4 border-4 border-gray-400">
                    <div className="font-bold text-3xl p-2">Password Change</div>
                    <input type="text" placeholder="username" onChange={e => setUsername(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={searchForUser}>SEARCH USERS</a>
                    <br />
                    <input type="text" placeholder="admin passphrase" onChange={e => setAdminPassphrase(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <input type="text" placeholder="new user password" onChange={e => setNewUserPassword(e.target.value)} className="m-2 w-1/4 border-2 border-gray-200 text-black" />
                    <a href="#" onClick={setPassword}>SET PASSWORD</a>
                </div>
            </div>
        </>
    );
}
