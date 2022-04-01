#!/bin/sh
emcc dsp.c -o worklet.js --pre-js worklet-pre.js --extern-post-js worklet-post.js -s SINGLE_FILE=1 -s BINARYEN_ASYNC_COMPILATION=0 -s EXPORTED_RUNTIME_METHODS='["cwrap"]' -s ENVIRONMENT='shell' -O2 --memory-init-file 0
