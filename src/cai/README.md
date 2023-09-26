# EarSketch CAI
An experimental Co-Creative Artificial Intelligence for EarSketch.

This system acts as a virtual assistant to promote creativity and skill development in EarSketch users, by conveying information from the curriculum in a conversational format and responding to changes in their scripts.

*At this time, CAI is primarily a research tool and should be considered an experimental feature prototype.*

## Architecture
### React
- **CAI.tsx** - CAI interface.
- **Chat.tsx** - custom interface components for human-human and NLU chat interfaces.
- **caiState.ts** - redux state for CAI.
- **caiThunks.ts** - functions defining actions that connect ES to CAI state.

### Code Analyzer
- **Autograder.tsx** - separate page for comparing student projects to reference examples.
- **CodeAnalyzer.tsx** - customizable page for analyzing projects, with and without CAI.
- **codeAnalyzerFunctions.ts** - utility functions too large for the .tsx file.

### Complexity Calculator
- **index.ts** - large file, parsing AST nodes to fill an analysis interface.
- **py.ts/js.ts** - language-dependent wrappers.
- **utils.ts** - utility functions.
- **state.ts** - storage (an interface, NOT a redux state).

### Analysis Module
- **index.ts** - interfaces and analysis functions for compiled script objects.
- **soundProfileLookup.ts** - functions to parse an analyzed script for musical information.
- **creativityAssessment.ts** - automated creativity assessment and time-on-task calculation.
- **utils.ts** - utility functions for the Code Analyzer's beat similarity/complexity analysis.

### Dialogue Module
- **index.ts** - central internal dialogue functions, drawing from other modules.
- **caitree.ts** - interface definitions and lists for each CAI dialogue utterance.
- **projectModel.ts** - defining current project goals (hardcoded for current studies).
- **student.ts** - data storage for student behavior, not limited to current projects.
- **state.ts** - storage (an interface, NOT a redux state).
- **upload.ts** - functions to upload CAI user data to *cai_history* database table.

### Error Handling Module
- **index.ts** - code processing to generate help messages for code errors.
- **py.ts/js.ts** - language-dependent wrappers.
- **utils.ts** - utility functions.
- **state.ts** - storage (an interface, NOT a redux state).

### Suggestion Module
- **index.ts** - weighted selection of three coding suggestion modules.
- **newCode.ts/advanceCode.ts/aesthetics.ts** - modules.
- **module.ts** - interface definition & utility functions.
- **codeRecommendations.ts** - generic sound examples (largely deprecated).
	
## Operation
### Environment Flags
- **SHOW_CAI** - Render CAI interface.
- **UPLOAD_CAI_HISTORY** - If `True` and SHOW_CAI is `False`, user interface interactions will be stored to the *cai_history* table.
- **SHOW_CHAT** - Render Chat interface for human-human collaboration. If `True` and SHOW_CAI is `True`, enables Wizard-of-Oz operations.

### Usage
With CAI enabled, a separate conversation is initialized between the user and CAI for each project a user opens.

A toggle button can be used to switch views between CAI and the curriculum in the header at the top of the EarSketch window.

When the window is refreshed, a user's conversational progress with CAI is reset.

### Database
Data collected during CAI usage is stored to the *cai_history* table in the EarSketch SQL database, with the following fields:

- **created** - datetime string representing when the data was saved.
- **username** - the user's current name at the time of data storage.
- **project** - filename for the current project.
- **history** - the dialogue entered by CAI or a user via the chat interface.
- **source_code** - saved code edits.
- **ui** - `cai`, `standard`, or `nlu` for previous studies.
