/*
 * mcu_resonator.c -- the deployable inference kernel for the modal MCSA detector.
 *
 * This is the real code an ESP32 (or any MCU with an FPU) would run: a bank of
 * r coupled-form complex resonators (second-order sections), driven by a small
 * input matrix, read out through magnitude+re+im features (last state and mean
 * over time), then a linear head. No FFT, no complex runtime, streaming O(r)
 * state. It is float32 here (ESP32-S3 has an FPU); the fixed-point path is a
 * coefficient/state requantization, analyzed separately in mcu_fixedpoint.py.
 *
 * Per mode k the recurrence is
 *     h_re' = g[k]*h_re - w[k]*h_im + b_re
 *     h_im' = w[k]*h_re + g[k]*h_im + b_im
 * with g[k]=rho*cos(theta), w[k]=rho*sin(theta) (poles rho*e^{+/-i theta}).
 *
 * It reads one text file (argv[1]) with the extracted weights + the test windows
 * and prints the 5 class logits per window, so a Python harness can prove the C
 * output is bit-close to the trained PyTorch model. Fixed to the validated
 * config: readout = magreim (per=3r, feat=6r).
 *
 * Build: gcc -O2 -std=c11 mcu_resonator.c -lm -o mcu_resonator
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

#define MAXR 128
#define NCLS 5
#define EPS 1e-6f

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: %s data.txt\n", argv[0]); return 1; }
    FILE *f = fopen(argv[1], "r");
    if (!f) { fprintf(stderr, "cannot open %s\n", argv[1]); return 1; }

    int r, T, feat, nwin;
    if (fscanf(f, "%d %d %d %d", &r, &T, &feat, &nwin) != 4) return 2;
    /* feat = 6r for magreim (last[mag,re,im] ++ mean[mag,re,im]) */

    int in_ch = 3;
    float *Wd = malloc(sizeof(float) * 2 * r * in_ch);   /* drive weight (2r x 3) */
    float *bd = malloc(sizeof(float) * 2 * r);           /* drive bias   (2r)     */
    float *g  = malloc(sizeof(float) * r);
    float *w  = malloc(sizeof(float) * r);
    float *Wh = malloc(sizeof(float) * NCLS * feat);     /* head weight (5 x feat)*/
    float *bh = malloc(sizeof(float) * NCLS);

    for (int i = 0; i < 2 * r * in_ch; i++) if (fscanf(f, "%f", &Wd[i]) != 1) return 3;
    for (int i = 0; i < 2 * r; i++)         if (fscanf(f, "%f", &bd[i]) != 1) return 3;
    for (int i = 0; i < r; i++)             if (fscanf(f, "%f", &g[i])  != 1) return 3;
    for (int i = 0; i < r; i++)             if (fscanf(f, "%f", &w[i])  != 1) return 3;
    for (int i = 0; i < NCLS * feat; i++)   if (fscanf(f, "%f", &Wh[i]) != 1) return 3;
    for (int i = 0; i < NCLS; i++)          if (fscanf(f, "%f", &bh[i]) != 1) return 3;

    float hre[MAXR], him[MAXR], sre[MAXR], sim[MAXR], feats[6 * MAXR];
    float *x = malloc(sizeof(float) * T * in_ch);

    for (int n = 0; n < nwin; n++) {
        for (int i = 0; i < T * in_ch; i++) if (fscanf(f, "%f", &x[i]) != 1) return 4;
        for (int k = 0; k < r; k++) { hre[k] = him[k] = sre[k] = sim[k] = 0.f; }

        for (int t = 0; t < T; t++) {
            const float *xt = &x[t * in_ch];
            for (int k = 0; k < r; k++) {
                /* complex drive b_re = row k of Wd . xt + bd[k];  b_im = row r+k */
                float bre = bd[k], bim = bd[r + k];
                for (int c = 0; c < in_ch; c++) {
                    bre += Wd[(k) * in_ch + c] * xt[c];
                    bim += Wd[(r + k) * in_ch + c] * xt[c];
                }
                float nre = g[k] * hre[k] - w[k] * him[k] + bre;
                float nim = w[k] * hre[k] + g[k] * him[k] + bim;
                hre[k] = nre; him[k] = nim;
                sre[k] += nre; sim[k] += nim;
            }
        }
        /* features: last[mag,re,im] then mean[mag,re,im] */
        for (int k = 0; k < r; k++) {
            feats[k]          = sqrtf(hre[k] * hre[k] + him[k] * him[k] + EPS);
            feats[r + k]      = hre[k];
            feats[2 * r + k]  = him[k];
            float mre = sre[k] / (float)T, mim = sim[k] / (float)T;
            feats[3 * r + k]  = sqrtf(mre * mre + mim * mim + EPS);
            feats[4 * r + k]  = mre;
            feats[5 * r + k]  = mim;
        }
        /* head */
        for (int o = 0; o < NCLS; o++) {
            float acc = bh[o];
            for (int j = 0; j < feat; j++) acc += Wh[o * feat + j] * feats[j];
            printf("%.9g%c", acc, o + 1 < NCLS ? ' ' : '\n');
        }
    }
    fclose(f);
    return 0;
}
