
/**
 * Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Jason Smith
 */
app.factory('caiProjectModel', ['recommender', function (recommender) {

    var activeProject = "";

    var availableGenres = [];
    var availableInstruments = [];

    // Initialize empty model.
    var defaultProjectModel = { 'genre': [], 'instrument': [], 'form': [], 'code structure': [] };

    var propertyOptions = {
        'genre': availableGenres,
        // 'instrument': availableInstruments,
        'form': ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"],
        'code structure': ['forLoop', 'function', 'consoleInput', 'conditional']
    };

    var suggestablePropertyOptions =  {
        'genre': availableGenres,
        // 'instrument': availableInstruments,
        'form': ["[FORM]"],
        'code structure': ['forLoop', 'function', 'consoleInput', 'conditional']
    };

    var propertyButtons ={
        'genre': "i have a genre I want to include",
        // 'instrument': "there's an instrument i want to make sure is in the project",
        'form': "i have a form in mind",
        'code structure': "i need to use a specific code structure"
    };

    var suggestableProperties = {
        'multiple': {
            'genre': availableGenres,
            // 'instrument': availableInstruments,
        },
        'one': {
            'form': ["[FORM]"]
        }
    }

    var projectModel = {};

    //returns a list of all properties that can be set/adjusted
    function getProperties() {
        var properties = Object.keys(propertyOptions);
        return properties;
    }

    function getOptions(propertyString) {
        if (Object.keys(propertyOptions).includes(propertyString)) {
            return propertyOptions[propertyString].slice(0);
        }
        else {
            return [];
        }
    }

    function randomPropertySuggestion() {

        var add = false;
        var selectedProperty;
        var selectedValue;

        //gather all properties that can be suggested at the moment (all with multiple options, plus those one-offs that have not yet been filled)
        possibleProperties = [];
        var multiples = Object.keys(suggestableProperties.multiple);
        var singles = Object.keys(suggestableProperties.one);

        for (var i = 0; i < multiples.length; i++) {
            if (projectModel[activeProject][multiples[i]].length < multiples.length) {
                possibleProperties.push(multiples[i]);
            }
        }

        for (var i = 0; i < singles.length; i++) {
            if (projectModel[activeProject][singles[i]].length == 0) {
                possibleProperties.push(singles[i]);
            }
        }

        if (possibleProperties.length == 0) {
            return {};
        }

        //select a property at random
        var propertyIndex = getRandomInt(0, possibleProperties.length - 1);
        selectedProperty = possibleProperties[propertyIndex];

        //if this is a property that can hold multiple values, mark if we are adding to an extant list or providing a first value
        if (multiples.includes(selectedProperty) && projectModel[activeProject][selectedProperty].length > 0) {
            add = true;
        }

        //list possible values, avoiding repeating existing values in the model
        var possibleValues = [];

        for (var i = 0; i < suggestablePropertyOptions[selectedProperty].length; i++) {
            var valueOption = suggestablePropertyOptions[selectedProperty][i];
            if (!projectModel[activeProject][selectedProperty].includes(valueOption)) {
                possibleValues.push(valueOption);
            }
        }

        //select one at random
        if (possibleValues.length > 0) {
            var valueIndex = getRandomInt(0, possibleValues.length - 1);
            selectedValue = possibleValues[valueIndex];
        }
        else {
            return {}
        };

        return { property: selectedProperty, value: selectedValue, isAdded: add };
    }


    function setActiveProject(projectName) {

        if (projectName in projectModel) {
            activeProject = projectName;
        }
        else {
            //create empty, default project model
            activeProject = projectName;
            clearModel();
        }
    }

    // Public getter.
    function getModel() {
        return projectModel[activeProject];
    }

    // Update model with key/value pair.
    function updateModel(property, value) {
        switch (property) {
            case 'genre':
            case 'code structure':
            case 'instrument':
                var index = projectModel[activeProject][property].indexOf(value);
                if (index === -1) {
                    projectModel[activeProject][property].push(value); // Unlimited number of genres/instruments.
                }
                break;
            case 'form':
                projectModel[activeProject]['form'][0] = value; // Only one form at a time.
                break;
            default:
                console.log('Invalid project model entry.');
        }
        console.log(projectModel);
    }

    // Return to empty/default model.
    function clearModel() {
        projectModel[activeProject] = {};
        for (var i in defaultProjectModel) {
            projectModel[activeProject][i] = [];
        }
    }

    // Empty single property array.
    function clearProperty(property) {
        projectModel[activeProject][property] = [];
    }

    // Remove single property from array.
    function removeProperty(property, propertyValue) {
        if (projectModel[activeProject][property]) {
            var index = projectModel[activeProject][property].indexOf(propertyValue);
            if (index > -1) {
                projectModel[activeProject][property].splice(index, 1);
            }
        }
    }

    /** FROM STACKOVERFLOW
     * Returns a random integer between min (inclusive) and max (inclusive).
     * The value is no lower than min (or the next integer greater than min
     * if min isn't an integer) and no greater than max (or the next integer
     * lower than max if max isn't an integer).
     * Using Math.round() will give you a non-uniform distribution!
     */
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function isEmpty() {
        for(var key in projectModel[activeProject]) {
            if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
                return false
            }
        }
        return true;
    }

    function getNonEmptyFeatures() {
        var features = [];
        for(var key in projectModel[activeProject]) {
            if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
                features.push(key)
            }
        }
        return features;
    }

    function getAllProperties() {
        var properties = [];
        for (var key in projectModel[activeProject]) {
            if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
                for (var pVal in projectModel[activeProject][key]) {
                    properties.push([key,projectModel[activeProject][key][pVal]]);
                }
            }
        }
        return properties;
    }

    function hasProperty(property) {
        for (var key in projectModel[activeProject]) {
            if (projectModel[activeProject][key] !== undefined && projectModel[activeProject][key].length !== 0) {
                for (var pVal in projectModel[activeProject][key]) {
                    if (projectModel[activeProject][key][pVal] === property) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function setOptions() {
        availableGenres = recommender.availableGenres();
        propertyOptions['genre'] = availableGenres;
        suggestablePropertyOptions['genre'] = availableGenres;
        suggestableProperties['multiple']['genre'] = availableGenres;
        
        // availableInstruments = recommender.availableInstruments();
        // propertyOptions['instrument'] = availableInstruments;
        // suggestablePropertyOptions['instrument'] = availableInstruments;
        // suggestableProperties['multiple']['instrument'] = availableInstruments;
    }


    return {
        getModel: getModel,
        updateModel: updateModel,
        clearModel: clearModel,
        clearProperty: clearProperty,
        removeProperty: removeProperty,
        getOptions: getOptions,
        getProperties: getProperties,
        randomPropertySuggestion: randomPropertySuggestion,
        setActiveProject: setActiveProject,
        propertyButtons: propertyButtons,
        isEmpty: isEmpty,
        getNonEmptyFeatures: getNonEmptyFeatures,
        getAllProperties: getAllProperties,
        hasProperty: hasProperty,
        setOptions: setOptions
    };

}]);
