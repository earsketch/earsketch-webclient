/**
 * An angular factory service for providing an ace completer for the EarSketch
 * API and audio constants.
 *
 * @module completer
 * @author Creston Bunch
 */
import { require } from "ace-builds"

import * as audioLibrary from './audiolibrary'
import ESApiDoc, { APIItem } from '../data/api_doc'
import esconsole from '../esconsole'

var langTools = require("ace/ext/language_tools");

// Get the list of autocompletions
var completions: string[] = []
Object.values(ESApiDoc).forEach(function(func) {
  if(Array.isArray(func)) {
    func.forEach(function(func) {
      if(func.autocomplete) {
        completions.push(func.autocomplete);
      }
    });
  } else {
    if((func as APIItem).autocomplete) {
      completions.push((func as APIItem).autocomplete!);
    }
  }
})

var earsketchCompleter = {

  getCompletions: function(editor: any, session: any, pos: any, prefix: string, callback: Function) {
    if (prefix.length < 2) { callback(null, []); return; }

    var output: any[] = [];

    // Add api functions to the output
    output = output.concat(completions.filter(function(f) {
      return f.indexOf(prefix) > -1;
    }).map(function(f, i) {
      return {name: f, value: f, score: -i, meta: "EarSketch function"};
    }));

    return Promise.all([
        audioLibrary.getAudioTags(),
        audioLibrary.getAudioFolders()
    ]).then(function(result: any) {
        // wait for all promises to complete and concatenate their results
        var resultMerge = new Set(result[0].concat(audioLibrary.EFFECT_TAGS, audioLibrary.ANALYSIS_TAGS, result[1]));
        var resultFilter = Array.from(resultMerge).sort().reverse();
        return resultFilter;
    }, function(err: Error) {
        esconsole(err, ['ERROR','AUDIOLIBRARY']);
        throw err;
    }).catch(function(err: Error) {
        esconsole(err, ['ERROR','AUDIOLIBRARY']);
        throw err;
    }).then(function(result: any) {
      result = result.filter(function(tag: any) {
        if (tag !== undefined) {
          return tag.indexOf(prefix) > -1;
        }
      }).map(function(tag: string, i: number) {
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
