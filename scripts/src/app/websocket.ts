import esconsole from '../esconsole'
import * as helpers from '../helpers'
import * as userNotification from './userNotification'

declare var URL_WEBSOCKET: string

var ws: any;
var reconnect = 10;
var isOpen = false;
var timer: number;
var userName: string;
var pendingMessages: any[] = [];
var pinging = false;
var isValid = true;

export function connect(username: string, callback?: Function) {
    username = username.toLowerCase(); // #1858

    ws = new WebSocket(URL_WEBSOCKET + '/socket/' + username + '/');
    userName = username; // set the scope variable.

    ws.onopen = function (event: any) {
        esconsole('socket has been opened', 'websocket');
        isOpen = true;

        if (typeof(callback) === 'function') {
            callback();
        }

        checkin();
    };

    ws.onerror = function (event: any) {
        esconsole(event, 'websocket');
    };

    ws.onclose = function (event: any) {
        esconsole('socket has been closed', 'websocket');
        isOpen = false;

        if (reconnect > 0) {
            esconsole(event, 'reconnecting (' + reconnect + ' times remaining)');
            connect(username);
            reconnect--;
        } else {
            checkout();
        }
    };

    ws.onmessage = function (event: any) {
        var data = JSON.parse(event.data);
        helpers.getNgRootScope().$emit('wsMessage', data);

        // TODO: handle these in userNotification

        // user notification history, including shared scripts
        if (data.notification_type === 'notifications') {
            userNotification.loadHistory(data.notifications);
        } else if (data.notification_type === 'broadcast') {
            userNotification.handleBroadcast(data);

            // shared script delivered as "notifications" collection
            // } else if (data.notification_type === 'shareWithPeople') {
            //     $rootScope.$applyAsync();
        } else if (data.notification_type === 'teacher_broadcast') {
            userNotification.handleTeacherBroadcast(data);

        } else if (data.notification_type === 'collaboration') {
            // this is all taken care by the collaboration service
        } else if (data.notification_type === 'pong') {
            pinging = false;
        } else if (data.notification_type === 'verification') {
            if (data.status === 'verified') {
                isValid = true;
                esconsole('connection verified', 'websocket');
            } else {
                esconsole('connection not verified', 'websocket');
            }
        } else if (data.notification_type === 'syncResponse') {
            // skip
        } else {
            esconsole(data, 'websocket');
        }
    };
}

function disconnect() {
    checkout();
    ws.close();
}

/**
 * Keep websocket connection alive.
 */
function checkin() {
    var interval = 20000;
    reconnect = 10;
    if (isOpen) {
        send({notification_type: 'dummy'});
    }
    timer = window.setTimeout(checkin, interval);
}

function checkout() {
    reconnect = 0;
    if (timer) {
        clearTimeout(timer);
    }
}

function ping() {
    send({notification_type: 'ping'});
    pinging = true;
}

function verify() {
    send({
        notification_type: 'verify',
        username: userName
    });
    isValid = false;
}

/**
 * Let other services / controllers react to websocket onmessage events.
 * @param callback
 * @param scope
 */
export function subscribe(callback: Function, scope: any) {
    var handler = helpers.getNgRootScope().$on('wsMessage', callback);
    if (scope) {
        scope.$on('$destory', handler);
    }
}

export function send(data: any) {
    if (!isOpen) {
        pendingMessages.push(data);
    } else {
        if (pendingMessages.length !== 0) {
            pendingMessages.forEach(function (d) {
                ws.send(JSON.stringify(d));
            });
            pendingMessages = [];
        } else {
            ws.send(JSON.stringify(data));
        }
    }
}

function sendMessageTo(targetUserName: string, message: string) {
    ws.send(JSON.stringify({
        'notification_type': 'directMessage',
        'from': userName,
        'to': targetUserName,
        'message': message
    }));
}

function sendDataTo(targetUserName: string, data: any) {
    ws.send(JSON.stringify({
        'notification_type': 'directData',
        'from': userName,
        'to': targetUserName,
        'data': data
    }));
}

// TODO: probably move this to the notification service
export function broadcast(text: string, user: string, hyperlink: string, expiration: number, type: string) {
    user = user.toLowerCase(); // #1858

    if (!hyperlink) {
        hyperlink = ''
    }

    expiration = 0;

    // if (expiration.length > 0) {
    //     try {
    //         expiration = parseInt(expiration);
    //     } catch (error) {
    //         console.log(error);
    //     }
    // }

    if (!type) {
        type = 'broadcast';
    }

    send({
        notification_type: type,
        username: user,
        // text: text,
        message: {
            text: text,
            hyperlink: hyperlink,
            expiration: expiration
        }
    });
}

const _isOpen = () => isOpen
export { _isOpen as isOpen, disconnect as close }