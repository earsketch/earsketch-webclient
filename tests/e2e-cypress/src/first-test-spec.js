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

describe('Bubble Tour Test', () => {
    // var consolespy;
    it('Visits Earsketch', () => {
        // i want to do this with dev but for some reason the daw doesn't get set up when you press "run" so i will use prod
        cy.visit('https://earsketch.gatech.edu/earsketch2/')
        // , {
        //     onBeforeLoad (win) {
        //         cy.spy(win.console, 'log').as('consoleLog')

        //       },
        // })


        //start the bubble tour
        cy.get('button').contains('Start').click()
        
        // step 1
        cy.get('button').contains('Next').click()

        // step 2
        // make sure next is grayed out until you click run
        cy.get('button').contains('Next').should('have.class','cursor-not-allowed')
        // click run button
        cy.get('#run-button').click().then((step2) => {
            cy.get('#console').should('contain', 'Script ran successfully')
            cy.get('button').contains('Next').should('not.have.class','cursor-allowed').click()
        })

    

        //  cy.get('@consoleLog').then((consoleLog) => {
             
        //     expect(consoleLog.args[169][0]).to.contain('code compiled')
        //     // call taka about this lol ! got it to work now
        //  })

        // wait for script to run, then click next
        //  cy.get('#console').contains('Script ran successfully')
        //  cy.get('button').contains('Next').click()

         // step 3
        cy.get('button').contains('Next').click()

        // step 4
        cy.get('[ng-hide="playing"] > .btn').click()
        cy.wait(1000) //wait a second for music to play (also serves as manual check)
        // make sure music is playing
        cy.get('[ng-show="playing"] > .btn').click()
        cy.get('button').contains('Next').click()

        // step 5 (open/close script browser)
        cy.get('#sidenav-scriptbrowser > .icon').click()
        cy.wait(500)
        cy.get('#sidenav-scriptbrowser > .icon').click()
        cy.get('button').contains('Next').click()

        // step 6 (check to make sure sound browser is open)
        cy.get('sound-browser').should('contain','SOUND COLLECTION')
        cy.get('button').contains('Next').click()

        // step 7 (check to make sure quick_tour.py is in scripts browser)
        cy.get('script-browser').should('contain','quick_tour.py')
        cy.get('button').contains('Next').click()

        // step 8 (make sure curriculum is showing and that it is hidden after clicking sidenav button again)
        cy.get('#curriculum-container').should('not.have.class','ui-layout-hidden')
        cy.get('#sidenav-curriculum').click()
        cy.get('#curriculum-container').should('have.class','ui-layout-hidden')
        cy.get('button').contains('Next').click()

        // close tutorial!
        cy.get('button').contains('Close').click()

    })



        // it('calls console.log with expected text', function () {
        //     cy.get('#run-button').click()
        //     cy.get('@consoleLog').should('be.calledWith', 'code compiled')
        //   })



        // //it just waits 5 seconds before clicking next so that everything can load. i wanted to go into the console log and watch though. :(
        // cy.wait(5000)

        // // NOW we can click next
        // cy.get('button').contains('Next').click()

        // // now on step 3
        // cy.get('button').contains('Next').click()

        // cy.get('button[ng-click="play();"]').click()

    
})

  
      
