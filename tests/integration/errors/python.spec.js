import * as compiler from '../../../src/app/compiler'

var SITE_DIRECTORY = '/base';

describe('Testing friendly Python errors', function() {
    var tester;

    beforeEach(function() {
        angular.module('ui.router',[]);
        angular.module('ui.bootstrap',[]);
        angular.module('ui.utils',[]);
        angular.module('ui.layout',[]);
        angular.module('ngAnimate',[]);
        angular.module('ngFileUpload',[]);
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
    });

    afterEach(function() {
        try {
            tester.destroy();
        } catch(e) {}
        tester = null;
    });

    it('should say init is not defined', function(done) {
        var script = 'init()\nfinish()';

        tester.visit('/', function() {
            compiler.compilePython(script).then(function(result) {
                done(new Error('Script should fail.'));
            }).catch(function(err) {
                console.log(err.toString());
                expect(err.toString()).toEqual(
                    "NameError: name 'init' is not defined on line 1"
                );
                done();
            });
        });
    });

});
