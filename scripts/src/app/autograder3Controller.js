import * as compiler from './compiler'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as userConsole from '../ide/console'
import * as userProject from './userProject'

app.controller("autograder3Controller",
['$scope', 'caiAnalysisModule',
function($scope, caiAnalysisModule) {

    $scope.prompts = [0];
    $scope.allowPrompts = false;
    $scope.seed = Date.now();
    $scope.useSeed = true;

    // overwrite prompt with a hijackable one
    var nativePrompt = window.esPrompt;

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

    $scope.csvInputMode = false;

    $scope.options = {
      "OVERVIEW": true,
      "COMPLEXITY": true,
      "EFFECTS": false,
      "MEASUREVIEW": false,
      "GENRE": false,
      "SOUNDPROFILE": false,
      "MIXING": false,
      "HISTORY": false,
      "APICALLS": false,
    };

    $scope.results = [];
    $scope.processing = null;

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
     * Read all script urls, parse their shareid, and then load and run
     * every script adding the results to the results list.
     */
    $scope.run = function() {
      $scope.results = [];
      $scope.processing = null;

      esconsole("Running autograder.", ['DEBUG']);

      if($scope.csvInputMode) {
        $scope.urls = document.querySelector('.output').innerText;
        $scope.urls = $scope.urls.replace(/,/, "\n");
      }

      var re = /\?sharing=([^\s.,;])+/g
      var matches = $scope.urls.match(re);

      // start with a promise that resolves immediately
      var p = new Promise(function(resolve) { resolve(); });

      angular.forEach(matches, function(match) {
        esconsole("Grading: " + match, ['DEBUG']);
        var shareId = match.substring(9);
        esconsole("ShareId: " + shareId, ['DEBUG']);
        p = p.then(function() {
          $scope.processing = shareId;
          var ret = userProject.loadScript(shareId).then($scope.runScriptHistory);
          $scope.processing = null;
          if (ret != 0)
            return ret;
        });
      });
    };

    $scope.runScriptHistory = function(script) {
        console.log("run script history", script.name);

        return userProject.getScriptHistory(script.shareid).then(function(scriptHistory) {
          var scriptVersions = Object.keys(scriptHistory);
          if (!$scope.options["HISTORY"])
              scriptVersions = [scriptVersions[scriptVersions.length-1]];

          var p = new Promise(function(resolve) { resolve(); });


          angular.forEach(scriptVersions, function(version) {

            p = p.then(function() {

              scriptHistory[version].name = script.name;

              return $scope.runScript(scriptHistory[version], version).then(function(result) {
                return result;
              });

          });

        });

      });
    }

    /**
     * Run a single script and add the result to the results list.
     */
    $scope.runScript = function(script, version = 0) {

          var sourceCode = script.source_code;

          if (sourceCode.indexOf('readInput') !== -1 || sourceCode.indexOf('input') !== -1 ) {
            var sourceCodeLines = sourceCode.split('\n');
            for (var i = 0; i < sourceCodeLines.length; i++) {
              if (sourceCodeLines[i].indexOf('readInput') !== -1) {
                console.log("read input", sourceCodeLines[i]);
              }
            }
            window.esPrompt = $scope.hijackedPrompt();
          }

          return $scope.compile(sourceCode, script.name).then(function(compiler_output) {
            esconsole(compiler_output, ['DEBUG']);
            var language = 'python';
            if (ESUtils.parseExt(script.name) == '.js') 
              language = 'javascript';
            var complexity = caiAnalysisModule.analyzeCode(language, sourceCode);
            var reports = caiAnalysisModule.analyzeMusic(compiler_output);
            reports["COMPLEXITY"] = complexity;
            Object.keys($scope.options).forEach(function(option) {
              if (reports[option] && !$scope.options[option])
                delete reports[option];
            });
            console.log(script.name, reports);
            $scope.results.push({
              script: script,
              version: version,
              reports: Object.assign({}, reports),
            });
            }).catch(function(err) {
              esconsole(err, ['ERROR']);
              $scope.results.push({
                script: script,
                version: version,
                error: err,
              });
          });
    };

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

    $scope.generateCSV = function() {
      var headers = ['#', 'username', 'script_name', 'version', 'shareid', 'error'];
      var rows = [];
      var col_map = {};

      for (var i = 0; i < $scope.results.length; i++) {
        var result = $scope.results[i];
        if (result.reports) {
          for (var j = 0; j < Object.keys(result.reports).length; j++) {
            var name = Object.keys(result.reports)[j];
            var report = result.reports[name];
            if (col_map[name] === undefined) {
              col_map[name] = {};
            }

            for (var k = 0; k < Object.keys(report).length; k++) {
              var key = Object.keys(report)[k];
              var colname = name + '_' + key;
              if (headers.indexOf(colname) === -1) {
                headers.push(colname);
                col_map[name][key] = headers.length - 1;
              }
            }
          }
        }
      }

      var idx = 1;

      angular.forEach($scope.results, function(result) {
        row = [];
        for (var i = 0; i < headers.length; i++) {
          row[i] = '';
        }
        if (result.script) {
          row[0] = idx;
          row[1] = result.script.username;
          row[2] = result.script.name;
          row[3] = result.version;
          row[4] = result.script.shareid;
        }
        if (result.error) {
          console.log(result.error)
          if (result.error.nativeError) {
            row[5] = result.error.nativeError.v + ' on line ' + result.error.traceback[0].lineno;
          } else {
            row[5] = result.error;
          }
        } else if (result.reports) {
          angular.forEach(result.reports, function(report, name) {
            angular.forEach(Object.keys(report), function(key) {
              row[col_map[name][key]] = report[key];
            });
          });
        }

        rows.push(row.join(','));

        idx += 1;
      });

      return headers.join(',') + '\n' + rows.join('\n') + '\n';
    };

    $scope.downloadCSV = function() {
      var file = $scope.generateCSV();
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";

      var aFileParts = [file];
      var blob = new Blob(aFileParts, {type: 'text/plain'});
      var url = window.URL.createObjectURL(blob);
      // download the script
      a.href = url;
      a.download = 'autograder_report.csv';
      a.target = '_blank';
      esconsole('File location: ' + a.href, ['debug','exporter']);
      a.click();
    };

    $scope.changeInputMode = function() {
      $scope.csvInputMode = !$scope.csvInputMode;
    };

    $scope.setOption = function(option) {
      $scope.options[option] = !$scope.options[option];
    };


}]);

