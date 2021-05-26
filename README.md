# earsketch-webclient
The AngularJS / React web browser client for EarSketch

# Client Overview

This is a general overview of the web client architecture.

## Libraries

- AngularJS (but we're transitioning to React)
- Skulpt, for running Python code in the browser
- DSP.js
- Ace, for editing code
- D3.js
- jQuery
- lodash
- MathJax
- lunr, for search
- hilitor, for highlighting search keywords
- Webpack

## Layout

Everything is under `webclient/`. Most of the subdirectories contain resources (audio, images, HTML, CSS). Some relevant contents:

- `webpack.*.js`
  WebPack configuration files. See `build-guide-web-client.md` for more details.

- `tests/`
  - `manual/`
    Manual tests. Developers fill these out and upload the results to Teams, under Test Results on #estech.

- `scripts/`
  Main source directory.

  - `vendor/`
    Third-party libraries. The plan is to do away with this in favor of package management via npm.

  - `lib/`
    Third-party libraries that we have customized.

  - `src/`
    Our source code.
    - `index.js`
      Outermost entry point: loads modules in order.

    - `api/`
      Defines the EarSketch API for use in user code (JS or Python).

    - `data/`
      Miscellaneous JSON data stored in globals: `ESApiDoc`, `ESMessages`, `ESNum_Slides`, `ESCurr_*`.

    - `model/`
      - `applyeffects.js`
        User-accessible effects, built on top of WebAudio nodes.

      - `esutils.js`
        Utility functions used throughout the code.

    - `setup.js`
      Connects to SoundCloud; user ID is determined by the host.

    - `app/`

      Our main source directory.
      Contains a variety of controllers, including:
      - `ideController.js`

      And many others. If you're looking at some big, visible piece of client functionality and you're wondering where it lives, the answer is probably `webclient/scripts/src/app`.

      More code lives in the subdirectory `services/`. The modules here don't touch the UI directly; rather, the are invoked by the relevant controllers. (For example, `dawController.js`(deprecated/removed) uses `services/player.js`, `ideController.js` uses `services/compiler.js`, etc.)

## Notes and Maintenance TODOs

- `doc/` is the destination folder for inline JSDoc generation, but it is kind of defunct.

- Bower is around but unused, previously due to people including hard copies of libraries, and (going forward) due to our using Webpack + NPM instead.

- There are some rogue files lying around that are ripe for removal, such as `scripts/lib/levenshtein-search.js`.

- `scripts/src/model/modules.js` defines namespaces prefixed by `EarSketch.`, but it is essentially defunct. We should remove it since we're trying to clean up the global namespace anyway.
(The only two namespaces it defines are `EarSketch.Global.ExitFlag` and `EarSketch.analytics`, and neither is actually in use as far as I can tell.)