//  Created by Juan Carlos Martinez on 6/26/15.
//  Copyright (c) 2015 gtcmt. All rights reserved.
//  FFT C Routines based on Richad Moore's Elements of Computer Music
//  sligthly modified for EMSCRIPTEN support
//
//  Modified by Ian Clester around 4/7/2022.
//  Extended for real-time operation within an AudioWorklet,
//  and revised for style & clarity.

#include <emscripten.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>

void multiply(float a[], float b[], float output[], int size, float scale) {
    for (int i = 0; i < size; i++) {
        output[i] = a[i] * b[i] * scale;
    }
}

void interpolate(float input[], float output[], int inputSize, int outputSize) {
    float ratio = (float)inputSize / outputSize;

    for (int i = 0; i < outputSize; i++) {
        float fracIndex = i * ratio;
        int prevIndex = floorf(fracIndex);
        float prev = input[prevIndex];
        float next = input[prevIndex + 1];
        output[i] = prev + (next - prev) * (fracIndex - prevIndex);
    }
}

void overlapadd(float input[], float output[], int offset, int N) {
    for (int i = 0; i < N; i++) {
        output[offset + i] = output[offset + i] + input[i];
    }
}

void bitreverse(float x[], int N) {
    int i, j, m;

    for (i = j = 0; i < N; i += 2, j += m) {
        if (j > i) {
            float rtemp = x[j];
            float itemp = x[j + 1]; // complex exchange
            x[j] = x[i];
            x[j + 1] = x[i + 1];
            x[i] = rtemp;
            x[i + 1] = itemp;
        }
        for (m = N >> 1; m >= 2 && j >= m; m >>= 1) {
            j -= m;
        }
    }
}

void cfft(float x[], int NC, int forward) {
    int delta;
    int ND = NC << 1;

    bitreverse(x, ND);

    for (int mmax = 2; mmax < ND; mmax = delta) {
        delta = mmax << 1;
        float theta = 2 * M_PI / (forward ? mmax : -mmax);
        float wpr = -2. * powf(sinf(0.5 * theta), 2.);
        float wpi = sinf(theta);
        float wr = 1;
        float wi = 0;
        for (int m = 0; m < mmax; m += 2) {
            float rtemp, itemp;
            for (int i = m; i < ND; i += delta) {
                int j = i + mmax;
                rtemp = wr * x[j] - wi * x[j + 1];
                itemp = wr * x[j + 1] + wi * x[j];
                x[j] = x[i] - rtemp;
                x[j + 1] = x[i + 1] - itemp;
                x[i] += rtemp;
                x[i + 1] += itemp;
            }
            wr = (rtemp = wr) * wpr - wi * wpi + wr;
            wi = wi * wpr + rtemp * wpi + wi;
        }
    }

    float scale = forward ? 1. / ND : 2.;
    for (int i = 0; i < ND; i++) {
        x[i] *= scale;
    }
}

void rfft(float x[], int N, int forward) {
    float theta = M_PI / N;
    float wr = 1.;
    float wi = 0.;
    float c1 = 0.5, c2;
    float xr, xi;

    if (forward) {
        c2 = -0.5;
        cfft(x, N, forward);
        xr = x[0];
        xi = x[1];
    } else {
        c2 = 0.5;
        theta = -theta;
        xr = x[1];
        xi = 0.;
        x[1] = 0.;
    }

    float wpr = -2. * powf(sinf(0.5 * theta), 2.);
    float wpi = sinf(theta);
    int N2p1 = (N << 1) + 1;

    for (int i = 0; i <= N >> 1; i++) {
        int i1 = i << 1;
        int i2 = i1 + 1;
        int i3 = N2p1 - i2;
        int i4 = i3 + 1;
        if (i == 0) {
            float h1r = c1 * (x[i1] + xr);
            float h1i = c1 * (x[i2] - xi);
            float h2r = -c2 * (x[i2] + xi);
            float h2i = c2 * (x[i1] - xr);
            x[i1] = h1r + wr * h2r - wi * h2i;
            x[i2] = h1i + wr * h2i + wi * h2r;
            xr = h1r - wr * h2r + wi * h2i;
            xi = -h1i + wr * h2i + wi * h2r;
        } else {
            float h1r = c1 * (x[i1] + x[i3]);
            float h1i = c1 * (x[i2] - x[i4]);
            float h2r = -c2 * (x[i2] + x[i4]);
            float h2i = c2 * (x[i1] - x[i3]);
            x[i1] = h1r + wr * h2r - wi * h2i;
            x[i2] = h1i + wr * h2i + wi * h2r;
            x[i3] = h1r - wr * h2r + wi * h2i;
            x[i4] = -h1i + wr * h2i + wi * h2r;
        }
        float temp = wr;
        wr = wr * wpr - wi * wpi + wr;
        wi = wi * wpr + temp * wpi + wi;
    }

    if (forward) {
        x[1] = xr;
    } else {
        cfft(x, N, forward);
    }
}

