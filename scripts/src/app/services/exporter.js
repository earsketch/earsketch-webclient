/**
 * A service that provides a way to export scripts in various forms.
 *
 * @module exporter
 * @author Creston Bunch
 */
import * as compiler from '../compiler'
import esconsole from '../../esconsole'
import * as ESUtils from '../../esutils'
import * as renderer from '../renderer'

app.factory('exporter', ['$rootScope',
function exporter($rootScope) {

    /**
     * Export the script as a text file. This function is wrapped in a closure
     * to make a dummy anchor tag for downloading.
     *
     * @name script
     * @function
     */
    var text = (function() {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        return function(script) {
            esconsole('Downloading script locally.', ['debug','exporter']);
            var aFileParts = [script.source_code];
            var codeblob = new Blob(aFileParts, {type: 'text/plain'});
            var url = window.URL.createObjectURL(codeblob);
            // download the script
            a.href = url;
            a.download = script.name;
            a.target = '_blank';
            esconsole('File location: ' + a.href, ['debug','exporter']);
            a.click();
            //window.URL.revokeObjectURL(url);
        };
    })();

    /**
     * Exports the script as a wav file.
     *
     * @name wav
     * @function
     * @returns {Promise} A promise that resolves to the data object that can
     * be downloaded.
     */
    var wav = function (script, quality) {
        var lang = ESUtils.parseLanguage(script.name);
        var p;
        if (lang == 'python') {
            p = compiler.compilePython(script.source_code, quality);
        } else {
            p = compiler.compileJavascript(script.source_code, quality);
        }

        var name = ESUtils.parseName(script.name);

        return p.then(function (result) {
          return result;
        }).catch(function() {
          throw ESMessages.download.compileerror;
        }).then(function(result) {
          if (result.length === 0) {
            throw ESMessages.download.emptyerror;
          }
          return renderer.renderWav(result);
        }).catch(function (err) {
          esconsole(err, ['error', 'exporter']);
          throw err;
        }).then(function (blob) {
            try {
                esconsole('Ready to download wav file.', ['debug', 'exporter']);

                // save the file locally without sending to the server.
                var data = {};
                data.path = (window.URL || window.webkitURL).createObjectURL(blob);
                data.name = name + '.wav';

                return data;
            } catch (e) {
                esconsole(e, ['error', 'exporter']);
                throw ESMessages.download.rendererror;
            }
        });
    };

    /**
     * Exports the script as a wav file.
     *
     * @name mp3
     * @function
     * @returns {Promise} A promise that resolves to the data object that can
     * be downloaded.
     */
    var mp3 = function (script, quality) {
        var p;
        var lang = ESUtils.parseLanguage(script.name);
        if (lang == 'python') {
            p = compiler.compilePython(script.source_code, quality);
        } else {
            p = compiler.compileJavascript(script.source_code, quality);
        }

        var name = ESUtils.parseName(script.name);

        return p.then(function (result) {
          return result;
        }).catch(function(err) {
          throw ESMessages.download.compileerror;
        }).then(function (result) {
          if (result.length === 0) {
            throw ESMessages.download.emptyerror;
          }
          return renderer.renderMp3(result);
        }).catch(function(err) {
          esconsole(err, ['error', 'exporter']);
          throw err;
        }).then(function(blob) {
          try {
              esconsole('Ready to download MP3 file.', ['DEBUG', 'IDE']);

              // save the file locally without sending to the server.
              var data = {};
              data.path = (window.URL || window.webkitURL).createObjectURL(blob);
              data.name = name + '.mp3';

              return data;
          } catch (e) {
              esconsole(e, ['error', 'exporter']);
              throw ESMessages.download.rendererror;
          }
        });
    };

    var multiTrack = function (script, quality) {
        var p;
        if (ESUtils.parseLanguage(script.name) === 'python') {
            p = compiler.compilePython(script.source_code, quality);
        } else {
            p = compiler.compileJavascript(script.source_code, quality);
        }

        var name = script.name.slice(0, -3);

        return new Promise(function(resolve, reject) {
          p.then(function (result) {
          if (result.length === 0) {
            throw ESMessages.download.emptyerror;
          }

          var zip = new JSZip();

          // mute all
          result.tracks.forEach(function (track) {
              for (var i = 0; i < track.clips.length; i++) {
                  if (typeof(track.clips[i].gain) !== 'undefined') {
                      track.clips[i].gain.gain.setValueAtTime(0.0, 0);
                  }
              }
          });

          var countRendered = 0; // there should be a better way to synchronize promises

          function excludeTracks(resLocal, targetNum) {
              var numTracks = resLocal.tracks.length;
              resLocal.tracks = resLocal.tracks.filter(function (v, i) {
                  return i === 0 || i === targetNum || i === numTracks-1;
              });
          }

          // closure for keeping the track number as local
          function renderAndZip(zip, trackNum, resolver) {
              // clone the result object
              var resLocal = angular.extend({}, result);

              // leave the target track and delete the rest
              excludeTracks(resLocal, trackNum);

              renderer.renderWav(resLocal, quality).then(function (blob) {
                  zip.file(name + '/' + 'track_' + trackNum.toString() + '.wav', blob);
                  countRendered++;

                  if (countRendered === result.tracks.length-2) {
                      if (ESUtils.whichBrowser().match('Safari') !== null) {
                          zip.generateAsync({type:"base64"}).then(function (base64) {
                              resolver(base64);
                          });
                      } else {
                          zip.generateAsync({type: 'blob'}).then(function (blob) {
                              var data = {};
                              data.path = (window.URL || window.webkitURL).createObjectURL(blob);
                              data.name = name + '.zip';
                              resolver(data);
                          });
                      }
                  }
              }).catch(function (err) {
                  esconsole(err, ['error', 'ide']);
                  throw ESMessages.download.rendererror;
              });
          }

          for (var i = 1; i < result.tracks.length-1; i++) {
              renderAndZip(zip, i, resolve);
          }

        }).catch(function (err) {
            esconsole(err, ['error', 'exporter']);
            reject(err);
        });

      });

    };

    /**
     * Export the script to SoundCloud using the SoundCloud SDK.
     *
     * @name soundcloud
     * @function
     */
    var soundcloud = function (script, quality, scData) {
        esconsole('Requesting SoundCloud Access...', ['DEBUG', 'IDE']);
        return SC.connect().then(function () {
            var p;
            var lang = ESUtils.parseLanguage(script.name);
            if (lang == 'python') {
              p = compiler.compilePython(script.source_code, quality);
            } else {
              p = compiler.compileJavascript(script.source_code, quality);
            }
            return p.then(function (result) {
                renderer.renderWav(result).then(function (blob) {
                    esconsole('Uploading to SoundCloud.', 'exporter');

                    var upload = SC.upload({
                        file: blob,
                        title: scData.options.name,
                        description: scData.options.description,
                        sharing: scData.options.sharing,
                        downloadable: scData.options.downloadable,
                        tag_list: scData.options.tags,
                        license: scData.options.license
                    });

                    upload.then(function(track){
                        esconsole('SoundCloud upload finished.', 'exporter');
                        scData.url = track.permalink_url;
                        scData.button = 'VIEW ON SOUNDCLOUD';
                        scData.uploaded = true;
                        scData.message.spinner = false;

                        if (scData.message.animation) {
                            clearInterval(scData.message.animation);
                            scData.message.animation = null;
                        }

                        scData.message.text = 'Finished uploading!';
                        $rootScope.$apply();
                    });
                });
            }).catch(function (err) {
                esconsole(err, ['DEBUG', 'IDE']);
                throw err;
            });
        });
    };

    /**
     * Print the source code.
     *
     * @name print
     * @function
     */
    var print = function (script) {
        var content = script.source_code;
        var lines = content.split(/\n/);
        var numlines = lines.length;
        esconsole(numlines, 'debug');
        var lineNum = 0;
        var pri = document.getElementById("ifmcontentstoprint").contentWindow;
        pri.document.open();
        pri.document.writeln('<pre style="-moz-tab-size:2; -o-tab-size:2; tab-size:2;">');
        while (lineNum < numlines) {
            content = lines[lineNum];
            esconsole(content, 'debug');
            var lineNumStr = (lineNum+1).toString();
            if (lineNumStr.length === 1) {
                lineNumStr = '  ' + lineNumStr;
            } else if (lineNumStr.length === 2) {
                lineNumStr = ' ' + lineNumStr;
            }
            pri.document.writeln(lineNumStr + "| " + content);
            lineNum++;
        }
        pri.document.writeln('</pre>');
        pri.document.close();
        pri.focus();
        pri.print();
    };

    return {
        text: text,
        wav: wav,
        mp3: mp3,
        multiTrack: multiTrack,
        soundcloud: soundcloud,
        print: print
    };
}]);
