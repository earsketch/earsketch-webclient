/**
 * @module autograderController
 */

app.controller("autograderController",
['$scope','compiler', 'userConsole','ESUtils',
function($scope, compiler, userConsole, ESUtils) {

    $scope.uploads = [];
    $scope.referenceFile = null;
    $scope.referenceScript = '';
    $scope.referenceLanguage = '';
    $scope.compilingReference = false;
    $scope.compileError = '';
    $scope.testTracks = [];
    $scope.testAllTracks = true;
    $scope.prompts = [];
    $scope.allowPrompts = false;
    $scope.seed = Date.now();
    $scope.useSeed = true;

    // overwrite userConsole javascript prompt with a hijackable one
    var nativePrompt = userConsole.prompt;
    $scope.listenerPrompt = function(text) {
      return nativePrompt(text).then(function(response) {
        $scope.prompts.push(response);
        return response;
      });
    };
    $scope.hijackedPrompt = function() {
      var i = 0;
      if ($scope.allowPrompts) {
        return function(text) {
          return nativePrompt(text);
        };
      } else {
        return function(text) {
            return new Promise(function(r) {
                r($scope.prompts[i++ % $scope.prompts.length]);
            });
        }
      }
    };
    // overwrite JavaScript random implementations with seedable one
    $scope.$watch('seed', function() {
      Math.random = function() {
        if ($scope.useSeed) {
          var rng = new Chance($scope.seed);
        } else {
          var rng = new Chance(Date.now());
        }
        return rng.random();
      };
    });

    // Loading ogg by default for browsers other than Safari
    // setting default to wav for chrome 58 (May 22, 2017)
    if (ESUtils.whichBrowser().match('Opera|Firefox|Msie|Trident') !== null) {
        $scope.quality = true;//false wav, true ogg
    } else {
        $scope.quality = false;//false wav, true ogg
    }

    /**
     * Compile a script as python or javascript based on the extension and
     * return the compilation promise.
     */
    $scope.compile = function(script, filename) {
        var ext = ESUtils.parseExt(filename);
        if (ext == '.py') {
            return compiler.compilePython(script, $scope.quality);
        } else if (ext == '.js') {
            return compiler.compileJavascript(script, $scope.quality);
        } else {
          return new Promise(function(accept, reject) {
            reject("Invalid file extension " + ext);
          });
        }
    };
    /**
     * Read a File object and return a promise that will resolve to the
     * file text contents.
     */
    $scope.readFile = function(file) {
        var p = new Promise(function(resolve, reject) {
            var r = new FileReader();
            r.onload = function(evt) {
                var result = evt.target.result;
                resolve(result);
            };
            r.onerror = function(err) {
                reject(err);
            };
            r.readAsText(file);
        });

        return p;
    };

    /**
     * Listen for changes to the reference file.
     */
    $scope.$watch(function() {return $scope.referenceFile; }, function (file) {
        $scope.uploads = [];
        $scope.prompts = [];
        $scope.compileError = '';
        $scope.referenceScript = '';
        $scope.referenceResult = null;
        $scope.referenceResultCopy = null;
        // restore prompt function to record inputs
        userConsole.prompt = $scope.listenerPrompt;
        if (file !== null) {
            $scope.referenceLanguage = ESUtils.parseLanguage(file.name);
            $scope.readFile(file)
            .then(function(script) {
                $scope.referenceScript = script;
                $scope.compilingReference = true;
                return $scope.compile(script, file.name);
            }).catch(function (err) {
                console.error(err);
                $scope.compilingReference = false;
                $scope.compileError = err.toString();
                $scope.$apply();
            }).then(function(result) {
                $scope.compilingReference = false;
                $scope.referenceResult = result;
                $scope.referenceResultCopy = angular.copy(result);
                $scope.$apply();
            }).catch(function(err) {
                console.error(err);
                $scope.compilingReference = false;
                $scope.compileError = err;
                $scope.$apply();
            });
        }
    });

    /**
     * Listen for file changes to the test files.
     */
    $scope.compareCount = 0;
    $scope.activeFile = "file";
    $scope.$watch(function() {return $scope.files; }, function (files) {
        // clear current uploads
        $scope.uploads = [];
        // use the hijacked prompt function to input user input
        userConsole.prompt = $scope.hijackedPrompt();

        // start with a promise that resolves immediately
        var p = new Promise(function(resolve) { resolve(); });
        
        angular.forEach(files, function(file, i) {
          // Begin compiling this script after the last one finishes. Daisy
          // chain calls to the queueFile() function so that scripts only start
          // compiling after the last one finished, thus avoiding erratic
          // behavior from scope variables crossing promise boundaries and
          // stuff.
          p = p.then(function() {
            var compareCount = i;
            var activeFile = file;
            $scope.compareCount = compareCount;
            $scope.activeFile = activeFile;
            // first we need to read the file object
            //AVN LOG
            //console.log("RESULT_P1", $scope.compareCount, compareCount);
            return $scope.readFile(file);
          }).then(function(script) {
            // if the script was read successfully, test it against the
            // reference script copy
            var retVal = $scope.compileAndCompare($scope.referenceResultCopy, file, script);
            //AVN LOG
            //console.log("RESULT_P3d", $scope.compareCount, retVal);
            return retVal;
          }).catch(function(err) {
            var results = {
                'file': file,
                'script': '',
                'language': ESUtils.parseLanguage(file.name),
                'compiled': false,
                'result': {},
                'error': 'Read error, corrupted file?',
                'pass': false
            };
            $scope.uploads.push(results);
            $scope.$apply();
            //AVN LOG
            //console.log("RESULT_P3e", $scope.compareCount, i, results, err);
            return results;
          }).then(function(testResults) {
            // add the test results to the list of uploads
            //AVN LOG
            //console.log("RESULT_P4", $scope.compareCount, i, testResults);
            $scope.uploads.push(testResults);
            $scope.compareCount++;
            $scope.$apply();
          });
        });
    });

    /**
     * Compile a test script and compare it to the reference script.
     * Returns a promise that resolves to an object describing the test results.
     */
    $scope.compileAndCompare_orig = function(referenceResult, file, testScript) {
      return new Promise(function(resolve, reject) {
        var results = {
          'file': file,
          'script': testScript,
          'language': ESUtils.parseLanguage(file.name),
          'compiled': false,
          'result': {},
          'error': '',
          'pass': false
        };
        try {
          var c = $scope.compile(testScript, file.name);
          c.then(function(result) {
            results.result = result;
            results.compiled = true;

            // check against reference script
            var a = $scope.compare(
              referenceResult, result
            );
            if (a) {
              results.pass = true;
            }
            //AVN LOG
            //console.log("RESULT_P3a", $scope.compareCount);
          }).catch(function(err) {
            results.error = err.toString();
            results.compiled = true;
            //AVN LOG
            //console.log("RESULT_P3b1", $scope.compareCount);
          });
        } catch (err) {
          results.error = err.toString();
          results.compiled = true;
          //AVN LOG
          //console.log("RESULT_P3b2", $scope.compareCount);
        }
        //AVN LOG
        //console.log("RESULT_P3c", $scope.compareCount);
        resolve(results);
      });
    };

    $scope.compileAndCompare = function(referenceResult, file, testScript) {
        var results = {
          'file': file,
          'script': testScript,
          'language': ESUtils.parseLanguage(file.name),
          'compiled': false,
          'result': {},
          'error': '',
          'pass': false
        };
        var c = $scope.compile(testScript, file.name);
        return c.then(function(result) {
          results.result = result;
          results.compiled = true;

          // check against reference script
          var a = $scope.compare(
            referenceResult, result
          );
          if (a) {
            results.pass = true;
          }
          //AVN LOG
          //console.log("RESULT_P3a", $scope.compareCount);
          return results;
        }).catch(function(err) {
          results.error = err.toString();
          results.compiled = true;
          //AVN LOG
          //console.log("RESULT_P3b1", $scope.compareCount);
          return results;
        });
    };

    /**
     * Function to compare the similarity of two script results.
     */
    $scope.compare = function(reference, test) {
        // create copies for destructive comparison
        reference = angular.copy(reference);
        test = angular.copy(test);

        // sort clips so clips inserted in different orders will not effect
        // equality.
        sortClips(reference);
        sortClips(test);
        // do the same with effects
        sortEffects(reference);
        sortEffects(test);
        // remove tracks we're not testing
        if (!$scope.testAllTracks) {
          reference.tracks = $.grep(reference.tracks, function(n, i) {
              return $scope.testTracks[i];
          });
          test.tracks = $.grep(test.tracks, function(n, i) {
              return $scope.testTracks[i];
          });
        }

        var retVal = JSON.stringify(reference) == JSON.stringify(test);
        var diffString = "";
        if(!retVal){
          diffString = "\n\n" + JSON.stringify(reference) + "\n\n" + JSON.stringify(test);
        }
        //AVN LOG
        //console.log("RESULT_DIFF", $scope.compareCount, $scope.activeFile, diffString);

        return retVal;
    };

    /**
     * Sort the clips in an object by measure.
     */
    function sortClips(result) {
        for (var i in result.tracks) {
            var track = result.tracks[i];
            track.clips.sort(function(a, b) {
                return a.measure - b.measure;
            });
        }
    }

    /**
     * Sort effects by start measure
     *
     * TODO: is this robust? for some reason I doubt it...
     */
    function sortEffects(result) {
        for (var i in result.tracks) {
            var track = result.tracks[i];
            for (var key in track.effects) {
                var effect = track.effects[key];
                effect.sort(function(a, b) {
                    return a.startMeasure - b.startMeasure;
                });
            }
        }
    }


    /**
     * Function to pipe Skulpt's stdout to the EarSketch console.
     *
     * @private
     */
    function outf(text) {
        // For some reason, skulpt prints a newline character after every
        // call to print(), so let's ignore those
        // TODO: users can't print newline characters...ugh
        if (text == '\n') {
            return;
        }
        esconsole('outf text is ' + text, ['INFO', 'IDE']);
        userConsole.log(text);
    }

    /**
     *
     * @private
     */
    function builtinRead(x) {
        if (Sk.builtinFiles === undefined ||
            Sk.builtinFiles["files"][x] === undefined) {

            throw "File not found: '" + x + "'";
        }

        return Sk.builtinFiles["files"][x];
    }

    Sk.pre = "output";
    Sk.configure({output:outf,read: builtinRead});

    Sk.onAfterImport = function(library) {
      switch(library) {
        case 'random':
          // Use the given seed for Skulpt
          var seedfunc = Sk.sysmodules['string random'].items[0].rhs.$d.seed;
          if ($scope.useSeed) {
            // Seed Skulpt's RNG implementation
            Sk.misceval.callsim(seedfunc, $scope.seed);
          }
          break;
      }
    }

}]);

/**
 * Angular directive for reading files from a file input.
 *
 * Copied from: http://stackoverflow.com/questions/17063000/ng-model-for-input-type-file
 */
app.directive("fileread", [function () {
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        scope.fileread = loadEvent.target.result;
                    });
                }
                reader.readAsArrayBuffer(changeEvent.target.files[0]);
            });
        }
    }
}]);

app.directive("codeEmbed", [function() {
  return {
    scope: {
      language: "="
    },
    require: '?ngModel',
    transclude: true,
    link: function (scope, element, attributes, ngModel) {
      var editor = ace.edit(element[0]);
      editor.setOptions({
          mode: 'ace/mode/' + scope.language,
          theme: 'ace/theme/github',
          showPrintMargin: false,
          wrap: true,
          readOnly: true
      });
      ngModel.$render = function() {
        editor.setValue(ngModel.$viewValue, -1);
      }
    }
  }
}]);

// DELETE THESE DEBUGGING THINGS:

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
