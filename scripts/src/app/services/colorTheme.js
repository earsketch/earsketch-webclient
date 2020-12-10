/**
 * Manage color themes across controllers and directives.
 *
 * @module colorTheme
 * @author Takahiko Tsuchiya
 */
app.factory('colorTheme', ['localStorage', '$rootScope', 'esconsole', function (localStorage, $rootScope, esconsole) {
    var currentTheme = 'dark';

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
            if (currentTheme === 'dark') {
                setTheme('light');
            } else {
                setTheme('dark');
            }

            return currentTheme;
        },
        
        load: function () {
            setTheme(localStorage.get('colorTheme'));
        }
    }
}]);