"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMessageList = exports.selectDropupLabel = exports.selectErrorOptions = exports.selectInputOptions = exports.selectActiveProject = exports.resetState = exports.setDropupLabel = exports.clearMessageList = exports.addToMessageList = exports.setMessageList = exports.setErrorOptions = exports.setDefaultInputOptions = exports.setInputOptions = exports.setActiveProject = exports.mousePosition = exports.keyStroke = exports.userOffPage = exports.userOnPage = exports.checkForCodeUpdates = exports.curriculumPage = exports.autoScrollCAI = exports.openCurriculum = exports.compileError = exports.compileCAI = exports.caiSwapTab = exports.sendCAIMessage = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var reducers_1 = require("../reducers");
var layout = require("../ide/layoutState");
var curriculum = require("../browser/curriculumState");
var editor = require("../ide/Editor");
var userProject = require("../app/userProject");
var analysis = require("./analysis");
var codeSuggestion = require("./codeSuggestion");
var dialogue = require("./dialogue");
var studentPreferences = require("./studentPreferences");
var studentHistory = require("./studentHistory");
var errorHandling = require("./errorHandling");
var complexityCalculator_1 = require("./complexityCalculator");
var complexityCalculatorPY_1 = require("./complexityCalculatorPY");
var complexityCalculatorJS_1 = require("./complexityCalculatorJS");
var caiSlice = toolkit_1.createSlice({
    name: "cai",
    initialState: {
        activeProject: "",
        messageList: { "": [] },
        inputOptions: [],
        errorOptions: [],
        dropupLabel: "",
    },
    reducers: {
        setActiveProject: function (state, _a) {
            var payload = _a.payload;
            state.activeProject = payload;
        },
        setInputOptions: function (state, _a) {
            var payload = _a.payload;
            state.inputOptions = payload;
        },
        setDefaultInputOptions: function (state) {
            if (state.inputOptions.length === 0 && !dialogue.isDone()) {
                state.inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" },
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
                    { label: "i think we're close to done", value: "wrapup" },
                    { label: "i have some ideas about our project", value: "properties" },
                ];
            }
        },
        setErrorOptions: function (state, _a) {
            var payload = _a.payload;
            state.errorOptions = payload;
        },
        setMessageList: function (state, _a) {
            var payload = _a.payload;
            if (!state.messageList[state.activeProject]) {
                state.messageList[state.activeProject] = [];
            }
            state.messageList[state.activeProject] = payload;
        },
        addToMessageList: function (state, _a) {
            var payload = _a.payload;
            if (state.activeProject) {
                state.messageList[state.activeProject].push(payload);
            }
        },
        clearMessageList: function (state) {
            state.messageList = {};
        },
        setDropupLabel: function (state, _a) {
            var payload = _a.payload;
            state.dropupLabel = payload;
        },
        resetState: function (state) {
            Object.assign(state, {
                activeProject: "",
                messageList: { "": [] },
                inputOptions: [],
                errorOptions: [],
                dropupLabel: "",
            });
        },
    },
});
// TODO: Avoid DOM manipulation.
function newCAIMessage() {
    var east = reducers_1.default.getState().layout.east;
    if (!(east.open && east.kind === "CAI")) {
        document.getElementById("caiButton").classList.add("flashNavButton");
    }
}
var introduceCAI = toolkit_1.createAsyncThunk("cai/introduceCAI", function (_, _a) {
    var dispatch = _a.dispatch;
    // reinitialize recommendation dictionary
    analysis.fillDict().then(function () {
        var msgText = dialogue.generateOutput("Chat with CAI");
        dialogue.studentInteract(false);
        dispatch(exports.setInputOptions(dialogue.createButtons()));
        dispatch(exports.setErrorOptions([]));
        if (msgText !== "") {
            var messages = msgText.includes("|") ? msgText.split("|") : [msgText];
            for (var msg in messages) {
                var outputMessage = {
                    text: messages[msg][0],
                    keyword: messages[msg][1],
                    date: Date.now(),
                    sender: "CAI",
                };
                dispatch(exports.addToMessageList(outputMessage));
                dispatch(exports.autoScrollCAI());
                newCAIMessage();
            }
        }
    });
});
exports.sendCAIMessage = toolkit_1.createAsyncThunk("cai/sendCAIMessage", function (input, _a) {
    var getState = _a.getState, dispatch = _a.dispatch;
    dialogue.studentInteract();
    if (input.label.trim().replace(/(\r\n|\n|\r)/gm, "") === "") {
        return;
    }
    var message = {
        text: [input.label, "", "", "", ""],
        keyword: ["", "", "", "", ""],
        date: Date.now(),
        sender: userProject.getUsername(),
    };
    var text = editor.ace.getValue();
    var lang = getState().app.scriptLanguage;
    codeSuggestion.generateResults(text, lang);
    dialogue.setCodeObj(editor.ace.session.getDocument().getAllLines().join("\n"));
    dispatch(exports.addToMessageList(message));
    var msgText = dialogue.generateOutput(input.value);
    if (input.value === "error") {
        dispatch(exports.setErrorOptions([]));
    }
    if (msgText.includes("[ERRORFIX")) {
        //const errorS = msgText.substring(msgText.indexOf("[ERRORFIX") + 10, msgText.lastIndexOf("|"))
        //const errorF = msgText.substring(msgText.lastIndexOf("|") + 1, msgText.length - 1)
        //msgText = msgText.substring(0, msgText.indexOf("[ERRORFIX"))
        //dialogue.setSuccessFail(parseInt(errorS), parseInt(errorF))
        //const actionOutput = dialogue.attemptErrorFix()
        //msgText += "|" + actionOutput ? dialogue.errorFixSuccess() : dialogue.errorFixFail()
    }
    dispatch(dialogue.isDone() ? exports.setInputOptions([]) : exports.setInputOptions(dialogue.createButtons()));
    if (msgText !== "") {
        var messages = msgText.includes("|") ? msgText.split("|") : [msgText];
        for (var msg in messages) {
            if (messages[msg] !== "") {
                var outputMessage = {
                    text: messages[msg][0],
                    keyword: messages[msg][1],
                    date: Date.now(),
                    sender: "CAI",
                };
                dispatch(exports.addToMessageList(outputMessage));
                dispatch(exports.autoScrollCAI());
                newCAIMessage();
            }
        }
    }
    // With no options available to user, default to tree selection.
    dispatch(exports.setDefaultInputOptions());
    dispatch(exports.setDropupLabel(dialogue.getDropup()));
});
exports.caiSwapTab = toolkit_1.createAsyncThunk("cai/caiSwapTab", function (activeProject, _a) {
    var getState = _a.getState, dispatch = _a.dispatch;
    if (activeProject === "" || activeProject === null || activeProject === undefined) {
        dispatch(exports.setActiveProject(""));
        dispatch(exports.clearMessageList());
        dispatch(exports.setInputOptions([]));
        dispatch(exports.setDropupLabel(""));
        dispatch(exports.setErrorOptions([]));
        dialogue.clearNodeHistory();
    }
    else {
        dispatch(exports.setActiveProject(activeProject));
        dialogue.setActiveProject(activeProject);
        if (!exports.selectMessageList(getState())[activeProject]) {
            dispatch(exports.setMessageList([]));
            dispatch(introduceCAI());
        }
        dispatch(exports.setInputOptions(dialogue.createButtons()));
        if (exports.selectInputOptions(getState()).length === 0) {
            dispatch(exports.setDefaultInputOptions());
        }
    }
    dispatch(exports.autoScrollCAI());
});
exports.compileCAI = toolkit_1.createAsyncThunk("cai/compileCAI", function (data, _a) {
    var dispatch = _a.dispatch;
    if (dialogue.isDone()) {
        return;
    }
    // call cai analysis here
    // const result = data[0]
    var language = data[1];
    var code = data[2];
    var results = language === "python" ? complexityCalculatorPY_1.analyzePython(code) : complexityCalculatorJS_1.analyzeJavascript(code);
    codeSuggestion.generateResults(code, language);
    studentHistory.addScoreToAggregate(code, language);
    dispatch(exports.setErrorOptions([]));
    var output = dialogue.processCodeRun(code, complexityCalculator_1.getUserFunctionReturns(), complexityCalculator_1.getAllVariables(), results, {});
    if (output !== null && output !== "" && output[0][0] !== "") {
        var message = {
            text: output[0],
            keyword: output[1],
            date: Date.now(),
            sender: "CAI",
        };
        dispatch(exports.addToMessageList(message));
        dispatch(exports.setInputOptions(dialogue.createButtons()));
        dispatch(exports.setDefaultInputOptions());
    }
    if (output !== null && output === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
        dispatch(exports.setDefaultInputOptions());
    }
    dispatch(exports.setDropupLabel(dialogue.getDropup()));
    dispatch(exports.autoScrollCAI());
    newCAIMessage();
    var t = Date.now();
    studentPreferences.addCompileTS(t);
});
exports.compileError = toolkit_1.createAsyncThunk('cai/compileError', function (data, _a) {
    var getState = _a.getState, dispatch = _a.dispatch;
    var errorReturn = dialogue.handleError(data[0]);
    errorHandling.storeErrorInfo(data[0], data[1]);
    if (dialogue.isDone()) {
        return;
    }
    if (errorReturn !== "") {
        dispatch(exports.setInputOptions(dialogue.createButtons()));
        dispatch(exports.setDefaultInputOptions());
        dispatch(exports.setErrorOptions([{ label: "do you know anything about this error i'm getting", value: "error" }]));
        dispatch(exports.autoScrollCAI());
    }
    else {
        dispatch(exports.setErrorOptions([]));
    }
});
exports.openCurriculum = toolkit_1.createAsyncThunk("cai/openCurriculum", function (_a, _b) {
    var message = _a[0], location = _a[1];
    var dispatch = _b.dispatch;
    dispatch(curriculum.fetchContent({ location: message.keyword[location][1].split("-") }));
    dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }));
});
exports.autoScrollCAI = toolkit_1.createAsyncThunk("cai/autoScrollCAI", function () {
    // Auto scroll to the bottom (set on a timer to happen after message updates).
    var caiBody = document.getElementById("cai-body");
    setTimeout(function () {
        if (caiBody) {
            caiBody.scrollTop = caiBody.scrollHeight;
        }
    });
});
exports.curriculumPage = toolkit_1.createAsyncThunk("cai/curriculumPage", function (location) {
    dialogue.addCurriculumPageToHistory(location);
});
exports.checkForCodeUpdates = toolkit_1.createAsyncThunk("cai/checkForCodeUpdates", function () {
    dialogue.checkForCodeUpdates(editor.ace.getValue());
});
exports.userOnPage = toolkit_1.createAsyncThunk("cai/userOnPage", function (time) {
    studentPreferences.addOnPageStatus(1, time);
});
exports.userOffPage = toolkit_1.createAsyncThunk("cai/userOffPage", function (time) {
    studentPreferences.addOnPageStatus(0, time);
});
exports.keyStroke = toolkit_1.createAsyncThunk("cai/keyStroke", function (_a) {
    var action = _a[0], content = _a[1], time = _a[2];
    studentPreferences.addKeystroke(action, content, time);
});
exports.mousePosition = toolkit_1.createAsyncThunk("cai/mousePosition", function (_a) {
    var x = _a[0], y = _a[1];
    studentPreferences.addMousePos({ x: x, y: y });
});
exports.default = caiSlice.reducer;
exports.setActiveProject = (_a = caiSlice.actions, _a.setActiveProject), exports.setInputOptions = _a.setInputOptions, exports.setDefaultInputOptions = _a.setDefaultInputOptions, exports.setErrorOptions = _a.setErrorOptions, exports.setMessageList = _a.setMessageList, exports.addToMessageList = _a.addToMessageList, exports.clearMessageList = _a.clearMessageList, exports.setDropupLabel = _a.setDropupLabel, exports.resetState = _a.resetState;
exports.selectActiveProject = function (state) { return state.cai.activeProject; };
exports.selectInputOptions = function (state) { return state.cai.inputOptions; };
exports.selectErrorOptions = function (state) { return state.cai.errorOptions; };
exports.selectDropupLabel = function (state) { return state.cai.dropupLabel; };
exports.selectMessageList = function (state) { return state.cai.messageList; };
//# sourceMappingURL=caiState.js.map