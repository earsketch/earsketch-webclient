app.factory('ESUtils', ['$window', '$location', '$http', function ($window, $location, $http) {
    function measureToTime(measure, tempo, timeSignature) {
        if (typeof(timeSignature) === 'undefined') timeSignature = 4;
        if (tempo === -1) tempo = 120;
        //tempo beats in 60 secs
        return (measure - 1.0) * timeSignature * 60.0 / tempo;
    }

    // TODO: unused?
    function measureToTimeDurationInSeconds(measure, tempo, timeSignature) {  // length of measure in seconds
        if (typeof(timeSignature) === 'undefined') timeSignature = 4;
        //tempo beats in 60 secs
        return (measure) * timeSignature * 60.0 / tempo;
    }

    function timeToMeasure(time, tempo, timeSignature) {
        if (typeof(timeSignature) === 'undefined') timeSignature = 4; // 4/4 time
        if (tempo === -1) tempo = 120;
        // should this return measure + 1?
        // return tempo * 1 / 60 * time / timeSignature;  // beat/min * min/sec * sec * measure/beat => measure

        // rounding at the 5th digit
        return toPrecision(time * (tempo/60) / timeSignature);
    }

    /**
     * Parses the language from a file extension using regex. Returns 'python' if
     * the extension is '.py' and 'javascript' otherwise.
     *
     * @param {string} filename The filename to parse.
     * @returns {string} Either 'python' or 'javascript'.
     */
    function parseLanguage(filename) {
        var ext = parseExt(filename);
        if (ext === '.py') {
            return 'python';
        } else {
            return 'javascript';
        }
    }

    /**
     * Parse out the share id from a sharing URL.
     */
    function parseShareId(shareUrl) {
      var parser = document.createElement("a");
      parser.href = shareUrl;
      hash = parser.hash;
      shareId = hash.split('=')[1];
      return shareId;
    }

    /**
     * Parse the filename (without extension) from a filename (with extension.)
     *
     * @param {string} filename The full filename
     * @returns {string} The extension-free filename.
     */
    function parseName(filename) {
        return filename.match(/(.+)\..+$/)[1];
    }

    /**
     * Parse the extension from a filename
     *
     * @param {string} filename The full filename.
     * @returns {string} The extension (with leading .)
     */
    function parseExt(filename) {
        return filename.match(/.[^.]*$/)[0];
    }

    function isMobileBrowser() {
        var check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))check = true
        })($window.navigator.userAgent || $window.navigator.vendor || $window.opera);

        return check;
    }

    function whichBrowser() {
        var ua = $window.navigator.userAgent, tem, M;
        M = ua.match(/edge\/\d+\.\d+/i);
        if (M) {
            M = M[0].split('/');
        } else {
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE ' + (tem[1] || '');
            }

            if (M[1] === 'Chrome') {
                tem = ua.match(/\bOPR\/(\d+)/);
                if (tem !== null) return 'Opera ' + tem[1];
            }

            M = M[2] ? [M[1], M[2]] : [$window.navigator.appName, $window.navigator.appVersion, '-?'];

            if ((tem = ua.match(/version\/(\d+)/i)) !== null) {
                M.splice(1, 1, tem[1]);
            }
        }

        return M.join(' ');
    }

    function whichOS() {
        var OSName="Unknown OS";
        if (navigator.appVersion.indexOf("Win") !== -1) {
            OSName = "Windows";
        } else if (navigator.appVersion.indexOf("Mac") !== -1) {
            OSName = "MacOS";
        } else if (navigator.appVersion.indexOf("X11") !== -1) {
            OSName = "UNIX";
        } else if (navigator.appVersion.indexOf("Linux") !== -1) {
            OSName = "Linux";
        }
        return OSName;
    }


    /**
     * Returns a human-readable string that is convenient to copy and paste into
     * integration tests. For scripts.
     *
     * @param {String} script The script to return.
     */
    function formatScriptForTests(script) {
        var lines = script.replace(/'/g, '"').split('\n');
        var s = '\n';
        var c = 0;
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('//')
                || lines[i].startsWith('#')
                || lines[i] == "") {
                continue;
            }
            if (c > 0) {
                s += '+ ';
            }
            s += "'" + lines[i] + "\\n'\n";
            c++;
        }
        return s;
    }

    /**
     * Returns a human readable string that is convenient to copy and paste into
     * integration tests. For script outputs. It returns only the relevant parts
     * of the result object.
     *
     * @param {Object} result The script result to return.
     */
    function formatResultForTests(result) {
        var s = '\n{\n';
        s += '    tempo: ' + result.tempo + ',\n';
        s += '    length: ' + result.length + ',\n';
        s += '    tracks: [\n';
        for (var i = 0; i < result.tracks.length - 1; i++) {
            var track = result.tracks[i];
            s += '        {clips: [';
            if (track.clips.length > 0) {
                s += '\n';
            }
            for (var j = 0; j < track.clips.length; j++) {
                var clip = track.clips[j];
                var temp = {
                    filekey: clip.filekey,
                    measure: clip.measure,
                    start: clip.start,
                    end: clip.end
                }
                if (clip.pitchshift !== undefined) {
                    temp.pitchshift = {};
                    temp.pitchshift.start = clip.pitchshift.start;
                    temp.pitchshift.end = clip.pitchshift.end;
                }
                s += '            ' + JSON.stringify(temp) + ',\n';
            }
            if (track.clips.length > 0) {
                s += '        ';
            }
            s += '],\n';
            s += '        effects: {';
            if (Object.keys(track.effects).length > 0) {
                s += '\n';
            }
            for (var key in track.effects) {
                s += '            "' + key + '":[\n';
                for (var j = 0; j < track.effects[key].length; j++) {
                    s += '                ' + JSON.stringify(track.effects[key][j]);
                    s += ',\n';
                }
                s += '            ],\n';
            }
            if (Object.keys(track.effects).length > 0) {
                s += '        ';
            }
            s += '}},\n'
        }
        s += '    ]\n';
        s += '}\n';

        return s;
    }

    function roundOff(value, digits) {
        return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
    }

    function truncate(value, digits) {
        var sig = value > 0 ? 1 : -1;
        return sig * Math.floor(sig * value * Math.pow(10, digits)) / Math.pow(10, digits);
    }

    function toPrecision(value, digits) {
        if (typeof(digits) === 'undefined') {
            digits = 5;
        }
        return parseFloat(value.toPrecision(digits));
    }

    /**
     * Checks if the object "b" has the matching structure (properties) as the object "a."
     * @param a {object}
     * @param b {object}
     * @returns {boolean}
     */
    function compareObjStructure(a, b) {
        if (!(typeof(a) === 'object' && typeof(b) === 'object')) {
            return false;
        }

        if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }

        return Object.keys(a).every(function (v, i) {
            var keyComp = Object.keys(b)[i] === v;
            if (keyComp) {
                var aIsObj = typeof(a[v]) === 'object';
                var bIsObj = typeof(b[v]) === 'object';

                if (aIsObj && bIsObj) {
                    return compareObjStructure(a[v], b[v])
                } else {
                    return !((aIsObj && !bIsObj) || (!aIsObj && bIsObj));
                }
            } else {
                return false;
            }
        });
    }

    /**
     * @name randomString
     * @function
     * @param length {number}
     * @returns {string}
     */
    function randomString(length) {
        return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
    }

    /**
     * If called with no arguments, it returns a dictionary containing all the key-value pairs of the URL parameter. If a key string is passed, it either returns the matching value or a null value if the parameter does not exist.
     * @param key {String} Parameter name to
     * @returns Object|String
     */
    function getURLParameters(key) {
        var params = $location.search();

        if (typeof(key) === 'undefined') {
            return params;
        } else if (typeof(key) === 'string') {
            if (params.hasOwnProperty(key)) {
                return params[key];
            } else {
                return null;
            }
        }
    }

    function getSiteBaseURI() {
        return SITE_BASE_URI;
    }

    function checkIllegalCharacters(input) {
        var matchPattern = /[$-/:-?{-~!"^#`\[\]\\]/g;
        return input.match(matchPattern);
    }

    function checkUserExists(id) {
        var url = URL_DOMAIN + '/services/scripts/searchuser';
        var opts = { params: {'query': id} };
        return $http.get(url, opts);
    }

    /**
     * Joins multiple sets into one. Each argument should be a set object. For ES5.
     * @returns {Set<any>}
     */
    function setConcat() {
        var res = new Set();
        for (var i = 0; i < arguments.length; i++) {
            arguments[i].forEach(function (v) {
                res.add(v);
            });
        }
        return res;
    }


    /**
     * Calculates last modified time unit (previously in scriptBrowserController & mainController).
     */
    function formatTimer(input) {
        var seconds = Math.floor(input / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        var days = Math.floor(hours / 24);

        if (days <= 1) {
            if (seconds <= 0) {
                return 'just now';
            } else if (minutes === 0) {
                // if (seconds === 1) {
                //     return '1 second ago';
                // } else {
                //     return seconds + ' seconds ago';
                // }
                return 'recently';
            } else if (hours === 0) {
                if (minutes === 1) {
                    return '1 minute ago';
                } else {
                    return minutes + ' minutes ago';
                }
            } else if (hours < 24) {
                if (hours === 1) {
                    return '1 hour ago';
                } else {
                    return hours + ' hours ago';
                }
            }
        } else {
            // if (days <= 1) return "today";
            if (days > 1 && days <= 2) {
                return "yesterday";
            } else if (days > 2 && days <= 7) {
                return days + " days ago";
            } else if (days > 7) {
                var weeks = Math.floor(days/7);

                if (weeks === 1) {
                    return "last week";
                } else if (weeks > 1 && weeks <= 4) {
                    return weeks + " weeks ago";
                } else if (weeks > 4) {
                    var months = Math.floor(weeks/4);

                    if (months === 1) {
                        return "last month";
                    } else if (months > 1 && months < 12) {
                        return months + " months ago";
                    } else if (months >= 12) {
                        var years = Math.floor(months/12);
                        if (years <= 1) {
                            return "last year";
                        } else if (years > 1) {
                            return years + " years ago";
                        }
                    }
                }
            }
        }
    }

    return {
        measureToTime: measureToTime,
        measureToTimeDurationInSeconds: measureToTimeDurationInSeconds,
        timeToMeasure: timeToMeasure,
        parseLanguage: parseLanguage,
        parseName: parseName,
        parseExt: parseExt,
        parseShareId: parseShareId,
        whichBrowser: whichBrowser,
        whichOS: whichOS,
        isMobileBrowser: isMobileBrowser,
        formatScriptForTests: formatScriptForTests,
        formatResultForTests: formatResultForTests,
        roundOff: roundOff,
        truncate: truncate,
        toPrecision: toPrecision,
        compareObjStructure: compareObjStructure,
        randomString: randomString,
        getURLParameters: getURLParameters,
        getSiteBaseURI: getSiteBaseURI,
        checkIllegalCharacters: checkIllegalCharacters,
        checkUserExists: checkUserExists,
        setConcat: setConcat,
        formatTimer: formatTimer
    }
}]);

