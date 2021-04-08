
/**
 * Project Modeling module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Jason Smith
 */
app.factory('caiProjectModel', [function () {

    // Initialize empty model.
    var defaultProjectModel = {'genre': [], 'instrument': [], 'form': []};
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
        clearProperty: clearProperty
    };

}]);
