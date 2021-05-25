/**
 * This file is a way to load Angular services outside of the Angular framework
 * specifically for use in the EarSketch API which exists outside of Angular.
 *
 * Using these wrappers, we can mock them in unit tests for easier testing.
 * (Trying to mock angular services for use outside of angular components is
 * a not-so-trivial task, so instead we mock these.)
 */

import angular from "angular";

export default function ServiceWrapper() {
    var elem = angular.element(document.querySelector('[ng-controller]'));
    var injector = elem.injector();

    // Load the autograder service outside angular
    var ApiAutograder = injector.get('autograder');

    // Load the user-project service outside angular
    var ApiUserProject = injector.get('userProject');

    // Load the audio analyzer outside angular
    var ApiAnalyzer = injector.get('analyzer');

    return {
        autograder: ApiAutograder as any,
        userProject: ApiUserProject as any,
        analyzer: ApiAnalyzer as any,
    }
}
