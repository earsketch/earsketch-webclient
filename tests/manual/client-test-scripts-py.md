# Client Test: Scripts (Python)

Directions:
- Fill in "Results" section
- Mark pass/fail, like so: [X]
- Save file, like so: `client-test-scripts-py-2020-05-29-george.md`

------------------------------------------------------------------------------
# Results

Test info:
- Name: 
- Date: 
- OS/Version: 
- Browser/Version: 

Test results:
1. Pass [ ] Fail [ ], Comments: 
2. Pass [ ] Fail [ ], Comments: 
3. Pass [ ] Fail [ ], Comments: 
4. Pass [ ] Fail [ ], Comments: 
5. Pass [ ] Fail [ ], Comments: 
6. Pass [ ] Fail [ ], Comments: 
7. Pass [ ] Fail [ ], Comments: 
8. Pass [ ] Fail [ ], Comments: 
9. Pass [ ] Fail [ ], Comments: 
10. Pass [ ] Fail [ ], Comments: 

------------------------------------------------------------------------------
# Tests

Run each script.

1. One-sample song

```py
from earsketch import *
init()
setTempo(128)

fitMedia(RD_RNB_PIANO_2, 1, 1, 3)
setEffect(1, DELAY, DELAY_TIME, 330)

finish()
```

2. 20-sample song

```py
from earsketch import *
init()
setTempo(128)

for track in range(1, 21):
    random_audio = selectRandomFile(EIGHTBIT_115_BPM__EIGHTVIDEOSPEAKNSPELL)
    print("Track " + str(track) + ": " + random_audio)
    fitMedia(random_audio, track, 1, 3)
    setEffect(track, VOLUME, GAIN, -12.0)

finish()
```

3. EarSketch API

```py
from earsketch import *
init()
setTempo(170)

sample = DUBSTEP_BASS_WOBBLE_001
print("Sample: " + sample)

centroid_value = analyze(sample, SPECTRAL_CENTROID)
print("Centroid: " + str(centroid_value))

sample_length = dur(sample)
print("Length: " + str(sample_length))

finish()  # see internal earsketch console for output
```

4. EarSketch API: readInput()

```py
from earsketch import *
init()
setTempo(80)

user_input = readInput("Enter any text:")
print(user_input)

user_input = readInput("Enter more text:")
print(user_input)

finish()  # see internal earsketch console for output
```

5. (future test)


6. (future test)


7. (future test)


8. (future test)


9. (future test)


10. (future test)

