/**
 * An angular factory service for providing an ace completer for the EarSketch
 * API and audio constants.
 *
 * @module completer
 * @author Creston Bunch
 */
import * as audioLibrary from '../audiolibrary'
import ESApiDoc from '../../data/api_doc'
import esconsole from '../../esconsole'

app.factory('completer', ['$q', function completerFactory($q) {

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
          audioLibrary.getAudioFolders()
      ]).then(function(result) {
          // wait for all promises to complete and concatenate their results
          var resultMerge = new Set(result[0].concat(audioLibrary.EFFECT_TAGS, audioLibrary.ANALYSIS_TAGS, result[1]));
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
