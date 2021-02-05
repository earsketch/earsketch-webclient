app.controller('layoutController', ['layout', '$rootScope', '$scope', '$timeout', '$window', '$location', 'ESUtils', 'userConsole', 'esconsole', 'reporter', 'collaboration', 'userNotification', function (layout, $rootScope, $scope, $timeout, $window, $location, ESUtils, userConsole, esconsole, reporter, collaboration, userNotification) {
    // TODO: use the localStorage service
    var localStorage = $window.localStorage;

    //embedableTrack
    $scope.isEmbedded = $location.search()["embedded"] === "true";
    var hideDaw = $location.search()["hideDaw"] && $scope.isEmbedded;
    var hideCode = $location.search()["hideCode"] && $scope.isEmbedded;
    window.layoutScope = $scope; // TODO: Don't do this.

    $scope.layout = {
        sidebar: true,
        main: true,
        curriculum: true,
        daw: true,
        console: true,
        coder: !hideCode,
        browser: 0 // -1: all closed, 0: sound, 1: script, 2: share, 3: api
    };

    // #1991: Some layout panes don't like to be closed at initialization,
    // so we cannot assign / ng-init $scope.layout state with the isEmbedded value.
    // Here, deferring the pane control until the embedded script is loaded.
    $scope.$on('embeddedScriptLoaded', () => {
        ['curriculum','console'].forEach(pane => {
            $scope.layout[pane] = false;
        });
        $scope.closeSidebarTabs();
    });

    $scope.embedDivSize = $scope.isEmbedded && !$scope.layout.coder ? 0 : 10;
    $scope.defaultDawSize = "200px"; 
    if($scope.isEmbedded){
        if(!$scope.layout.coder && !hideDaw) {
            $scope.defaultDawSize = "100%";
        } else {
            if(hideDaw) $scope.defaultDawSize = "54px";
        }
    }


    $scope.layoutLoaded = false;
    $scope.curriculumMaximized = false;
    var lastLayout = {};

    // TODO: move direct manipulation of elements to a directive
    function updateSplitBars() {
        var splitbars = angular.element('.ui-splitbar');

        var indices = {
            sidebar: 0,
            daw: 1,
            console: 2,
            curriculum: 3,
            chat: 3
        };

        var sel = [];

        if (!$scope.curriculumMaximized) {
            angular.forEach($scope.layout, function (v, k) {
                if (k !== 'browser' && k !== 'coder') {
                    if (v) {
                        sel.push(indices[k]);
                    }
                }
            });
        }

        for (var i = 0; i < 4; i++) {
            // hide all handles (W, N, S, E)
            angular.element(splitbars[i]).addClass('no-bg');
        }

        sel.forEach(function (v) {
            // no-bg hides the handles -- remove to show
            angular.element(splitbars[v]).removeClass('no-bg');
        });

        // a little ugly, but since this function is called from many other sibling functions
        // note: localstorage can only store key-value pairs (single string value)

        if ($scope.layoutLoaded && ! $scope.isEmbedded) {
            localStorage.setItem('layout', JSON.stringify($scope.layout));
        }

        // this is from the mainController scope...
        $scope.toggleNotificationHistory(false);
    }

    /**
     * Function to toggle the layout panes
     */
    $scope.toggleLayout = function (pane) {
        if ($scope.curriculumMaximized) {
            $scope.toggleCurriculumMaximization();
        }

        if (pane === 'daw') {
            // TODO: Possible redundancy after the canvas toggle being removed.
            $scope.layout['daw'] = true;
            angular.element("#zoom-container").show();
        } else if (pane === 'chat') {
            $scope.showChatWindow = !$scope.showChatWindow;
            if ($scope.showChatWindow)
                $scope.showCAIWindow = false;
            if(!$scope.showCAIWindow)
                $scope.layout['curriculum'] = $scope.showChatWindow;

            if ($scope.showChatWindow) {
                collaboration.joinTutoring();
            } else {
                // collaboration.leaveTutoring();
            }
            layout.set('chat', $scope.showChatWindow, true);
        } else if (pane == 'cai') {
            $scope.showCAIWindow = !$scope.showCAIWindow;
            if ($scope.showCAIWindow)
                $scope.showChatWindow = false;
            if (!$scope.showChatWindow)
                $scope.layout['curriculum'] = $scope.showCAIWindow;

            layout.set('cai', $scope.showCAIWindow, true);
        } else if (pane === 'curriculum') {
            $scope.layout[pane] = ($scope.showChatWindow || $scope.showCAIWindow) ? true : !$scope.layout[pane];
            $scope.showChatWindow = false; 
            $scope.showCAIWindow = false;
            $scope.$broadcast('toggleCurr', $scope.layout[pane]);
        } else {
            // Toggle the layout
            $scope.layout[pane] = !$scope.layout[pane];
        }

        updateSplitBars();
        reporter.sidebarTogglesClicked();
    };
    
    /**
     * Function to toggle the layout to open or closed state
     */
    $scope.toggleLayoutToState = function (pane, state) {
        if (state === "open") {
            if (!$scope.layout[pane]) {
                $scope.toggleLayout(pane);
            }
        } else if (state === "close") {
            if ($scope.layout[pane]) {
                $scope.toggleLayout(pane); // TODO: what is this
            }
        } else {
            $scope.toggleLayout(pane);
        }
    };

    /**
     * On listener for ui.layout.resize event.
     *
     * @private
     */
    $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
        resizeNavigationWidth();

        /* Toggle the layout parameter when resize pane to zero */
        // TODO: is this logic still being used???

        // Toggle when beforeContainer size is zero
        if (beforeContainer.uncollapsedSize === 0) {

            if (afterContainer.id === "content") {
                $scope.closeSidebarTabs();
                $scope.layout['sidebar'] = false;
            }

            if (afterContainer.id === "coder" && beforeContainer.id === "devctrl") {
                $scope.toggleLayout('daw');
            }

            if (beforeContainer.id === "coder" && afterContainer.id === "console-frame")
                $scope.toggleLayout('coder');
        }

        // Toggle when afterContainer size is zero
        if (afterContainer.uncollapsedSize === 0) {

            if (afterContainer.id === "coder" && beforeContainer.id === "devctrl")
                $scope.toggleLayout('coder');

            if (afterContainer.id === "console-frame")
                $scope.toggleLayout('console');

            if (afterContainer.id === "curriculum-container")
                $scope.toggleLayout('curriculum');
        } else {
            if (afterContainer.id === 'console-frame') {
                userConsole.scroll();
            }
        }
    });

    /**
     * On listener for ui.layout.loaded event. Add functions to run when ui layout is loaded.
     * @private
     */
    $scope.$on('ui.layout.loaded', function () {
        $timeout(function () {
            // recall locally-stored layout object if safe
            if (localStorage.getItem('layout') !== null && !$scope.isEmbedded) {
                var recall = JSON.parse(localStorage.getItem('layout'));
                if (ESUtils.compareObjStructure($scope.layout, recall)) {
                    if(!$scope.isEmbedded) $scope.layout = recall;

                    $scope.layout.daw = true;
                    $scope.layout.main = true;
                    $scope.layout.coder = true;
                }
            }

            $scope.layoutLoaded = true;
            updateSplitBars();
        });

        angular.element('#screen').fadeOut(100);
        userNotification.isInLoadingScreen = false;
    });

    $scope.$on('openConsoleOnCodeCompileError', function() {
        if (!$scope.layout.console) {
            $scope.toggleLayout('console');
        }
    });

    $scope.$on('togglePanesOnOpeningOwnSharedScript', function() {
        // close the curriculum pane if it's open
        if ($scope.layout.curriculum) {
            $scope.toggleLayout('curriculum');
        }
        if (!$scope.layout.browser.script && !$scope.isEmbedded) {
            $scope.openSidebarTab('script');
        }
        if ($scope.layout.sidebar){
            $scope.toggleSidebarTab('sidebar');
        }
    });

    // Note: Shared-script browser was retired.
    // $scope.$on('switchToShareMode', function() {
    //     if ($scope.layout.curriculum) {
    //         $scope.toggleLayout('curriculum');
    //     }
    //     if (!$scope.isEmbedded) {
    //         $scope.openSidebarTab('share');
    //     }
    // });

    /**
     * Function to run when digest cycle completes.
     *
     * @private
     */
    function postDigest(callback) {
        var unregister = $rootScope.$watch(function () {
            unregister();
            $timeout(function () {
                callback();
                postDigest(callback);
            }, 0, false);
        });
    }

    /**
     * Function for post digest cycle
     *
     * @private
     */
    postDigest(function () {
        var editorScope = angular.element('.code-container').scope();
        if (editorScope) {
            editorScope.editor.droplet.resize();
        }
    });

    $scope.closeSidebarTabs = function () {
        $scope.layout.browser = -1;
        $scope.layout['sidebar'] = false;
        updateSplitBars();
    };

    $scope.openSidebarTab = function (tab) {
        // A workaround for issue #1985
        $timeout(() => {
            $scope.layout.browser = ['sound', 'script', 'share', 'api'].indexOf(tab);
            $scope.layout['sidebar'] = true;
            updateSplitBars();
        }, 0);
    };

    $scope.toggleSidebarTab = function (tab) {
        if ($scope.curriculumMaximized) {
            $scope.toggleCurriculumMaximization();
        }

        var requestId = ['sound', 'script', 'share', 'api'].indexOf(tab);

        // if the tab is already open
        if ($scope.layout.browser === requestId) {
            $scope.layout.browser = -1;
            $scope.layout['sidebar'] = false;
            updateSplitBars();
        } else {
            $scope.layout.browser = requestId;
            $scope.layout['sidebar'] = true;
            updateSplitBars();
        }

        if (tab == 'sound') {
            $timeout(function() {$rootScope.$broadcast('refreshSounds');}, 10);
        }
    };

    $scope.toggleSidebarTabToState = function (tab, state) {
        var requestId = ['sound', 'script', 'share', 'api'].indexOf(tab);

        if (state === "open") {
            if ($scope.layout.browser !== requestId) {
                $scope.toggleSidebarTab(tab);
            }
        } else if (state === "close") {
            if ($scope.layout.browser === requestId) {
                $scope.toggleSidebarTab(tab);
            }
        } else {
            $scope.toggleSidebarTab(tab);
        }
    };

    $scope.toggleCurriculumMaximization = function () {
        $scope.curriculumMaximized = !$scope.curriculumMaximized;
        var key;

        if ($scope.curriculumMaximized) {
            for (key in $scope.layout) {
                if ($scope.layout.hasOwnProperty(key)) {
                    lastLayout[key] = $scope.layout[key];
                }
            }

            $scope.closeSidebarTabs();
            $scope.layout.main = false;
        } else {
            for (key in lastLayout) {
                if (lastLayout.hasOwnProperty(key)) {
                    $scope.layout[key] = lastLayout[key];
                }
            }

            $scope.layout.main = true;
        }

        updateSplitBars();
    };

    $scope.$on('toggleSidebar', function (event, tab) {
        $scope.toggleSidebarTab(tab);
    });

    $scope.resetScrollBars = function () {
        $rootScope.$broadcast('resetScrollBars');
    };

    $scope.$watch(function () {
        return $scope.layout.browser;
    }, function () {
        // open and close the sidebar when sidebar tabs are toggled

        // TODO: global bad!
        if (typeof(myLayout) !== 'undefined') {
            if ($scope.laout.browser > -1 && myLayout.west.state.isClosed) {
                myLayout.open('west');
            } else if ($scope.laout.browser === -1 && !myLayout.west.state.isClosed) {
                myLayout.close('west');
            }
        }
    }, true);
}]);
