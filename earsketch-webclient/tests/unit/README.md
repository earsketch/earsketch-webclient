# EarSketch Unit Tests

## Unit Tests

Unlike integration tests, unit tests are meant to target a much smaller "units"
and usually mock dependencies that are not being tested.

There are two major kinds of unit tests:

* Black box tests: test valid or invalid inputs and verify correct outputs
* White box tests: write tests that will execute every line of code

Both kinds of tests should be used for ensuring good code validation and testing
coverage!

### Requirements

To use these integration tests, you must install karma and jasmine
and one or more browser launchers for karma. All available through npm:

    $ npm install -g karma
    $ npm install -g karma-jasmine
    $ npm install -g karma-firefox-launcher
    $ npm install -g karma-chrome-launcher
    $ npm install -g karma-safari-launcher

## Running The Unit Tests

From within the tests/unit directory:

    $ karma start unit.conf.js

## Adding Unit Tests

Read about [Angular unit tests](https://docs.angularjs.org/guide/unit-testing)

Skim the [Jasmine tutorial](http://jasmine.github.io/2.1/introduction.html)

Each unit test should be a \*.spec.js file. To create your own, use
audiolibrary.spec.js as an example.

### Tips for writing good unit tests

* [Write the tests first.](https://en.wikipedia.org/wiki/Test-driven_development)
* Use [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection)
 to break up components into testable chunks.
* Aim for code with
"low [coupling](https://en.wikipedia.org/wiki/Coupling_%28computer_programming%29) and
high [cohesion](https://en.wikipedia.org/wiki/Cohesion_%28computer_science%29)."
* Avoid global variables. Pass everything you need as function parameters! This
 makes it easier to mock dependencies and spy on objects.
* [This talk](https://www.destroyallsoftware.com/talks/boundaries) goes over
 some good principles.
* Use dump() for printing in the command line. console.log only works in browsers.

## Coverage

Ideally our unit tests should cover as much as possible.
Currently the following services have unit tests:

* audiolibrary.js

