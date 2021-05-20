/**
 * Autograder API: Python
 *
 * This is a Skulpt library that wraps all autograder common functions
 * so they can be interpreted in Python by Skulpt.
 *
 * @module PythonAutograderAPI
 * @author Creston Bunch
 */

import * as ESUtils from '../esutils'
import * as userConsole from '../app/userconsole'

var $builtinmodule = function (name) {

    var mod = {};
    var compiler = ServiceWrapper().compiler;
    var analyzer = ServiceWrapper().reader;
    var autograder = ServiceWrapper().autograder;
    var nativePrompt = userConsole.prompt;
    var prompts = [];
    var prints = [];
    var i = 0;
    var defaultOutf = Sk.outf;

    var hijackedPrompt = function() {
      return new Promise(function(resolve, reject) {
        if (prompts.length == 0) {
          reject('Prompt required, but none given.');
        }
        if (i > prompts.length - 1) {
          reject('Unexpected prompt.');
        }
        resolve(prompts[i++]);
      });
    };

    Sk.output = function(text) {
      prints.push(text);
    }

    mod.__ES_REPORTS = new Sk.builtin.dict();

    /**
     * Return the script object parsed from the global __SCRIPT variable.
     */
    mod.get_script = new Sk.builtin.func(function() {
      return Sk.ffi.remapToPy(Sk.builtins['__SCRIPT'].source_code);
    });

    /**
     * Return the language parsed from the global __SCRIPT variable.
     */
    mod.get_language = new Sk.builtin.func(function() {
      return Sk.ffi.remapToPy(ESUtils.parseLanguage(Sk.builtins['__SCRIPT'].name));
    });

    mod.report = new Sk.builtin.func(function(name, obj) {
      reports = Sk.ffi.remapToJs(mod.__ES_REPORTS);
      reports[Sk.ffi.remapToJs(name)] = Sk.ffi.remapToJs(obj);
      mod.__ES_REPORTS = Sk.ffi.remapToPy(reports);
    });

    mod.compile = new Sk.builtin.func(function(source, language) {
      userConsole.prompt = hijackedPrompt;
      prints = [];
      source = Sk.ffi.remapToJs(source);
      if (language == 'python') {
        var promise = compiler.importPython(source, 0);
      } else {
        var promise = compiler.compileJavascript(source, 0);
      }
      var susp = new Sk.misceval.Suspension();
      susp.resume = function() {
        userConsole.prompt = nativePrompt;
        if (susp.data.error != undefined) {
          return Sk.ffi.remapToPy([{error: susp.data.error}, prints]);
        } else {
          return Sk.ffi.remapToPy([cleanResult(susp.data.result), prints]);
        }
      };
      susp.data = {
          type: "Sk.promise",
          promise: promise
      };

      return susp;
    });

    /**
     * Remove audio clips from the result to convert it to a python object.
     */
    function cleanResult(result) {
      for (var i = 0; i < result.tracks.length; i++) {
        result.tracks[i].analyser = null;
        for (var j = 0; j < result.tracks[i].clips.length; j++) {
          result.tracks[i].clips[j].audio = null;
        }
      }

      result.error = null;
      return result;
    }

    /**
     * Hijack the prompt() function and provide a list of inputs. It will cycle
     * through the list every time prompt() asks for an input.
     */
    mod.set_input = new Sk.builtin.func(function(inputs) {
      i = 0;
      prompts = Sk.ffi.remapToJs(inputs);
    });

    /**
     * Show the grader a dialog with the code's source code and ask for values
     * for the given inputs. Returns a list of the input values.
     */
    mod.prompt = new Sk.builtin.func(function(inputs, script, language) {
      inputs = Sk.ffi.remapToJs(inputs);
      script = Sk.ffi.remapToJs(script);
      language = Sk.ffi.remapToJs(language);

      var promise = autograder.prompt(inputs, script, language);
      var susp = new Sk.misceval.Suspension();
      susp.resume = function() {
          if (susp.data.error) {
            throw susp.data.error;
          }
          return Sk.ffi.remapToPy(susp.data.result);
      }
      susp.data = {
          type: "Sk.promise",
          promise: promise
      };
      return susp;
    });

    /**
     * Request input from the native window prompt.
     */
    mod.input = new Sk.builtin.func(function (msg) {
        var promise = nativePrompt(Sk.ffi.remapToJs(msg));
        var susp = new Sk.misceval.Suspension();
        susp.resume = function() {
            return Sk.ffi.remapToPy(susp.data.result);
        }
        susp.data = {
            type: "Sk.promise",
            promise: promise
        };
        return susp;
    });

    /**
     * Measure the complexity of source code using the given method. Currently
     * only supports the 'earsketch' method.
     */
    mod.complexity = new Sk.builtin.func(function(source, language, method) {
      switch(method.v) {
        case "earsketch":
          if (language.v == 'python') {
            results = analyzer.analyzePython(source.v);
            results.total = analyzer.total(results);
            return Sk.ffi.remapToPy(results);
          } else {
            results = analyzer.analyzeJavascript(source.v);
            results.total = analyzer.total(results);
            return Sk.ffi.remapToPy(results);
          }
          break;
        default:
          throw "Unknown complexity method: " + method;
      }

    });

    /**
     * Function to get the global result variable from inside the module
     * when a user imports it as 'from earsketch import *'
     *
     * @private
     */
    mod._getResult = new Sk.builtin.func(function() {
        userConsole.prompt = nativePrompt;
        return mod.__ES_RESULT;
    });

    /**
     * Function to get reports created by the autograder.
     *
     * @private
     */
    mod._getReports = new Sk.builtin.func(function() {
        userConsole.prompt = nativePrompt;
        return mod.__ES_REPORTS;
    });

    return mod;
};
