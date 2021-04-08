
/**
 * Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Jason Smith
 */
app.factory('caiProjectModel', [function () {

    // Initialize empty model.
    var defaultProjectModel = { 'genre': [], 'instrument': [], 'form': [] };


    var propertyOptions = {
        'genre': ["HIP HOP", "RNB", "DUBSTEP", "EIGHTBIT", "ELECTRO", "HOUSE", "LATIN", "URBANO LATINO", "CINEMATIC SCORE", "EDM", "POP", "ROCK", "TRAP", "UK HOUSE", "WORLD PERCUSSION", "TECHNO", "WEST COAST HIP HOP", "RNB FUNK", "GOSPEL", "NEW HIP HOP", "ALT POP", "FUNK", "NEW FUNK"],
        'instrument': ["DRUMS", "VOCALS", "WINDS", "SYNTH", "KEYBOARD", "STRINGS", "SFX", "BASS"],
        'form': ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"],
        'complexity': ['forLoop', 'function', 'consoleInput', 'conditional']
    };

    var projectModel = {};
    clearModel();

    //returns a list of all properties that can be set/adjusted
    function getProperties() {
        var properties = Object.keys(propertyOptions);
        return properties;
    }

    function getOptions(propertyString) {
        if (Object.keys(propertyOptions).includes(propertyString)) {
            return propertyOptions[propertyString].slice(0);
        }
        else return [];
    }



    var projectModel = {};
    clearModel();

    // Public getter.
    function getModel() {
        return projectModel;
    }

    // Update model with key/value pair.
    function updateModel(property, value) {

        switch(property) {
            case 'genre':
            case 'instrument':
                projectModel[property].push(value); // Unlimited number of genres/instruments.
                break;
            case 'form':
                projectModel['form'][0] = value; // Only one form at a time.
                break;
            default:
                console.log('Invalid project model entry.');
        }

    }

    // Return to empty/default model.
    function clearModel() {
        projectModel = Object.assign({}, defaultProjectModel);
    }

    // Empty single property array.
    function clearProperty(property) {
        projectModel[property] = [];
    }

    return {
        getModel: getModel,
        updateModel: updateModel,
        clearModel: clearModel,
        clearProperty: clearProperty,
        getOptions: getOptions,
        getProperties: getProperties
    };

}]);
