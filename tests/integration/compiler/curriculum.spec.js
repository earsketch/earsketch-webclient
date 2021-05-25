import * as compiler from '../../../src/app/compiler'

describe('Curriculum example scripts', function() {
    var tester;
    
    beforeEach(function() {
        angular.module('ui.router',[]);
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

        function outf(m) {
            // do nothing (for now)
        }

        Sk.configure({output:outf});
        Sk.pre = "output";
        Sk.configure({output:outf,read: builtinRead});
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

    function runTestPython(script, expected, done) {
        tester.visit('/', function() {
            compiler.compilePython(script, 0).then(function(result) {
                expect(result).toMatchResult(expected, script);
                done();
            }).catch(function(err) {
                expect(err.toString()).toEqual(null);
                done();
            });
        });
    }

    function runTestJavascript(script, expected, done) {
        tester.visit('/', function() {
            compiler.compileJavascript(script, 0).then(function(result) {
                expect(result).toMatchResult(expected, script);
                done();
            }).catch(function(err) {
                expect(err.toString()).toEqual(null);
                done();
            });
        });
    }

    it('should compile Intro Script correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Intro Script.py'],
            CURRICULUM_RESULTS['Intro Script'], done);
    });

    it('should compile Intro Script correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Intro Script.js'],
            CURRICULUM_RESULTS['Intro Script'], done);
    });

    it('should compile Earsketch Demo correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Earsketch Demo.py'],
            CURRICULUM_RESULTS['Earsketch Demo'], done);
    });

    it('should compile Earsketch Demo correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Earsketch Demo.js'],
            CURRICULUM_RESULTS['Earsketch Demo'], done);
    });

    it('should compile Opus 1 correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Opus 1.py'],
            CURRICULUM_RESULTS['Opus 1'], done);
    });

    it('should compile Opus 1 correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Opus 1.js'],
            CURRICULUM_RESULTS['Opus 1'], done);
    });

    it('should compile Beats correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Beats.py'],
            CURRICULUM_RESULTS['Beats'], done);
    });

    it('should compile Beats correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Beats.js'],
            CURRICULUM_RESULTS['Beats'], done);
    });

    it('should compile variables correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['variables.py'],
            CURRICULUM_RESULTS['variables'], done);
    });

    it('should compile variables correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['variables.js'],
            CURRICULUM_RESULTS['variables'], done);
    });

    it('should compile Fixed Error correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Fixed Error.py'],
            CURRICULUM_RESULTS['Fixed Error'], done);
    });

    it('should compile Fixed Error correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Fixed Error.js'],
            CURRICULUM_RESULTS['Fixed Error'], done);
    });

    it('should compile Delay Effect correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Delay Effect.py'],
            CURRICULUM_RESULTS['Delay Effect'], done);
    });

    it('should compile Delay Effect correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Delay Effect.js'],
            CURRICULUM_RESULTS['Delay Effect'], done);
    });

    it('should compile Envelopes correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Envelopes.py'],
            CURRICULUM_RESULTS['Envelopes'], done);
    });

    it('should compile Envelopes correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Envelopes.js'],
            CURRICULUM_RESULTS['Envelopes'], done);
    });

    it('should compile Complex Envelopes correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Complex Envelopes.py'],
            CURRICULUM_RESULTS['Complex Envelopes'], done);
    });

    it('should compile Complex Envelopes correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Complex Envelopes.js'],
            CURRICULUM_RESULTS['Complex Envelopes'], done);
    });

    it('should compile Transition Techniques - Drum Fill correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Transition Techniques - Drum Fill.py'],
            CURRICULUM_RESULTS['Transition Techniques - Drum Fill'], done);
    });

    it('should compile Transition Techniques - Drum Fill correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Transition Techniques - Drum Fill.js'],
            CURRICULUM_RESULTS['Transition Techniques - Drum Fill'], done);
    });

    it('should compile Transition Techniques - Track Dropouts correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Transition Techniques - Track Dropouts.py'],
            CURRICULUM_RESULTS['Transition Techniques - Track Dropouts'], done);
    });

    it('should compile Transition Techniques - Track Dropouts correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Transition Techniques - Track Dropouts.js'],
            CURRICULUM_RESULTS['Transition Techniques - Track Dropouts'], done);
    });

    it('should compile Transition Techniques - Risers correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Transition Techniques - Risers.py'],
            CURRICULUM_RESULTS['Transition Techniques - Risers'], done);
    });

    it('should compile Transition Techniques - Risers correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Transition Techniques - Risers.js'],
            CURRICULUM_RESULTS['Transition Techniques - Risers'], done);
    });

    it('should compile Drum beat (no loops) correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Drum beat (no loops).py'],
            CURRICULUM_RESULTS['Drum beat (no loops)'], done);
    });

    it('should compile Drum beat (no loops) correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Drum beat (no loops).js'],
            CURRICULUM_RESULTS['Drum beat (no loops)'], done);
    });

    it('should compile Drum beat (with loops) correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Drum beat (with loops).py'],
            CURRICULUM_RESULTS['Drum beat (with loops)'], done);
    });

    it('should compile Drum beat (with loops) correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Drum beat (with loops).js'],
            CURRICULUM_RESULTS['Drum beat (with loops)'], done);
    });

    it('should compile Panning Loop correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Panning Loop.py'],
            CURRICULUM_RESULTS['Panning Loop'], done);
    });

    it('should compile Panning Loop correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Panning Loop.js'],
            CURRICULUM_RESULTS['Panning Loop'], done);
    });

    it('should compile Rhythmic Ramps correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Rhythmic Ramps.py'],
            CURRICULUM_RESULTS['Rhythmic Ramps'], done);
    });

    it('should compile Rhythmic Ramps correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Rhythmic Ramps.js'],
            CURRICULUM_RESULTS['Rhythmic Ramps'], done);
    });

    it('should compile A-B-A Form correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['A-B-A Form.py'],
            CURRICULUM_RESULTS['A-B-A Form'], done);
    });

    it('should compile A-B-A Form correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['A-B-A Form.js'],
            CURRICULUM_RESULTS['A-B-A Form'], done);
    });

    it('should compile Custom Functions correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Custom Functions.py'],
            CURRICULUM_RESULTS['Custom Functions'], done);
    });

    it('should compile Custom Functions correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Custom Functions.js'],
            CURRICULUM_RESULTS['Custom Functions'], done);
    });

    it('should compile Improved A-B-A correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Improved A-B-A.py'],
            CURRICULUM_RESULTS['Improved A-B-A'], done);
    });

    it('should compile Improved A-B-A correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Improved A-B-A.js'],
            CURRICULUM_RESULTS['Improved A-B-A'], done);
    });

    it('should compile Multi Beat correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Multi Beat.py'],
            CURRICULUM_RESULTS['Multi Beat'], done);
    });

    it('should compile Multi Beat correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Multi Beat.js'],
            CURRICULUM_RESULTS['Multi Beat'], done);
    });

    it('should compile Return Statements correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Return Statements.py'],
            CURRICULUM_RESULTS['Return Statements'], done);
    });

    it('should compile Return Statements correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Return Statements.js'],
            CURRICULUM_RESULTS['Return Statements'], done);
    });

    it('should compile Concatenation correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Concatenation.py'],
            CURRICULUM_RESULTS['Concatenation'], done);
    });

    it('should compile Concatenation correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Concatenation.js'],
            CURRICULUM_RESULTS['Concatenation'], done);
    });

    it('should compile Beat String Concatenation correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Beat String Concatenation.py'],
            CURRICULUM_RESULTS['Beat String Concatenation'], done);
    });

    it('should compile Beat String Concatenation correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Beat String Concatenation.js'],
            CURRICULUM_RESULTS['Beat String Concatenation'], done);
    });

    it('should compile Substrings correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Substrings.py'],
            CURRICULUM_RESULTS['Substrings'], done);
    });

    it('should compile Substrings correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Substrings.js'],
            CURRICULUM_RESULTS['Substrings'], done);
    });

    it('should compile String Operations correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['String Operations.py'],
            CURRICULUM_RESULTS['String Operations'], done);
    });

    it('should compile String Operations correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['String Operations.js'],
            CURRICULUM_RESULTS['String Operations'], done);
    });

    it('should compile Advanced Transition Techniques - Looping correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Advanced Transition Techniques - Looping.py'],
            CURRICULUM_RESULTS['Advanced Transition Techniques - Looping'], done);
    });

    it('should compile Advanced Transition Techniques - Looping correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Advanced Transition Techniques - Looping.js'],
            CURRICULUM_RESULTS['Advanced Transition Techniques - Looping'], done);
    });

    it('should compile Advanced Transition Techniques - Anacrusis correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Advanced Transition Techniques - Anacrusis.py'],
            CURRICULUM_RESULTS['Advanced Transition Techniques - Anacrusis'], done);
    });

    it('should compile Advanced Transition Techniques - Anacrusis correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Advanced Transition Techniques - Anacrusis.js'],
            CURRICULUM_RESULTS['Advanced Transition Techniques - Anacrusis'], done);
    });

    it('should compile Printing Demo correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Printing Demo.py'],
            CURRICULUM_RESULTS['Printing Demo'], done);
    });

    it('should compile Printing Demo correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Printing Demo.js'],
            CURRICULUM_RESULTS['Printing Demo'], done);
    });

    it('should compile Overlap Logic Error correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Overlap Logic Error.py'],
            CURRICULUM_RESULTS['Overlap Logic Error'], done);
    });

    it('should compile Overlap Logic Error correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Overlap Logic Error.js'],
            CURRICULUM_RESULTS['Overlap Logic Error'], done);
    });

    it('should compile Overlap Correction correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Overlap Correction.py'],
            CURRICULUM_RESULTS['Overlap Correction'], done);
    });

    it('should compile Overlap Correction correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Overlap Correction.js'],
            CURRICULUM_RESULTS['Overlap Correction'], done);
    });

    it('should compile Argument Order Correction correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Argument Order Correction.py'],
            CURRICULUM_RESULTS['Argument Order Correction'], done);
    });

    it('should compile Argument Order Correction correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Argument Order Correction.js'],
            CURRICULUM_RESULTS['Argument Order Correction'], done);
    });

    // TODO: these use custom modal stuff
    // it('should compile Simple Console Input correctly in Python', function(done) {
    //     runTestPython(CURRICULUM_SCRIPTS['Simple Console Input.py'],
    //         CURRICULUM_RESULTS['Simple Console Input'], done);
    // });
    //
    // it('should compile Simple Console Input correctly in JavaScript', function(done) {
    //     runTestJavascript(CURRICULUM_SCRIPTS['Simple Console Input.js'],
    //         CURRICULUM_RESULTS['Simple Console Input'], done);
    // });
    //
    // it('should compile Conditionals correctly in Python', function(done) {
    //     runTestPython(CURRICULUM_SCRIPTS['Conditionals.py'],
    //         CURRICULUM_RESULTS['Conditionals'], done);
    // });
    //
    // it('should compile Conditionals correctly in JavaScript', function(done) {
    //     runTestJavascript(CURRICULUM_SCRIPTS['Conditionals.js'],
    //         CURRICULUM_RESULTS['Conditionals'], done);
    // });
    //
    // it('should compile Which Comes First correctly in Python', function(done) {
    //     runTestPython(CURRICULUM_SCRIPTS['Which Comes First.py'],
    //         CURRICULUM_RESULTS['Which Comes First'], done);
    // });
    //
    // it('should compile Which Comes First correctly in JavaScript', function(done) {
    //     runTestJavascript(CURRICULUM_SCRIPTS['Which Comes First.js'],
    //         CURRICULUM_RESULTS['Which Comes First'], done);
    // });

    it('should compile Lists correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Lists.py'],
            CURRICULUM_RESULTS['Lists'], done);
    });

    it('should compile Arrays correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Arrays.js'],
            CURRICULUM_RESULTS['Arrays'], done);
    });

    it('should compile List Iteration correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['List Iteration.py'],
            CURRICULUM_RESULTS['List Iteration'], done);
    });

    it('should compile Array Iteration correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Array Iteration.js'],
            CURRICULUM_RESULTS['Array Iteration'], done);
    });

    it('should compile Additive Introduction correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Additive Introduction.py'],
            CURRICULUM_RESULTS['Additive Introduction'], done);
    });

    it('should compile Additive Introduction correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Additive Introduction.js'],
            CURRICULUM_RESULTS['Additive Introduction'], done);
    });

    it('should compile Making a drum set correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Making a drum set.py'],
            CURRICULUM_RESULTS['Making a drum set'], done);
    });

    it('should compile Making a drum set correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Making a drum set.js'],
            CURRICULUM_RESULTS['Making a drum set'], done);
    });

    it('should compile List Operations correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['List Operations.py'],
            CURRICULUM_RESULTS['List Operations'], done);
    });

    it('should compile Array Operations correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Array Operations.js'],
            CURRICULUM_RESULTS['Array Operations'], done);
    });

    // it('should compile Random Clip correctly in Python', function(done) {
    //     runTestPython(CURRICULUM_SCRIPTS['Random Clip.py'],
    //         CURRICULUM_RESULTS['Random Clip'], done);
    // });
    //
    // it('should compile Random Clip correctly in JavaScript', function(done) {
    //     runTestJavascript(CURRICULUM_SCRIPTS['Random Clip.js'],
    //         CURRICULUM_RESULTS['Random Clip'], done);
    // });

    it('should compile Amen Break correctly in Python', function(done) {
        runTestPython(CURRICULUM_SCRIPTS['Amen Break.py'],
            CURRICULUM_RESULTS['Amen Break'], done);
    });

    it('should compile Amen Break correctly in JavaScript', function(done) {
        runTestJavascript(CURRICULUM_SCRIPTS['Amen Break.js'],
            CURRICULUM_RESULTS['Amen Break'], done);
    });

    // it('should compile Amen Remix correctly in Python', function(done) {
    //     runTestPython(CURRICULUM_SCRIPTS['Amen Remix.py'],
    //         CURRICULUM_RESULTS['Amen Remix'], done);
    // });
    //
    // it('should compile Amen Remix correctly in JavaScript', function(done) {
    //     runTestJavascript(CURRICULUM_SCRIPTS['Amen Remix.js'],
    //         CURRICULUM_RESULTS['Amen Remix'], done);
    // });
});
