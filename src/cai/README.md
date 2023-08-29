# EarSketch CAI

Co-Creative Artificial Intelligence

## Architecture

### React
- CAI.tsx - CAI interface.
- Chat.tsx - custom interface components for human-human and NLU chat interfaces.
- caiState.ts - redux state for CAI.
- caiThunks.ts - functions defining actions that connect ES to CAI state.

### Complexity Calculator
- index.ts - large file, parsing AST nodes to fill an analysis interface.
- py.ts/js.ts - language-dependent wrappers.
- utils.ts - utility functions.
- state.ts - storage (an interface, NOT a redux state).

### Analysis Module
- index.ts - interfaces and analµysis functions for compiled script objects.
- soundProfileLookup.ts - functions to parse an analyzed script for musical information.

### Dialogue Module
- index.ts - central internal dialogue functions, drawing from other modules.
- caitree.ts - interface definitions and lists for each CAI dialogue node
- projectModel.ts - defining current project goals (hardcoded for current studies).
- student.ts - data storage for student behavior, not limited to current projects.
- state.ts - storage (an interface, NOT a redux state).
- upload.ts - functions to upload CAI user data to *cai_history* database table.

### Error Handling Module
- index.ts - code processing to generate help messages for code errors.
- py.ts/js.ts - language-dependent wrappers.
- utils.ts - utility functions.
- state.ts - storage (an interface, NOT a redux state).

### Suggestion System
- suggestionManager.ts - weighted selection of three coding modules
- newCode.ts/advanceCode.ts/aesthetics.ts - modules.
- module.ts - interface definition & utility functions.
- codeRecommendations.ts - generic sound examples (largely deprecated).

### Code Analyzer
- Autograder.tsx - separate page for comparing student projects to reference examples.
- CodeAnalyzer.tsx - customizable page for analyzing projects, with and without CAI.
- codeAnalyzerFunctions.ts - utility functions too large for the .tsx file.
	
## Operation

### Environment Flags

- SHOW_CAI - Render CAI interface.
- UPLOAD_CAI_HISTORY - If ```True``` and SHOW_CAI is ```False```, user interface interactions will be stored to the *cai_history* table.
- SHOW_CHAT - Render Chat interface for human-human collaboration. If ```True``` and SHOW_CAI is ```True```, enables Wizard-of-Oz operations.
