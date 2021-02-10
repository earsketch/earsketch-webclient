describe('Api Browser Test', () => {
    it('0: opens the earsketch page, gets stuff out of the way, opens API browser', () => {
        // cy.visit('https://earsketch.gatech.edu/earsketch2/')
        // cy.visit('https://earsketch-test.ersktch.gatech.edu/earsketch2/')
        cy.visit('http://localhost:8080/')

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
        cy.get('div').contains('APIs').click() // this is bad selection
        cy.get('api-browser').parent().should('have.class','active')
    })

    it('1: shows/hides function details', () => {
        cy.get('span').contains('analyze').click()
        // check if the text is correct: (horrible selecting)
        cy.get('.flex-auto > :nth-child(1) > .border-t > span').should('contain','This function analyzes an audio file for the specified feature')
        
        cy.get('span').contains('analyze').click()
        // had to use the horrible selecting again to check if the element exists
        cy.get('.flex-auto > :nth-child(1) > .border-t > span').should('not.exist')

    })
    it('2: pastes from API browser', () => {
        //first, create a new script
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
        cy.get('#newscriptname').type('API_Browser_Cypress_Py')
        cy.get(':nth-child(2) > .form-control').select('Python')
        cy.get('[ng-click="confirm()"]').click()

        // horrible selecting yet again
        cy.get(':nth-child(1) > .flex > .h-8 > .pt-1 > .icon-paste2').click()
        cy.get('.ace_content').contains('analyze(audioFile, featureForAnalysis)')
    })
    it('3: verifies change between languages', () => {
        //first, verify that we are in python mode
        cy.get('.ace_content').contains('python code')
        //check for "print"
        //cy.get('.flex-auto').scrollTo('bottom')
        cy.get(':nth-child(16) > .flex > .text-2xl').should('not.contain', 'println').should('contain','print')
        
        //then, create a new JS script
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
        cy.get('#newscriptname').type('API_Browser_Cypress_JS')
        cy.get(':nth-child(2) > .form-control').select('JavaScript')
        cy.get('[ng-click="confirm()"]').click()

        //verify it is in javascript
        cy.get('.ace_content').contains('javascript code')

        //check for println
        cy.get(':nth-child(16) > .flex > .text-2xl').should('contain', 'println')


    })

    //what do we want expected behavior to be between parts of a test? should we expect that they run in the order I wrote them, or should I put new script implementations for every single part (this is pretty easy to implement as a function in cypress but also idk if needed)
    it('4: uses the search box', () => {
        // bad selector, couldn't use the other one because it returned 4 things
        // cy.get('input[placeholder="Search"]').click()
        cy.get('.flex-grow-0 > .pb-1 > .border-b-2 > .w-full').then((searchbar) => {
            if(cy.get('.ace_content').contains('javascript code')){
                cy.get(searchbar).type('println')
                cy.get('.p-5').should('exist')

                //do we want to open a python script to check that too? and vice versa?
            }
            else if(cy.get('.ace_content').contains('python code')){
                cy.get(searchbar).type('println')
                cy.get('.p-5').should('not.exist')
            }
        })

    })



})