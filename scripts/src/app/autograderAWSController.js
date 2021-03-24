/**
 * @module autograderController
 */

app.controller("autograderAWSController",
['$scope','compiler', 'Upload','userConsole','esconsole','reader', 'caiAnalysisModule','ESUtils', 'userProject', '$http',
function($scope, compiler, Upload, userConsole, esconsole, reader, caiAnalysisModule, ESUtils, userProject, $http) {

    // Loading ogg by default for browsers other than Safari
    // setting default to wav for chrome 58 (May 22, 2017)
    if (ESUtils.whichBrowser().match('Opera|Firefox|Msie|Trident') !== null) {
        $scope.quality = true;//false wav, true ogg
    } else {
        $scope.quality = false;//false wav, true ogg
    }

    $scope.artistName = '';
    $scope.complexityThreshold = 0;
    $scope.uniqueStems = 0;
    $scope.lengthRequirement = 0;

    $scope.contestDict = {};

    $scope.results = [];

    $scope.music_passed = [];
    $scope.code_passed = [];
    $scope.music_code_passed = [];

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

      $scope.processing = null;

      $scope.results = [];
      $scope.contestDict = {};

      $scope.music_passed = [];
      $scope.code_passed = [];
      $scope.music_code_passed = [];

      esconsole("Running autograder.", ['DEBUG']);
      $scope.entries = document.querySelector('.output').innerText;
      $scope.entrants = document.querySelector('.hiddenOutput').innerText;
      // var shareUrls = $scope.urls.split('\n');
      // shareUrls.pop();
      var shareID = $scope.entries.split(',');
      var contestID = $scope.entrants.split(',');
      // console.log(shareUrls);

      for (i = 0; i < shareID.length; i++) {
        if (shareID[i][0] == ','){
          shareID[i] = shareID[i].substring(1);
        }
        $scope.contestDict[shareID[i]] = contestID[i];
      }

      // var re = /\?sharing=([^\s.,;])+/g
      // var matches = $scope.urls.match(re);

      // start with a promise that resolves immediately
      var p = new Promise(function(resolve) { resolve(); });

      //for (var i = 0; i < shareUrls.length; i++) {
      // angular.forEach(matches, function(match) {
      angular.forEach(shareID, function(id) {
        esconsole("ShareId: " + id, ['DEBUG']);
        p = p.then(function() {
          $scope.processing = id;
          var ret = userProject.loadScript(id).then($scope.compileScript);
          if (ret != 0)
            return ret;
        });
      });
    };

    $scope.compileScript = function(script) {
      console.log("compile script", script.name);

      if (script.name == undefined) {
        console.log("Script is incorrectly named.");
        return 0;
      }
      if (script.source_code.indexOf('readInput') !== -1 || script.source_code.indexOf('input') !== -1 ) {
        console.log("Script contains readInput, cannot autograde.");
        return 0;
      }

      var complexity = $scope.read(script.source_code, script.name);
      var complexityScore = reader.total(complexity);
      var complexityPass = complexityScore >= $scope.complexityThreshold;

      return $scope.compile(script.source_code, script.name).then(function(compiler_output) {
        esconsole(compiler_output, ['DEBUG']);

        var analysis = caiAnalysisModule.analyzeMusic(compiler_output);
        var reports = {};
        reports["OVERVIEW"] = analysis["OVERVIEW"];
        reports["COMPLEXITY"] = complexity;
        reports["COMPLEXITY"]["complexityScore"] = complexityScore;

        reports = Object.assign({}, reports, $scope.contestGrading(reports["OVERVIEW"]["length (seconds)"], analysis["MEASUREVIEW"]));

        $scope.results.push({
          script: script,
          reports: reports,
        });

        if (reports["GRADE"]["music"] > 0) {
          $scope.music_passed.push({
          script: script,
          reports: reports,
        });
        }
        reports["GRADE"]["code"] = (complexityPass > 0) ? 1 : 0;
        if (reports["COMPLEXITY"]["userFunc"] == 0) {
          reports["GRADE"]["code"] = 0;
        } 
        if (reports["GRADE"]["code"] > 0) {
          $scope.code_passed.push({
          script: script,
          reports: reports,
        });
        }
        if (reports["GRADE"]["music"] + reports["GRADE"]["code"] > 1) {
          reports["GRADE"]["music_code"] = 1;
          $scope.music_code_passed.push({
          script: script,
          reports: reports,
        });
        }
        $scope.processing = null;
      }).catch(function(err) {
        esconsole(err, ['ERROR']);
        $scope.processing = null;
    });

  };

    // /*
    //  * Grade contest entry for length and sound usage requirements.
    // */
    $scope.contestGrading = function(lengthInSeconds, measureView) {

        var report = {};
        report[$scope.artistName] = {"numStems": 0, "stems": []};

        var stems = [];

        for (var measure in measureView) {
          for (var item in measureView[measure]) {
            if (measureView[measure][item].type == "sound") {
              var sound = measureView[measure][item].name;
              if (!stems.includes(sound)) {
                stems.push(sound);
              }
              if (sound.includes($scope.artistName)) {
                if (report[$scope.artistName]["stems"].indexOf(sound) === -1) {
                  report[$scope.artistName]["stems"].push(sound);
                  report[$scope.artistName]["numStems"] += 1;
                }
              }
            }
          }
        }

        report["GRADE"] = {"music": 0, "code": 0, "music_code": 0};
        report["UNIQUE_STEMS"] = {"stems": stems};

        if(report[$scope.artistName]["numStems"] > 0){
          if (stems.length > Number($scope.uniqueStems)) {
            if(Number($scope.lengthRequirement) <= lengthInSeconds){
              report["GRADE"]["music"] = 1;
            }
          }
        }

        return report;
    };

    $scope.generateCSVAWS = function() {
      var headers = ['#', 'username', 'script_name', 'shareid', 'error'];
      var includeReports = ["GRADE", "OVERVIEW"];
      var rows = [];
      var col_map = {};

      for (var i = 0; i < $scope.results.length; i++) {
        var result = $scope.results[i];
        if (result.reports) {
          for (var j = 0; j < Object.keys(result.reports).length; j++) {
            var name = Object.keys(result.reports)[j];
            if (includeReports.includes(name)) {

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
      }
      angular.forEach($scope.results, function(result) {
        row = [];
        for (var i = 0; i < headers.length; i++) {
          row[i] = '';
        }
        if (result.script) {
          row[1] = result.script.username;
          row[2] = result.script.name;
          row[3] = result.script.shareid;
          // var frontString = "https://earsketch.gatech.edu/earsketch2/#?sharing=";
          var frontString = SITE_BASE_URI + "/earsketch2/?sharing=";
          row[0] = $scope.contestDict[frontString+row[3]];
        }
        if (result.error) {
          console.log(result.error)
          if (result.error.nativeError) {
            row[4] = result.error.nativeError.v + ' on line ' + result.error.traceback[0].lineno;
          } else {
            row[4] = result.error;
          }
        } else if (result.reports) {
          angular.forEach(result.reports, function(report, name) {
            if (includeReports.includes(name)) {
              angular.forEach(Object.keys(report), function(key) {
                row[col_map[name][key]] = report[key];
              });
            }
          });
        }

        rows.push(row.join(','));
      });

      return headers.join(',') + '\n' + rows.join('\n');
    };

    $scope.downloadAWS = function() {
      var file = $scope.generateCSVAWS();
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