void convert(float S[], float C[], int N2, int D, float lastphase[]) {
    static const float EPSILON = 1e-6;

    // unravel rfft-format spectrum: note that N2+1 pairs of values are produced
    for (int i = 0; i <= N2; i++) {
        int real = i << 1, amp = real;
        int imag = real + 1, freq = imag;
        float a = (i == N2 ? S[1] : S[real]);
        float b = (i == 0 || i == N2 ? 0. : S[imag]);

        // compute magnitude value from real and imaginary parts
        C[amp] = hypotf(a, b);

        // compute phase value from real and imaginary parts and take
        // difference between this and previous value for each channel
        float phase, phasediff;
        if ((C[amp] * (N2 << 1)) < EPSILON) {
            phase = 0;
            phasediff = phase - lastphase[i];
            lastphase[i] = phase;
        } else {
            if (fabsf(b) < EPSILON) {
                if (a < 0) {
                    phase = M_PI;
                } else {
                    phase = 0;
                }
            } else {
                phase = -atan2f(b, a);
            }
            phasediff = phase - lastphase[i];
            lastphase[i] = phase;

            // unwrap phase differences
            phasediff = phasediff - D * 2 * M_PI * i / (N2 << 1);
            if (phasediff > 0)
                phasediff = fmodf(phasediff + M_PI, 2 * M_PI) - M_PI;
            else {
                phasediff = fmodf(phasediff - M_PI, 2 * M_PI) + M_PI;
                if (phasediff == M_PI) {
                    phasediff = -M_PI;
                }
            }
        }
        // convert each phase difference to frequency in radians
        C[freq] = 2 * M_PI * i / (N2 << 1) + phasediff / D;
    }
}

// unconvert essentially undoes what convert does, i.e., it turns N2+1 PAIRS of
// amplitude and frequency values in C into N2 PAIR of complex spectrum data (in
// rfft format) in output array S; sampling rate R and interpolation factor I
// are used to recompute phase values from frequencies
void unconvert(float C[], float S[], int N2, int I, float accumphase[]) {
    // subtract out frequencies associated with each channel,
    // compute phases in terms of radians per I samples, and
    // convert to complex form
    for (int i = 0; i <= N2; i++) {
        int real = i << 1, amp = real;
        int imag = real + 1, freq = imag;
        if (i == N2)
            real = 1;
        float mag = C[amp];
        accumphase[i] += I * C[freq];
        float phase = accumphase[i];
        S[real] = mag * cosf(phase);
        if (i != N2)
            S[imag] = -mag * sinf(phase);
    }
}

#define WINDOW_SIZE 1024
#define HOP_SIZE 128

EMSCRIPTEN_KEEPALIVE
float buffer[HOP_SIZE];

float hannWindow[WINDOW_SIZE];

EMSCRIPTEN_KEEPALIVE
void setup() {
    // Generate Hann window.
    for (int i = 0; i < WINDOW_SIZE; i++) {
        hannWindow[i] = 0.5 - 0.5 * cosf(2 * M_PI * i / (WINDOW_SIZE - 1));
    }
}

// Internal state for one pitchshifter instance.
typedef struct {
    float inputWindow[WINDOW_SIZE];
    float overlapped[WINDOW_SIZE];
    float lastPhase[WINDOW_SIZE / 2 + 1];
    float accumPhase[WINDOW_SIZE / 2 + 1];
} shifter;

EMSCRIPTEN_KEEPALIVE
shifter *createShifter() {
    shifter *s = malloc(sizeof(shifter));
    memset(s, 0, sizeof(shifter));
    return s;
}

EMSCRIPTEN_KEEPALIVE
void destroyShifter(shifter *s) { free(s); }

// Process HOP_SIZE samples. Expects `input` and `output` to be HOP_SIZE long.
EMSCRIPTEN_KEEPALIVE
void processBlock(shifter *s, float input[], float output[], float factor) {
    static float tmp[WINDOW_SIZE];
    static float magFreqPairs[WINDOW_SIZE + 2];

    float *inputWindow = s->inputWindow;
    float *overlapped = s->overlapped;
    float *lastPhase = s->lastPhase;
    float *accumPhase = s->accumPhase;
    // Shift `input` (HOP_SIZE) on to the end of `inputWindow` (WINDOW_SIZE).
    memmove(inputWindow, &inputWindow[HOP_SIZE],
            (WINDOW_SIZE - HOP_SIZE) * sizeof(float));
    memcpy(&inputWindow[WINDOW_SIZE - HOP_SIZE], input,
           HOP_SIZE * sizeof(float));
    int hopOut = roundf(factor * HOP_SIZE);

    // Phase vocoder.
    multiply(inputWindow, hannWindow, tmp, WINDOW_SIZE, 1);
    rfft(tmp, WINDOW_SIZE / 2, 1);
    convert(tmp, magFreqPairs, WINDOW_SIZE / 2, HOP_SIZE, lastPhase);
    unconvert(magFreqPairs, tmp, WINDOW_SIZE / 2, hopOut, accumPhase);
    rfft(tmp, WINDOW_SIZE / 2, 0);
    double scale = 1 / sqrtf((double)WINDOW_SIZE / hopOut / 2);
    multiply(tmp, hannWindow, tmp, WINDOW_SIZE, scale);
    overlapadd(tmp, overlapped, 0, WINDOW_SIZE);

    // Shift `hopOut` samples from the beginning of `overlapped` and
    // interpolate them back into `HOP_SIZE` samples.
    interpolate(overlapped, output, hopOut, HOP_SIZE);
    memmove(overlapped, &overlapped[hopOut],
            (WINDOW_SIZE - hopOut) * sizeof(float));
    memset(&overlapped[WINDOW_SIZE - hopOut], 0, hopOut * sizeof(float));
}
