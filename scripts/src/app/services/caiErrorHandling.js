import {AUDIOKEYS_RECOMMENDATIONS} from 'audiokeysRecommendations';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiErrorHandling', ['complexityCalculatorHelperFunctions', function (complexityCalculatorHelperFunctions) {

	var studentCode;

	var pythonAndAPI = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish", "fitMedia",
		"importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBealSlice", "print", "readInput",
		"replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile",
		"setEffect", "setTempo", "shuffleList", "shuffleString", "and", "as", "assert", "break", "del", "elif",
		"class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
		 "pass", "print", "raise", "return", "try", "while", "with", "yield"];

	var allNames = [];

	var allVars = [];
	var userFunctions = [];

	var AUDIOKEYS = Object.keys(AUDIOKEYS_RECOMMENDATIONS);

	function handleError(error, codeObj){
		console.log(error);
		var errorType = String(error).split(':')[0];
		studentCode = codeObj.split("\n");
		if (errorType in errorFunctions) {
		    return errorFunctions[errorType](error);
		}
		else return null;
	}

	var levenshteinThreshold = 5;

	var errorFunctions = {
		"TypeError": handleTypeError,
		"NameError": handleNameError,
		"IndentationError": handleIndentError,
		"IndexError": handleIndexError,
		"ParseError": handleParseError,
		"ImportError": handleImportError,
		"SyntaxError": handleSyntaxError,
		"ValueError": handleValueError
	};

	var importStatements = ["from earsketch import*", "from random import*"];

	function handleTypeError(error) {
		//return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the type error by commenting it out"];
	}


	function handleNameError(error) {
		var codeString = studentCode[error[0].traceback[0].lineno - 1];
		//var codeString = '1.2,3 4;5';
		var parts = codeString.split(/[., ;"'{}()*=\+\-\/%\[\]]/);

		var offendingName = "";

		var nameScores = [];

		for (var i in parts) {
			var part = parts[i];
			var lowestScore = -1;
			var replacement = "";
			for (var j in allNames) {
				var score = levenshtein(allNames[j], part)
				if (score > 0 && score <= levenshteinThreshold && (lowestScore == -1 || score < lowestScore)) {
					lowestScore = score;
					replacement = allNames[j];
                }
			}

			if (lowestScore != -1) {
				nameScores.push([lowestScore, part, replacement]);
            }
		}

		var sortedNames = nameScores.sort();

		offendingName = sortedNames[0][1];
		bestReplacement = sortedNames[0][2];

		if (offendingName == "") {
			return null;
		}
		else {
			var spliceIndex = codeString.indexOf(offendingName) + offendingName.length;
			var newLine = codeString.substring(0, codeString.indexOf(offendingName));
			newLine += bestReplacement;
			newLine += codeString.substring(spliceIndex);

			return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, codeString.length, newLine];
        }	
	}

	function handleIndentError(error) {

		var newLine = "";

		var currentLine = studentCode[error[0].traceback[0].lineno - 1];
		var prevLine = "";
		if (error[0].traceback[0].lineno - 2 >= 0) {
			prevLine = studentCode[error[0].traceback[0].lineno - 2];
        }

		var nextLine = "";
		if (error[0].traceback[0].lineno < studentCode.length) {
			nextLine = studentCode[error[0].traceback[0].lineno];
		}

		var currentTabs = numberOfLeadingSpaces(currentLine);
		var prevTabs = numberOfLeadingSpaces(prevLine);
		var nextTabs = numberOfLeadingSpaces(nextLine);

		var prevCurr = currentTabs - prevTabs;
		var currNext = currentTabs - nextTabs;

		var toUse = 0;

		if (Math.abs(currNext) <= Math.abs(prevCurr)) {
			toUse = currNext;
		}
		else if (Math.abs(currNext) > Math.abs(prevCurr)) {
			toUse = prevCurr;
		}

		if (toUse < 0) {
			var cutoff = Math.abs(toUse);
			newLine = currentLine.substring(cutoff);
		}
		else {
			for (var i = 0; i < toUse; i++) {
				newLine += " ";
			}

			newLine += currentLine;
        }


		return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, currentLine.length, newLine];
	}

	function handleIndexError(error) {
		return null;
		//return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the index error by commenting it out"];
	}

	function handleParseError(error) {
		var codeLine = studentCode[error[0].traceback[0].lineno - 1];
		var newLineValue = "";

		for (var i in importStatements) {
			if (levenshtein(codeLine, importStatements[i]) <= levenshteinThreshold) {
				newLineValue = importStatements[i];
				break;
			}
		}

		if (newLineValue != "") {
			return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, studentCode[error[0].traceback[0].lineno - 1].length, newLineValue];
		}
		else return null;
	}

	function handleImportError(error) {
		var codeLine = studentCode[error[0].traceback[0].lineno - 1];
		var newLineValue = "";

		for (var i in importStatements) {
			if (levenshtein(codeLine, importStatements[i]) <= levenshteinThreshold) {
				newLineValue = importStatements[i];
				break;
            }
        }

		if (newLineValue != "") {
			return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, studentCode[error[0].traceback[0].lineno - 1].length - 1, newLineValue];
		}
		else return null;
	}

	function handleSyntaxError(error) {
		return null;

		//return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the syntax error by commenting it out"];
	}

	function handleValueError(error) {

		//is it makeBeat??? that's the first thing to check

		//OTHERWISE, replace the offending issue with the proper value from a series of proper values
		//this is NOT a typeerror, which is probably easier to check. for now, let's focus on makeBeat only
		//hm. we may need to access the complexityCalculator. or the helper functions, actually. oh boy

		var codeLine = studentCode[error[0].traceback[0].lineno - 1];

		if (codeLine.includes('makeBeat')) {
			//if we have makebeat, we need to look at the first argument and determine hwo long it is, THEN check the argument string . but actually imma hold off on this.
			return null;



		}
		else return null;

		//return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the value error by commenting it out"];
	}

	function numberOfLeadingSpaces(stringToCheck) {
		var number = 0;

		for (var i = 0; i < stringToCheck.length; i++) {
			if (stringToCheck[i] != " ") {
				break;
			}
			else {
				number += 1;
            }
		}

		return number;
    }

	function updateNames(variables, functions) {

		if (variables != null && functions != null) {
			allNames = pythonAndAPI.slice(0);

			for (var i in variables) {
				allNames.push(variables[i].name);
			}
			for (var i in functions) {
				allNames.push(functions[i].name);
			}
			for (var i in AUDIOKEYS) {
				allNames.push(AUDIOKEYS[i]);
            }

			//copy variable and function information
			allVars = variables.slice(0);
			userFunctions = functions.slice(0);
		}
    }

	function levenshtein(a, b) {
		if (a.length === 0) return b.length;
 		if (b.length === 0) return a.length;
		var matrix = [];

		// increment along the first column of each row
		var i;
		for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }

		// increment each column in the first row
		var j;
		for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }

		// Fill in the rest of the matrix
		for (i = 1; i <= b.length; i++) {
			for (j = 1; j <= a.length; j++) {
				if (b.charAt(i - 1) === a.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
						Math.min(matrix[i][j - 1] + 1, // insertion
							matrix[i - 1][j] + 1)); // deletion
				}
			}
		}
		return matrix[b.length][a.length];
	}

    return {
		handleError: handleError,
		updateNames: updateNames
    };

}]);
