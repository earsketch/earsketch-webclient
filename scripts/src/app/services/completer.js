/**
 * An angular factory service for providing an ace completer for the EarSketch
 * API and audio constants.
 *
 * @module completer
 * @author Creston Bunch
 */
import esconsole from '../../esconsole'

app.factory('completer', ['audioLibrary', '$q', function completerFactory(audioLibrary, $q) {

  var langTools = ace.require("ace/ext/language_tools");

  // Get the list of autocompletions
  var completions = []
  angular.forEach(ESApiDoc, function(func) {
    if(Array.isArray(func)) {
      angular.forEach(func, function(func) {
        if(func.autocomplete) {
          completions.push(func.autocomplete);
        }
      });
    } else {
      if(func.autocomplete) {
        completions.push(func.autocomplete);
      }
    }
  })

  var earsketchCompleter = {

    getCompletions: function(editor, session, pos, prefix, callback) {
      if (prefix.length < 2) { callback(null, []); return; }

      var output = [];

      // Add api functions to the output
      output = output.concat(completions.filter(function(f) {
        return f.indexOf(prefix) > -1;
      }).map(function(f, i) {
        return {name: f, value: f, score: -i, meta: "EarSketch function"};
      }));

      return $q.all([
          audioLibrary.getAudioTags(),
          audioLibrary.getEffectTags(),
          audioLibrary.getAnalysisTags(),
          audioLibrary.getAudioFolders()
      ]).then(function(result) {
          // wait for all promises to complete and concatenate their results
          var resultMerge = new Set(result[0].concat(result[1], result[2], result[3], result[4]));
          var resultFilter = Array.from(resultMerge).sort().reverse();
          return resultFilter;
      }, function(err) {
          esconsole(err, ['ERROR','AUDIOLIBRARY']);
          throw err;
      }).catch(function(err) {
          esconsole(err, ['ERROR','AUDIOLIBRARY']);
          throw err;
      }).then(function(result) {
        result = result.filter(function(tag) {
          if (tag !== undefined) {
            return tag.indexOf(prefix) > -1;
          }
        }).map(function(tag, i) {
          return {name: tag, value: tag, score: i, meta: "EarSketch constant"};
        });

        output = output.concat(result);

        callback(null, output);
      });

    }
  };

  // reset completers ()emoves the keyword completer that includes Python
  // keywords we don't want to show students)
  langTools.setCompleters(null);
  langTools.addCompleter(langTools.snippetCompleter);
  langTools.addCompleter(earsketchCompleter);

  return {};

}]);
