//
//  main.c
//  EMSCRPitchShift
//
//  Created by Juan Carlos Martinez on 6/26/15.
//  Copyright (c) 2015 gtcmt. All rights reserved.
//  FFT C Routines based on Richad Moore's Elements of Computer Music
//  sligthly modified for EMSCRIPTEN support


#include <math.h>
#include <string.h>
#include <emscripten.h>

#define ZEROAMP 0.000001

float TWOPI, PI;

void initDSP(){
    PI = 4.*atan( 1. );
    TWOPI = 8.*atan( 1. );
}
//Hanning modified * 2 just for comparison with MATLAB
//Put the original after testing
void fillHann(float ww[], int N)
{
    int n2 = N*2 +1;
    for (int n=0; n<N; n++) {
        ww[n] = 0.5 - (0.5* cos(2*M_PI *(2*n+1)/(n2-1)));
    }
    
}

void windowSignal(float output[], float a[], float b[], int N) {
    for (int i = 0; i < N; i++) {
        output[i] = a[i] * b[i];
    }
}

void windowSignalQ(float ww[],float xx[],  int N, float factor)
{
    for (int i=0; i<N; i++) {
        xx[i] = factor*ww[i]*xx[i];
    }
}

void interpolateFit(float yvals[],float outvals[],  int N,int NOUT,  float inc) {
    int yindex, count;
    float min, max;
    float findex;
    findex = 0.0f;
    count =0;
    while ((findex < N) &&(count<NOUT) ) {
        yindex = floor(findex);
        min = yvals[yindex];
        max = yvals[yindex +1];
        outvals[count] = min + (max-min)*(findex -yindex);
        count++;
        findex = findex + inc;
    }
    if (count<NOUT) {
        for (int i=count; i<NOUT; i++) {
            outvals[i] = yvals[N];
        }
    }
}

void overlapadd(float xin[],float yoverlap[],  int offset,int N)
{
    for (int i=0; i<N; i++) {
        yoverlap[offset +i] =  yoverlap[offset +i] + xin[i];
    }

}

void bitreverse( float x[], int N )
{
    float 	rtemp,itemp;
    int 		i,j,
    m;
    
    for ( i = j = 0; i < N; i += 2, j += m ) {
        if ( j > i ) {
            rtemp = x[j]; itemp = x[j+1]; /* complex exchange */
            x[j] = x[i]; x[j+1] = x[i+1];
            x[i] = rtemp; x[i+1] = itemp;
        }
        for ( m = N>>1; m >= 2 && j >= m; m >>= 1 )
            j -= m;
    }
}


void cfft( float x[], int NC, int forward )
{
	float 	wr,wi,
    wpr,wpi,
    theta,
    scale;
	int 		mmax,
    ND,
    m,
    i,j,
    delta;
    
	ND = NC<<1;
	bitreverse( x, ND );
	for ( mmax = 2; mmax < ND; mmax = delta ) {
		delta = mmax<<1;
		theta = TWOPI/( forward? mmax : -mmax );
		wpr = -2.*pow( sin( 0.5*theta ), 2. );
		wpi = sin( theta );
		wr = 1.;
		wi = 0.;
		for ( m = 0; m < mmax; m += 2 ) {
	 		float rtemp, itemp;
            for ( i = m; i < ND; i += delta ) {
				j = i + mmax;
				rtemp = wr*x[j] - wi*x[j+1];
				itemp = wr*x[j+1] + wi*x[j];
				x[j] = x[i] - rtemp;
				x[j+1] = x[i+1] - itemp;
				x[i] += rtemp;
				x[i+1] += itemp;
            }
            wr = (rtemp = wr)*wpr - wi*wpi + wr;
            wi = wi*wpr + rtemp*wpi + wi;
		}
    }
    
    
    scale = forward ? 1./ND : 2.;
    { float *xi=x, *xe=x+ND;
        while ( xi < xe )
            *xi++ *= scale;
    }
}


