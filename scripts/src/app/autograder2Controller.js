import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as userConsole from './userconsole'

app.controller("autograder2Controller",
['$scope','compiler', 'reader', 'userProject',
function($scope, compiler, reader, userProject) {

    // Loading ogg by default for browsers other than Safari
    // setting default to wav for chrome 58 (May 22, 2017)
    if (ESUtils.whichBrowser().match('Opera|Firefox|Msie|Trident') !== null) {
        $scope.quality = true;//false wav, true ogg
    } else {
        $scope.quality = false;//false wav, true ogg
    }

    $scope.results = [];
    $scope.processing = null;

    /**
     * Calculate the complexity of a script as python or javascript based on the extension and
     * return the complexity scores.
     */
    $scope.read = function(script, filename) {
        var ext = ESUtils.parseExt(filename);
        if (ext == '.py') {
            return reader.analyzePython(script);
        } else if (ext == '.js') {
            return reader.analyzeJavascript(script);
        } else {
          return new Promise(function(accept, reject) {
            reject("Invalid file extension " + ext);
          });
        }
    };

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
      var shareUrls = $scope.urls.split('\n');
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
          return userProject.loadScript(shareId).then($scope.runScript);
        });
      });
    };

    /**
     * Run a single script and add the result to the results list.
     */
    $scope.runScript = function(script) {
      console.log("run script", script.name);
      return $scope.compile(script.source_code,script.name).then(function(tracks) {
          console.log(tracks)
          esconsole(tracks, ['DEBUG']);
          $scope.results.push({
            script: script,
            reports: {'Code Complexity': $scope.read(script.source_code, script.name)},
          });
          $scope.processing = null;
        }).catch(function(err) {
          esconsole(err, ['ERROR']);
          $scope.results.push({
            script: script,
            error: err,
          });
          $scope.processing = null;
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
        console.log(text);
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
          break;
      }
    };


    $scope.generateCSV = function() {
      var headers = ['username', 'script_name', 'shareid', 'error'];
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
      angular.forEach($scope.results, function(result) {
        row = [];
        for (var i = 0; i < headers.length; i++) {
          row[i] = '';
        }
        if (result.script) {
          row[0] = result.script.username;
          row[1] = result.script.name;
          row[2] = result.script.shareid;
        }
        if (result.error) {
          console.log(result.error)
          if (result.error.nativeError) {
            row[3] = result.error.nativeError.v + ' on line ' + result.error.traceback[0].lineno;
          } else {
            row[3] = result.error;
          }
        } else if (result.reports) {
          angular.forEach(result.reports, function(report, name) {
            angular.forEach(Object.keys(report), function(key) {
              row[col_map[name][key]] = report[key];
            });
          });
        }

        rows.push(row.join(','));
      });

      return headers.join(',') + '\n' + rows.join('\n');
    };

    $scope.download = function() {
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
      //window.URL.revokeObjectURL(url);
    };

}]);