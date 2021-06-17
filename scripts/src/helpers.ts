import angular from 'angular';
import React from 'react';
import { Provider } from 'react-redux';
import { react2angular } from 'react2angular';

import store from './reducers';

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

export function wrapModal(Component: any) {
    const Wrapped = ({ modalInstance, resolve, ...props}: any) =>
        React.createElement(Provider, { store }, React.createElement(Component, { close: modalInstance.close, ...resolve, ...props }, null))
    return react2angular(Wrapped, ["modalInstance", "resolve"])
}