void rfft( float x[], int N, int forward  )
{
    float 	c1,c2,
    h1r,h1i,
    h2r,h2i,
    wr,wi,
    wpr,wpi,
    temp,
    theta;
    float 	xr,xi;
    int 		i,
    i1,i2,i3,i4,
    N2p1;
    
	theta = PI/N;
	wr = 1.;
	wi = 0.;
	c1 = 0.5;
	if ( forward ) {
		c2 = -0.5;
		cfft( x, N, forward );
		xr = x[0];
		xi = x[1];
    } else {
		c2 = 0.5;
		theta = -theta;
		xr = x[1];
		xi = 0.;
		x[1] = 0.;
	}
	wpr = -2.*pow( sin( 0.5*theta ), 2. );
	wpi = sin( theta );
	N2p1 = (N<<1) + 1;
	for ( i = 0; i <= N>>1; i++ ) {
		i1 = i<<1;
		i2 = i1 + 1;
		i3 = N2p1 - i2;
		i4 = i3 + 1;
		if ( i == 0 ) {
            h1r =  c1*(x[i1] + xr );
            h1i =  c1*(x[i2] - xi );
            h2r = -c2*(x[i2] + xi );
            h2i =  c2*(x[i1] - xr );
            x[i1] =  h1r + wr*h2r - wi*h2i;
            x[i2] =  h1i + wr*h2i + wi*h2r;
            xr =  h1r - wr*h2r + wi*h2i;
            xi = -h1i + wr*h2i + wi*h2r;
		} else {
            h1r =  c1*(x[i1] + x[i3] );
            h1i =  c1*(x[i2] - x[i4] );
            h2r = -c2*(x[i2] + x[i4] );
            h2i =  c2*(x[i1] - x[i3] );
            x[i1] =  h1r + wr*h2r - wi*h2i;
            x[i2] =  h1i + wr*h2i + wi*h2r;
            x[i3] =  h1r - wr*h2r + wi*h2i;
            x[i4] = -h1i + wr*h2i + wi*h2r;
		}
		wr = (temp = wr)*wpr - wi*wpi + wr;
		wi = wi*wpr + temp*wpi + wi;
	}
	if ( forward )
		x[1] = xr;
    else
		cfft( x, N, forward );
}


void convert( float S[], float C[], int N2, int D,float lastphase[])
//float S[], C[]; int N2, D, R;
{
    
    float   phase,phasediff;
    int real,
    imag,
    amp,
    freq;
    float   a,
    b;
    int i;
    
    
    
    /* unravel rfft-format spectrum: note that N2+1 pairs of
     values are produced */
    
    for ( i = 0; i <= N2; i++ ) {
        imag = freq = ( real = amp = i<<1 ) + 1;
        a = ( i == N2 ? S[1] : S[real] );
        b = ( i == 0 || i == N2 ? 0. : S[imag] );
        
        /* compute magnitude value from real and imaginary parts */
        
        C[amp] = hypot( a, b );
        
        /* compute phase value from real and imaginary parts and take
         difference between this and previous value for each channel */
        
        if ( (C[amp]*(N2<<1)) < ZEROAMP ){
            phase =0;
            phasediff = phase - lastphase[i];
            lastphase[i] = phase;
        }
        else {
            if (fabsf(b)<ZEROAMP) {
                if (a<0) {
                    phase = PI;
                }else{
                    phase =0;
                }
                
            }else{
                phase = -atan2( b, a ) ;
            }
            phasediff = phase - lastphase[i];
            lastphase[i] = phase;
            
            
            /* unwrap phase differences */
            phasediff = phasediff - D*TWOPI*i/(N2<<1);
            if (phasediff>0)
                phasediff = fmodf(phasediff+PI, TWOPI)-PI;
            else{
                phasediff =  fmodf(phasediff-PI, TWOPI)+PI;
                if(phasediff == PI){
                    phasediff = -PI;
                }
            }
            

        }
        
        /* convert each phase difference to frequency in radians */
        
        C[freq] = TWOPI*i/(N2<<1)  + phasediff/D;
    }
    
}


