// describe('My First Test', () => {
//     it('Visits the Kitchen Sink', () => {
//       cy.visit('https://example.cypress.io')
//     })
//     it('finds the content "type"', () => {
//         cy.visit('https://example.cypress.io')
    
//         cy.contains('type').click()

//         cy.url().should('include', '/commands/actions')
//       })
//   })

describe('General Client Test', () => {

    beforeEach(() => {
        let moveCursor = "{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}"
        let pythonCode1 = "fitMedia(HOUSE_DEEP_DREAMPAD_001, 1, 1, 5)"
        let pythonCode2 = "{enter}print(dur(HOUSE_DEEP_DREAMPAD_001))"
        let jsCode2 = "{enter}println(dur(HOUSE_DEEP_DREAMPAD_001));"
        let finish = "{enter}finish()"
        let step3 = moveCursor.concat(pythonCode1).concat(finish)
        let step4 = moveCursor.concat(pythonCode1).concat(pythonCode2).concat(finish)
        let step5 = moveCursor.concat('{backspace}').concat(pythonCode1).concat(';').concat(finish).concat(';')
        let step6 = moveCursor.concat('{backspace}').concat(pythonCode1).concat(';').concat(jsCode2).concat(finish).concat(';')

        cy.wrap(moveCursor).as('moveCursor')
        cy.wrap(pythonCode1).as('pythonCode1')
        cy.wrap(pythonCode2).as('pythonCode2')
        cy.wrap(finish).as('finish')
        cy.wrap(step3).as('step3')
        cy.wrap(step4).as('step4')
        cy.wrap(step5).as('step5')
        cy.wrap(step6).as('step6')
    })




    it('1: opens the earsketch page & gets stuff out of the way', () => {
        // cy.visit('https://earsketch.gatech.edu/earsketch2/')
        // cy.visit('https://earsketch-test.ersktch.gatech.edu/earsketch2/')
        cy.visit('http://localhost:8081/')

        cy.get('button').contains(/skip/gi).click()

        // close the curriculum if it is open, bc it blocks our view
        cy.get('#curriculum-container').then((curriculumcontainer) => {
            if (curriculumcontainer.hasClass('ui-layout-hidden')) {
                // do nothing, move on to next step
            } else {
                // close the curriculum
                cy.get('#sidenav-curriculum > .icon').click()
            }
        })
    })

    it('2: opens sound browser and previews a sound', () => {

        // check to make sure the sound browser is open. if it is, continue. if not, open it and continue.

        // this opens up script browser to check if my if statement works
        // cy.get('#sidenav-scriptbrowser > .icon').click()


        cy.get('sound-browser').parent().then((parent) => {
            if (parent.hasClass('active')) {
                // do nothing, move on to next step
            } else {
                // open the sound browser
                cy.get('#sidenav-filebrowser > .icon').click()
            }
        })
        // cy.get('sound-browser > div > div > div > div .flex-grow').To('bottom')
        cy.get('sound-browser > div').contains('CIARA_MELANIN_BEAT').click()

        // cy.get('[style="overflow: visible"]').children('[style="overflow: auto; will-change: transform;"]').scrollTo('bottom')
        
        // cy.get('[class="flex-grow"; style="position:relative"]').scrollTo('bottom')
        
        // cy.get('[style="position: relative; height: 367px; width: 300px; overflow: auto; will-change: transform; direction: ltr;"]').scrollTo('bottom')
       
        // click on the first play button, wait a second, and click again. currently not sure how to make cypress check if audio is happening
        cy.get(':nth-child(1) > .flex-grow > .pl-2 > .btn').click()
        cy.wait(1000)
        cy.get(':nth-child(1) > .flex-grow > .pl-2 > .btn').click()
    })

    it('3: runs a py script with fitMedia()', () => {
        // REMINDER THAT THIS TEST WILL FAIL UNLESS YOU HAVE THE SIMULATED PAGE OPEN AND VIEWABLE ON YOUR SCREEN!

        // create a new script. depending on what ran before this, you either have to click "create a new script" or the add tab button
        // cy.get('body').then(() => {
        //     if(cy.get('a').contains(/Click here to create a new script/ig).is(':visible')) {
        //         cy.get('a').contains(/Click here to create a new script/ig).click()
        //     } else if(cy.get('#btn-add-tab > .icon')) {
        //         cy.get('#btn-add-tab > .icon').click()
        //     }
        // })
        cy.get('a').contains(/Click here to create a new script/ig).then(($newscripttext) => {
            if($newscripttext.is(':visible')) {
                $newscripttext.click()
            }
        }) 
        cy.get('#btn-add-tab > .icon').then(($newscripttab) => {
            if($newscripttab.is(':visible')) {
                $newscripttab.click()
            }
        })

        cy.get('#newscriptname').type('cypressPython1')
        cy.get('[ng-click="confirm()"]').click()

        cy.get('@step3').then((step3) => {
            cy.get('.ace_content').type(step3)
        })

        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','Script ran successfully')
        })

    })
    it('4: runs a py script with an EarSketch function', () => {
        // make a new script
        cy.get('#btn-add-tab > .icon').click()
        cy.get('#newscriptname').type('cypressPython2')
        cy.get('[ng-click="confirm()"]').click()

        cy.get('@step4').then((step4) => {
            cy.get('.ace_content').type(step4)
        })

        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','Script ran successfully')
            cy.get('#console').should('contain','2')

        })
    })
    it('5: runs a js script with fitMedia()', () => {
        // make a new script this time with javascript!
        cy.get('#btn-add-tab > .icon').click()
        cy.get('#newscriptname').type('cypressJavaScript1')
        cy.get(':nth-child(2) > .form-control').select('JavaScript')
        cy.get('[ng-click="confirm()"]').click()

        cy.get('@step5').then((step5) => {
            cy.get('.ace_content').type(step5)
        })
        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','Script ran successfully')
        })
    })
    it('6: runs a js script with an EarSketch function', () => {
        // make a new script this time with javascript!
        cy.get('#btn-add-tab > .icon').click()
        cy.get('#newscriptname').type('cypressJavaScript2')
        cy.get(':nth-child(2) > .form-control').select('JavaScript')
        cy.get('[ng-click="confirm()"]').click()

        cy.get('@step6').then((step6) => {
            cy.get('.ace_content').type(step6)
        })
        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','Script ran successfully')
            cy.get('#console').should('contain','2')
        })
    })
    it('7: play, repeat, metronome, volume, and reset', () => {
        // run the last script open
        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','Script ran successfully')
        })

        // make sure the pause button displays when the play button is clicked.
        cy.get('[ng-hide="playing"] > .btn > .icon').click().then(() => {
            cy.get('[ng-show="playing"]').should('not.have.class','ng-hide')
            cy.wait(1000)
            cy.get('[ng-show="playing"] > .btn > .icon').click()
        })

        // check that the slider has the expected behavior (muted icon shows when muted, slider returns to previous value when unmute button clicked)
        cy.get('#dawVolumeSlider').invoke('val').then(($origVolume) => {
            cy.get('#dawVolumeSlider').invoke('val',-20).trigger('change')
            cy.get('[ng-show="volumeMuted"]').should('not.have.class','ng-hide')
            cy.wait(500)
            cy.get('[ng-show="volumeMuted"]').click()
            // check that when you click the unmute button, the slider goes back to the previous value.
            cy.get('#dawVolumeSlider').should('have.value', $origVolume)
        })

        // metronome - check turning on and off, is it still on after clicking to turn off/daw playback?
        cy.get('#dawMetronomeButton').click().should('have.class','btn-clear-warning')
        cy.get('[ng-hide="playing"] > .btn > .icon').click()
        cy.wait(1000)
        cy.get('[ng-show="playing"] .btn > .icon').click()
        cy.get('#dawMetronomeButton').click().should('not.have.class','btn-clear-warning')

        // repeat button - check turning on and off and pause and play buttons
        cy.get('[ng-click = "toggleLoop();"]').click().should('have.class','btn-clear-warning')
        cy.get('[ng-hide="playing"] > .btn > .icon').click()
        cy.wait(5000)
        cy.get('[ng-hide="playing"]').should('have.class','ng-hide') // expect play button to be hidden bc pause button is displayed since it is still playing
        cy.get('[ng-click = "toggleLoop();"]').click().should('not.have.class','btn-clear-warning') // toggle off looping
        cy.wait(5000)
        cy.get('[ng-show="playing"]').should('have.class','ng-hide') // after waiting 5 secs, the pause button should disappear because it will have stopped looping.

        // reset button - play for 100 ms and then reset, making sure the play head is at 0
        cy.get('[ng-hide="playing"] > .btn > .icon').click()
        cy.wait(100)
        cy.get('[ng-show="playing"] > .btn > .icon').click()
        cy.get('[ng-click="reset()"]').click()
        cy.get('daw-play-head').should('have.css', 'left', '0px')

    })
    it('8: open curriculum and click link in the ToC', () => {
        // if curriculum is not open, open it
        cy.get('#curriculum-container').then((curriculumcontainer) => {
            if (curriculumcontainer.hasClass('ui-layout-hidden')) {
                cy.get('#sidenav-curriculum > .icon').click()            
            } else {
                // do nothing, keep curriculum open
            }
        })

        // check to make sure the curriculum is on the table of contents view. if not, reload page to reset the state of the curriculum and try again
        cy.get('#current-section').then((currentsection) => {
            if (cy.wrap(currentsection).contains('Table of Contents')) { // have to wrap to get cypress to recognize #current-section as a .get object and not as a standalone object - have to use diff assertions for the two
                cy.get('a').contains('Unit 2').click()
            } else { // reload the page and open the curriculum, and it should open to the table of contents.
                cy.visit('https://earsketch.gatech.edu/earsketch2/')
                cy.get('button').contains(/skip/gi).click()
                cy.get('#curriculum-container').then((curriculumcontainer) => {
                    if (curriculumcontainer.hasClass('ui-layout-hidden')) {
                        cy.get('#sidenav-curriculum > .icon').click()            
                    } else {
                        // do nothing, keep curriculum open
                    }
                })
                cy.get('a').contains('Unit 2').click()
            }
        })

        // make sure the header is for unit 2 introduction
        cy.get('h2').contains('Unit 2 Introduction')

    })
    it('9: copies text from api browser', () => {

        // close the curriculum if it is open, bc it blocks our view
        cy.get('#curriculum-container').then((curriculumcontainer) => {
            if (curriculumcontainer.hasClass('ui-layout-hidden')) {
                // do nothing, move on to next step
            } else {
                // close the curriculum
                cy.get('#sidenav-curriculum > .icon').click()
            }
        })

        // create a new script. changes depending on previous state, so this does what is needed to create a new script
        cy.get('a').contains(/Click here to create a new script/ig).then(($newscripttext) => {
            if($newscripttext.is(':visible')) {
                $newscripttext.click()
            }
        }) 
        cy.get('#btn-add-tab > .icon').then(($newscripttab) => {
            if($newscripttab.is(':visible')) {
                $newscripttab.click()
            }
        })
    
        // make new script
        cy.get('#newscriptname').type('cypressStep9')
        cy.get(':nth-child(2) > .form-control').select('Python')
        cy.get('[ng-click="confirm()"]').click()

        // open api browser
        cy.get('#sidenav-apibrowser > .icon').click()

        cy.get('@moveCursor').then((moveCursor) => {
            cy.get('.ace_content').type(moveCursor)
        })

         
          // BETTER SOLUTION: i would like to highlight the word "fileName" in the text editor so that I can replace with a song title, but can't access this for some reason. probably due to the fact I can't find it in html
        // cy.get('.ace_content > .ace_text_layer > .ace_line').last()
       
        let songTitle = "CIARA_MELANIN_DRUMBEAT_1"
        let getToBottomOfText = "{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}"
        let insidePrint = getToBottomOfText.concat("{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}")
        let insideDur = getToBottomOfText.concat("{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}").concat(songTitle).concat(")){enter}finish()")
        
        // scroll so that print is visible
        cy.get('.flex-auto').scrollTo('bottom')
        // find print selector
        cy.get(':nth-child(16) > .flex > .h-8 > .pt-1').click()
        cy.get('.ace_content').type(insidePrint)

        // dur selector
        cy.get(':nth-child(6) > .flex > .h-8 > .pt-1 > .inline-block').click()
        cy.get('.ace_content').type(insideDur)

        // check to make sure dur(fileName) = 4 and is displayed in console
        cy.get('#run-button').click().then(() => {
            cy.get('#console').should('contain','4')
        })
    })
    it('9.5: toggles and untoggles blocks mode', () => {
        // get gear icon menu
        cy.get('#editor-options').click()
        cy.get('a').contains('Toggle Blocks Mode').click()
        cy.get('.droplet-palette-wrapper').should('have.css', 'left', '0px')

        // untoggle blocks mode
       
        cy.get('#editor-options').click()
        cy.get('a').contains('Toggle Blocks Mode').click() 
        cy.get('.droplet-palette-wrapper').should('have.css', 'left', '-9999px')
        
    })
    it('10: login and logout', () => {
        cy.get('[name="username"]').type('jeffres5')
        cy.get('[ng-model="password"]').type('hello')
        cy.get('button[type="submit"] > .icon-arrow-right').click()

        cy.get('body').should('contain','Login successful')

        cy.get('#logged-in').click()
        cy.get('a').contains('Logout').click()
        cy.get('[name="username"]').should('be.visible')
    })

})