import angular from 'angular';

// TODO: Should replace the global ServiceWrapper in api/angular-wrappers.js
export const getNgService = (name: string): angular.IRootScopeService => angular.element(document).injector().get(name);

export const getNgController = (controllerName: string) => {
    const elem = document.querySelector(`[ng-controller="${controllerName}"]`);
    return elem ? angular.element(elem) : {
        scope() { return null }
    };
}

export const getNgDirective = (directiveName: string) => {
    const elem = document.querySelector(`div[${directiveName}]`);
    return elem ? angular.element(elem) : {
        scope() { return null }
    };
}

export const getNgRootScope = () => angular.element(document).injector().get('$rootScope');

export const getNgMainController = () => angular.element(document.body);