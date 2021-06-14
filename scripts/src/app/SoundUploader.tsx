import React, { useState } from "react"

import audioContext from './audiocontext'
import * as audioLibrary from './audiolibrary'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as RecorderService from './esrecorder'
import * as sounds from '../browser/soundsState'
import * as userConsole from './userconsole'
import * as userNotification from './userNotification'
import * as userProject from './userProject'
import i18n from "i18next"
import store from "../reducers"

async function uploadFile(file: File, key: string, tempo: number, onProgress: (frac: number) => void) {
    if (userProject.getUsername() == null) {
        throw i18n.t('messages:uploadcontroller.userAuth')
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = await audioContext.decodeAudioData(arrayBuffer)
    if (buffer.duration > 30) {
        esconsole("Rejecting the upload of audio file with duration: " + buffer.duration, ["upload", "error"])
        throw i18n.t('messages:uploadcontroller.bigsize')
    }

    const fileKeys = sounds.selectAllFileKeys(store.getState())
    if (fileKeys.some(fileKey => fileKey === (userProject.getUsername() + '_' + key).toUpperCase())) {
        throw `${key} (${(userProject.getUsername() + '_' + key).toUpperCase()})${i18n.t('messages:uploadcontroller.alreadyused')}`
    }

    if (tempo > 200 || (tempo > -1 && tempo < 45)) {
        throw i18n.t('messages:esaudio.tempoRange')
    }

    const data = userProject.form({
        file,
        username: userProject.getUsername(),
        file_key: key,
        filename: file.name,
        tempo: tempo + "",
    })

    // Sadly, Fetch does not yet support observing upload progress (see https://github.com/github/fetch/issues/89).
    const request = new XMLHttpRequest()
    request.upload.onprogress = e => onProgress(e.loaded / e.total)

    request.timeout = 60000
    request.ontimeout = () => userConsole.error(i18n.t('messages:uploadcontroller.timeout'))
    const promise = new Promise<void>((resolve, reject) => {
        request.onload = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    userNotification.show(i18n.t('messages:uploadcontroller.uploadsuccess'), "success")
                    // Clear the cache so it gets reloaded.
                    audioLibrary.clearAudioTagCache()
                    store.dispatch(sounds.resetUserSounds())
                    store.dispatch(sounds.getUserSounds(userProject.getUsername()))
                    resolve()
                } else {
                    reject(i18n.t('messages:uploadcontroller.commerror'))
                }
            } else {
                reject(i18n.t('messages:uploadcontroller.commerror2'))
            }
        }
    })

    onProgress(0)
    request.open("POST", URL_DOMAIN + "/services/files/upload")
    request.send(data)
    return promise
}

const ProgressBar = ({ progress }: { progress: number }) => {
    const percent = Math.floor(progress * 100) + "%"
    return <div id="progressbar"> 
        <div className="col-sm-12">
            <div className="progress">
                <div className="progress-bar progress-bar-success" style={{ width: percent }}>{percent}</div>
            </div>
        </div>
    </div>
}

