/* 
 *  earsketch-dsp.js - a fast digital signal processing  library for javascript
 *  transpiled from C by emscripten  
 *  Created by Juan Martinez Nieto <jcm7@gatech.edu> on 2015-09-01.
 *
 */

import ESMessages from "../src/data/messages";

//EARSKETCH DSP ESSENTIAL VARIABLES

//var ESDSP_MAX_BUFFERSIZE = 5*44100*60;

declare var Module: any

let initDSP: any
let fillHann: any
let windowSignal: any
let windowSignalQ: any
let rfft: any
let convert: any
let unconvert: any
let overlapadd: any
let interpolateFit: any
let interpolateFitVar: any

var ESDSP_NumberOfSamples=0;
var ESDSP_WINDOW_SIZE = 1024;
export const HOP_SIZE = 256;

var ESDSP_MAX_BUFFERSIZE = 8388608;
var ESDSP_MAX_OUTSAMPLES = 2*ESDSP_MAX_BUFFERSIZE;
var ESDSP_MAX_FRAMES =  ESDSP_MAX_BUFFERSIZE/HOP_SIZE;

var ESDSP_FRAMES=0;
var ESDSP_OUTSAMPLES=0;
var ESDSP_INTERSAMPLES=0;


//HEAP VARIABLES
var WW_HEAP: any
var HH_HEAP: any
var LASTPH_HEAP: any
var ACCUMPH_HEAP: any
var MAGFREQ_HEAP: any
var YOVERLAP_HEAP: any
var YINTERP_HEAP: any
var YHOPOUT_HEAP: any

var ZERO_FOUTSAMPLES: any

//Create the Heap
setupHeap();

function esdsploadtest(){
	console.log('EARSKETCH DSP library LOADED ....');
}

function setupCWrappers(){
	initDSP = Module.cwrap('initDSP', 'number');
	fillHann = Module.cwrap('fillHann', 'number', ['number','number']);
	windowSignal = Module.cwrap('windowSignal', 'number', ['number','number','number']);
	windowSignalQ = Module.cwrap('windowSignalQ', 'number', ['number','number','number','number']);
	rfft = Module.cwrap('rfft', 'number', ['number','number','number']);
	convert = Module.cwrap('convert', 'number', ['number','number','number','number','number']);
	unconvert = Module.cwrap('unconvert', 'number', ['number','number','number','number','number']);
	overlapadd = Module.cwrap('overlapadd', 'number', ['number','number','number','number']);
	interpolateFit = Module.cwrap('interpolateFit', 'number', ['number','number','number','number','number']);
	interpolateFitVar = Module.cwrap('interpolateFitVar', 'number', ['number','number','number', 'number','number','number', 'number']);
}

//todo:check memory limits
function initHeap(){
	console.log('Zeroing overlapp Array !!!');
    YOVERLAP_HEAP.set(ZERO_FOUTSAMPLES);
}

