# EarSketch Web Client App

## Getting started with client development
1. Clone the EarSketch repository from `https://github.com/GTCMT/earsketch-webclient`.
2. Install the latest-stable `node.js` and `npm`. If you have them already, check if the versions are at least >=10 and >=6, respectively.
3. In `<repo>/webclient`, run `npm install`. This installs JS libraries and may take a while.
4. Run `npm run serve` to start a local dev server. This should automatically open the ES client application hosted at `localhost:8080`.
5. Optionally, you can run `npm run build-dev` to generate distribution files (`webclient/index.html` and bundle files in `webclient/dist`). They can be loaded by the same webpack-dev-server instance from step 4 (`localhost:8080`) by another localhost server with `webclient` as the public folder. *Note: Do not check in the generated `index.html` or `dist/` files with git.*
---

## Webpack AMD (require-like) loading / building overview
- `Webpack` is an extensive source-code loader / builder / etc. that has replaced the now-obsolete `require.js` in summer 2020.
- Asynchronous module definition (AMD) is a dependency-loading mechanism used in `node.js` and `require.js`. We are currently moving away from AMD (as well as the ancient UMD loading using `<script>` tags) to `import`-based ESM loading.

### Configuration files
- Note: all under `./webclient` directory.
- `webpack.common.js`: The base config file for `webpack`. May need modifications when adding / removing libraries outside npm or dealing with global / constant variables.
- `webpack.dev.js`: Configs specific to local development (not for the DEV server!).
- `webpack.prod.js`: Configs for the release build (used on DEV and PROD servers). Generates minified `dist/bundle.js` loaded in `index.html`.
- `package.json`: The npm config file organizing the library dependencies and build commands.
- `package-lock.json`: Describes the `node_modules` structure. Do not modify.
- `.babelrc`: The config file for Babel, an ES6+ to ES5 transpiler.
- `scripts/src/index.js`: The JS entry-point for loading all the modules in order (AMD only).

### `webpack.common.js`
- `resolve.alias`: Defines module names for import / require. For AMD loading in `index.js`, all our source-code files are shimmed here. This won't be necessary as much once we start using the ESM imports in individual source-code files.
- `module.rules`: This is where we configure various file loaders (preprocessors) and source-code transformers.
  + HappyPack: Runs Babel transpiler in multiple threads (thus faster).
  + Exports loader: Makes certain variables in the source code available for import / require. Exported names are then typically treated as semi-global variables in our codebase -- something to be avoided in the future.
- `plugins.(providePlugin)`: Exports and/or exposes certain variables as semi-global variables. Again, only a tentative solution used in the current AMD loading.

### `index.js`
- The entry point for our JavaScript madness.
- Some modules are loaded and initialized here (e.g., `jquery` and `jqueryUI`) as some libraries assume the availability of other objects in the context. Something to be avoided in our own dev process.
- Some of the `exports-loader` outputs are assigned to the global scope with `Object.assign(window,src)`. Again, to be eliminated in the future.
- `require(['angular'], callback)` is the gist of AMD loading, where the many of the `angular` modules depends on asynchronously-initialized `angular`. You might need to add other modules to the preloading list.
- `windows.app = angular.module(...)`: The main `angular` module is created here, and made available as a global variable `app`.
- `angular.bootstrap(document,...)`: The main `angular` module is attached to the HTML body here.

### Guidelines for adding new modules
#### Third-party libraries
- Install with npm whenever possible. Notify other developers to run `npm install` after pushing.
- Prefer `import`-ing the library in individual source files where necessary than loading in `index.js`.
- For older (unmaintained) libraries, you may need to add a shim for a specific file and/or expose a variable as module with `exports-loader`.

#### New custom source files
- Always export individual / default variables, and import in each dependant files (e.g., `import '../new_feature/NewComponent.js'`).
- Avoid adding new shims to `webpack.common.js` and/or loading in `index.js`.

---

<!--- Dev Conventions (to be improved by everyone!) --->
## Coding Conventions

### Writing text
Before adding any static text to the web client, please internationalize it so it can be translated! See our [internationalization guide](i18n.md).

### Printing debug messages to the browser console
Use esconsole(message, [tags], ...) for controlled printing and logging. You can use custom tags with lower case or upper case, and multiple tags.

By default, everything printed through esconsole() is added to the error reporting log (up to the newest 100 messages). Some tags such as 'TEMP', 'EXCLUDE', 'NOLOG' are set to be excluded from the logging. They can still be logged with include={tags} URL parameter or using esconsole(msg, tags, <null>, logLevel=2).

### List of commonly used tags
- The default tag with esconsole(message, <empty>): 'DEV'
- Always printed & logged whatsover: 'WARNING', 'ERROR', 'FATAL'
- Also always logged for error report: 'INFO', 'USER'

- Excluded from logging by default: 'TEMP', 'EXCLUDE', 'NOLOG', 'META
- Excluded from printing by default: none

