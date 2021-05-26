/**
 * Manage color themes across controllers and directives.
 *
 * @module colorTheme
 * @author Takahiko Tsuchiya
 */
import esconsole from '../../esconsole'

app.factory('colorTheme', ['localStorage', '$rootScope', function (localStorage, $rootScope) {
    var currentTheme = 'light';

    function setTheme(theme) {
        esconsole('setting the color theme to ' + theme);

        if (['dark', 'light'].indexOf(theme) === -1) {
            return null;
        }

        currentTheme = theme;
        localStorage.set('colorTheme', currentTheme);

        $rootScope.$emit('colorThemeChanged', currentTheme);
        return currentTheme;
    }

    return {
        subscribe: function (scope, callback) {
            var handler = $rootScope.$on('colorThemeChanged', callback);
            scope.$on('$destroy', handler);
        },

        get: function () {
            return currentTheme;
        },

        set: setTheme,

        toggle: function () {
            const newTheme = currentTheme==='dark' ? 'light' : 'dark';
            return setTheme(newTheme);
        },
        
        load: function () {
            const theme = localStorage.get('colorTheme', 'light');
            return setTheme(theme);
        }
    }
}]);