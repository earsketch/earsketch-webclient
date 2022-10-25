# EarSketch Integration Tests

## Integration Tests

These tests differ from unit tests because they connect the entire chain of components from the server backend to the client frontend. Nothing is mocked.

Integration tests are meant to ensure groups of components are working together correctly.

### Requirements

To use these integration tests, you must install karma, jasmine, and one or more browser launchers for karma. All available through npm:

    $ npm install -g karma
    $ npm install -g karma-jasmine
    $ npm install -g karma-firefox-launcher
    $ npm install -g karma-chrome-launcher
    $ npm install -g karma-safari-launcher

### Script Integration Tests

The Script integration tests are meant to verify the integrity of published EarSketch scripts. They verify that all EarSketch scripts in the curriculum and Coursera produce the expected output.

Currently the script integration tests cover the curriculum up to the end of Unit 2 and selected Coursera scripts.

#### Running the Script Integration Tests

From within the integration/scripts directory:

    $ npx karma start scripts.conf.js

#### Adding Script Integration Tests

Each test suite is made up of 3 files:

- a .spec.js file that describes the tests using the Jasmine framework
- a .scripts.js file that contains all of the scripts to be tested
- a .results.js file that contains all of the expected result objects

To add your own or create new test suites, use the curriculum suite as an example.

For convenience, EarSketch has logs that output human-friendly versions of scripts and script JSON results that can be copy-pasted into .scripts.js and .results.js files. However, these logs are not visible by default. To see these logs add the ?include=NOLOG query parameter to your EarSketch URL. Then you can search for NOLOG in your JavaScript console.

### Error Integration Tests

These tests are meant to verify that certain errors are output under certain conditions.

These tests are unfinished.
