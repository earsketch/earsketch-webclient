import * as compiler from '../../../src/app/compiler'

describe('API function tests', function() {
    var tester;
    var skulptConfig;
    var userConsole;
    
    beforeEach(function() {
        angular.module('ui.router',[]);

        // userConsole needs a mock for $uibModal
        angular.module('ui.bootstrap',[])
            .service('$uibModal',function(){})
            .service('$uibModalProvider',function(){});

        angular.module('ui.utils',[]);
        angular.module('ui.layout',[]);
        angular.module('ngAnimate',[]);
        angular.module('ngFileUpload',[]);
        angular.module('angular-clipboard',[]);
        angular.module('angular-confirm',[]);
        angular.module('rzModule',[]);
        angular.module('uiSwitch',[]);
        angular.module('infinite-scroll',[]);
        angular.module('ui.scroll',[]);
        angular.module('ui.scroll.grid',[]);

        // add the isSimilarTo matcher from helpers.js for testing results
        jasmine.addMatchers(customMatchers);

        tester = ngMidwayTester('EarSketchApp');
        // TODO: This may be broken now that userConsole is a module rather than a service.
        userConsole = tester.injector().get('userConsole');
        // mock angular.element().injector() used in the Passthrough for
        // getting the injector outside of angular
        spyOn(angular, 'element').and.callFake(function() {
            return {injector: tester.injector}
        });

        // configure skulpt
        function builtinRead(x) {
            if (Sk.builtinFiles === undefined ||
                Sk.builtinFiles["files"][x] === undefined) {

                throw "File not found: '" + x + "'";
            }

            return Sk.builtinFiles["files"][x];
        }

        skulptConfig = {
            output: function(m) {
                console.log(m);
                // do nothing (for now)
            },
            read: builtinRead
        };

        // check on skulpt output
        spyOn(skulptConfig, 'output');
        // check on JavaScript output
        spyOn(userConsole, 'log');

        Sk.pre = "output";
        Sk.configure(skulptConfig);
    });

    afterEach(function() {
        // close the audio context after each test so we don't open too many
        var context = tester.injector().get('audioContext');
        context.close();
        // try to destroy the tester in case it opened any resources
        try {
            tester.destroy();
        } catch(e) {}
        tester = null;
    });

    function runTestPython(script, expected, done, logs) {
        if (logs === undefined) {
            logs = [];
        }
        tester.visit('/', function() {
            compiler.compilePython(script, 0).then(function(result) {
                expect(result).toMatchResult(expected, script);
                for (var i = 0; i < logs.length; i++) {
                    expect(skulptConfig.output).toHaveBeenCalledWith(logs[i]);
                }
                done();
            }).catch(function(err) {
                expect(err.toString()).toEqual(null);
                done();
            });
        });
    }

    function runTestJavascript(script, expected, done, logs) {
        if (logs === undefined) {
            logs = [];
        }
        tester.visit('/', function() {
            compiler.compileJavascript(script, 0).then(function(result) {
                expect(result).toMatchResult(expected, script);
                for (var i = 0; i < logs.length; i++) {
                    expect(userConsole.log).toHaveBeenCalledWith(logs[i]);
                }
                done();
            }).catch(function(err) {
                expect(err.toString()).toEqual(null);
                done();
            });
        });
    }

    it('should compile analyze correctly in Python', function(done) {
        // TODO: figure out why this number is different in the browser
        // when not rounded
        // TODO: write tests for RMS_AMPLITUDE as well
        var logs = ['0.279'];
        runTestPython(API_SCRIPTS['analyze.py'],
                      API_RESULTS['analyze'],
                      done,
                      logs);
    });

    it('should compile analyze correctly in JavaScript', function(done) {
        var logs = [0.279];
        runTestJavascript(API_SCRIPTS['analyze.js'],
                          API_RESULTS['analyze'],
                          done,
                          logs);
    });

    it('should compile analyzeForTime correctly in Python', function(done) {
        var logs = ['0.279'];
        runTestPython(API_SCRIPTS['analyzeForTime.py'],
                      API_RESULTS['analyzeForTime'],
                      done,
                      logs);
    });

    it('should compile analyzeForTime correctly in JavaScript', function(done) {
        var logs = [0.279];
        runTestJavascript(API_SCRIPTS['analyzeForTime.js'],
                          API_RESULTS['analyzeForTime'],
                          done,
                          logs);
    });

    it('should compile analyzeTrack correctly in Python', function(done) {
        var logs = ['0.241'];
        runTestPython(API_SCRIPTS['analyzeTrack.py'],
                      API_RESULTS['analyzeTrack'],
                      done,
                      logs);
    });

    it('should compile analyzeTrack correctly in JavaScript', function(done) {
        var logs = [0.241];
        runTestJavascript(API_SCRIPTS['analyzeTrack.js'],
                          API_RESULTS['analyzeTrack'],
                          done,
                          logs);
    });

    it('should compile analyzeTrackForTime correctly in Python', function(done) {
        var logs = ['0.259'];
        runTestPython(API_SCRIPTS['analyzeTrackForTime.py'],
                      API_RESULTS['analyzeTrackForTime'],
                      done,
                      logs);
    });

    it('should compile analyzeTrackForTime correctly in JavaScript', function(done) {
        var logs = [0.259];
        runTestJavascript(API_SCRIPTS['analyzeTrackForTime.js'],
                          API_RESULTS['analyzeTrackForTime'],
                          done,
                          logs);
    });

    it('should compile createAudioSlice correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['createAudioSlice.py'],
                      API_RESULTS['createAudioSlice'],
                      done);
    });

    it('should compile createAudioSlice correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['createAudioSlice.js'],
                          API_RESULTS['createAudioSlice'],
                          done);
    });

    it('should compile dur correctly in Python', function(done) {
        var logs = ['2'];
        runTestPython(API_SCRIPTS['dur.py'],
                      API_RESULTS['dur'],
                      done,
                      logs);
    });

    it('should compile dur correctly in JavaScript', function(done) {
        var logs = [2];
        runTestJavascript(API_SCRIPTS['dur.js'],
                          API_RESULTS['dur'],
                          done,
                          logs);
    });

    it('should compile fitMedia correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['fitMedia.py'],
                      API_RESULTS['fitMedia'],
                      done);
    });

    it('should compile fitMedia correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['fitMedia.js'],
                          API_RESULTS['fitMedia'],
                          done);
    });

    it('should compile importImage1 correctly in Python', function(done) {
        var logs = ["[[226, 228, 226, 230, 222, 221, 225, 230, 232, 232], [227, 221, 221, 224, 110, 204, 95, 222, 93, 230], [235, 223, 106, 222, 217, 227, 118, 220, 218, 231], [221, 226, 88, 227, 197, 200, 124, 203, 226, 234], [233, 180, 224, 230, 124, 175, 153, 229, 231, 236], [229, 224, 92, 222, 56, 79, 96, 205, 232, 233], [233, 209, 229, 224, 219, 93, 92, 226, 209, 233], [230, 227, 227, 221, 229, 231, 214, 227, 230, 228], [232, 228, 179, 219, 230, 228, 144, 228, 231, 229], [233, 233, 229, 224, 180, 218, 227, 228, 223, 228]]"];
        runTestPython(API_SCRIPTS['importImage1.py'],
                          API_RESULTS['importImage1'],
                          done,
                          logs);
    });

    it('should compile importImage1 correctly in JavaScript', function(done) {
        var logs = [[[226, 228, 226, 230, 222, 221, 225, 230, 232, 232], [227, 221, 221, 224, 110, 204, 95, 222, 93, 230], [235, 223, 106, 222, 217, 227, 118, 220, 218, 231], [221, 226, 88, 227, 197, 200, 124, 203, 226, 234], [233, 180, 224, 230, 124, 175, 153, 229, 231, 236], [229, 224, 92, 222, 56, 79, 96, 205, 232, 233], [233, 209, 229, 224, 219, 93, 92, 226, 209, 233], [230, 227, 227, 221, 229, 231, 214, 227, 230, 228], [232, 228, 179, 219, 230, 228, 144, 228, 231, 229], [233, 233, 229, 224, 180, 218, 227, 228, 223, 228]]];
        runTestJavascript(API_SCRIPTS['importImage1.js'],
                      API_RESULTS['importImage1'],
                      done,
                      logs);
    });

    it('should compile importImage2 correctly in Python', function(done) {
        var logs = ["[[[226, 226, 226], [228, 228, 228], [226, 226, 226], [230, 230, 230], [222, 222, 222], [221, 221, 221], [225, 225, 225], [230, 230, 230], [232, 232, 232], [232, 232, 232]], [[227, 227, 227], [221, 221, 221], [221, 221, 221], [224, 224, 224], [110, 110, 110], [204, 204, 204], [95, 95, 95], [222, 222, 222], [93, 93, 93], [230, 230, 230]], [[235, 235, 235], [223, 223, 223], [106, 106, 106], [222, 222, 222], [217, 217, 217], [227, 227, 227], [118, 118, 118], [220, 220, 220], [218, 218, 218], [231, 231, 231]], [[221, 221, 221], [226, 226, 226], [88, 88, 88], [227, 227, 227], [197, 197, 197], [200, 200, 200], [124, 124, 124], [203, 203, 203], [226, 226, 226], [234, 234, 234]], [[233, 233, 233], [180, 180, 180], [224, 224, 224], [230, 230, 230], [124, 124, 124], [175, 175, 175], [153, 153, 153], [229, 229, 229], [231, 231, 231], [236, 236, 236]], [[229, 229, 229], [224, 224, 224], [92, 92, 92], [222, 222, 222], [56, 56, 56], [79, 79, 79], [96, 96, 96], [205, 205, 205], [232, 232, 232], [233, 233, 233]], [[233, 233, 233], [209, 209, 209], [229, 229, 229], [224, 224, 224], [219, 219, 219], [93, 93, 93], [92, 92, 92], [226, 226, 226], [209, 209, 209], [233, 233, 233]], [[230, 230, 230], [227, 227, 227], [227, 227, 227], [221, 221, 221], [229, 229, 229], [231, 231, 231], [214, 214, 214], [227, 227, 227], [230, 230, 230], [228, 228, 228]], [[232, 232, 232], [228, 228, 228], [179, 179, 179], [219, 219, 219], [230, 230, 230], [228, 228, 228], [144, 144, 144], [228, 228, 228], [231, 231, 231], [229, 229, 229]], [[233, 233, 233], [233, 233, 233], [229, 229, 229], [224, 224, 224], [180, 180, 180], [218, 218, 218], [227, 227, 227], [228, 228, 228], [223, 223, 223], [228, 228, 228]]]"];
        runTestPython(API_SCRIPTS['importImage2.py'],
                          API_RESULTS['importImage2'],
                          done,
                          logs);
    });

    it('should compile importImage2 correctly in JavaScript', function(done) {
        var logs = [[[[226, 226, 226], [228, 228, 228], [226, 226, 226], [230, 230, 230], [222, 222, 222], [221, 221, 221], [225, 225, 225], [230, 230, 230], [232, 232, 232], [232, 232, 232]], [[227, 227, 227], [221, 221, 221], [221, 221, 221], [224, 224, 224], [110, 110, 110], [204, 204, 204], [95, 95, 95], [222, 222, 222], [93, 93, 93], [230, 230, 230]], [[235, 235, 235], [223, 223, 223], [106, 106, 106], [222, 222, 222], [217, 217, 217], [227, 227, 227], [118, 118, 118], [220, 220, 220], [218, 218, 218], [231, 231, 231]], [[221, 221, 221], [226, 226, 226], [88, 88, 88], [227, 227, 227], [197, 197, 197], [200, 200, 200], [124, 124, 124], [203, 203, 203], [226, 226, 226], [234, 234, 234]], [[233, 233, 233], [180, 180, 180], [224, 224, 224], [230, 230, 230], [124, 124, 124], [175, 175, 175], [153, 153, 153], [229, 229, 229], [231, 231, 231], [236, 236, 236]], [[229, 229, 229], [224, 224, 224], [92, 92, 92], [222, 222, 222], [56, 56, 56], [79, 79, 79], [96, 96, 96], [205, 205, 205], [232, 232, 232], [233, 233, 233]], [[233, 233, 233], [209, 209, 209], [229, 229, 229], [224, 224, 224], [219, 219, 219], [93, 93, 93], [92, 92, 92], [226, 226, 226], [209, 209, 209], [233, 233, 233]], [[230, 230, 230], [227, 227, 227], [227, 227, 227], [221, 221, 221], [229, 229, 229], [231, 231, 231], [214, 214, 214], [227, 227, 227], [230, 230, 230], [228, 228, 228]], [[232, 232, 232], [228, 228, 228], [179, 179, 179], [219, 219, 219], [230, 230, 230], [228, 228, 228], [144, 144, 144], [228, 228, 228], [231, 231, 231], [229, 229, 229]], [[233, 233, 233], [233, 233, 233], [229, 229, 229], [224, 224, 224], [180, 180, 180], [218, 218, 218], [227, 227, 227], [228, 228, 228], [223, 223, 223], [228, 228, 228]]]];
        runTestJavascript(API_SCRIPTS['importImage2.js'],
                      API_RESULTS['importImage2'],
                      done,
                      logs);
    });

    it('should compile importFile correctly in Python', function(done) {
        var logs = ['Copyright OpenJS Foundation and other contributors, https://openjsf.org/\n\nPermission is hereby granted, free of charge, to any person obtaining\na copy of this software and associated documentation files (the\n"Software"), to deal in the Software without restriction, including\nwithout limitation the rights to use, copy, modify, merge, publish,\ndistribute, sublicense, and/or sell copies of the Software, and to\npermit persons to whom the Software is furnished to do so, subject to\nthe following conditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\nLIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\nOF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\nWITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'];
        runTestPython(API_SCRIPTS['importFile.py'],
                      API_RESULTS['importFile'],
                      done,
                      logs);
    });

    it('should compile importFile correctly in JavaScript', function(done) {
        var logs = ['Copyright OpenJS Foundation and other contributors, https://openjsf.org/\n\nPermission is hereby granted, free of charge, to any person obtaining\na copy of this software and associated documentation files (the\n"Software"), to deal in the Software without restriction, including\nwithout limitation the rights to use, copy, modify, merge, publish,\ndistribute, sublicense, and/or sell copies of the Software, and to\npermit persons to whom the Software is furnished to do so, subject to\nthe following conditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\nLIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\nOF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\nWITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'];
        runTestJavascript(API_SCRIPTS['importFile.js'],
                      API_RESULTS['importFile'],
                      done,
                      logs);
    });

    it('should compile insertMedia1 correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['insertMedia1.py'],
                          API_RESULTS['insertMedia1'],
                          done);
    });

    it('should compile insertMedia1 correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['insertMedia1.js'],
                      API_RESULTS['insertMedia1'],
                      done);
    });

    it('should compile insertMedia2 correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['insertMedia2.py'],
                          API_RESULTS['insertMedia2'],
                          done);
    });

    it('should compile insertMedia2 correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['insertMedia2.js'],
                      API_RESULTS['insertMedia2'],
                      done);
    });

    it('should compile insertMediaSection correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['insertMediaSection.py'],
                          API_RESULTS['insertMediaSection'],
                          done);
    });

    it('should compile insertMediaSection correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['insertMediaSection.js'],
                      API_RESULTS['insertMediaSection'],
                      done);
    });

    // TODO: makeBeat

    it('should compile makeBeatSlice correctly in Python', function(done) {
        runTestPython(API_SCRIPTS['makeBeatSlice.py'],
                          API_RESULTS['makeBeatSlice'],
                          done);
    });

    it('should compile makeBeatSlice correctly in JavaScript', function(done) {
        runTestJavascript(API_SCRIPTS['makeBeatSlice.js'],
                      API_RESULTS['makeBeatSlice'],
                      done);
    });

    // TODO: the rest of the API functions

});
