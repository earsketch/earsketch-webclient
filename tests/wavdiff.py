import sys

import numpy as np
import scipy.io.wavfile

if len(sys.argv) != 3:
    print("Compares two wav files.")
    exit(f"Usage: {sys.argv[0]} <filename> <filename>")

sample_rate_a, a = scipy.io.wavfile.read(sys.argv[1])
sample_rate_b, b = scipy.io.wavfile.read(sys.argv[2])

if sample_rate_a != sample_rate_b:
    exit(f"Not identical: sample rates differ ({sample_rate_a} vs. {sample_rate_b}).")

if a.shape[0] != b.shape[0]:
    exit(f"Not identical: lengths differ ({a.shape[0]} samples vs. {b.shape[0]} samples).")

if a.shape[1] != b.shape[1]:
    exit(f"Not identical: number of channels differ ({a.shape[1]} vs {b.shape[1]}).")

if a.dtype != b.dtype:
    print(f"Note: sample types differ ({a.dtype.__name__} vs. {b.dtype.__name__}).")

if (a == b).all():
    print("Completely identical.")
    exit()

# Convert to float.
if np.issubdtype(a.dtype, np.integer):
    a = a / np.iinfo(a.dtype).max
if np.issubdtype(b.dtype, np.integer):
    b = b / np.iinfo(b.dtype).max

thresh = .0001
close = np.isclose(a, b, rtol=0, atol=thresh)
if close.all():
    print(f"Nearly identical: samples differ by less than {thresh}, average difference is {np.abs(a - b).mean()}.")
    exit()

print(f"Not identical: samples differ by more than {thresh} at {np.sum(~close)} points (across all channels). Among those, average difference is {np.abs(a[~close] - b[~close]).mean()}.")