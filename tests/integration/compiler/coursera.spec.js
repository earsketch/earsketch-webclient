import * as compiler from '../../../src/app/compiler'

describe('Coursera example scripts', function() {
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
                expect(err.toString()).toEqual(null, script);
                done();
            });
        });
    }

    it('should compile 5.3.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.3.1'],
                      COURSERA_RESULTS['5.3.1'], done);
    });

    it('should compile 5.4.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.4.1'],
                      COURSERA_RESULTS['5.4.1'], done);
    });

    it('should compile 5.5.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.5.1'],
                      COURSERA_RESULTS['5.5.1'], done);
    });

    it('should compile 5.5.2 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.5.2'],
                      COURSERA_RESULTS['5.5.2'], done);
    });

    it('should compile 5.5.3 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.5.3'],
                      COURSERA_RESULTS['5.5.3'], done);
    });

    it('should compile 5.6.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.6.1'],
                      COURSERA_RESULTS['5.6.1'], done);
    });

    it('should compile 5.6.2 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.6.2'],
                      COURSERA_RESULTS['5.6.2'], done);
    });

    it('should compile 5.6.3 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.6.3'],
                      COURSERA_RESULTS['5.6.3'], done);
    });

    it('should compile 5.7.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.7.1'],
                      COURSERA_RESULTS['5.7.1'], done);
    });

    it('should compile 5.8.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.8.1'],
                      COURSERA_RESULTS['5.8.1'], done);
    });

    it('should compile 5.9.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.9.1'],
                      COURSERA_RESULTS['5.9.1'], done);
    });

    it('should compile 5.10.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.10.1'],
                      COURSERA_RESULTS['5.10.1'], done);
    });

    it('should compile 5.10.2 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['5.10.2'],
                      COURSERA_RESULTS['5.10.2'], done);
    });

    it('should compile 6.1.1 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['6.1.1'],
                      COURSERA_RESULTS['6.1.1'], done);
    });

    it('should compile 6.1.2 correctly.', function(done) {
        runTestPython(COURSERA_SCRIPTS['6.1.2'],
                      COURSERA_RESULTS['6.1.2'], done);
    });

});