/* unconvert essentially undoes what convert does, i.e., it
 turns N2+1 PAIRS of amplitude and frequency values in
 C into N2 PAIR of complex spectrum data (in rfft format)
 in output array S; sampling rate R and interpolation factor
 I are used to recompute phase values from frequencies */

void unconvert( float C[], float S[], int N2, int I, float accumphase[] )
//float C[], S[]; int N2, I, R;
{

    int         i,
    real,
    imag,
    amp,
    freq;
    float   mag,phase;

    /* subtract out frequencies associated with each channel,
     compute phases in terms of radians per I samples, and
     convert to complex form */
    
    for ( i = 0; i <= N2; i++ ) {
        imag = freq = ( real = amp = i<<1 ) + 1;
        if ( i == N2 )
            real = 1;
        mag = C[amp];
        //phaseCumulative = phaseCumulative + hopOut * trueFreq;
        accumphase[i] += I*C[freq];
        phase = accumphase[i];
        S[real] = mag*cos( phase );
        if ( i != N2 )
            S[imag] = -mag*sin( phase );
    }
}

#define WINDOW_SIZE 1024
// TODO: Change this back to 256.
#define HOP_SIZE 128

EMSCRIPTEN_KEEPALIVE
float buffer[HOP_SIZE];
float input[WINDOW_SIZE];
float hannWindow[WINDOW_SIZE];
float windowed[WINDOW_SIZE];
float lastPhase[WINDOW_SIZE / 2 + 1];
float magFreqPairs[WINDOW_SIZE + 2];
float accumPhase[WINDOW_SIZE / 2 + 1];
float overlapped[WINDOW_SIZE];
float interpolated[WINDOW_SIZE];

EMSCRIPTEN_KEEPALIVE
void setup() {
    initDSP();
    fillHann(hannWindow, WINDOW_SIZE);
    memset(input, 0, WINDOW_SIZE * sizeof(float));
    memset(overlapped, 0, WINDOW_SIZE * sizeof(float));
}

// To use, fill `buffer` with input beforehand,
// and read output from `buffer` afterwards.
EMSCRIPTEN_KEEPALIVE
void processBlock(float factor) {
    // Shift `buffer` on to the end of `input`.
    memmove(input, &input[HOP_SIZE], (WINDOW_SIZE - HOP_SIZE) * sizeof(float));
    memcpy(&input[WINDOW_SIZE - HOP_SIZE], buffer, HOP_SIZE * sizeof(float));
    int hopOut = round(factor * HOP_SIZE);
    windowSignal(windowed, input, hannWindow, WINDOW_SIZE);
    rfft(windowed, WINDOW_SIZE / 2, 1);
    convert(windowed, magFreqPairs, WINDOW_SIZE / 2, HOP_SIZE, lastPhase);
    unconvert(magFreqPairs, windowed, WINDOW_SIZE / 2, hopOut, accumPhase);
    rfft(windowed, WINDOW_SIZE / 2, 0);
    double scale = 1 / sqrt((double)WINDOW_SIZE / hopOut / 2);
    windowSignalQ(hannWindow, windowed, WINDOW_SIZE, scale);
    overlapadd(windowed, overlapped, 0, WINDOW_SIZE);
    // TODO: This interpolation should probably have access to the last sample from the previous block.
    interpolateFit(overlapped, buffer, hopOut, HOP_SIZE, (float)hopOut / HOP_SIZE);
    memmove(overlapped, &overlapped[hopOut], (WINDOW_SIZE - hopOut) * sizeof(float));
    memset(&overlapped[WINDOW_SIZE - hopOut], 0, hopOut * sizeof(float));
}
