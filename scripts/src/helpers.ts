import angular from 'angular';
import { react2angular } from 'react2angular';

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

export function wrapModal(component: Function) {
    const wrapped = ({ modalInstance, resolve, ...props}: any) => component({ close: modalInstance.close, ...resolve, ...props })
    return react2angular(wrapped, ["modalInstance", "resolve"])
}