- General debugging: 'DEV' (default), 'DEBUG' (check values, etc.), 'INFO' (for logging), 'TRACE' (for checking execution orders, etc.)
- Verbose Messages: 'LONG'
- App Lifecycle: 'INIT', 'COMPILE', ...
- User-input-related: 'USER', 'UI', ...
- Controllers: 'CTRL', 'DAW', 'IDE', ...
- Models, Services: 'MODEL', 'SERVICE', 'WS' (for web services), 'PT' (for pass through), ...
- Miscellaneous: 'MISC', 'META'


<hr>
<!--- Misc Tools --->
## Grunt (task automator)
Grunt is used to make running tasks such as JSDoc generation, LESS compilation, and unit testing easier.
http://gruntjs.com/getting-started

### Usage
Install Node (npm) if you have not done already.

Install Grunt-cli, preferably to your global environment:

    sudo npm install -g grunt-cli

Install npm dependencies. If any of the tasks does not work, you should try installing (or updating) packages first.

    cd (webclient directory)
    npm install

To run all the default grunt tasks:

    cd (webclient directory)
    grunt

To run a specific task, such as jsdoc building:

    cd (webclient directory)
    grunt jsdoc

<hr>
## Bower
Bower is a client-side dependency-management tool. Bower components are installed for angular, bootstrap, jquery, and less. These are installed under webclient/scripts/vendor/bower_components. Currently, additional plugins for those libraries are installed in their respective folders in the parent director (ie angular-mocks, angular-ui-router, etc).

To be written more.


<hr>
<!--- Documentation --->
## WebClient (JS) documentation
We use JSDoc to generate the developer documentation from the code.

### Preparation
Install [npm](https://www.npmjs.com/) if you have not already.

(Optional) install JSDoc globally on your system:

    sudo npm install jsdoc -g

Install dependencies:

    cd <webclient directory>
    npm install

### Generating documentation
#### Using Grunt
    cd <webclient directory>
    grunt doc

#### Not using Grunt
    cd <webclient directory>
    ./node_modules/.bin/jsdoc -c conf.json
If you installed jsdoc globally:

    jsdoc -c conf.json

The HTML documentation will be generated under ./webclient/doc

### Writing documentation
[JSDoc documentation](http://usejsdoc.org/)

### Configuration
webclient/conf.json is used for configuring jsdoc.


<hr>
<!--- CSS stuff --->
## Less
LESS is a CSS extension with variables, etc. that needs to be compiled into a regular css file. Please be careful that if you work directly on a regular CSS file, it may be overwritten when someone compiles a paired LESS file.

### Setup
With npm, install less:

    cd <webclient directory>
    npm install

(Optional) install Less globally on your system:

    sudo npm install less -g


### Compiling
Using grunt (Make sure to install / update the npm packages first):

    cd <webclient folder>
    grunt less

### Manually compiling using the compile_less.sh script

All scripts cam be compiled by running ./compile_less.sh in the /css directory

All less variables are stored in css/variables.less

All less files are included in /css/allstyles.less + /css/allstyles.css

### Manually compiling individual scripts: using the lessc command in the css folder

    ./node_modules/less/bin/lessc styles.less styles.css

If you installed Less globally:

    lessc /css/styles.less /css/styles.css

<hr>
<!--- Authoring --->
## Authoring
There are many additional IDE plugins for syntax highlighting and automatic compilation. I suggest at least using syntax highlighting for Sublime Text. This can be installed with the package manager.


<hr>
<!--- Python --->
## Skulpt

<hr>
<!--- --->
## Integration Testing

Integration tests can be found in ```webclient/tests/integration```

**For information on how to run or add tests, please check the README in the above directory.**

Currently there are integration tests for
1. The compiler
2. Specific user errors

The purpose of [integration tests](https://en.wikipedia.org/wiki/Integration_testing)
is for testing groups of modules together. In our case we want to test the compiler
and a number of scripts that we want to guarantee will produce the correct output
from our curriculum, Coursera course, etc.

Typically integration tests are only run if all unit tests are passing. For our
purposes, the integration tests make real requests to the server whereas in a
typical unit test server requests are mocked.

For integration testing Angular we use [Karma](http://karma-runner.github.io) with
[Jasmine](https://github.com/karma-runner/karma-jasmine) and
[this ngMidwayTester](https://github.com/yearofmoo/ngMidwayTester) library to help
mock parts of Angular we don't care about.

## Unit Testing

Unit tests can be found in ```webclient/tests/unit```

**For information on how to run or add tests, please check the README in the above directory.**

[Unit tests](https://en.wikipedia.org/wiki/Unit_testing) are meant to test the
integrity of small "units" of code. In order to do this, dependencies are
typically mocked so only the code, or unit, that is being tested gets run.

For unit testing we use [Karma](http://karma-runner.github.io) with
[Jasmine](https://github.com/karma-runner/karma-jasmine).

<hr>
<!--- --->
## Third-Party Libraries

In general, we need to strike a balance between using third-party libraries to incorporate
robust functionality with minimal effort and becoming overly dependent on poorly-maintained
or otherwise constrained third-party libraries.

Before adding a library to the project, you must get approval from Jason. Also, we cannot
use any GPL/LPGL libraries.