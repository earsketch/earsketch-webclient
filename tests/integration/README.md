# EarSketch Integration Tests

## Integration Tests

These tests differ from unit tests because they connect the entire chain of components from the server backend to the client frontend. Nothing is mocked.

Integration tests are meant to ensure groups of components are working together
correctly.

### Requirements

To use these integration tests, you must install karma, jasmine, ngMidwayTester, and one or more browser launchers for karma. All available through npm:

    $ npm install -g karma-cli
    $ npm install -g karma-jasmine
    $ npm install ng-midway-tester
    $ npm install -g karma-firefox-launcher
    $ npm install -g karma-chrome-launcher
    $ npm install -g karma-safari-launcher

**Note that ng-midway-tester should not be installed globally.**

### Modifying Test Configs as You Develop

When we add a new angular module or create a new service, the existing tests are likely to fail before fixing the config config and spec files.

When you add a new angular module that is listed in `angular.module('EarSketchApp', ['__here__'])` in `scripts/src/index.js`, you should also include it in each of the spec files (such as `api.spc.js`) with `angular.module('__name__', [])`.

When you create a new angular service or factory used in various places in the EarSketch app, you should also include it in the list of loaded files in `compiler.conf.js`. 


### Compiler Integration Tests

The compiler integration tests are meant to verify the integrity of published EarSketch scripts. They verify that all EarSketch scripts in the curriculum and Coursera produce the expected output before we release 

Currently the compiler integration tests cover the curriculum up to the end of Unit 2 and selected Coursera scripts.


#### Running the Compiler Integration Tests

From within the integration/compiler directory:

    $ karma start compiler.conf.js

#### Adding Compiler Integration Tests

Each test suite is made up of 3 files:

- a .spec.js file that describes the tests using the Jasmine framework
- a .scripts.js file that contains all of the scripts to be tested
- a .results.js file that contains all of the expected result objects

To add your own or create new test suites, use the curriculum suite as an example.

For convenience, EarSketch has logs that output human-friendly versions of scripts and script JSON results that can be copy-pasted into .scripts.js and .results.js files. However, these logs are not visible by default. To see these logs add the ?include=NOLOG query parameter to your EarSketch URL. Then you can search for NOLOG in your JavaScript console.

### Error Integration Tests

These tests are meant to verify that certain errors are output under certain conditions.

These tests are unfinished.


