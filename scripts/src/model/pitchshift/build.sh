#!/bin/sh
emcc dsp.c -o earsketch-dsp.js -s TOTAL_MEMORY=134217728 -s EXPORTED_FUNCTIONS="['_rfft', '_cfft' , '_initDSP', '_fillHann' , '_windowSignal', '_windowSignalQ', '_interpolateFit' , '_interpolateFitVar' ,'_overlapadd','_convert' , '_unconvert']" -s EXPORTED_RUNTIME_METHODS='["cwrap"]' -s ENVIRONMENT='worker' -O2 --memory-init-file 0
