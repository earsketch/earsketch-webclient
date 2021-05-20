describe('EarSketch API tests', function() {

    var audioLibrary, compiler, renderer;
    var $rootScope, $q, result;

    // mock module dependencies
    beforeEach(function() {
        // TODO: figure out a way to ignore dependencies or mock them universally or something
        angular.module('ui.router',[]);
        angular.module('ui.bootstrap',[]);
        angular.module('ui.utils',[]);
        angular.module('ui.layout',[]);
        angular.module('ngAnimate',[]);
        angular.module('ngAnimate',[]);
        angular.module('ngFileUpload',[]);
        angular.module('angular-clipboard',[]);
        angular.module('angular-confirm',[]);
        angular.module('rzModule',[]);
        angular.module('uiSwitch',[]);
        angular.module('infinite-scroll',[]);
        angular.module('ui.scroll',[]);
        angular.module('ui.scroll.grid',[]);
    });

    // load the earsketch app
    beforeEach(module('EarSketchApp'));

    beforeEach(function() {
        // create a mock audioLibrary service
        audioLibrary = {
            getAudioClip: function() {
                return new Promise(function(resolve) { resolve(); });
            }
        };

        // create a mock renderer service
        renderer = {
            mergeClips: function() {
                return new Promise(function(resolve) { resolve(); });
            }
        };

        // create a mock compiler service
        compiler = {
            postCompile: function() {
                return new Promise(function(resolve) { resolve(); });
            },
            loadBuffersForSampleSlicing: function () {
                return new Promise(function (resolve) { resolve(); });
            }
        };
    });

    beforeEach(inject(function($injector) {
        // mock the service wrapper that the API uses to load angular
        // dependencies

        // overriding the angular-wrappers' function
        ServiceWrapper = function() {
            return {
                audioLibrary: audioLibrary,
                compiler: compiler,
                renderer: renderer,
            }
        };
        $rootScope = $injector.get('$rootScope');
        $q = $injector.get('$q');
    }));

    // create an empty result for each test
    beforeEach(function() {
        result = ES_PASSTHROUGH.init({}, 0);
    });

    describe('common errors', function () {
        var apis = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "dur", "finish", "fitMedia", "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "readInput", "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile", "setEffect", "setTempo", "shuffleList", "shuffleString"];

        apis.forEach(function (api) {
            it('should not allow illegal filekeys', function () {
                var trackNum = 1;
                var trackLoc = 1;
                var fn;

                switch (api) {
                    case 'fitMedia':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.fitMedia(result, filekey, trackNum, trackLoc, 5);
                        };
                        break;
                    case 'insertMedia':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.insertMedia(result, filekey, trackNum, trackLoc, 1);
                        };
                        break;
                    case 'insertMediaSection':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.insertMediaSection(result, filekey, trackNum, trackLoc, 1, 2, 1);
                        };
                        break;
                    case 'makeBeat':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.makeBeat(result, filekey, trackNum, trackLoc, '');
                        };
                        break;
                    case 'makeBeatSlice':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.makeBeatSlice(result, filekey, trackNum, trackLoc, '', [0]);
                        };
                        break;
                    case 'analyze':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.analyze(result, filekey, 'spectral_centroid');
                        };
                        break;
                    case 'analyzeForTime':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.analyzeForTime(result, filekey, 'spectral_centroid');
                        };
                        break;
                    case 'dur':
                        fn = function (filekey) {
                            ES_PASSTHROUGH.dur(result, filekey);
                        };
                        break;
                    default:
                        break;
                }

                // expect(function () { fn('AUDIO_FILE') }).not.toThrowError(TypeError);
                expect(function () { fn(undefined) }).toThrowError(TypeError);
                expect(function () { fn(123) }).toThrowError(TypeError);
                expect(function () { fn(null) }).toThrowError(TypeError);

                if (!~['makeBeat', 'makeBeatSlice'].indexOf(api)) {
                    expect(function () { fn([]) }).toThrowError(TypeError);
                    expect(function () { fn(['AUDIO_FILE']) }).toThrowError(TypeError);
                }
            });

            it('should not allow certain track numbers', function () {
                function test(fn) {
                    expect(function () { fn(1) }).not.toThrowError(RangeError);
                    expect(function () { fn(-1) }).toThrowError(RangeError);
                    expect(function () { fn('1') }).toThrowError(TypeError);
                    expect(function () { fn(undefined) }).toThrowError(TypeError);
                    expect(function () { fn(null) }).toThrowError(TypeError);

                    // master track
                    if (!~['analyzeTrack', 'analyzeTrackForTime', 'setEffect', 'rhythmEffects'].indexOf(api)) {
                        expect(function () { fn(0) }).toThrowError(RangeError);
                    }
                }

                var filekey = 'AUDIO_FILE';
                var trackLoc = 1;

                switch (api) {
                    case 'fitMedia':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.fitMedia(result, filekey, trackNum, trackLoc, 5);
                        });
                        break;
                    case 'insertMedia':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.insertMedia(result, filekey, trackNum, trackLoc, 1);
                        });
                        break;
                    case 'insertMediaSection':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.insertMediaSection(result, filekey, trackNum, trackLoc, 1, 2, 1);
                        });
                        break;
                    case 'makeBeat':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.makeBeat(result, filekey, trackNum, trackLoc, '');
                        });
                        break;
                    case 'makeBeatSlice':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.makeBeatSlice(result, filekey, trackNum, trackLoc, '0', [1]);
                        });
                        break;
                    case 'analyzeTrack':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.analyzeTrack(result, trackNum, 'spectral_centroid');
                        });
                        break;
                    case 'analyzeTrackForTime':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.analyzeTrackForTime(result, trackNum, 'spectral_centroid', 1, 2);
                        });
                        break;
                    case 'setEffect':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.setEffect(result, trackNum, 'DELAY');
                        });
                        break;
                    case 'rhythmEffects':
                        test(function (trackNum) {
                            ES_PASSTHROUGH.rhythmEffects(result, trackNum, 'FILTER', 'FILTER_FREQ', [300, 3000, 1000], 1.0, '0+++1+++2+++1+++');
                        });
                        break;
                    default:
                        break;
                }
            });

            it('should not allow certain track locations', function () {
                function test(fn) {
                    expect(function () { fn(1) }).not.toThrowError(RangeError);
                    expect(function () { fn(0) }).toThrowError(RangeError);
                    expect(function () { fn(-1) }).toThrowError(RangeError);
                    expect(function () { fn('1') }).toThrowError(TypeError);
                    expect(function () { fn(undefined) }).toThrowError(TypeError);
                    expect(function () { fn(null) }).toThrowError(TypeError);
                }

                var filekey = 'AUDIO_FILE';
                var trackNum = 1;

                switch (api) {
                    case 'fitMedia':
                        test(function (trackLoc) {
                            ES_PASSTHROUGH.fitMedia(result, filekey, trackNum, trackLoc, 5);
                        });
                        break;
                    case 'insertMedia':
                        test(function (trackLoc) {
                            ES_PASSTHROUGH.insertMedia(result, filekey, trackNum, trackLoc, 1);
                        });
                        break;
                    case 'insertMediaSection':
                        test(function (trackLoc) {
                            ES_PASSTHROUGH.insertMediaSection(result, filekey, trackNum, trackLoc, 1, 2, 1);
                        });
                        break;
                    case 'makeBeat':
                        test(function (trackLoc) {
                            ES_PASSTHROUGH.makeBeat(result, filekey, trackNum, trackLoc, '');
                        });
                        break;
                    case 'makeBeatSlice':
                        test(function (trackLoc) {
                            ES_PASSTHROUGH.makeBeatSlice(result, filekey, trackNum, trackLoc, '0', [1]);
                        });
                        break;
                    default:
                        break;
                }
            });

            it('should only allow selected audio features', function () {
                function test(fn) {
                    expect(function () { fn('SPECTRAL_CENTROID') }).not.toThrowError(Error);
                    expect(function () { fn('RMS_AMPLITUDE') }).not.toThrowError(Error);
                    expect(function () { fn('HELLO') }).toThrowError(Error);

                    expect(function () { fn(0) }).toThrowError(TypeError);
                    expect(function () { fn(undefined) }).toThrowError(TypeError);
                    expect(function () { fn(['SPECTRAL_CENTROID']) }).toThrowError(TypeError);
                    expect(function () { fn(null) }).toThrowError(TypeError);
                }

                var filekey = 'AUDIO_FILE';
                var trackNum = 1;

                switch (api) {
                    case 'analyze':
                        test(function (feature) {
                            ES_PASSTHROUGH.analyze(result, filekey, feature);
                        });
                        break;
                    case 'analyzeForTime':
                        test(function (feature) {
                            ES_PASSTHROUGH.analyzeForTime(result, filekey, feature, 1, 2);
                        });
                        break;
                    case 'analyzeTrack':
                        test(function (feature) {
                            ES_PASSTHROUGH.analyzeTrack(result, trackNum, feature);
                        });
                        break;
                    case 'analyzeTrackForTime':
                        test(function (feature) {
                            ES_PASSTHROUGH.analyzeTrackForTime(result, trackNum, feature, 1, 2);
                        });
                        break;
                    default:
                        break;
                }
            });

            it('should only accept string', function () {
                function test(fn) {
                    expect(function () { fn('hello') }).not.toThrowError(TypeError);
                    expect(function () { fn(1) }).toThrowError(TypeError);
                    expect(function () { fn(undefined) }).toThrowError(TypeError);
                    expect(function () { fn([]) }).toThrowError(TypeError);
                    expect(function () { fn({}) }).toThrowError(TypeError);
                    expect(function () { fn(null) }).toThrowError(TypeError);
                }

                switch (api) {
                    case 'replaceString':
                        test(function (str) {
                            ES_PASSTHROUGH.replaceString(result, str, 'a', 'b');
                            ES_PASSTHROUGH.replaceString(result, 'a', str, 'b');
                            ES_PASSTHROUGH.replaceString(result, 'a', 'b', str);
                        });
                        break;
                    case 'reverseString':
                        test(function (str) {
                            ES_PASSTHROUGH.reverseString(result, str);
                        });
                        break;
                    case 'shuffleString':
                        test(function (str) {
                            ES_PASSTHROUGH.shuffleString(result, str);
                        });
                        break;
                    default:
                        break;
                }
            });

            it('should only accept list', function () {
                function test(fn) {
                    expect(function () { fn([1,2,3]) }).not.toThrowError(TypeError);
                }

                switch (api) {
                    case 'replaceListElement':
                        test(function (list) {
                            ES_PASSTHROUGH.replaceListElement(result, list, 1, 2);
                        });
                        break;
                    case 'reverseList':
                        test(function (list) {
                            ES_PASSTHROUGH.reverseList(result, list);
                        });
                        break;
                    case 'shuffleList':
                        test(function (list) {
                            ES_PASSTHROUGH.shuffleList(result, list);
                        });
                        break;
                    default:
                        break;
                }
            });
        });
    });

    describe('analyze', function () {
        // TODO: need some fix here since the changes from the sample slice function (Nov 10, 2017)
        xit('should make the correct analyze calls', function() {
            var spy = spyOn(audioLibrary, 'getAudioClip').and.callThrough();
            var r = ES_PASSTHROUGH.analyze(result, 'AUDIO_FILE', 'SPECTRAL_CENTROID');
            expect(audioLibrary.getAudioClip).toHaveBeenCalledWith(
                'AUDIO_FILE', 120, 0
            );
        });
    });

    describe('analyzeForTime', function () {});
    describe('analyzeTrack', function () {});
    describe('analyzeTrackForTime', function () {});
    describe('dur', function () {});
    describe('finish', function () {});

    describe('fitMedia', function () {
        describe('errors', function () {
            it('should not allow illegal start / end locations', function () {
                function testfn(start, end) {
                    ES_PASSTHROUGH.fitMedia(result, 'AUDIO_FILE', 1, start, end);
                }
                expect(function () { testfn(1,2) }).not.toThrowError(RangeError);

                expect(function () { testfn('1','2') }).toThrowError(TypeError);
                expect(function () { testfn(1, undefined) }).toThrowError(TypeError);
                expect(function () { testfn(-1,5) }).toThrowError(RangeError);
                expect(function () { testfn(0,5) }).toThrowError(RangeError);
                expect(function () { testfn(0,0) }).toThrowError(RangeError);
                //expect(function () { testfn(2,1) }).toThrowError(RangeError); // TODO: implement the crossing-value error
            });
        });

        it('shoud return the result with clips', function () {
            var trNum = 1;
            var measure = 3;
            var length = 5;
            var clipStart = 1;
            var clipEnd = length - measure + 1;
            ES_PASSTHROUGH.fitMedia(result, 'AUDIO_FILE', trNum, measure, length);
            expect(result.tracks[trNum].clips[0]).toEqual({
                filekey: 'AUDIO_FILE',
                track: trNum,
                measure: measure,
                start: clipStart,
                end: clipEnd,
                scale: false,
                loop: true,
                silence: 0
            });
        });
    });

    describe('importImage', function () {});
    describe('importFile', function () {});

    describe('init', function () {
        it('should init an empty result', function() {
            expect(result).toEqual({
                init: true,
                finish: false,
                tempo: 120,
                length: 0,
                quality: 0,
                tracks: [],
                slicedClips: {}
            });
        });
    });

    describe('insertMedia', function () {});
    describe('insertMediaSection', function () {});
    describe('makeBeat', function () {});
    describe('makeBeatSlice', function () {});
    describe('readInput', function () {});

    describe('replaceListElement', function () {
        it('should work', function () {
            expect(ES_PASSTHROUGH.replaceListElement(result, [1,2,1,3], 1, 0)).toEqual([0,2,0,3]);
        });
    });

    describe('replaceString', function () {
        it('should work', function () {
            expect(ES_PASSTHROUGH.replaceString(result, 'help', 'h', 'y')).toBe('yelp');
        });
    });

    describe('reverseList', function () {
        it('should work', function () {
            expect(ES_PASSTHROUGH.reverseList(result, [1,2,3])).toEqual([3,2,1]);
        });
    });

    describe('reverseString', function () {
        it('should work', function () {
            expect(ES_PASSTHROUGH.reverseString(result, 'hello')).toBe('olleh');
        });
    });

    describe('rhythmEffects', function () {});
    describe('selectRandomFile', function () {});
    describe('setEffect', function () {});

    describe('setTempo', function () {
        it('should set the correct tempo', function() {
            ES_PASSTHROUGH.setTempo(result, 100);
            expect(result).toEqual({
                init: true,
                finish: false,
                tempo: 100,
                length: 0,
                quality: 0,
                tracks: [],
                slicedClips: {}
            });
            ES_PASSTHROUGH.setTempo(result, 45);
            expect(result).toEqual({
                init: true,
                finish: false,
                tempo: 45,
                length: 0,
                quality: 0,
                tracks: [],
                slicedClips: {}
            });
            ES_PASSTHROUGH.setTempo(result, 220);
            expect(result).toEqual({
                init: true,
                finish: false,
                tempo: 220,
                length: 0,
                quality: 0,
                tracks: [],
                slicedClips: {}
            });
        });

        it('should require the correct setTempo arguments', function() {
            var msg;
            msg = 'setTempo() takes exactly 1 argument(s) (0 given)';
            expect(function() { ES_PASSTHROUGH.setTempo(result) })
                .toThrow(new TypeError(msg));
            msg = 'setTempo() takes exactly 1 argument(s) (2 given)';
            expect(function() { ES_PASSTHROUGH.setTempo(result, 100, 'extra') })
                .toThrow(new TypeError(msg));
            msg = 'tempo must be a number';
            expect(function() { ES_PASSTHROUGH.setTempo(result, '100') })
                .toThrow(new TypeError(msg));
            msg = 'setTempo exceeds the allowed range of 45 to 220';
            expect(function() { ES_PASSTHROUGH.setTempo(result, 44) })
                .toThrow(new RangeError(msg));
            expect(function() { ES_PASSTHROUGH.setTempo(result, 221) })
                .toThrow(new RangeError(msg));
        });
    });

    describe('shuffleList', function () {
        it('should return a list with the same length', function () {
            expect(ES_PASSTHROUGH.shuffleList(result, [1,2,3]).length).toBe(3);
        });
    });

    describe('shuffleString', function () {
        it('should return a string with the same length', function () {
            expect(ES_PASSTHROUGH.shuffleString(result, 'test').length).toBe(4);
        });
    });
});
