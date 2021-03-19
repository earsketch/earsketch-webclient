import * as scripts from '../browser/scriptsState';
import * as tabs from '../editor/tabState';

/**
 * Angular controller for the IDE (text editor) and surrounding items.
 * @module ideController
 */
app.controller("tabController", ['$rootScope', '$scope', '$http', '$uibModal', '$location', '$timeout', 'WaveformCache', 'compiler', 'renderer', 'uploader', 'userProject', 'userConsole', 'userNotification', 'wsapi', 'ESUtils', 'esconsole', '$window', '$confirm','$q', 'localStorage', 'completer', 'reporter', 'colorTheme', 'collaboration', '$ngRedux', function ($rootScope, $scope, $http, $uibModal, $location, $timeout, WaveformCache, compiler, renderer, uploader, userProject, userConsole, userNotification, wsapi, ESUtils, esconsole, $window, $confirm, $q, localStorage, completer, reporter, colorTheme, collaboration, $ngRedux) {
    $scope.tabContextMenu = [];

    $scope.openContextMenu = function (index) {
        $scope.swapTab(index);

        $scope.tabContextMenu.forEach(function (tab) {
            tab.state = false;
        });
        $scope.tabContextMenu[index].state = true;
    };

    $scope.preventPopover = function (index) {
        $scope.tabContextMenu[index].state = false;
    };

    $scope.activeTab = 0; // the index of the current active tab

    $scope.embeddedScriptUsername = "";
    $scope.embeddedScriptName = "";
    $scope.$on('embeddedScriptLoaded', function(event, data){
        $scope.embeddedScriptUsername = data.username;
        $scope.embeddedScriptName = data.scriptName;
    })

    /**
     * Array containing the currently open tabs with properties like shareid, source_code, active, etc.
     * @type {Array}
     */
    $scope.tabs = [];

    // update open tabs whenever the open scripts list changes
    $scope.scripts = userProject.scripts;
    $scope.sharedScripts = userProject.sharedScripts;
    $scope.openScripts = userProject.openScripts;
    $scope.openSharedScripts = userProject.openSharedScripts;

    var scriptTimeoutPeriod = 600000; // 10 minutes

    // TODO: why use these async stuff here?
    // watch for changes to the scripts, and update any open tabs
    $scope.$watch('scripts', function () {
        // TODO: use forEach
        for (var i in $scope.openScripts) {
            if ($scope.openScripts.hasOwnProperty(i)) {
                var key = $scope.openScripts[i];
                var index = -1, count = 0;

                angular.forEach($scope.tabs, function(tab) {
                    if(tab.shareid === key) {
                        index = count;
                    }
                    count++;
                });

                if ($scope.tabs[index] && !$scope.tabs[index].readonly && $scope.scripts[key]) {
                    $scope.tabs[index] = $scope.scripts[key];
                } else if ($scope.tabs[index] && !$scope.tabs[index].isShared && $scope.scripts[key]) {
                    $scope.tabs.splice(index, 0, $scope.scripts[key]);
                }
            }
        }
    }, true);

    $scope.$watch('sharedScripts', function () {
        if (userProject.sharedScriptsReady) {
            // TODO: use forEach
            for (var i in $scope.openSharedScripts) {
                if ($scope.openSharedScripts.hasOwnProperty(i)) {
                    var shareid = $scope.openSharedScripts[i];
                    var index = -1, count = 0;

                    angular.forEach($scope.tabs, function(tab) {
                        if (tab.shareid === shareid) {
                            index = count;
                        }
                        count++;
                    });

                    if ($scope.tabs[index] && $scope.sharedScripts[shareid]) {
                        $scope.tabs[index] = $scope.sharedScripts[shareid];
                    }
                }
            }
        }
    }, true);

    $scope.$watch('openScripts', function () {
        refreshTabState();
    }, true);

    $scope.$watch('openSharedScripts', function () {
        refreshTabStateForSharedScripts();
    }, true);

    /**
     * layoutController informs this function when the tabs are done loading so
     * we can check of for any active tabs in the tabdrop and 'bubble' it up
     */
    $scope.$on('checkForDroppedTabs', function (event, currentTabId) {
        $scope.isDroppedTabActive = angular.element('.tab-container .dropdown-menu > li.active').length;
        if ($scope.isDroppedTabActive) {
            var droppedTabsCount = angular.element('.tab-container .dropdown-menu > li').length;
            var moveToIndex = $scope.tabs.length - droppedTabsCount;

            if (moveToIndex > -1) {
                //Remove tab from the drop-down
                var removedTab = $scope.tabs.splice(currentTabId,1);

                //Insert tab as the last visible tab
                $scope.tabs.splice(moveToIndex, 0, removedTab[0]);

                //switch focus to currently active tab
                $scope.swapTab(moveToIndex);
            }
        }
    });

    $scope.$on('updateTabFromEditorSave', function () {
        if ($scope.tabs.length > 0 && !$scope.tabs[$scope.activeTab].saved) {
            $scope.saveScript();
        } else if ($scope.tabs[$scope.activeTab].collaborative) {
            collaboration.saveScript();
        }
        $scope.activeTabID && $ngRedux.dispatch(tabs.removeModifiedScript($scope.activeTabID));
    });

    $scope.$on('updateTabValueOnEditorChange', function() {
        if ($scope.tabs[$scope.activeTab]) {
            $scope.tabs[$scope.activeTab].source_code = $scope.editor.getValue();
        }
    });

    $scope.$on('markCurrentTabDirty', function(){
        markCurrentTabDirty();
    });

    $scope.$on('createScript', function(event, shareid){
        refreshTabState();
        $scope.swapTab($scope.getTabId(shareid));
    });

    $scope.$on('selectScript', function(event, shareid){
        refreshTabState();
        $scope.swapTab($scope.getTabId(shareid));
    });

    $scope.$on('openCurriculumCode', function(event, fake_script){
        var newTab = $scope.openReadOnlyTab(fake_script);
        $scope.swapTab(newTab); 
    });

    $scope.$on('importScript', function(event, script){
        $scope.importScript(script);
    });

    $scope.$on('copyScript', function(event, script){
        $scope.copyScript(script);
    });

    $scope.$on('showTabAfterScriptVersionChange', function(event, script){
        var tabId = $scope.getTabId(script.shareid);

        if (tabId === -1) {
            // open the script in tab
            //note - selectScript() is inherited from IDE controller
            $scope.selectScript(script);
        } else {
            // it is already open, set focus on it
            $scope.swapTab(tabId);
        }
    });

    $scope.$on('saveCollaborativeScriptAttempt', function(){
        var script = $scope.tabs[$scope.activeTab];
        if (script.collaborative) {
            // if (script.username === userProject.getUsername()) {
                collaboration.saveScript(script.shareid);
            // }
            $rootScope.$broadcast('scriptSaveResponseRecieved');
        } else if (!script.readonly && !script.isShared && !script.saved) {
            // save the script on a successful run
            userProject.saveScript(script.name, script.source_code, true, userProject.STATUS_SUCCESSFUL)
                .then(function () {
                    $rootScope.$broadcast('scriptSaveResponseRecieved');
                }).catch(function (err) {
                    $rootScope.$broadcast('scriptSaveResponseRecieved');
                    userNotification.show(ESMessages.idecontroller.savefailed, 'failure1');
            });
        } else {
            $rootScope.$broadcast('scriptSaveResponseRecieved');
        }
    });

    $scope.$on('saveCollaborativeScriptFailure', function(){
        var script = $scope.tabs[$scope.activeTab];
        if (script.collaborative) {
            // if (script.username === userProject.getUsername()) {
                collaboration.saveScript(script.shareid);
            // }
            $rootScope.$broadcast('scriptSaveResponseRecieved');
        } else if (!script.readonly && !script.isShared && !script.saved) {
            userProject.saveScript(script.name, script.source_code, true, userProject.STATUS_UNSUCCESSFUL)
                .then(function () {
                    $rootScope.$broadcast('scriptSaveResponseRecieved');
                }).catch(function (err) {
                $rootScope.$broadcast('scriptSaveResponseRecieved');
                userNotification.show(ESMessages.idecontroller.savefailed, 'failure1');
            });
        } else {
            $rootScope.$broadcast('scriptSaveResponseRecieved');
        }
    });

    $scope.$on("swapTabAfterIDEinit", function(){
        $scope.swapTab(0);
    });

    $scope.$on("selectSharedScript", function(event, script){
        $scope.selectSharedScript(script);
    });

    $scope.$on('refreshTabState', () => {
        $ngRedux.dispatch(scripts.syncToNgUserProject());
        refreshTabState();
    });

    // TODO: move this to tabs service?
    /**
     * Updates tabs by looking into openScripts
     *
     * @private
     */
    function refreshTabState () {
        esconsole('refreshing the tab state', 'IDE');

        var notOwnedScriptsCache = [];
        var i;

        for (i in $scope.tabs) {
            if ($scope.tabs.hasOwnProperty(i)) {
                var script = $scope.tabs[i];
                if (!script) continue;
                // #1858
                if (script.readonly || (userProject.isLogged() && script.collaborative && script.username.toLowerCase() !== userProject.getUsername().toLowerCase())) {
                    notOwnedScriptsCache[i] = script;
                }
            }
        }

        $scope.tabs = [];

        if ($scope.openScripts.length > 0 ) {
            // if the user has tabs, open them
            for (i in $scope.openScripts) {
                var key = $scope.openScripts[i];
                if ($scope.openScripts.hasOwnProperty(i) && $scope.scripts[key]) {
                    $scope.tabs.push($scope.scripts[key]);
                }
            }
        }

        // re-insert read-only or not-owned tabs at previous positions
        angular.forEach(notOwnedScriptsCache, function(value, key) {
            // checking this because collaborative scripts in notOwnedScriptsCache is handled differently from the share scripts cache upon logout.
            // TODO: could be improved by introducing the tabs service properly.
            if (value && (userProject.scripts.hasOwnProperty(value.shareid) || userProject.sharedScripts.hasOwnProperty(value.shareid) || value.readonly)) {
                $scope.tabs.splice(key, 0, value);
            }
        });
    }

    // TODO: move this to tabs service?
    /**
     * Updates tabs by looking into openSharedScripts
     *
     * @private
     */
    function refreshTabStateForSharedScripts () {
        esconsole('refreshing the tab state for shared scripts', 'IDE');

        var openScriptsCache = {};
        var i;

        for (i in $scope.tabs) {
            if ($scope.tabs.hasOwnProperty(i)) {
                if ($scope.tabs[i] && !$scope.tabs[i].isShared) {
                    openScriptsCache[i] = $scope.tabs[i];
                }
            }
        }

        $scope.tabs = [];
        if ($scope.openSharedScripts.length > 0 ) {
            // if the user has tabs, open them
            for (i in $scope.openSharedScripts) {
                if ($scope.openSharedScripts.hasOwnProperty(i)) {
                    var key = $scope.openSharedScripts[i];
                    $scope.sharedScripts[key] && $scope.tabs.push($scope.sharedScripts[key]);
                }
            }
        }

        // re-insert open tabs at previous positions
        angular.forEach(openScriptsCache, function(value, key) {
            value && $scope.tabs.splice(key, 0, value);
        });
    }

    collaboration.refreshTabStateForSharedScripts = refreshTabStateForSharedScripts;

    /**
     * Function to run when digest cycle completes. Approach for running jquery or doing any necessary DOM manipulation.
     *
     * @private
     */
    function postDigest(callback) {
        var unregister = $rootScope.$watch(function () {
            unregister();
            $timeout(function () {
                callback();
                postDigest(callback); // TODO: why?
            },0,false);
        });
    }

    postDigest(function () {
        // $scope.setupDropdownTabs(); // TODO: Only call it when state is invalidated.
    });

    
    /**
     *
     * @name markCurrentTabDirty
     * @function
     */
    function markCurrentTabDirty() {
        // TODO: not working well with collaborative scripts
        var script = $scope.tabs[$scope.activeTab];

        if (script && !script.collaborative) {
            // the script has been modified -- flag the script
            script.saved = false;
            script.tooltipText = ESMessages.idecontroller.unsavedScript;

            // set a timeout to save the script
            if (!script.timeoutActive) {
                script.timeoutActive = $timeout(saveScriptOnTimeout, scriptTimeoutPeriod, true, $scope.activeTab);
            }

            // To reflect changes in tab saved state
            $scope.$$phase || $scope.$digest();

            $scope.activeTabID && $ngRedux.dispatch(tabs.addModifiedScript($scope.activeTabID));
        }
    }

    /**
     * Opens a tab in the IDE controller that is not backed by a script in the
     * user service. Useful scripts opened in the curriculum.
     *
     * @param script {Object} The script object to put in the tab as read-only.
     * @returns {int} The index of the newly opened tab.
     */
    $scope.openReadOnlyTab = function (script) {
        esconsole('opening a read-only tab', 'IDE');

        script.readonly = true;
        $scope.tabs.push(script);

        $ngRedux.dispatch(scripts.addReadOnlyScript(Object.assign({}, script)));
        return $scope.tabs.length - 1;
    };

    /**
     * @name selectSharedScript
     * @function
     * @param script
     * @returns {null}
     */
    $scope.selectSharedScript = function (script) {
        esconsole('selected a shared script', 'IDE');

        userProject.openSharedScript(script.shareid);
        //refresh tab state to keep $scope.tabs up-to-date before we call getTabId
        refreshTabStateForSharedScripts();
        $scope.swapTab($scope.getTabId(script.shareid));
    };

    /**
     * @name swapTab
     * @function
     * @param newTabIndex {number}
     */
    $scope.swapTab = function (newTabIndex) {
        esconsole('swapping tab to: ' + newTabIndex, 'IDE');

        // Notify the target tab when in chat session.
        if (collaboration.active && collaboration.tutoring) {
            collaboration.sendTabSwitchRecord($scope.tabs[newTabIndex]);
        }

        //note - the editor value is passed to the tabController from ideController via scope inheritance
        if ($scope.editor.ace) {
            var nextScript = $scope.tabs[newTabIndex];
            var prevScript = $scope.tabs[$scope.activeTab];

            if (newTabIndex >= 0 && typeof(nextScript) !== 'undefined') {
                if (typeof(prevScript) !== 'undefined' && prevScript.collaborative && nextScript !== prevScript) {
                    collaboration.closeScript(prevScript.shareid, userProject.getUsername());
                }
                if (nextScript.collaborative) {
                    collaboration.openScript(nextScript, userProject.getUsername());
                }

                $scope.activeTab = newTabIndex;
				//AVN LOG
                //console.log("ACTIVE TAB SET", $scope.activeTab, newTabIndex);

                if (nextScript.collaborative) {
                    if ($scope.editor.droplet.currentlyUsingBlocks) {
                        $scope.toggleBlocks();
                    }
                } else {
                    // TODO: editor.setValue wrapper not working with ace editor?
                    if ($scope.editor.droplet.currentlyUsingBlocks) {
                        $scope.editor.droplet.setValue(nextScript.source_code, -1);
                    } else {
                        $scope.editor.ace.setValue(nextScript.source_code, -1);
                    }
                    $scope.editor.setReadOnly(!!nextScript.readonly || $scope.isEmbedded); //isEmbedded inherited from ideController
                }

                userConsole.clear();
                $scope.clearErrors();
                $scope.setLanguage(ESUtils.parseLanguage(nextScript.name));

                if (nextScript.isShared) {
                    if (nextScript.collaborative) {
                        userConsole.status('Opening a collaborative script.');
                    } else {
                        $scope.isEmbedded || userConsole.status(ESMessages.idecontroller.shared);
                    }
                } else if (nextScript.readonly) {
                    userConsole.status(ESMessages.idecontroller.readonly);
                }

                // alerts the dawController to reset preservation flags
                $rootScope.$broadcast('swapTab');

                $rootScope.$broadcast('caiSwapTab',$scope.tabs[$scope.activeTab].name);

            }
            else {
                $rootScope.$broadcast('caiClose');
            }

            $scope.editor.clearHistory();
            // force-set the custom horizontal scroller width and re-render
            $scope.editor.ace.renderer.scrollBarH.setInnerWidth($scope.editor.ace.renderer.content.clientWidth);
            $scope.editor.ace.resize();

            if (newTabIndex >= 0 ) {
                if ($scope.tabs.length) {
                    $scope.activeTabID = $scope.tabs[newTabIndex].shareid;
                    $ngRedux.dispatch(tabs.setOpenTabs($scope.tabs.map(v => v.shareid)));
                    $ngRedux.dispatch(tabs.setActiveTabID($scope.activeTabID));
                }
            } else if ($scope.tabs.length) {
                $ngRedux.dispatch(tabs.setOpenTabs($scope.tabs.map(v => v.shareid)));
                $ngRedux.dispatch(tabs.setActiveTabID($scope.activeTabID));
            } else {
                $ngRedux.dispatch(tabs.resetTabs());
            }
        }
    };

    $scope.$on('reloadRecommendations', function(event){
        $rootScope.$broadcast('recommenderScript',$scope.tabs[$scope.activeTab]);
    });

    /**
     * @name getTabId
     * @function
     * @param shareid {text}
     */
    $scope.getTabId = function (shareid) {
        var index = 0;
        var matchedIndex = -1;

        angular.forEach($scope.tabs, function(tab) {
            if (tab.shareid === shareid) {
                matchedIndex = index;
            }
            index++;
        });
        return matchedIndex;
    };

    /**
     * @name closeTab
     * @function
     * @param id {number}
     * @param $event
     */
    $scope.closeTab = function (id, $event) {
        esconsole('closing a tab at: ' + id, 'IDE');

        let savePromise = null;

        if ($event) {
            $event.preventDefault();
            $event.stopPropagation();
        }

        var script = $scope.tabs[id];

        if (script.collaborative) {
            collaboration.closeScript(script.shareid, userProject.getUsername());
        }

        // shared scripts don't need to be saved, so close the tab
        if (script.isShared) {
            $scope.openSharedScripts = userProject.closeSharedScript(script.shareid);
            $scope.tabs.splice(id, 1);
        }
        // readonly tabs are not backed by the user service, so just close the tab
        else if (script.readonly) {
            $scope.tabs.splice(id, 1);
            $ngRedux.dispatch(scripts.removeReadOnlyScript(script.shareid));
        }
        // otherwise tabs are backed by the user service
        else if (!script.saved && !script.collaborative) {
            // TODO: manage saving with collaborative scripts

            // only ask for user permission when the script is unsaved
            // var c = confirm(ESMessages.idecontroller.closetab);

            // actually, let's go ahead and automatically save scripts
            savePromise = userProject.saveScript(script.name, script.source_code)
                .then(function () {
                    $scope.openScripts = userProject.closeScript(script.shareid);
                    $scope.tabs.splice(id, 1);

                    esconsole($scope.tabs, 'LOG');
                    esconsole($scope.openScripts, 'LOG');
                    userNotification.show(ESMessages.user.scriptcloud, 'success');
                }).catch(function (err) {
                userNotification.show(ESMessages.idecontroller.savefailed, 'failure1');
            });

            $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
        } else {

            $scope.openScripts = userProject.closeScript(script.shareid);
            $scope.tabs.splice(id, 1);
        }
        savePromise ? savePromise.then(() => $scope.swapTabAfterClose(id)) : $scope.swapTabAfterClose(id);
    };

    /**
     * @name swapTabAfterClose
     * @function
     */
    $scope.swapTabAfterClose = function (id) {
        esconsole('swapping tab after closing, from: ' + id, 'IDE');

        if ($scope.activeTab < id) {
            //focused tab is to the left of closed tab, keep the focus same
            $scope.swapTab($scope.activeTab);
        } else {
            //closed tab is the last tab OR
            //focused tab is to the right closed tab, then decrease the index by one
            if (id === $scope.tabs.length || $scope.activeTab > id) {
                $scope.swapTab(id - 1);
            } else {
                $scope.swapTab(id);
            }
        }
    };

    /**
     * @name setupDropDownTabs
     * @function
     */
    $scope.setupDropdownTabs = function () {
        angular.element('.nav-tabs').tabdrop({align:'left'}).tabdrop('layout');
        angular.element('.close-all').remove();
        angular.element('.nav-tabs').find('.dropdown-menu').append('<li class="close-all"><a>Close All</a></li>');
        angular.element('.nav-tabs').find('.dropdown-menu').css('left','inherit').css('transform','inherit').css('top','40px');
        angular.element('.close-all').on('mousedown', function () {
            $confirm({text: ESMessages.idecontroller.closealltabs,
                ok: "Close All"}).then(function () {
                var promises = userProject.saveAll();
                $q.all(promises).then(function () {
                    userNotification.show(ESMessages.user.allscriptscloud);

                    //once all scripts have been saved close all tabs
                    angular.forEach($scope.tabs, function(script) {
                        if(!script.isShared) {
                            userProject.closeScript(script.shareid);
                        } else {
                            userProject.closeSharedScript(script.shareid);
                        }
                    });
                    $scope.tabs.splice(0,$scope.tabs.length);
                    $ngRedux.dispatch(tabs.resetTabs());
                }).catch(function (err) {
                    userNotification.show(ESMessages.idecontroller.saveallfailed, 'failure1');
                });
            });

            $scope.$applyAsync();
        });

        //set up scroll bar when dropdown menu cannot show completely
        var dropdownmenu = angular.element('.nav-tabs').find('.dropdown-menu');
        var tabnumber = dropdownmenu.children().length;
        //28：tab height in dropdown menu; 104: height of close all tab and parts above editor
        var dropdownmenuheight = (tabnumber-2)*28+104;
        var coderheight = angular.element("#coder").height();
        if (dropdownmenuheight>coderheight) {
            //69 : height of those above editor
            dropdownmenu.css({"overflow":"auto","max-height": coderheight-69 + "px"});
        }
        else{
            dropdownmenu.css({"overflow":"","max-height": ""});
        }
    };

    $scope.closeAllTabs = function () {
        $confirm({text: ESMessages.idecontroller.closealltabs,
            ok: "Close All"}).then(function () {
            var promises = userProject.saveAll();
            $q.all(promises).then(function () {
                userNotification.show(ESMessages.user.allscriptscloud);

                //once all scripts have been saved close all tabs
                angular.forEach($scope.tabs, function(script) {
                    if(!script.isShared) {
                        userProject.closeScript(script.shareid);
                    } else {
                        userProject.closeSharedScript(script.shareid);
                    }
                });
                $scope.tabs.splice(0,$scope.tabs.length);
                $ngRedux.dispatch(tabs.resetTabs());
                $ngRedux.dispatch(tabs.resetModifiedScripts());
                $ngRedux.dispatch(scripts.resetReadOnlyScripts());
            }).catch(function (err) {
                userNotification.show(ESMessages.idecontroller.saveallfailed, 'failure1');
            });
        });

        $scope.$applyAsync();
    };

    /**
     * @name updateFileLabel
     * @function
     * @param name {string}
     */
    $scope.updateFileLabel = function (name) {
        $scope.tabs[$scope.activeTab].name = name;
    };

    /**
     * @name saveScript
     * @function
     */
    $scope.saveScript = function () {
        var script = $scope.tabs[$scope.activeTab];
        if (!script.saved && !script.collaborative) {
            console.log('saved', script);
            $rootScope.$broadcast('recommenderScript', script);
            userProject.saveScript(script.name, script.source_code).then(function () {
                if (userProject.isLogged()) {
                    userNotification.show(ESMessages.user.scriptcloud, 'success');
                } else {
                    userNotification.show(ESMessages.user.scriptlocal);
                }
                $ngRedux.dispatch(scripts.syncToNgUserProject());
            }).catch(function (err) {
                userNotification.show(ESMessages.idecontroller.savefailed, 'failure1');
            });
        }
    };

    /**
     * @name copyScript
     * @function
     */
    $scope.copyScript = function (script) {
        if (!script) {
            script = $scope.tabs[$scope.activeTab];
        }

        userProject.saveScript(script.name, script.source_code,false)
            .then(function (savedScript) {
                userNotification.show(ESMessages.user.scriptcopied);
                $scope.selectScript(savedScript);
            });
    };

    /**
     * @name importScript
     * @function
     */
    $scope.importScript = function (script) {
        if (typeof(script) === 'undefined') {
            script = $scope.tabs[$scope.activeTab];
        }

        esconsole('importing a shared script ' + script.name, 'IDE');
        var author = script.username ? script.username : 'EarSketch';

        if (script.collaborative) {
            // TODO: kind of redundant with userProject.importScript
            var p, originalScriptName = script.name;
            if (userProject.lookForScriptByName(script.name)) {
                p = $uibModal.open({
                    templateUrl: 'templates/rename-import-script.html',
                    controller: 'renameController',
                    size: 100,
                    resolve: {
                        script: function() { return script; }
                    }
                }).result;

                p.then(function(newScript) {
                    if (newScript.name === script.name) {
                        script.name = nextName(script.name);
                    } else {
                        script.name = newScript.name;
                    }
                    return script;
                }, function () {
                    //dismissed
                }).catch(function(err) {

                });
            } else {
                // Script name is valid, so just return it
                p = new Promise(function(resolve) { resolve(script); });
            }

            p.then(function () {
                userNotification.show('Saving a *copy* of collaborative script "' + originalScriptName + '" (created by ' + author + ') into your local Script Browser.');
                collaboration.getScriptText(script.shareid).then(function (text) {
                    userProject.saveScript(script.name, text).then(function () {
                        userProject.refreshCodeBrowser();
                        $ngRedux.dispatch(scripts.syncToNgUserProject());
                    });
                });
            });
        } else {
            userProject.importScript(script).then(function(importedScript) {
                userNotification.show('Imported a copy of script "' + script.name + '" (created by ' + author + ') into your local Script Browser.');
                // For some reason, closing is only required for read-only script
                if (!script.isShared) {
                    $scope.closeTab($scope.getTabId(script.shareid));
                }

                $scope.refreshCodeBrowser().then(function() {
                    $ngRedux.dispatch(scripts.syncToNgUserProject());
                    return $scope.selectScript(importedScript);
                });
            }).catch(function(err) {
                //TODO:can check for this in renameController ondismiss
                if (err === "backdrop click") {
                    userNotification.show('Cancelled Import');
                } else {
                    userNotification.show(err);
                }
            });
        }
    };

    /**
     * @name refreshCodeBrowser
     * @function
     */
    $scope.refreshCodeBrowser = function () {
        return userProject.refreshCodeBrowser();
    };

    /**
     * save script on timeout
     * @name saveScriptOnTimeout
     * @function
     */
    function saveScriptOnTimeout(id) {
        var script = $scope.tabs[id];
        // collaborative script saving is managed mainly on server
        if (!script.saved && !script.collaborative) {
            userProject.saveScript(script.name, script.source_code);
        }
        delete $scope.tabs[id].timeoutActive;
    }
}]);