function setupHeap(){
	console.log('Creating ES DSP Heap !!!');
    
    ZERO_FOUTSAMPLES = new Float32Array(ESDSP_MAX_OUTSAMPLES);
    //yoverlap = (float *)calloc(outSamples , sizeof(float));
    //yinterp = (float *)calloc(interSamples,sizeof(float));

    //TODO:REVIEW EMSCRIPTEN HEAP FOR OVERLAP AND INTERPOLATION  EXTENDS TOTAL MEMORY 
    //IN THE HEAP OR USE STANDARD FLOAT ARRAY AND USE THE COPY FUNCTION


	var nDataBytes = ESDSP_WINDOW_SIZE * Float32Array.BYTES_PER_ELEMENT;
	var hhPtr = Module._malloc(nDataBytes);
	HH_HEAP = new Float32Array(Module.HEAPF32.buffer, hhPtr, ESDSP_WINDOW_SIZE);


	var wwPtr = Module._malloc(nDataBytes);
	WW_HEAP = new Float32Array(Module.HEAPF32.buffer, wwPtr, ESDSP_WINDOW_SIZE);


	nDataBytes = (ESDSP_WINDOW_SIZE/2 +1) * Float32Array.BYTES_PER_ELEMENT;
	var lastphPtr = Module._malloc(nDataBytes);
	LASTPH_HEAP = new Float32Array(Module.HEAPF32.buffer, lastphPtr, ESDSP_WINDOW_SIZE/2 +1);


	nDataBytes = (ESDSP_WINDOW_SIZE + 2) * Float32Array.BYTES_PER_ELEMENT;
	var magfreqPtr = Module._malloc(nDataBytes);
	MAGFREQ_HEAP = new Float32Array(Module.HEAPF32.buffer, magfreqPtr, ESDSP_WINDOW_SIZE + 2);


	nDataBytes = (ESDSP_WINDOW_SIZE/2 +1) * Float32Array.BYTES_PER_ELEMENT;
	var accumphPtr = Module._malloc(nDataBytes);
	ACCUMPH_HEAP = new Float32Array(Module.HEAPF32.buffer, accumphPtr, ESDSP_WINDOW_SIZE/2 +1);


	nDataBytes = (ESDSP_MAX_OUTSAMPLES) * Float32Array.BYTES_PER_ELEMENT;
	var yoverlapPtr = Module._malloc(nDataBytes);
	YOVERLAP_HEAP = new Float32Array(Module.HEAPF32.buffer, yoverlapPtr, ESDSP_MAX_OUTSAMPLES);
	//YOVERLAP_HEAP.set(ZERO_FOUTSAMPLES);

	nDataBytes = (ESDSP_MAX_BUFFERSIZE) * Float32Array.BYTES_PER_ELEMENT;
	var yinterpPtr = Module._malloc(nDataBytes);
	YINTERP_HEAP = new Float32Array(Module.HEAPF32.buffer, yinterpPtr, ESDSP_MAX_BUFFERSIZE);


	//yhopout = (int *)calloc(frames , sizeof(int));
	//YHOPOUT_HEAP
	nDataBytes = (ESDSP_MAX_FRAMES) * Int32Array.BYTES_PER_ELEMENT;
	var yhopoutPtr = Module._malloc(nDataBytes);
	YHOPOUT_HEAP = new Int32Array(Module.HEAP32.buffer, yhopoutPtr, ESDSP_MAX_FRAMES);

}

function initDSPLibrary(){
	console.log('initDSPLibrary... ');
	setupCWrappers();
	//setupHeap();
	initDSP();
	fillHann(HH_HEAP.byteOffset,ESDSP_WINDOW_SIZE);	
}

function freeHeap(){
	Module._free(HH_HEAP.byteOffset);
	Module._free(WW_HEAP.byteOffset);
	Module._free(LASTPH_HEAP.byteOffset);
	Module._free(MAGFREQ_HEAP.byteOffset);
	Module._free(ACCUMPH_HEAP.byteOffset);
	Module._free(YOVERLAP_HEAP.byteOffset);
	Module._free(YINTERP_HEAP.byteOffset);
	Module._free(YHOPOUT_HEAP.byteOffset);
}



function setOutSample(envelope: Float32Array){
	var step,alpha , hopOut: any;
    ESDSP_OUTSAMPLES = 0;               
    for (let f=0; f<ESDSP_FRAMES; ++f) {        
		step = envelope[f];
        alpha =  Math.pow (2.0, step/12.0);
        hopOut = Math.round(alpha*HOP_SIZE);
        ESDSP_OUTSAMPLES = ESDSP_OUTSAMPLES + hopOut;
        
    }
    ESDSP_OUTSAMPLES = ESDSP_OUTSAMPLES +ESDSP_WINDOW_SIZE - hopOut;

    if(ESDSP_OUTSAMPLES > ESDSP_MAX_OUTSAMPLES){
    	return false;
    }
    return true;

}

function setVariableShift(envelope: Float32Array){
	var step,alpha , hopOut;

                    
    for (let f=0; f<ESDSP_FRAMES; ++f) {
        step = envelope[f];
        alpha =  Math.pow (2.0, step/12.0);
        hopOut = Math.round(alpha*HOP_SIZE);
        YHOPOUT_HEAP[f] = hopOut;
    }
}



export function computeNumberOfFrames(totalsamples: number){

	return  1+ Math.floor(  (totalsamples-ESDSP_WINDOW_SIZE) / HOP_SIZE );
}

//return an audio buffer