(function () {

    /**
     * Returns a Gaussian Random Number around a normal distribution defined by the mean
     * and standard deviation parameters.
     *
     * Uses the algorithm used in Java's random class, which in turn comes from
     * Donald Knuth's implementation of the BoxÐMuller transform.
     *
     * @param {Number} [mean = 0.0] The mean value, default 0.0
     * @param {Number} [standardDeviation = 1.0] The standard deviation, default 1.0
     * @return {Number} A random number
     */
    Math.randomGaussian = function (mean, standardDeviation) {

        mean = defaultTo(mean, 0.0);
        standardDeviation = defaultTo(standardDeviation, 1.0);

        if (Math.randomGaussian.nextGaussian !== undefined) {
            var nextGaussian = Math.randomGaussian.nextGaussian;
            delete Math.randomGaussian.nextGaussian;
            return (nextGaussian * standardDeviation) + mean;
        } else {
            var v1, v2, s, multiplier;
            do {
                v1 = 2 * Math.random() - 1; // between -1 and 1
                v2 = 2 * Math.random() - 1; // between -1 and 1
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            multiplier = Math.sqrt(-2 * Math.log(s) / s);
            Math.randomGaussian.nextGaussian = v2 * multiplier;
            return (v1 * multiplier * standardDeviation) + mean;
        }

    };

    /**
     * Returns a normal probability density function for the given parameters.
     * The function will return the probability for given values of X
     *
     * @param {Number} [mean = 0] The center of the peak, usually at X = 0
     * @param {Number} [standardDeviation = 1.0] The width / standard deviation of the peak
     * @param {Number} [maxHeight = 1.0] The maximum height of the peak, usually 1
     * @returns {Function} A function that will return the value of the distribution at given values of X
     */
    Math.getGaussianFunction = function (mean, standardDeviation, maxHeight) {

        mean = defaultTo(mean, 0.0);
        standardDeviation = defaultTo(standardDeviation, 1.0);
        maxHeight = defaultTo(maxHeight, 1.0);

        return function getNormal(x) {
            return maxHeight * Math.pow(Math.E, -Math.pow(x - mean, 2) / (2 * (standardDeviation * standardDeviation)));
        }
    };

    function defaultTo(value, defaultValue) {
        return isNaN(value) ? defaultValue : value;
    }

    /**
     * Decimal adjustment of a number.
     *
     * @param {String}  type  The type of adjustment.
     * @param {Number}  value The number.
     * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
     * @returns {Number}      The adjusted value.
     */
    function decimalAdjust(type, value, exp) {
        // If the exp is undefined or zero...
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](value);
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        // Shift
        value = value.toString().split('e');
        value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    // Decimal round
    if (!Math.round10) {
        Math.round10 = function (value, exp) {
            return decimalAdjust('round', value, exp);
        };
    }
    // Decimal floor
    if (!Math.floor10) {
        Math.floor10 = function (value, exp) {
            return decimalAdjust('floor', value, exp);
        };
    }
    // Decimal ceil
    if (!Math.ceil10) {
        Math.ceil10 = function (value, exp) {
            return decimalAdjust('ceil', value, exp);
        };
    }

})();