const FileTab = ({ close }: { close: () => void }) => {
    const [file, setFile] = useState(null as File | null)
    const [key, setKey] = useState("")
    const [tempo, setTempo] = useState("")
    const [error, setError] = useState("")
    const [progress, setProgress] = useState(null as number | null)

    const name = file ? ESUtils.parseName(file.name) : ""
    if (key === "" && name !== "") {
        setKey(name.trim().toUpperCase().replace(/\W/g, "_").replace(/_+/g, "_"))
    }
    const extension = file ? ESUtils.parseExt(file.name) : ""

    const submit = async () => {
        try {
            await uploadFile(file!, key, tempo === "" ? -1 : +tempo, setProgress)
            close()
        } catch (error) {
            setError(error)
        }
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body transparent">
            {error && <div className="alert alert-danger">{error}</div>}
            <div>
                <div className="upload-file">
                    <input id="file" className="inputfile" type="file" onChange={e => setFile(e.target.files![0])} accept=".wav,.aiff,.aif,.mp3,audio/wav,audio/aiff,audio/mpeg" required />
                    <label id="inputlabel" htmlFor="file">
                        <span><i className="icon icon-cloud-upload"></i></span>
                        <span>{name || "Choose a file..."}</span>
                        {extension
                        ? <kbd className="kbd">{extension}</kbd>
                        : <><kbd className="kbd">.wav</kbd><kbd className="kbd">.aiff</kbd><kbd className="kbd">.mp3</kbd></>}
                    </label>
                </div>
                <div className="modal-section-header">
                    <span>Constant Value (required)</span>
                    <span>Tempo (Optional)</span>
                </div>
                <div className="modal-section-body" id="upload-details">
                    <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control shake" id="key" value={key} onChange={e => setKey(e.target.value)} required />
                    <input type="number" placeholder="e.g. 120" className="form-control shake" id="tempo" value={tempo} onChange={e => setTempo(e.target.value)} />
                </div>
            </div>
        </div>
        <div className="modal-footer">
            {progress !== null && <ProgressBar progress={progress} />}
            <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
            <input type="submit" value="UPLOAD" className="btn btn-primary text-white" disabled={file === null} />
        </div>
    </form>
}

const RecordTab = () => {
    // $scope.recError = ''
    // $scope.micAccessError = false
    // $scope.micAccessMessage = ''
    // $scope.notAllowedToRecord = false

    // $scope.recorder = RecorderService
    // RecorderService.callbacks.prepareForUpload = (data, useMetro, tempo) => {
    //     $scope.file.data = data
    //     if (useMetro) {
    //         $scope.file.tempo = tempo
    //     }
    // }

    // $scope.openRecordMenu = function () {
    //     if (ESUtils.whichBrowser().match('Chrome|Firefox') == null) {
    //         $scope.recError = i18n.t('messages:uploadcontroller.nosupport')
    //     } else {
    //         RecorderService.init()
    //     }
    // }

    // RecorderService.callbacks.micAccessBlocked = function (error) {
    //     $scope.$apply(function () {
    //         $scope.micAccessError = true
    //         if (error == "chrome_mic_noaccess") {
    //             $scope.micAccessMessage = i18n.t('messages:uploadcontroller.chrome_mic_noaccess')
    //         } else if (error == "ff_mic_noaccess") {
    //             $scope.micAccessMessage = i18n.t('messages:uploadcontroller.ff_mic_noaccess')
    //         }
    //         $scope.notAllowedToRecord = true
    //         $timeout(function () {
    //             $scope.notAllowedToRecord = false
    //         }, 1000)
    //     })
    // }

    // RecorderService.callbacks.openRecordMenu = function () {
    //     $scope.$apply(function () {
    //         $scope.micAccessError = false
    //         $scope.micAccessMessage = ''
    //     })
    //     // $scope.activePill = $scope.menus.record
    // }

    // return <form onSubmit={e => { e.preventDefault(); submit() }}>
    //     <div className="modal-body">
    //         <div className="alert alert-danger" ng-show="uploadError">
    //             {uploadError}
    //         </div>
    //         <div className="alert alert-danger" ng-show="recError">
    //             {recError}
    //         </div>
    //         <div className="alert alert-danger" ng-show="micAccessError">
    //             <p>{micAccessMessage}</p>
    //             <span className="shake" ng-className="{'notAllowedTo':notAllowedToRecord, '':!notAllowedToRecord}">
    //                 <button className="buttonmodal" ng-click="openRecordMenu()">ENABLE MIC AND CLICK HERE TO TRY AGAIN.</button>
    //             </span>
    //         </div>
    //         <div ng-hide="recError || micAccessError">
    //             <div className="modal-section-header">
    //                 <span>Constant Value (required)</span>
    //             </div>
    //             <div className="modal-section-content"> 
    //                 <input type="text" placeholder="e.g. MYRECORDING_01" className="form-control" id="key" ng-model="file.key" ng-change="showUploadButton()" />
    //             </div>
    //             <div className="modal-section-header">
    //                 <span>Measures Control</span>
    //                 <button type="button" className="btn btn-hollow btn-filter" ng-show="recorder.properties.useMetro" ng-className="recorder.properties.clicks ? 'active' : ''" ng-click="recorder.properties.clicks = !recorder.properties.clicks">
    //                     <span>CLICK WHILE RECORDING</span>
    //                 </button>
    //                 <button type="button" className="btn btn-hollow btn-filter" ng-className="recorder.properties.useMetro ? 'active' : ''" ng-click="recorder.properties.useMetro = !recorder.properties.useMetro">
    //                     <span>METRONOME</span>
    //                 </button>
    //             </div>
    //             <div className="modal-section-content" ng-show="recorder.properties.useMetro" id="count-measures-input">
    //                 <div>
    //                     <label>Tempo (beats per minute)</label>
    //                     <input type="text" placeholder="e.g. 120" ng-model="recorder.properties.bpm" />
    //                     <input id="tempoSlider" type="range" ng-model="recorder.properties.bpm" name="rangeTempo" min="45" max="220" />
    //                 </div>
    //                 <div>
    //                     <label>Countoff Measures</label>
    //                     <input type="text" placeholder="{{recorder.properties.countoff}}" ng-model="recorder.properties.countoff" />
    //                 </div>
    //                 <div>
    //                     <label>Measures to Record</label>
    //                     <input type="text" placeholder="{{recorder.properties.numMeasures}}" ng-model="recorder.properties.numMeasures" />
    //                 </div>
    //             </div>
    //             <div className="modal-section-header">
    //                 <span>Record Sound</span>
    //                 <div id="levelmeter-container">
    //                     <LevelMeter />
    //                 </div>
    //             </div>
    //             <div className="modal-section-content" id="record-section-container">
    //                 <div id="metronome">
    //                     <VisualMetronome
    //                         mic-is-on="recorder.micIsOn"
    //                         has-buffer="recorder.hasBuffer"
    //                         use-metro="recorder.properties.useMetro"
    //                         is-recording="recorder.isRecording"
    //                         is-previewing="recorder.isPreviewing"
    //                         cur-measure="recorder.curMeasure"
    //                         cur-measure-show="recorder.curMeasureShow" />
    //                 </div>       
    //                 <div id="waveform">
    //                     <Waveform id="wavedisplay" />
    //                 </div>
    //                 <button type="button" id="record-clear-button" className="btn btn-hollow btn-filter" ng-show="recorder.hasBuffer" ng-click="recorder.clear(true);">
    //                     <span>CLEAR</span>
    //                 </button>
    //             </div>
    //         </div>
    //     </div>
    //     <div className="modal-footer">
    //         <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
    //         <input type="submit" value="UPLOAD" className="btn btn-primary text-white" />
    //     </div>
    // </form>
    return null
}

const FreesoundTab = () => {
    // $scope.freesoundChoice = -1
    // $scope.freesoundResults = []
    // $scope.searchform = {'searchQuery': ''}

    // $scope.entryLimit = 3
    // $scope.currentPage = 1
    // $scope.maxSize = 4; //pagination max size
    // $scope.noOfPages =  0
    // $scope.firstSearchExecuted = false

    // $scope.selectFreesoundResult = function(resultIndex){
    //     $scope.freesoundChoice = resultIndex
    //     $scope.file.key = $scope.cleanFilename($scope.freesoundResults[resultIndex].name).toUpperCase()
    //     $scope.file.tempo = Math.round($scope.freesoundResults[resultIndex].bpm)
    //     console.log(resultIndex); //AVN log
    // }

    // $scope.searchFreesound = function() {
    //     var searchUrl = URL_SEARCHFREESOUND
    //     var queryParams = {'query': $scope.searchform.searchQuery}

    //     $scope.firstSearchExecuted = true

    //     $scope.currentPage = 1
    //     $scope.freesoundResults = []

    //     var hasBpmData = function(freesoundResult){
    //         var r = freesoundResult
    //         return !!r.analysis && !!r.analysis.rhythm && !!r.analysis.rhythm.bpm
    //     }

    //     $http.get(searchUrl, {params: queryParams}).then(function(result) {
    //         $scope.freesoundResults = result.data.results.filter(hasBpmData).map($scope.resultToUrlSet)
    //         console.log('Posted query', result); //AVN log
    //     }).catch(function(err) {
    //         $scope.freesoundResults = freesoundResults
    //             .map(function(url){ return {'raw':url, 'trusted': $sce.trustAsResourceUrl(url)}})
    //         $scope.noOfPages = Math.ceil($scope.freesoundResults.length/$scope.entryLimit)

    //         //console.log('query failure', url, data, err); //AVN log
    //     })

    //     $scope.freesoundChoice = -1
    //     $scope.file.key = ''
    //     $scope.file.tempo = ''
    // }

    // $scope.resultToUrlSet = function(singleResult, resultInd){
    //     var fileUrl = singleResult.previews['preview-lq-mp3']
    //     var secureFileUrl = fileUrl.indexOf('https') === -1 ? fileUrl.replace('http', 'https') : fileUrl
    //     return {
    //         trustedFile: $sce.trustAsResourceUrl(secureFileUrl),
    //         trustedIframe: $sce.trustAsResourceUrl("https://freesound.org/embed/sound/iframe/"+singleResult.id+"/simple/small/"),
    //         rawFileUrl: singleResult.previews['preview-hq-mp3'],
    //         resultIndex: resultInd,
    //         creator: singleResult.username,
    //         filename: $scope.cleanFilename(singleResult.name) + ".mp3",
    //         name: singleResult.name,
    //         bpm: Math.round(singleResult.analysis.rhythm.bpm)
    //     }
    // }

    // $scope.cleanFilename = function(name){
    //     var alphaNumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    //     var splitName = name.split("")
    //     for(var i = 0; i < splitName.length; i++){
    //         if(!alphaNumeric.includes(splitName[i])) {
    //             splitName[i] = "_"
    //         }
    //     }
    //     return splitName.join("")
    // }

    // $scope.saveFreesoundToServer = function() {
    //     var url = URL_SAVEFREESOUND

    //     //AVN TODO - refactor this copy-paste into validateFilenameAndTempo() function
    //     var key = $scope.file.key,
    //         tempo = $scope.file.tempo

    //     var flagerr = false

    //     // TODO: show these userConsole warnings as notification messages instead
    //     if (userProject.getUsername() == null) {
    //         esconsole('User not authenticated', 'warning')
    //         userConsole.warn(i18n.t('messages:uploadcontroller.userAuth'))
    //         $scope.uploadError = i18n.t('messages:uploadcontroller.userAuth')
    //         flagerr = true
    //     }

    //     if($scope.freesoundChoice === -1){
    //         esconsole('No selection made for Freesound upload', 'warning')
    //         userConsole.warn(i18n.t('messages:uploadcontroller.freesoundSelection'))
    //         flagerr = true
    //     }

    //     try {
    //         if (typeof(key) === 'undefined') {
    //             esconsole('Key Undefined ...', 'warning')
    //             userConsole.warn(i18n.t('messages:uploadcontroller.undefinedconstant'))
    //             $scope.uploadError = i18n.t('messages:uploadcontroller.undefinedconstant')
    //             flagerr = true
    //         } else {
    //             var jsstr = 'let ' + key + '=5'
    //             esconsole(jsstr, 'debug')
    //             eval(jsstr); // TODO: This is a truly horrible hack.
    //             const fileKeys = sounds.selectAllFileKeys($ngRedux.getState())
    //             if (fileKeys.some(fileKey => fileKey === (userProject.getUsername() + '_' + key).toUpperCase())) {
    //                 esconsole('Key Already Exists ...', 'info')
    //                 userConsole.warn(key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  i18n.t('messages:uploadcontroller.alreadyused'))
    //                 $scope.uploadError = key + ' (' + (userProject.getUsername() + '_' + key).toUpperCase() + ')' +  i18n.t('messages:uploadcontroller.alreadyused')
    //                 flagerr = true
    //             }
    //         }
    //     } catch (err) {
    //         esconsole(err)

    //         flagerr = true
    //         esconsole('Key value not allowed', 'warning')
    //         userConsole.warn(key + ' ' + i18n.t('messages:uploadcontroller.invalidconstant'))
    //         $scope.uploadError = key + ' ' + i18n.t('messages:uploadcontroller.invalidconstant')
    //     }

    //     if (tempo == null || tempo == "") {
    //         tempo = '-1'
    //     } else {
    //         esconsole(parseInt(tempo), 'debug')
    //         if ( isNaN(parseInt(tempo)) || tempo < -1) {
    //             flagerr = true
    //             esconsole('Tempo is NaN', 'warning')
    //             userConsole.warn(i18n.t('messages:uploadcontroller.tempointeger'))
    //             $scope.uploadError = i18n.t('messages:uploadcontroller.tempointeger')
    //         }
    //         if(tempo > 200 || (tempo > -1 && tempo < 45)){
    //             flagerr = true
    //             esconsole('Tempo is out of range 45-200', 'warning')
    //             userConsole.warn(i18n.t('messages:esaudio.tempoRange'))
    //             $scope.uploadError = i18n.t('messages:esaudio.tempoRange')
    //         }
    //     }

    //     if(!flagerr) {
    //         //console.log("properly formatted filesave info") //AVN log
            
    //         var data = {
    //             username: userProject.getUsername(),
    //             file_key: key, 
    //             tempo: tempo,
    //             filename: $scope.freesoundResults[$scope.freesoundChoice].filename,
    //             creator: $scope.freesoundResults[$scope.freesoundChoice].creator,
    //             url: $scope.freesoundResults[$scope.freesoundChoice].rawFileUrl
    //         }

    //         $http.post(url, undefined, {params:data}).then(function(result) {
    //             userNotification.show(i18n.t('messages:uploadcontroller.uploadsuccess'), 'success')

    //             // clear the cache so it gets reloaded
    //             audioLibrary.clearAudioTagCache()

    //             $ngRedux.dispatch(sounds.resetUserSounds())
    //             $ngRedux.dispatch(sounds.getUserSounds(userProject.getUsername()))

    //             $scope.close()
    //         }).catch(function(err) {
    //             console.log('query failure', url, data, err); //AVN log
    //         })
    //     }
    // }

    // return <form onSubmit={e => { e.preventDefault(); submit() }}>
    //     <div>
    //         <div className="alert alert-danger" ng-show="uploadError">
    //             {uploadError}
    //         </div>
    //         <div>
    //             <a href="http://freesound.org/" target="_blank">Freesound.org</a> is an online database with thousands of free audio clips, including everything from music to field recordings, all licensed under Creative Commons licenses. EarSketch allows you to search the Freesound database without having to leave the EarSketch site. Try it below! 
    //         </div>
    //         <div className="search-block">
    //                 <input className="form-control shake form-search" placeholder="Enter your sound search query here" ng-model="searchform.searchQuery" type="text" required /> 
    //                 <button ng-click="searchFreesound()" className="btn btn-hollow btn-filter">SEARCH</button>
    //         </div>
    //         <p>
    //             <div className="modal-section-header">
    //                 <span ng-hide="freesoundResults.length === 0">Results</span>
    //             </div>
    //             <div ng-repeat="result in freesoundResults">
    //                 <div ng-show="(currentPage-1)*entryLimit <= result.resultIndex && result.resultIndex < currentPage*entryLimit">
    //                     <div>{result.name}: {result.bp} bpm. Uploaded by Freesound user {result.creator}</div>
    //                     <audio controls>
    //                         <source ng-src="{{result.trustedFile}}" type="audio/mpeg" />
    //                     Your browser does not support the audio element.
    //                     </audio>
    //                     <span ng-click="selectFreesoundResult(result.resultIndex)">
    //                         <span> &nbsp; &nbsp;</span>
    //                         <i className="ng-class: freesoundChoice === result.resultIndex ? 'icon selection icon-checkmark' : 'icon selection icon-plus2'"></i>
    //                     </span>
    //                     <p></p>
    //                 </div>
    //             </div>
    //             <div ng-show="freesoundResults.length === 0 && firstSearchExecuted">
    //                 <br />No results<br />
    //             </div>
    //         </p>
    //         <div className="modal-section-body" id="upload-details">
    //             <input type="text" placeholder="e.g. MYSOUND_01" className="form-control shake" id="key" ng-model="file.key" />
    //         </div>
    //         <div uib-pagination boundary-links="true" max-size="maxSize" num-pages="noOfPages" total-items="freesoundResults.length" ng-model="currentPage"  items-per-page="entryLimit" className="pagination-sm" previous-text="&lsaquo;" next-text="&rsaquo;" first-text="&laquo;" last-text="&raquo;" ng-show="freesoundResults.length > 0" />
    //     </div>
    //     <div className="modal-footer">
    //         <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
    //         <input type="submit" value="UPLOAD" className="btn btn-primary text-white" />
    //     </div>
    // </form>
    return null
}

const TunepadTab = () => {
    // $scope.tunepadURL = ""
    // $scope.tunepadIsShowingProjectPage = false
    // $scope.isSafari = ESUtils.whichBrowser().match('Safari')

    // $scope.loginToEmbeddedTunepad = function(){
    //     if ($scope.isSafari) return null
  
    //     var username = userProject.getUsername()
    //     var encodedPassword = userProject.getPassword()
    //     var url = URL_DOMAIN + '/services/scripts/getembeddedtunepadid'
  
    //     var payload = new FormData()
    //     payload.append('username', username)
    //     payload.append('password', encodedPassword)
  
    //     $.ajax({
    //         type: "POST",
    //         enctype: 'multipart/form-data',
    //         url: url,
    //         data: payload,
    //         processData: false,
    //         contentType: false,
    //         cache: false,
    //         success: function (result) {
  
    //           console.log("tunepadembed SUCCESS : ", result)
    //           // TODO: This is a temporary hack for the event listener expecting a different URL structure from the embedded TunePad. We need a proper fix soon.
    //           // $scope.tunepadURL = result.url.split("?")[0]
    //           $scope.tunepadURL = result.url.split("?")[0].replace('/redirect-via-EarSketch', '')
  
    //           if($scope.tunepadURL[$scope.tunepadURL.length-1] === "/") $scope.tunepadURL = $scope.tunepadURL.slice(0, -1) //remove trailing "/" from url
    //           var tunepadIFrame = $("#tunepadIFrame")[0]; //.attr("src", result.url)
  
    //           // TODO: This is also a hack-fix where the TunePad iframe was not loaded in the "embed" mode.
    //           // tunepadIFrame.contentWindow.location.replace(result.url)
    //           tunepadIFrame.contentWindow.location.replace(result.url.replace('redirect-via-EarSketch/?', '?embedded=true&client=earsketch&'))
    //         },
    //         error: function(result){
    //           console.log("tunepadembed Failure: ", result)
    //           $("#wrongPassword").show()
    //         }
    //     })
    // }
  
    // $scope.loginToEmbeddedTunepad()

    // window.addEventListener('message', function(message) {
    //     // you can also check message.origin to see if it matches the expected ifram
    //     // you can check message.isTrusted 
    //     if (message.origin == $scope.tunepadURL && message.isTrusted) {            
    //         // console.log(JSON.parse(message.data))
    //         if(message.data === "dropbook-view") $scope.tunepadIsShowingProjectPage = true
    //         else if(message.data === "project-embed-list") $scope.tunepadIsShowingProjectPage = false
    //         else {
    //             var tpData = JSON.parse(message.data)
    //             if(tpData.wavData) {
    //                 $scope.file.tempo = tpData.bpm

    //                 var wavBytes = new Uint8Array(tpData.wavData.length)
    //                 tpData.wavData.forEach(function(v, i){wavBytes[i] = v})
    //                 var d = new Date()
    //                 var defaultName = $scope.cleanFilename("Tunepad"+"_"+d.toLocaleDateString() + " _" + d.toLocaleTimeString())
    //                 var u8File = new File([wavBytes], defaultName+".wav", {type:"audio/wav"})

    //                 //todo tpEmbed: hack-something with username and timestamp as a placeholder
    //                 //todo tpEmbed: use real tunepad data here once serialization is fixed
    //                 // $scope.file.data = dataURItoFile(/*tpData.wavData*/bdStr, "tunepadAudio.wav")

    //                 $scope.file.data = u8File

    //                 //todo tpEmbed: still need to specify filename before submit button can be activated,
    //                 $scope.$apply()
    //                 $scope.uploadFile()
    //             }
    //         }
    //         $scope.$apply()
    //     }
    // })

    // var tunepadWindow
    // $scope.saveTunepadWavData = function() {
    //     if(!tunepadWindow) tunepadWindow = document.getElementById("tunepadIFrame").contentWindow
    //     if (tunepadWindow != null) {
    //         tunepadWindow.postMessage("save-wav-data", "*")
    //     }
    // }

    // return <form onSubmit={e => { e.preventDefault(); submit() }}>
    //     <div className="modal-body">
    //         <div className="alert alert-danger" ng-show="uploadError">
    //             {uploadError}
    //         </div>
    //         <div>
    //             <div ng-show="isSafari" style="text-align:center; margin:2em;">
    //                 Sorry, TunePad in EarSketch currently does not work in Safari. Please use Chrome or FireFox.
    //             </div>
    //             <iframe ng-show="!isSafari" name="tunepadIFrame" id="tunepadIFrame" allow="microphone https://tunepad.xyz/ https://tunepad.live/" width="100%" height="500px">IFrames are not supported by your browser.</iframe>
    //         </div>
    //         <div className="modal-section-body" id="upload-details">
    //             <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control shake" id="key" ng-model="file.key" ng-change="showUploadButton()" />
    //         </div>
    //     </div>
    //     <div className="modal-footer">
    //         <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
    //         <input type="submit" value="UPLOAD" className="btn btn-primary text-white" />
    //     </div>
    // </form>
    return null
}

const GrooveMachineTab = () => {
    // $scope.groovemachineURL = ""

    // $scope.openGrooveMachineMenu = function () {
    //     $scope.activePill = $scope.menus.groovemachine
    //     $scope.gmLogin()
        
    // }

    // $scope.gmLogin = function() {
    //     var gmIFrame = $("#gmIFrame")[0]; //.attr("src", result.url)
    //     $scope.groovemachineURL = 'https://groovemachine.lmc.gatech.edu'
    //     gmIFrame.contentWindow.location.replace($scope.groovemachineURL)
    // }

    // var gmWindow
    // $scope.saveGrooveMachineWavData = function() {
    //     if(!gmWindow) gmWindow = document.getElementById("gmIFrame").contentWindow
    //     if (gmWindow != null) {
    //         gmWindow.postMessage("save-wav-data", "*")
    //     }
    // }

    // $scope.gmReady = false

    // window.addEventListener('message', function(message) {
    //     // you can also check message.origin to see if it matches the expected ifram
    //     // you can check message.isTrusted 
    //     if (message.origin == $scope.groovemachineURL) {
    //         if (message.data == 0) {
    //             $scope.gmReady = false
    //         } 
    //         else if (message.data == 1) {
    //             $scope.gmReady = true
    //         } 
    //         else {
    //             var gmData = message.data
 
    //             var date = new Date()
    //             var dateString = date.toLocaleDateString()
    //             var timeString = date.toLocaleTimeString()
    //             var defaultName = $scope.cleanFilename("GrooveMachine"+"_"+ dateString + " _" + timeString)
    //             var u8File = new File([new Blob([gmData.wavData], { type: 'audio/wav' })], defaultName+".wav", {type:"audio/wav"})
                
    //             $scope.file.tempo = gmData.tempo
    //             $scope.file.data = u8File
    //             $scope.$apply()
    //             $scope.uploadFile()
    //         }
    //         $scope.$apply()
    //     } 
    // })

    // return <form onSubmit={e => { e.preventDefault(); submit() }}>
    //     <div className="modal-body">
    //         <div className="alert alert-danger" ng-show="uploadError">
    //             {uploadError}
    //         </div>
    //         <div>
    //             <iframe name="gmIFrame" id="gmIFrame" allow="microphone"  width="100%" height="500px">IFrames are not supported by your browser.</iframe>
    //         </div>
    //         <div className="modal-section-body" id="upload-details">
    //             <input type="text" placeholder="e.g. MYSYNTH_01" className="form-control shake" id="key" ng-model="file.key" ng-change="showUploadButton()" />
    //         </div>
    //     </div>
    //     <div className="modal-footer">
    //         <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
    //         <input type="submit" value="UPLOAD" className="btn btn-primary text-white" />
    //     </div>
    // </form>
    return null
}

const Tabs = [
    { component: FileTab, title: "UPLOAD SOUND", icon: "cloud-upload" },
    { component: RecordTab, title: "QUICK RECORD", icon: "microphone" },
    { component: FreesoundTab, title: "FREESOUND", icon: "search", },
    { component: TunepadTab, title: "TUNEPAD", icon: "cloud-upload" },
    { component: GrooveMachineTab, title: "GROOVEMACHINE", icon: "cloud-upload" },
]

export const SoundUploader = ({ close }: { close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const TabBody = Tabs[activeTab].component

    return  <>
        <div className="modal-header">
            <h4 className="modal-title">Add a New Sound</h4>
            <hr className="my-4 border-gray-200" />
            <div className="es-modal-tabcontainer">
                <ul className="nav-pills flex flex-row">
                    {Tabs.map(({ title, icon }, index) =>
                    <li key={index} className={"uib-tab nav-item flex-grow" + (activeTab === index ? " active" : "")}>
                        <a href="" onClick={() => setActiveTab(index)} className="nav-link h-full flex justify-center items-center">
                            <i className={`icon icon-${icon} mr-3`}></i>{title}
                        </a>
                    </li>)}
                </ul>
            </div>
        </div>
        <div id="upload-sound-tabcontainer">
            <TabBody close={close} />
        </div>
    </>
}