export function computePitchShift(AudioData: Float32Array, envelope: Float32Array, context: AudioContext) { 
	console.log ('Start computePitchShift ...');


	console.log('WINDOW_SIZE '+ ESDSP_WINDOW_SIZE + ' HOP SIZE '+HOP_SIZE);
	console.log('Buffer Samples '+ AudioData.length );

	if(AudioData.length > ESDSP_MAX_BUFFERSIZE){
		throw ESMessages.esaudio.pitchshiftTooLong;
	}

	ESDSP_NumberOfSamples = AudioData.length ;
	ESDSP_FRAMES = 1+ Math.floor(  (ESDSP_NumberOfSamples-ESDSP_WINDOW_SIZE) / HOP_SIZE );


	//Compute Frame Envelope

    if(!setOutSample(envelope)){
    	throw "MAX INTERPOLATION SIZE REACHED";
    }

    ESDSP_INTERSAMPLES = ESDSP_NumberOfSamples;//Math.floor(OUTSAMPLES/alpha);

	initDSPLibrary();
	
	setVariableShift(envelope);

	initHeap();
	
	console.log('Buffer Frames '+ ESDSP_FRAMES );
    console.log('OUTSAMPLES ' +  ESDSP_OUTSAMPLES);
    console.log('INTERSAMPLES ' +  ESDSP_INTERSAMPLES);

	var QWindow;// = 1.0 / Math.sqrt(((WINDOW_SIZE/HOPOUT)/2.0));
	//console.log('QWindow ' +  QWindow);

	var index = 0;
	var offset = 0;
    for (let f=0; f<ESDSP_FRAMES; ++f) {
    	//Nota that subarray is a pointer to the AudioData not a new array
    	//WW.set(AudioData.subarray(index,index+WINDOW_SIZE));
    	QWindow = 1.0 / Math.sqrt(((ESDSP_WINDOW_SIZE/YHOPOUT_HEAP[f])/2.0));

    	WW_HEAP.set(AudioData.subarray(index,index+ESDSP_WINDOW_SIZE));
    	//HANNING WINDOW
    	windowSignal(HH_HEAP.byteOffset,WW_HEAP.byteOffset, ESDSP_WINDOW_SIZE);
    	//FORWARD REAL FFT
    	rfft(WW_HEAP.byteOffset, ESDSP_WINDOW_SIZE/2, 1);
    	//COMPUTING INSTANTANEOS FREQUENCY
    	convert( WW_HEAP.byteOffset, MAGFREQ_HEAP.byteOffset, ESDSP_WINDOW_SIZE/2, HOP_SIZE,LASTPH_HEAP.byteOffset);
    	//COMPUTE COMPLEX FFT FROM INSTANTANEOUS FREQUENCY
    	unconvert(  MAGFREQ_HEAP.byteOffset,  WW_HEAP.byteOffset, ESDSP_WINDOW_SIZE/2, YHOPOUT_HEAP[f], ACCUMPH_HEAP.byteOffset);
    	//INVERSE FFT
    	rfft(WW_HEAP.byteOffset, ESDSP_WINDOW_SIZE/2, 0);
		//WEIGTHED HANNING WINDOW
    	windowSignalQ(HH_HEAP.byteOffset,WW_HEAP.byteOffset, ESDSP_WINDOW_SIZE, QWindow);

    	index = index +HOP_SIZE;
		overlapadd(WW_HEAP.byteOffset,YOVERLAP_HEAP.byteOffset,  offset, ESDSP_WINDOW_SIZE);

    	offset = offset + YHOPOUT_HEAP[f];
    }
	console.log('Interpolation ...');

	interpolateFitVar(YOVERLAP_HEAP.byteOffset,YINTERP_HEAP.byteOffset, YHOPOUT_HEAP.byteOffset,  ESDSP_OUTSAMPLES,ESDSP_INTERSAMPLES,  ESDSP_FRAMES ,HOP_SIZE);

    console.log('after DSP Interpolation');

	var audiobuffer = context.createBuffer(1, ESDSP_INTERSAMPLES, context.sampleRate);  
	console.log('copy buffer ');

	var pcmChannel = audiobuffer.getChannelData(0);
	var ytemp = 	YINTERP_HEAP.subarray(0,ESDSP_INTERSAMPLES);
	pcmChannel.set(ytemp);
	//audiobuffer.copyToChannel(YINTERP_HEAP,0,0);  

    //freeHeap();
    //console.log('Free Heap');

    return audiobuffer;
}
