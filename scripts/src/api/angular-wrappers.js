/**
 * This file is a way to load Angular services outside of the Angular framework
 * specifically for use in the EarSketch API which exists outside of Angular.
 *
 * Using these wrappers, we can mock them in unit tests for easier testing.
 * (Trying to mock angular services for use outside of angular components is
 * a not-so-trivial task, so instead we mock these.)
 */

function ServiceWrapper() {
    var elem = angular.element(document.querySelector('[ng-controller]'));
    var injector = elem.injector();

    // Load the audio library service outside angular
    var ApiAudioLibrary = injector.get('audioLibrary');

    // Load the compiler service outside angular
    var ApiCompiler = injector.get('compiler');

    // Load the renderer outside angular
    var ApiRenderer = injector.get('renderer');

    // Load the user console outside angular
    var ApiUserConsole = injector.get('userConsole');

    // Load the autograder service outside angular
    var ApiAutograder = injector.get('autograder');

    // Load the user-project service outside angular
    var ApiUserProject = injector.get('userProject');

    // Load the audio analyzer outside angular
    var ApiAnalyzer = injector.get('analyzer');

    // Load the effect builder outside angular
    var ApiApplyEffects = injector.get('applyEffects');

    // Load the reader service outside angular
    var ApiReader = injector.get('reader');

    // Load the esutils service outside angular
    var ESUtils = injector.get('ESUtils');

    return {
        audioLibrary: ApiAudioLibrary,
        compiler: ApiCompiler,
        renderer: ApiRenderer,
        userConsole: ApiUserConsole,
        autograder: ApiAutograder,
        userProject: ApiUserProject,
        analyzer: ApiAnalyzer,
        applyEffects: ApiApplyEffects,
        reader: ApiReader,
        ESUtils: ESUtils,
    }
}
