/*
WS API Server Communication
*/
ES_WORKSPACE = '';
ES_IMAGE_DATA = '';
ES_FILE_DATA = '';

app.factory('wsapi', function () {
    //TODO: many unused functions?

    function wsapiGetWorkspace(username) {
        var url = URL_DOMAIN + '/services/scripts/getworkspace?username=' + username;

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    esconsole(request.responseText, 'debug');
                    ES_WORKSPACE = request.responseText;
                }
            }
        };
        request.send();
    }

    function wsapiGetAudioTags() {
        var url = URL_DOMAIN + '/services/audio/getaudiotags';

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    //console.log(request.responseText);
                    var jsonAudioData = JSON.parse(request.responseText);
                    for (var i = 0; i < jsonAudioData.length; i++) {
                        esconsole(jsonAudioData[i], 'debug');
                    }
                }
            }
        };
        request.send();
    }

    function wsapiSaveWorkspace(username, ws) {


        var formData = new FormData();
        formData.append('username', username);
        formData.append('workspace', ws);

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN + '/services/scripts/saveworkspace');

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    esconsole('******* SAVE WS OK*********', 'debug');
                }
            }
        };
        request.send(formData);

    }


    function wsapiSignIn(username, pwd) {
        esconsole(pwd, 'debug');
        var formData = new FormData();
        formData.append('username', username);
        formData.append('email', 'xxx.yyy@zzz.com');
        var encode = btoa(pwd);
        var pwdencode = encodeURIComponent(encode)
        formData.append('password', pwdencode);
        formData.append('first_name', 'John');
        formData.append('last_name', 'Doe');
        formData.append('image_url', 'http://earsketch.gatech.edu/media/img/profileImg/1.png');
        formData.append('description', 'EarSketch Person');
        formData.append('favorite_artists', 'Richard Devine Young Guru');

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN + '/services/scripts/signin');

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    esconsole('******* SIGN IN OK*********', 'info');
                    esconsole(request.responseText, 'info');
                }
            }
        };
        request.send(formData);

    }

    function wsapiGetForgotPassword() {
        var url = URL_DOMAIN + '/services/scripts/forgotpwd?username=xyz';

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    console.log('FPWD RESPONSE>' + request.responseText);
                }
            }
        };
        request.send();
    }

    function wsgetImageData() {
        var imageData;
        try {
            imageData = (JSON.parse(ES_IMAGE_DATA))
        }
        catch (e) {
            throw new RangeError('Invalid URL');
        }
        return imageData;
    }

    /*May 25th 2016: This function is not in use anymore. It was used to send error reports to Trello.
    We now log error reports in github using wsapiCreateIssue() */
    function wsapiSendReport(jsreport) {

        var formData = new FormData();

        formData.append('jsreport', jsreport);

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN + '/services/files/reporterror');

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    esconsole('******* Send Report OK*********', 'info');
                }
            }
        };
        request.send(formData);
    }

    function wsapiCreateIssue(jsreport) {

        var formData = new FormData();

        formData.append('jsreport', jsreport);

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN + '/services/files/reportissue');

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    esconsole('******* Send Issue Report OK*********', 'info');
                }
            }
        };
        request.send(formData);
    }


    function wsgetFileData() {
        return ES_FILE_DATA;
    }

    return {
        getWorkspace: wsapiGetWorkspace,
        sendReport: wsapiSendReport,
        createIssue: wsapiCreateIssue
    };
});
