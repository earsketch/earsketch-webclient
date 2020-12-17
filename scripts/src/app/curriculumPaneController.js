app.directive('curriculumpane', function () {
    return {
        require: 'ideController', // TODO: why is it using the ideController scope?
        templateUrl: 'templates/curriculum-pane.html',
        transclude: true,
        controller: ['$scope', '$element', '$templateCache', '$http', '$templateRequest', 'ESUtils', '$compile', 'esconsole', 'clipboard', 'userNotification', 'localStorage', 'colorTheme', '$rootScope', 'userProject', 'collaboration', '$location',
            function($scope, $element, $templateCache, $http, $templateRequest, ESUtils, $compile, esconsole, clipboard, userNotification, localStorage, colorTheme, $rootScope, userProject, collaboration, $location) {
                $scope.templateURL = 'tocPopoverTemplate.html';
                $scope.popoverIsOpen = false;
                $scope.popover2IsOpen = false;
                $scope.showURLbutton = false;
                $scope.showSlideButton = false;
                $scope.showSlides = false;
                $scope.isSlideSwitch = false;

                $scope.language = localStorage.get('language', 'python');

                // set display language from URL parameter if not logged in
                if (['python', 'javascript'].indexOf(ESUtils.getURLParameters('language')) > -1) {
                    $scope.language = ESUtils.getURLParameters('language');
                    $rootScope.$broadcast('language', $scope.language);
                }

                $scope.toggleDisplayLanguage = function () {
                    if ($scope.language === 'python') {
                        $scope.language = 'javascript';
                    } else {
                        $scope.language = 'python';
                    }
                    $rootScope.$broadcast('language', $scope.language);
                    $rootScope.$broadcast('curriculumLanguage', $scope.language);
                };

                $scope.currentLocation = [-1];
                $scope.currentSection = 'Table of Contents';

                $scope.body = $element.find('body[data-type="book"]');
                $scope.chapter = null;
                $scope.sections = null;

                $scope.chapterHeading = '';

                $scope.$on('language', function (event, val) {
                    // TODO: this gets called multiple times when switching tabs
                    $scope.language = val;
                    $scope.filterLang();
                    var videos = angular.element('video');
                    for (var i = 0; i < videos.length; i++) {
                        videos[i].pause();
                    }
                    $rootScope.$broadcast('curriculumLanguage', $scope.language);
                });

                $scope.$on('fontSizeChanged', function (event, val) {
                    angular.element('#curriculum').css('font-size', val);
                });
                angular.element('#curriculum').css('font-size', $scope.fontSizNum);

                $scope.toc = ESCurr_TOC;
                $scope.numSlides = ESNum_Slides; // data listing the number of slides for each chapter
                $scope.slides = []; // list of slide image URLs
                $scope.focus = [null, null]; // unit, chapter

                var pageIdx = -1;
                var tocPages = ESCurr_Pages;

                //==========================================
                // TEMPORARY FOR AMAZON CONTEST TESTING
                var compModeFromURL = $location.absUrl().includes('competition');

                // Show additional chapters when either the global or the URL param is true.
                if (FLAGS.SHOW_CURRICULUM_FINAL_CHAPTER || compModeFromURL) {
                    // Add an item to the hard-coded `num_slides.js` data.
                    $scope.numSlides.push([]);

                    // TOC / pages data are already generated and included.
                } else {
                    // Remove the Remix-Competition chapter in TOC.
                    $scope.toc.pop();

                    // Remove "Unit 9" page indices.
                    tocPages = tocPages.filter(function (unit) {
                        return unit[0] !== 9;
                    });

                    // Num_Slides are not properly generated, so no need for edits.
                }
                //==========================================

                var curriculumDir = '../curriculum/';

                function preloadModifiedHTML(url) {
                    url = curriculumDir + url;
                    $templateRequest(url, true).then(function (template) {
                        $templateCache.put(url, template);
                    }).catch(function (err) {

                    });
                }

                /**
                 * Used for controlling the TOC collapsible items.
                 * @param $event
                 * @returns {null}
                 */
                $scope.toggleFocus = function ($event) {
                    // prevent popover "outsideClick" to be mistriggered by the change of the DOM contents
                    $event.stopPropagation();

                    var elem = $event.target;
                    var scope = angular.element(elem).scope();

                    if (typeof(scope.secIdx) !== 'undefined') {
                        return null;
                    } else if (typeof(scope.chIdx) !== 'undefined') {
                        if ($scope.focus[1] === scope.chIdx) {
                            $scope.focus[1] = null;
                        } else {
                            $scope.focus[1] = scope.chIdx;
                        }
                    } else if (typeof(scope.unitIdx) !== 'undefined') {
                        if ($scope.focus[0] === scope.unitIdx) {
                            $scope.focus[0] = null;
                        } else {
                            $scope.focus[1] = null;
                            $scope.focus[0] = scope.unitIdx;
                        }
                    }
                };

                $scope.getChNumberForDisplay = function(unitIdx, chIdx) {
                    if ($scope.toc[unitIdx].chapters[chIdx] === undefined || $scope.toc[unitIdx].chapters[chIdx].displayChNum === -1) {
                        return '';
                    } else {
                        return $scope.toc[unitIdx].chapters[chIdx].displayChNum;
                    }
                };

                $scope.getChNumber = function (unitIdx, chIdx) {
                    var numChs = $scope.toc.map(function (unit) {
                        return unit.chapters.length;
                    });

                    var base = 0;
                    for (var i = 0; i < unitIdx; i++) {
                        base += numChs[i];
                    }
                    return base + chIdx+1;
                };

                colorTheme.subscribe($scope, function (event, theme) {
                    if (theme === 'dark') {
                        angular.element('#dropdown-toc').css('background-color', '#373737');

                        // remove default pygment class
                        angular.element('#curriculum').removeClass('curriculum-light');
                        angular.element("#curriculum .curriculum-javascript").removeClass('default-pygment');
                        angular.element("#curriculum .curriculum-python").removeClass('default-pygment');

                    } else {
                        angular.element('#dropdown-toc').css('background-color', '#FFFFFF');

                        // add default pygment class
                        angular.element('#curriculum').addClass('curriculum-light');
                        angular.element("#curriculum .curriculum-javascript").addClass('default-pygment');
                        angular.element("#curriculum .curriculum-python").addClass('default-pygment');
                    }
                });

                // TODO: clean up the ugly incr stuff
                function findLocFromTocUrl(url) {
                    var incr = true;
                    var i = 0;
                    var loc = [0];
                    $scope.toc.forEach(function (unit, unitIdx) {
                        unit.chapters.forEach(function (ch, chIdx) {
                            if (ch.URL === url) {
                                loc = [unitIdx, chIdx];
                                incr = false;
                            }
                            if (incr) {
                                i++;
                            }

                            ch.sections.forEach(function (sec, secIdx) {
                                if (sec.URL === url) {
                                    loc = [unitIdx, chIdx, secIdx];
                                    incr = false;
                                }
                                if (incr) {
                                    i++;
                                }
                            });
                        });
                    });
                    // pageIdx = i;
                    return loc;
                }

                /**
                 * Function to load chapter
                 */
                $scope.loadChapter = function (href, loc) {

                    if (typeof(loc) === 'undefined') {
                        var url = href.split('/').slice(-1)[0].split('#').slice(0, 1)[0];
                        var sectionDiv = href.split('/').slice(-1)[0].split('#')[1];
                        loc = findLocFromTocUrl(href);
                    }

                    if (loc.length === 1) {
                        if ($scope.toc[loc[0]].chapters.length > 0) {
                            if ($scope.toc[loc[0]].chapters[0].length > 0) {
                                loc = [loc[0], 0, 0];
                            } else {
                                loc.push(0);
                            }
                        }
                    }

                    if (loc.length === 2) {
                        var currChapter = $scope.toc[loc[0]].chapters[loc[1]];

                        if (currChapter.sections.length > 0) {
                            if (typeof(sectionDiv) === 'undefined') {
                                // when opening a chapter-level page, also present the first section
                                loc.push(0); // add the first section (index 0)
                                href = currChapter.sections[0].URL;
                            } else {
                                //section id was sent in href, present the corresponding section
                                for (var i = 0; i < currChapter.sections.length; ++i) {
                                    if (sectionDiv === currChapter.sections[i].URL.split('#')[1]) {
                                        loc.push(i);
                                        href = currChapter.sections[i].URL;
                                        break;
                                    }
                                }
                            }
                        } else {
                            href = currChapter.URL;
                        }
                    }

                    var keepGoing = true;
                    var isReload = (!$scope.isSlideSwitch) && ($scope.currentLocation.length == loc.length) && $scope.currentLocation.every(function(element, index) {
                            if (keepGoing && (element !== loc[index])) {
                                keepGoing = false;
                                return false;
                            } else {
                                return true
                            }
                        });

                    $scope.showSlides = false; // reset back to regular curriculum text
                    $scope.isSlideSwitch = false; // reset the slide button

                    // TODO: this was breaking the navigation, disabling for now...
                    if (!isReload) {

                        // clear cached elements
                        $element.find('div.sect1').remove();
                        $element.find('div.sect2').remove();

                        $scope.currentLocation = loc;

                        // this with ng-include would automatically cache the template into templateCache, but we preload all the html in the above toc pagination parser to prevent some http-loading instability
                        $scope.templateURL = curriculumDir + href;
                        $scope.$applyAsync();

                        // console.log($templateCache.info());

                        // update the pageIdx for the pagination if necessary
                        pageIdx = tocPages.map(function(v) {
                            return v.toString();
                        }).indexOf(loc.toString());

                        // fill the list of slide image URLs
                        $scope.slides = [];
                        var chNum = '';
                        if ($scope.currentLocation.length === 1 && $scope.currentLocation[0] === 0) {
                            //It's welcome page
                        } else {
                            chNum = $scope.getChNumberForDisplay($scope.currentLocation[0], $scope.currentLocation[1]);
                        }


                        if ($scope.numSlides[$scope.currentLocation[0]].length > 0 && chNum !== '') {
                            for (var i = 0; i < $scope.numSlides[$scope.currentLocation[0]][$scope.currentLocation[1]]; i++) {

                                var slideNum = (i+1).toString();
                                if (slideNum.length === 1) {
                                    slideNum = '0' + slideNum;
                                }
                                $scope.slides.push('/teachermaterials/Unit ' + $scope.currentLocation[0] + '/Lesson ' + chNum + '/Slide' + slideNum + '.jpeg');
                            }

                            $scope.showSlideButton = true;
                        } else {
                            $scope.showSlideButton = false;
                        }

                    }

                    $scope.popoverIsOpen = false;
                    $scope.popover2IsOpen = false;
                    $scope.showURLbutton = true;
                };

                /*Function that loads the relevant chapter
                based on error message displayed in console*/
                $scope.loadChapterForError = function (errorMessage) {
                    var text = errorMessage.split(" ")[3];
                    if (text === 'ImportError:') {
                        $scope.loadChapter('ch_31.html#importerror');
                    } else if (text === 'IndentationError:') {
                        $scope.loadChapter('ch_31.html#indentationerror');
                    } else if (text === 'IndexError:') {
                        $scope.loadChapter('ch_31.html#indexerror');
                    } else if (text === 'NameError:' || text === 'ReferenceError:') {
                        $scope.loadChapter('ch_31.html#nameerror');
                    } else if (text === 'ParseError:') {
                        $scope.loadChapter('ch_31.html#parseerror');
                    } else if (text === 'SyntaxError:') {
                        $scope.loadChapter('ch_31.html#syntaxerror');
                    } else if (text === 'TypeError:') {
                        $scope.loadChapter('ch_31.html#typeerror');
                    } else if (text === 'ValueError:' || text === 'RangeError:') {
                        $scope.loadChapter('ch_31.html#valueerror');
                    }
                }; 

                // TODO: more like "page loaded"
                $scope.chapterLoaded = function () {
                    $scope.body = $element.find('div.sect1').parent();

                    angular.element('pre code').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });

                    //==============================================
                    // cache section elements and clear the page (for reformatting)
                    $scope.sections = $element.find('div.sect2').clone();
                    // remove the nested sections from the parent chapter
                    $element.find('div.sect2').remove();

                    // copy the chapter portion AFTER removing the nested sections
                    $scope.chapter = $element.find('div.sect1').clone();
                    // remove the chapter portion for now
                    $element.find('div.sect1').remove();

                    // re-append the modified individual parts to the chapter body
                    // TODO: These reorganization might not be necessary at all with the new asciidoc-based curriculum. Check and remove?
                    $scope.body.append($scope.chapter);
                    $scope.body.append($scope.sections);

                    // TODO: page header thing... broken
                    // $scope.chapter.find('h1').css('margin-top', '20px');
                    // $scope.chapter.find('h1').parent().prepend(
                    //     '<div style="text-align:center; font-size:25px; color:#888888; font-weight:bold;">' +
                    //     'Unit ' + $scope.currentLocation[0] + ' ' +
                    //     'Chapter ' + ($scope.currentLocation[0]) +
                    //     '</div>'
                    // );
                    //
                    // $scope.sections.find('h1').css('margin-top', '20px');
                    // $scope.sections.find('h1').parent().prepend(function (i) {
                    //     return '<div style="text-align:center; font-size:20px; color:#888888; font-weight:bold;">' +
                    //         'Unit ' + $scope.currentLocation[0] + ' ' +
                    //         'Chapter ' + ($scope.currentLocation[0]+1) + ' ' +
                    //         'Section ' + (i+1) +
                    //         '</div>';
                    // });

                    $scope.pageChanged();
                    $scope.filterLang();

                    if ($scope.query !== undefined && $scope.query !== '') {
                        //Highlight search text matches found in the curriculum
                        var myHilitor = new Hilitor("curriculum-atlas");
                        myHilitor.setMatchType("left");
                        myHilitor.apply($scope.query);
                    }
                };

                $scope.copyURL = function () {
                    var URL = SITE_BASE_URI + '#?curriculum=' + $scope.currentLocation.join('-') + '&language=' + $scope.language;
                    clipboard.copyText(URL);
                    userNotification.show('Curriculum URL was copied to the clipboard');
                };

                $scope.filterLang = function () {
                    if ($scope.language === 'python') {
                        $element.find('.curriculum-python').show();
                        $element.find('.curriculum-javascript').hide();
                        $element.find('.copy-btn-py').show();
                        $element.find('.copy-btn-js').hide();
                    } else {
                        $element.find('.curriculum-python').hide();
                        $element.find('.curriculum-javascript').show();
                        $element.find('.copy-btn-py').hide();
                        $element.find('.copy-btn-js').show();
                    }
                };

                // show the current section and title in the footer
                $scope.updateCurrentPageTitle = function () {
                    if (pageIdx === -1) {
                        $scope.currentSection = 'Table of Contents';
                        return null;
                    }

                    var title = '';
                    var loc = $scope.currentLocation;

                    if (loc.length === 1) {
                        $scope.currentSection = $scope.toc[loc[0]].title;
                    } else if (loc.length === 2) {
                        if ($scope.chapter.find('h2').length) {
                            title = $scope.chapter.find('h2')[0].textContent;
                        }

                        var chNumForDisplay = $scope.getChNumberForDisplay(loc[0], loc[1]);
                        if (chNumForDisplay) {
                            $scope.currentSection = $scope.getChNumberForDisplay(loc[0], loc[1]) + ': ' + title;
                        } else {
                            $scope.currentSection = title;
                        }
                    } else if (loc.length === 3) {
                        if (angular.element($scope.sections[loc[2]]).find('h3').length) {
                            title = angular.element($scope.sections[loc[2]]).find('h3')[0].textContent;
                        }
                        var chNumForDisplay = $scope.getChNumberForDisplay(loc[0], loc[1]);
                        if (chNumForDisplay) {
                            $scope.currentSection = $scope.getChNumberForDisplay(loc[0], loc[1]) + '.' + (loc[2]+1) + ': ' + title;
                        } else {
                            $scope.currentSection = (loc[2]+1) + ': ' + title;
                        }
                    }
                };

                $scope.pageChanged = function () {
                    // clear all sections
                    $scope.chapter.hide();
                    $scope.sections.hide();

                    if ($scope.currentLocation.length <= 2) {
                        $scope.chapter.show();
                    } else if ($scope.currentLocation.length === 3) {
                        if ($scope.currentLocation[2] === 0) {
                            $scope.chapter.show(); // the first section also is shown with the chapter header
                        }

                        angular.element($scope.sections[$scope.currentLocation[2]]).show();
                    }

                    $scope.updateCurrentPageTitle();

                    if (collaboration.active && collaboration.tutoring) {
                        collaboration.sendCurriculumOpenRecord($scope.currentSection);
                    }
                };

                function loadPageFromIdx(idx) {
                    var url;

                    if (idx < -1) {
                        pageIdx = -1;
                        return null;
                    } else if (idx >= tocPages.length) {
                        pageIdx--;
                        return null;
                    }

                    if (idx === -1) {
                        $scope.templateURL = 'tocPopoverTemplate.html';
                        $scope.showURLbutton = false;
                    } else {
                        var loc = tocPages[idx];
                        if (loc.length === 1) {
                            url = $scope.toc[loc[0]].URL;
                        } else if (loc.length === 2) {
                            url = $scope.toc[loc[0]].chapters[loc[1]].URL;
                        } else if (loc.length === 3) {
                            url = $scope.toc[loc[0]].chapters[loc[1]].sections[loc[2]].URL;
                        }
                        $scope.loadChapter(url, loc);
                        $scope.currentLocation = loc;
                    }
                }

                $scope.prevPage = function () {
                    loadPageFromIdx(--pageIdx);
                };

                $scope.nextPage = function () {
                    loadPageFromIdx(++pageIdx);
                };

                toggleSidebar = function (arg) {
                    $scope.$emit('toggleSidebar', arg);
                };

                downloadProtectedData = function () {
                    // if logged in as admin or teacher
                    if (userProject.isLogged()) {
                        userProject.getUserInfo().then(function (userInfo) {
                            if (userInfo && userInfo.role === 'admin' || userInfo.role === 'teacher') {
                                // start downloading immediately
                                var userName = userProject.getUsername();
                                var password = userProject.getEncodedPassword();

                                var requestURL = URL_DOMAIN + '/services/files/getprotecteddatawithlogin';
                                var opts = {
                                    params: {
                                        'username': userName,
                                        'password': password
                                    },
                                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                                    responseType : 'blob'
                                };

                                $http.post(requestURL, null, opts).then(function(data){
                                    console.log(data.length);
                                    var zipFileName = "teacherMaterials.zip";
                                    var teacherMaterialsFile = data.data;
                                    var downloadUrl = URL.createObjectURL(teacherMaterialsFile);
                                    var a = document.createElement("a");       
                                    a.href = downloadUrl;
                                    a.download = zipFileName;
                                    document.body.appendChild(a);
                                    a.click();

                                }).catch(function (error) {
                                    esconsole(error, 'error');
                                })
                            } else {
                                // proceed to the download modal
                                $scope.downloadProtectedData();
                            }
                        });
                    } else {
                        // proceed to the download modal
                        $scope.downloadProtectedData();
                    }
                };

                /**
                 * Function to toggle slide state
                 *
                 * @private
                 */
                $scope.toggleSlides = function () {
                    $scope.showSlides = !$scope.showSlides;
                    if ($scope.showSlides) {
                        $scope.templateURL = 'mySlideTemplate.html';
                        $scope.isSlideSwitch = true;
                    } else {
                        loadPageFromIdx(pageIdx);
                        $scope.isSlideSwitch = false;
                    }
                };

                $scope.toggleMaximization = function () {
                    // :S
                    angular.element('[ng-controller=layoutController]').scope().toggleCurriculumMaximization();
                };

                /**
                 * Function to toggle table of contents
                 *
                 * @private
                 */
                $scope.tableOfContents = function () {
                    if ($scope.showSlides) {
                        $scope.showSlides = !$scope.showSlides;
                    }
                    $scope.templateURL = 'tocPopoverTemplate.html';
                };

                $scope.openFromUrlParam = function () {
                    var locstr = ESUtils.getURLParameters('curriculum');
                    if (locstr !== null) {
                        var loc = locstr.split('-').map(function (idx) {
                            return parseInt(idx);
                        });
                        var sec = null;
                        if (loc.every(function (idx) {
                                return !isNaN(idx);
                            })) {

                            try {
                                if (loc.length === 1) {
                                    sec = $scope.toc[loc[0]];
                                } else if (loc.length === 2) {
                                    sec = $scope.toc[loc[0]].chapters[loc[1]];
                                } else if (loc.length === 3) {
                                    sec = $scope.toc[loc[0]].chapters[loc[1]].sections[loc[2]];
                                }
                            } catch (e) {
                                esconsole('Curriculum index does not exist: ' + loc, 'curriculum');
                            }

                            if (sec && sec.hasOwnProperty('URL')) {
                                $scope.loadChapter(sec.URL, loc);
                            }
                        }
                    }
                };

                // preload the curriculum content into cache
                $scope.toc.forEach(function (unit) {
                    if (unit.chapters.length === 0 && unit.sections.length === 0) {
                        preloadModifiedHTML(unit.URL);
                    } else if (unit.chapters.length !== 0) {
                        unit.chapters.forEach(function (ch) {
                            // register a chapter (heading) as a loadable page only if it doesn't have a child section
                            if (ch.sections.length === 0) {
                                preloadModifiedHTML(ch.URL);
                                // $http.get(url, { cache: $templateCache });
                            }

                            ch.sections.forEach(function (sec) {
                                preloadModifiedHTML(sec.URL);
                                // $http.get(url, { cache: $templateCache });
                            });
                        });
                    } else if (unit.sections.length !== 0) {
                        unit.sections.forEach(function (sec) {
                            preloadModifiedHTML(sec.URL);
                        });
                    }
                });

                $scope.openFromUrlParam();
            }]
    };
});


