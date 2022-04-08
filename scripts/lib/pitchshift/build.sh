#!/bin/sh
emcc dsp.c -o worklet.js --extern-pre-js worklet-pre.js --extern-post-js worklet-post.js -s SINGLE_FILE=1 -s BINARYEN_ASYNC_COMPILATION=0 -s ENVIRONMENT='shell' -O3 -Wall
