# Client Test: Code Analysis

Directions:
- Fill in "Results" section
- Mark pass/fail, like so: [X]
- Save file, like so: `client-test-code-analysis-2020-05-29-george.md`

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

For each test, 
 1. Run the provided script in the EarSketch client. 
 2. Ensure there is a console output labeled "autograder"
 3. Ensure the "autograder" in the output contains a "code" property that matches the expected output provided.

1. 
Script:
```py
from earsketch import *

init()
setTempo(120)

def myFunction(argInteger):
  return argInteger + 5.3

myList = [0,1,2,3,4,5]

for myLoopVariable in range(0,6,2):
  myVar = myFunction(myLoopVariable)
  print myLoopVariable + myVar

finish()
```

Output:

boolOps: 0
booleans: 0
comparisons: 0
conditionals: 0
consoleInput: 0
floats: 3
forLoops: 4
ints: 3
listOps: 0
lists: 2
mathematicalOperators: 3
strOps: 0
strings: 0
userFunc: 5
variables: 4


2. 
Script:
```py
from earsketch import *

init()
setTempo(120)

def sectionA(startMeasure, endMeasure): # create an A section, placing music from startMeasure (inclusive) to endMeasure (exclusive)
  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, startMeasure, endMeasure) # main
  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure) # drums
  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, startMeasure, endMeasure) # bassline
  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, startMeasure, startMeasure + 1) # backing
  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, startMeasure + 2, startMeasure + 3) # backing repeated

# B section

def sectionB(startMeasure, endMeasure):
  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_3, 1, startMeasure, endMeasure) # sparse drums
  fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 3, startMeasure, endMeasure) # rattling
  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, startMeasure, startMeasure + 1) # backing

# Setting up an ABA musical form through function calls
sectionA(1, 5)
sectionB(5, 9)
sectionA(9, 13)

myString = "22222222"
myString = myString + "333333333333"

if(myString == "notMyString"):
  print 0
else:
  print 5

finish()
```

Output:

boolOps: 0
booleans: 3
comparisons: 3
conditionals: 3
consoleInput: 0
floats: 0
forLoops: 0
ints: 1
listOps: 0
lists: 0
mathematicalOperators: 3
strOps: 3
strings: 3
userFunc: 1
variables: 4

3. 
Script:

```py
from earsketch import *

init()
setTempo(120)


myList = ["AAAAAAAAA",0,1,2,3,4,5]
subList = myList[0]

for i in subList:
  print "Additional characters for originality"
  print i

finish()
```

Output:
boolOps: 0
booleans: 0
comparisons: 0
conditionals: 0
consoleInput: 0
floats: 0
forLoops: 1
ints: 3
listOps: 0
lists: 4
mathematicalOperators: 0
strOps: 0
strings: 4
userFunc: 0
variables: 1


4.
Script:
```js
"use strict";

init();
setTempo(120);

var numbers = [1, 4, 9];
var doubles = numbers.map(function(num) {
  return num * 2;
})

println(doubles);

var rhythm1 = "0+++0+0+0+--0+00";
var rhythm2 = "0+0-00++0-000+++";

//Music

function createBeat(startMeasure, soundClip, beatString){
  var endMeasure = startMeasure + 3;
  for (var measure = startMeasure; measure < endMeasure; measure++){
    makeBeat(soundClip, 1, measure, beatString);
  }

  // Return ending measure so we can use it outside function
  return endMeasure;
}

// Function calls

// Assigning the value we return to a variable
var newStart = createBeat(1, HIPHOP_DUSTYGROOVE_007, rhythm1);
// Passing the returned value into another function
createBeat(newStart, HIPHOP_DUSTYGROOVE_010, rhythm2);


finish();
```

Output:
boolOps: 0
booleans: 3
comparisons: 3
conditionals: 0
consoleInput: 0
floats: 0
forLoops: 4
ints: 3
listOps: 3
lists: 3
mathematicalOperators: 3
strOps: 0
strings: 3
userFunc: 5
variables: 4

5. (future test)


6. (future test)


7. (future test)


8. (future test)


9. (future test)


10. (future test)

