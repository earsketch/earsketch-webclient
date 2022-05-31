# earsketch-webclient

The React web browser client for EarSketch


## Local client build

1. Clone earsketch-webclient and earsketch-curriculum into the same directory

```bash
git clone https://github.com/GTCMT/earsketch-webclient.git
git clone https://github.com/GTCMT/earsketch-curriculum.git
```

2. Run curriculum `local_dev_curriculum_asciidoc_builder.sh` _(python3 and BeautifulSoup4 package required)_

```bash
cd earsketch-curriculum/scripts

./local_dev_curriculum_asciidoc_builder.sh /path/to/earsketch-curriculum
# creates earsketch-curriculum/curriculum-local/*.html
# creates earsketch-curriculum/curriculum-local/curr_toc.js
# creates earsketch-curriculum/curriculum-local/curr_pages.js
# creates earsketch-curriculum/curriculum-local/curr_pages.js
```

3. Confirm the earsketch-webclient/curriculum link is working _(windows only)_

```bash
ls -l earsketch-webclient/curriculum
# points to ../earsketch-curriculum/curriculum-local/

# if you do not see directory contents, including curr_toc.js, then re-create it
cd earsketch-webclient
rm curriculum
ln -s ../earsketch-currciulum/curriculum-local curriculum
```

4. Serve the client with npm

```bash
npm install
grunt less     # prepares css files
npm run serve  # serves client
```

More details in `earsketch-webclient/DeveloperDocs/build-guide-web-client.md`.


## Client Overview

This is a general overview of the web client architecture.

### Libraries

- Skulpt, for running Python code in the browser
- DSP.js
- Ace, for editing code
- D3.js
- jQuery
- Lodash
- MathJax
- lunr, for search
- hilitor, for highlighting search keywords
- webpack
- i18next ([internationalization guide](DeveloperDocs/i18n.md))

### Layout

Everything is under `webclient/`. Most of the subdirectories contain resources (audio, images, HTML, CSS). Some relevant contents:

- `webpack.*.js`
  webpack configuration files. See `build-guide-web-client.md` for more details.

- `tests/`
  - `manual/`
    Manual tests. Developers fill these out and upload the results to Teams, under Test Results on #estech.

- `scripts/`
  Main source directory.


  - `lib/`
    Third-party libraries (not included in `package.json`) and parts of our code that need to be separate. Note that our copy of `droplet` is customized.

  - `src/`
    Our source code.
    - `index.js`
      Outermost entry point: loads modules in order.

    - `api/`
      Defines the EarSketch API for use in user code (JS or Python).

    - `data/`
      Miscellaneous JSON data stored in globals: `ESApiDoc`, `ESMessages`, `ESNum_Slides`, `ESCurr_*`.

    - `locales/`
      Language/locale-specific strings files for translation support

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

### Notes and Maintenance TODOs

- `doc/` is the destination folder for inline JSDoc generation, but it is kind of defunct.

- Bower is around but unused, previously due to people including hard copies of libraries, and (going forward) due to our using webpack + npm instead.

- `scripts/src/model/modules.js` defines namespaces prefixed by `EarSketch.`, but it is essentially defunct. We should remove it since we're trying to clean up the global namespace anyway.
(The only two namespaces it defines are `EarSketch.Global.ExitFlag` and `EarSketch.analytics`, and neither is actually in use as far as I can tell.)
