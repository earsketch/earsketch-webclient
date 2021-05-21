import audioContext from './audiocontext'
import esconsole from '../esconsole';
import * as ESUtils from '../esutils';
import * as sounds from '../browser/soundsState';
import * as userConsole from './userconsole'
import * as userNotification from './userNotification';

app.controller("UploadSoundCtrl", ['$scope','$uibModalInstance','RecorderService','userProject','audioLibrary','$sce', '$timeout', '$http', '$ngRedux' , function($scope, $uibModalInstance, RecorderService, userProject, audioLibrary, $sce, $timeout, $http, $ngRedux) {
    $scope.file = {
        data: null,
        key: null,
        tempo: null
    };

    // TEMPORARY FOR GM TESTING
    $scope.showGM = FLAGS.SHOW_GM;


    $scope.recError = '';
    $scope.uploadError = '';
    $scope.isMp3 = true;
    $scope.isAiff = true;
    $scope.isWav = true;
    $scope.chosenfilename = 'Choose a file...';
    $scope.micAccessError = false;
    $scope.micAccessMessage = '';
    $scope.notAllowedToRecord = false;
    $scope.freesoundChoice = -1;
    $scope.freesoundResults = []; 
    $scope.searchform = {'searchQuery': ''};

    $scope.entryLimit = 3;
    $scope.currentPage = 1;
    $scope.maxSize = 4; //pagination max size
    $scope.noOfPages =  0; 
    $scope.firstSearchExecuted = false;

    $scope.menus = {
        upload: 0,
        record: 1,
        freesound: 2,
        tunepad: 3,
        groovemachine: 4
    };

    $scope.activePill = $scope.menus.upload;

    $scope.tunepadURL = "";
    $scope.tunepadIsShowingProjectPage = false;
    $scope.isSafari = ESUtils.whichBrowser().match('Safari');

    $scope.groovemachineURL = "";

    /* RECORDER implementations */
    $scope.prepareForUpload = function (data, useMetro, tempo) {
        $scope.file.data = data;
        if (useMetro) {
            $scope.file.tempo = tempo;
        }
        $scope.$applyAsync();
    };

    $scope.recorder = RecorderService;
    RecorderService.upload.prepareForUpload = $scope.prepareForUpload;

    $scope.close = function () {
        $uibModalInstance.close();
    };

    $scope.openUploadMenu = function () {
        $scope.activePill = $scope.menus.upload;
    };

    $scope.openRecordMenu = function () {
        if (ESUtils.whichBrowser().match('Chrome|Firefox') == null) {
            $scope.recError = ESMessages.uploadcontroller.nosupport;
        } else {
            RecorderService.init();
        };
        // $scope.activePill = $scope.menus.record;
    };
    
    $scope.openGrooveMachineMenu = function () {
        $scope.activePill = $scope.menus.groovemachine;
        $scope.gmLogin();
        
    }

    RecorderService.micAccessBlocked = function (error) {
        $scope.$apply(function () {
            $scope.micAccessError = true;
            if (error == "chrome_mic_noaccess") {
                $scope.micAccessMessage = ESMessages.uploadcontroller.chrome_mic_noaccess;
            } else if (error == "ff_mic_noaccess") {
                $scope.micAccessMessage = ESMessages.uploadcontroller.ff_mic_noaccess;
            }
            $scope.notAllowedToRecord = true;
            $timeout(function () {
                $scope.notAllowedToRecord = false;
            }, 1000);
        });
    };

    RecorderService.openRecordMenu = function () {
        $scope.$apply(function () {
            $scope.micAccessError = false;
            $scope.micAccessMessage = '';
        });
        // $scope.activePill = $scope.menus.record;
    };
    $scope.readyToUpload = false;
    $scope.showUploadButton = function (caller) {
        if (caller === 'file') {
            $scope.readyToUpload = !!$scope.file.key;
        } else {
            $scope.readyToUpload = !!($scope.file.key && $scope.file.data);
        }
        //todo tpEmbed - change name of file object if it is the default one set up the tunepad msg reply?
    };

    

    $scope.selectFreesoundResult = function(resultIndex){
        $scope.freesoundChoice = resultIndex;
        $scope.file.key = $scope.cleanFilename($scope.freesoundResults[resultIndex].name).toUpperCase();
        $scope.file.tempo = Math.round($scope.freesoundResults[resultIndex].bpm);
        console.log(resultIndex); //AVN log
    }

    $scope.searchFreesound = function() {

        var searchUrl = URL_SEARCHFREESOUND;
        var queryParams = {'query': $scope.searchform.searchQuery};

        $scope.firstSearchExecuted = true;

        $scope.currentPage = 1;
        $scope.freesoundResults = [];

        var hasBpmData = function(freesoundResult){
            var r = freesoundResult;
            return !!r.analysis && !!r.analysis.rhythm && !!r.analysis.rhythm.bpm;
        }

        $http.get(searchUrl, {params: queryParams}).then(function(result) {
            $scope.freesoundResults = result.data.results.filter(hasBpmData).map($scope.resultToUrlSet);
            console.log('Posted query', result); //AVN log
        }).catch(function(err) {
            $scope.freesoundResults = freesoundResults
                .map(function(url){ return {'raw':url, 'trusted': $sce.trustAsResourceUrl(url)}});
            $scope.noOfPages = Math.ceil($scope.freesoundResults.length/$scope.entryLimit);

            //console.log('query failure', url, data, err); //AVN log
        });

        $scope.freesoundChoice = -1;
        $scope.file.key = '';
        $scope.file.tempo = ''; 
    };

    $scope.resultToUrlSet = function(singleResult, resultInd){
        var fileUrl = singleResult.previews['preview-lq-mp3'];
        var secureFileUrl = fileUrl.indexOf('https') === -1 ? fileUrl.replace('http', 'https') : fileUrl;
        return {
            trustedFile: $sce.trustAsResourceUrl(secureFileUrl),
            trustedIframe: $sce.trustAsResourceUrl("https://freesound.org/embed/sound/iframe/"+singleResult.id+"/simple/small/"),
            rawFileUrl: singleResult.previews['preview-hq-mp3'],
            resultIndex: resultInd,
            creator: singleResult.username,
            filename: $scope.cleanFilename(singleResult.name) + ".mp3",
            name: singleResult.name,
            bpm: Math.round(singleResult.analysis.rhythm.bpm)
        };
    };

    $scope.cleanFilename = function(name){
        var alphaNumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var splitName = name.split("");
        for(var i = 0; i < splitName.length; i++){
            if(!alphaNumeric.includes(splitName[i])) {
                splitName[i] = "_";
            }
        }
        return splitName.join("");
    };

    $scope.saveFreesoundToServer = function() {
        var url = URL_SAVEFREESOUND;

        //AVN TODO - refactor this copy-paste into validateFilenameAndTempo() function
        var key = $scope.file.key,
            tempo = $scope.file.tempo;

        var flagerr = false;

        // TODO: show these userConsole warnings as notification messages instead
        if (userProject.getUsername() == null) {
            esconsole('User not authenticated', 'warning');
            userConsole.warn(ESMessages.uploadcontroller.userAuth);
            $scope.uploadError = ESMessages.uploadcontroller.userAuth;
            flagerr = true;
        }

        if($scope.freesoundChoice === -1){
            esconsole('No selection made for Freesound upload', 'warning');
            userConsole.warn(ESMessages.uploadcontroller.freesoundSelection);
            flagerr = true;
        }

        try {
            if (typeof(key) === 'undefined') {
                esconsole('Key Undefined ...', 'warning');
                userConsole.warn(ESMessages.uploadcontroller.undefinedconstant);
                $scope.uploadError = ESMessages.uploadcontroller.undefinedconstant;
                flagerr = true;
            } else {
                var jsstr = 'let ' + key + '=5';
                esconsole(jsstr, 'debug');
                eval(jsstr); // TODO: This is a truly horrible hack.
                const fileKeys = sounds.selectAllFileKeys($ngRedux.getState());
                if (fileKeys.some(fileKey => fileKey === (userProject.getUsername() + '_' + key).toUpperCase())) {
                    esconsole('Key Already Exists ...', 'info');
                    userConsole.warn(key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  ESMessages.uploadcontroller.alreadyused);
                    $scope.uploadError = key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  ESMessages.uploadcontroller.alreadyused;
                    flagerr = true;
                }
            }
        } catch (err) {
            esconsole(err);

            flagerr = true;
            esconsole('Key value not allowed', 'warning');
            userConsole.warn(key + ' ' + ESMessages.uploadcontroller.invalidconstant);
            $scope.uploadError = key + ' ' + ESMessages.uploadcontroller.invalidconstant
        }

        if (tempo == null || tempo == "") {
            tempo = '-1';
        } else {
            esconsole(parseInt(tempo), 'debug');
            if ( isNaN(parseInt(tempo)) || tempo < -1) {
                flagerr = true;
                esconsole('Tempo is NaN', 'warning');
                userConsole.warn(ESMessages.uploadcontroller.tempointeger);
                $scope.uploadError = ESMessages.uploadcontroller.tempointeger;
            }
            if(tempo > 200 || (tempo > -1 && tempo < 45)){
                flagerr = true;
                esconsole('Tempo is out of range 45-200', 'warning');
                userConsole.warn(ESMessages.esaudio.tempoRange);
                $scope.uploadError = ESMessages.esaudio.tempoRange;
            }
        }

        if(!flagerr) {
            //console.log("properly formatted filesave info") //AVN log
            
            var data = {
                username: userProject.getUsername(),
                file_key: key, 
                tempo: tempo,
                filename: $scope.freesoundResults[$scope.freesoundChoice].filename,
                creator: $scope.freesoundResults[$scope.freesoundChoice].creator,
                url: $scope.freesoundResults[$scope.freesoundChoice].rawFileUrl
            };

            $http.post(url, undefined, {params:data}).then(function(result) {
                userNotification.show(ESMessages.uploadcontroller.uploadsuccess, 'success');

                // clear the cache so it gets reloaded
                audioLibrary.clearAudioTagCache();

                $ngRedux.dispatch(sounds.resetUserSounds());
                $ngRedux.dispatch(sounds.getUserSounds(userProject.getUsername()));

                $scope.close();
            }).catch(function(err) {
                console.log('query failure', url, data, err); //AVN log
            });
        }
    }

    $scope.loginToEmbeddedTunepad = function(){
      if ($scope.isSafari) return null;

      var username = userProject.getUsername();
      var encodedPassword = userProject.getEncodedPassword();
      var url = URL_DOMAIN + '/services/scripts/getembeddedtunepadid';

      var payload = new FormData();
      payload.append('username', username);
      payload.append('password', encodedPassword);

      $.ajax({
          type: "POST",
          enctype: 'multipart/form-data',
          url: url,
          data: payload,
          processData: false,
          contentType: false,
          cache: false,
          success: function (result) {

            console.log("tunepadembed SUCCESS : ", result);
            // TODO: This is a temporary hack for the event listener expecting a different URL structure from the embedded TunePad. We need a proper fix soon.
            // $scope.tunepadURL = result.url.split("?")[0];
            $scope.tunepadURL = result.url.split("?")[0].replace('/redirect-via-EarSketch', '');

            if($scope.tunepadURL[$scope.tunepadURL.length-1] === "/") $scope.tunepadURL = $scope.tunepadURL.slice(0, -1) //remove trailing "/" from url
            var tunepadIFrame = $("#tunepadIFrame")[0]; //.attr("src", result.url);

            // TODO: This is also a hack-fix where the TunePad iframe was not loaded in the "embed" mode.
            // tunepadIFrame.contentWindow.location.replace(result.url);
            tunepadIFrame.contentWindow.location.replace(result.url.replace('redirect-via-EarSketch/?', '?embedded=true&client=earsketch&'));
          },
          error: function(result){
            console.log("tunepadembed Failure: ", result);
            $("#wrongPassword").show();
          }
      });
    };

    $scope.loginToEmbeddedTunepad();

    $scope.gmLogin = function() {
        
        var gmIFrame = $("#gmIFrame")[0]; //.attr("src", result.url);
        $scope.groovemachineURL = 'https://groovemachine.lmc.gatech.edu';
        gmIFrame.contentWindow.location.replace($scope.groovemachineURL);
    };

    // fill the constant field with the file name when it's blank
    $scope.$watch('file.data', function (val) {
        $scope.uploadError = '';

        if(!val) return;

        if (!$scope.file.key) {
            var filename = val.name.split('.');

            // TODO: this does not handle file names with multiple dots
            $scope.chosenfilename = filename[0];
            var name = filename[0].toUpperCase();
            var ext = filename[1].toLowerCase();
            if (ext.match('mp3')) {
                $scope.isMp3 = true;
                $scope.isAiff = false;
                $scope.isWav = false;
            } else if (ext.match('aiff')) {
                $scope.isMp3 = false;
                $scope.isAiff = true;
                $scope.isWav = false;
            } else if (ext.match('wav')) {
                $scope.isMp3 = false;
                $scope.isAiff = false;
                $scope.isWav = true;
            } else {
                $scope.isMp3 = false;
                $scope.isAiff = false;
                $scope.isWav = false;
                $scope.chosenfilename = val.name;
            }

            name = name.replace(/[^\w]/g, '_');
            name = name.replace(/\_+/g, '_');
            if (name[name.length-1] === '_') {
                name = name.slice(0, -1);
            }
            if (name[0].match(/\d/)) {
                name = 'SOUND_'.concat(name); // const cannot start with a number?
                // -> actually the user name is appended, so it should be able to start with a number
            }
            esconsole(name, ['debug', 'upload', 'controller']);
            $scope.file.key = name;

        }
        $scope.showUploadButton();      
    });


    $scope.startLoading = false;
    $scope.progressBarValue = 0;

    function decodeAudioFile(file) {
        return new Promise(function (resolve) {
            var fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = function (e) {
                audioContext.decodeAudioData(e.target.result, function (buffer) {
                    resolve(buffer);
                });
            };
        });
    }

    // TODO: Duplicate in renderer.js. Move both to ESUtils.
    function float32ToInt16(input) {
        var res = new Int16Array(input.length);
        for (var i = 0; i < input.length; i++) {
            var s = Math.max(-1, Math.min(1, input[i]));
            res[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return res;
    }

    function compressToMP3(file, buffer) {
        var numCh = buffer.numberOfChannels;
        var mp3encoder = new lamejs.Mp3Encoder(numCh, 44100, 160);
        var mp3Data = [];

        var left = float32ToInt16(buffer.getChannelData(0));
        var right = float32ToInt16(buffer.getChannelData(numCh-1));
        var sampleBlockSize = 1152;
        var mp3buf;

        var len = left.length;

        for (var i = 0; i < len; i += sampleBlockSize) {
            var leftChunk = left.subarray(i, i + sampleBlockSize);
            var rightChunk = right.subarray(i, i + sampleBlockSize);
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }
        mp3buf = mp3encoder.flush();

        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        var blob = new Blob(mp3Data, {type: 'audio/mp3'});
        var fileName = file.name.replace(/\.wav|\.aiff/g, '.mp3');

        return new File([blob], fileName, {
            type: 'audio/mp3'
        });
    }

    function readFileAsArrayBuffer(file) {
        var fr = new FileReader();
        fr.onload = function(e) {
            var arrayBuffer = fr.result;
            return arrayBuffer;
          }
        fr.readAsArrayBuffer(file);
    }

    $scope.uploadFile = function () {
        $scope.uploadError = '';
        var file = $scope.file.data,
            key = $scope.file.key,
            tempo = $scope.file.tempo;
        
        var x = Promise.resolve(readFileAsArrayBuffer(file));

        x.then(function(result) {
            var element = document.createElement('a');
            element.setAttribute('download', result);
            element.style.display = 'none';
            document.body.appendChild(element);
            
            element.click();
            
            document.body.removeChild(element);
            
        }, function () {
            userConsole.warn('Sorry, Upload file failed :',x);
        });

        var flagerr = false;

        // TODO: show these userConsole warnings as notification messages instead
        if (userProject.getUsername() == null) {
            esconsole('User not authenticated', ['upload', 'error']);
            userConsole.warn(ESMessages.uploadcontroller.userAuth);
            $scope.uploadError = ESMessages.uploadcontroller.userAuth;
            flagerr = true;
        }

        if (typeof(file) == 'undefined') {
            esconsole('File Undefined ...', ['upload', 'error']);
            userConsole.warn(ESMessages.uploadcontroller.wavsel);
            $scope.uploadError = ESMessages.uploadcontroller.wavsel;
            flagerr = true;
        } else {
            //check if file is from esrecording
            if (file.name === 'QUICK_RECORD'){
                file.name = key+'.wav';
            }
            var filename = file.name;
            var ext = filename.split('.').pop();

            if (!['wav','aiff','aif','mp3'].includes(ext)) {
                userConsole.warn(filename + ESMessages.uploadcontroller.invalidfile);
                $scope.uploadError = filename + ESMessages.uploadcontroller.invalidfile;
                flagerr = true;
            }
        }

        decodeAudioFile(file).then(function (buffer) {
            if (buffer.duration > 30) {
                esconsole('Rejecting the upload of audio file with duration: ' + buffer.duration, ['upload', 'error']);

                userConsole.warn(ESMessages.uploadcontroller.bigsize);
                $scope.uploadError = ESMessages.uploadcontroller.bigsize;
                flagerr = true;
                return null;
            } else {
                try {
                    if (typeof(key) == 'undefined') {
                        esconsole('Key Undefined ...', 'warning');
                        userConsole.warn(ESMessages.uploadcontroller.undefinedconstant);
                        $scope.uploadError = ESMessages.uploadcontroller.undefinedconstant;
                        flagerr = true;
                    } else {
                        var jsstr = 'let ' + key + '=5';
                        esconsole(jsstr, 'debug');
                        eval(jsstr); // TODO: This is a truly horrible hack.
                        const fileKeys = sounds.selectAllFileKeys($ngRedux.getState());
                        if (fileKeys.some(fileKey => fileKey === (userProject.getUsername() + '_' + key).toUpperCase())) {
                            esconsole('Key Already Exists ...', 'info');
                            // userConsole.warn(key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  ESMessages.uploadcontroller.alreadyused);
                            $scope.uploadError = key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  ESMessages.uploadcontroller.alreadyused;
                            flagerr = true;
                        }
                    }
                } catch (err) {
                    esconsole(err);

                    flagerr = true;
                    esconsole('Key value not allowed', 'warning');
                    // userConsole.warn(key + ' ' + ESMessages.uploadcontroller.invalidconstant);
                    $scope.uploadError = key + ' ' + ESMessages.uploadcontroller.invalidconstant
                }

                if (tempo == null || tempo === '') {
                    tempo = '-1';
                } else {
                    esconsole(parseInt(tempo), 'debug');
                    if ( isNaN(parseInt(tempo)) || tempo < -1) {
                        flagerr = true;
                        esconsole('Tempo is NaN', 'warning');
                        userConsole.warn(ESMessages.uploadcontroller.tempointeger);
                        $scope.uploadError = ESMessages.uploadcontroller.tempointeger;
                    }
                    if(tempo > 200 || (tempo > -1 && tempo < 45)){
                        flagerr = true;
                        esconsole('Tempo is out of range 45-200', 'warning');
                        userConsole.warn(ESMessages.esaudio.tempoRange);
                        $scope.uploadError = ESMessages.esaudio.tempoRange;
                    }
                }

                if (!flagerr) {
                    //Create Multipart Form Data
                    var formData = new FormData();
                    formData.append('file', file);
                    formData.append('username', userProject.getUsername());
                    formData.append('file_key', key);
                    formData.append('filename', file.name);
                    formData.append('tempo', tempo);

                    var request = new XMLHttpRequest();

                    //request.open("POST", 'http://earsketch.gatech.edu'+'/services/files/upload');
                    esconsole('Submit Custom Sound to '+URL_DOMAIN+'/services/files/upload', 'debug');

                    // for the sound upload bar
                    request.upload.onprogress = function(e) {
                        $scope.startLoading = true;
                        $scope.$apply(function () {
                            var current = (e.loaded / e.total) * 100;
                            $scope.progressBarValue = Math.round( current );
                            if ($scope.progressBarValue === 100) {
                                setTimeout(function () {
                                    $scope.startLoading = false;
                                    $scope.progressBarValue = 0;
                                    $uibModalInstance.close();
                                }, 600);
                            }

                            // for the timeout error
                            setTimeout(function () {
                                $scope.startLoading = false;
                                $scope.progressBarValue = 0;
                            }, 10100);
                        });
                    };

                    request.open("POST", URL_DOMAIN+'/services/files/upload');

                    request.timeout = 60000;
                    request.ontimeout = function () {
                        userConsole.error(ESMessages.uploadcontroller.timeout);
                    };

                    request.onload = function () {
                        if (request.readyState === 4) {
                            if (request.status === 200) {
                                userNotification.show(ESMessages.uploadcontroller.uploadsuccess, 'success');

                                // clear the cache so it gets reloaded
                                audioLibrary.clearAudioTagCache();

                                $ngRedux.dispatch(sounds.resetUserSounds());
                                $ngRedux.dispatch(sounds.getUserSounds(userProject.getUsername()));
                            } else {
                                esconsole('Error Sending Custom Sound...', 'error');
                                esconsole(request.statusText, 'error');
                                userConsole.error(ESMessages.uploadcontroller.commerror);
                                $scope.error = ESMessages.uploadcontroller.commerror;
                            }
                        } else {
                            esconsole('Error Sending Custom Sound....', 'error');
                            userConsole.error(ESMessages.uploadcontroller.commerror2);
                            $scope.error = ESMessages.uploadcontroller.commerror2;
                        }
                    };

                    request.send(formData);
                    esconsole('****UPLOAD SEND******' , 'info');
                }
            }
        });
    };

    $scope.done = function () {
        RecorderService.clear();
        $uibModalInstance.close();
    };


    var tunepadWindow;
    $scope.saveTunepadWavData = function() {
        if(!tunepadWindow) tunepadWindow = document.getElementById("tunepadIFrame").contentWindow;
        if (tunepadWindow != null) {
            tunepadWindow.postMessage("save-wav-data", "*");
        }
    }

    var gmWindow;
    $scope.saveGrooveMachineWavData = function() {
        if(!gmWindow) gmWindow = document.getElementById("gmIFrame").contentWindow;
        if (gmWindow != null) {
            gmWindow.postMessage("save-wav-data", "*");
        }
    }


    function isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    window.uploadScope = $scope;
    window.addEventListener('message', function(message) {
      // you can also check message.origin to see if it matches the expected ifram
      // you can check message.isTrusted 
        if (message.origin == $scope.tunepadURL && message.isTrusted) {            
            // console.log(JSON.parse(message.data));
            if(message.data === "dropbook-view") $scope.tunepadIsShowingProjectPage = true;
            else if(message.data === "project-embed-list") $scope.tunepadIsShowingProjectPage = false;
            else {
                var tpData = JSON.parse(message.data);
                if(tpData.wavData) {
                    $scope.file.tempo = tpData.bpm;

                    var wavBytes = new Uint8Array(tpData.wavData.length)
                    tpData.wavData.forEach(function(v, i){wavBytes[i] = v});
                    var d = new Date();
                    var defaultName = $scope.cleanFilename("Tunepad"+"_"+d.toLocaleDateString() + " _" + d.toLocaleTimeString());
                    var u8File = new File([wavBytes], defaultName+".wav", {type:"audio/wav"});

                    //todo tpEmbed: hack-something with username and timestamp as a placeholder
                    //todo tpEmbed: use real tunepad data here once serialization is fixed
                    // $scope.file.data = dataURItoFile(/*tpData.wavData*/bdStr, "tunepadAudio.wav");

                    $scope.file.data = u8File;

                    //todo tpEmbed: still need to specify filename before submit button can be activated,
                    $scope.$apply();
                    $scope.uploadFile();
                }
            }
            $scope.$apply();
        }
    });
    $scope.gmReady = false;

    window.addEventListener('message', function(message) {
        // you can also check message.origin to see if it matches the expected ifram
        // you can check message.isTrusted 
        if (message.origin == $scope.groovemachineURL) {
            if (message.data == 0) {
                $scope.gmReady = false;
            } 
            else if (message.data == 1) {
                $scope.gmReady = true;
            } 
            else {
                var gmData = message.data;
 
                var date = new Date()
                var dateString = date.toLocaleDateString();
                var timeString = date.toLocaleTimeString();
                var defaultName = $scope.cleanFilename("GrooveMachine"+"_"+ dateString + " _" + timeString);
                var u8File = new File([new Blob([gmData.wavData], { type: 'audio/wav' })], defaultName+".wav", {type:"audio/wav"});
                
                $scope.file.tempo = gmData.tempo;
                $scope.file.data = u8File;
                $scope.$apply();
                $scope.uploadFile();
            }
            
            
            $scope.$apply();
        }
            
      });

    // function dataURItoFile(dataURI, filename) {
    //     // convert base64/URLEncoded data component to raw binary data held in a string
    //     var byteString;
    //     if (dataURI.split(',')[0].indexOf('base64') >= 0)
    //         byteString = atob(dataURI.split(',')[1]);
    //     else
    //         byteString = unescape(dataURI.split(',')[1]);

    //     // separate out the mime component
    //     var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    //     // write the bytes of the string to a typed array
    //     var ia = new Uint8Array(byteString.length);
    //     for (var i = 0; i < byteString.length; i++) {
    //         ia[i] = byteString.charCodeAt(i);
    //     }

    //     return new File([ia], filename, {type:mimeString});
    // }


}]);
