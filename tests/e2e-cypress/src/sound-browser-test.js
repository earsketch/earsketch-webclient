it.only('0: setup', () => {
    // cy.visit('https://earsketch.gatech.edu/earsketch2/')
    // cy.visit('https://earsketch-test.ersktch.gatech.edu/earsketch2/')
    cy.visit('http://localhost:8081/')

    cy.get('button').contains(/skip/gi).click()

    // close the curriculum if it is open, bc it blocks our view
    cy.get('#curriculum').then((curriculum) => {
        if (curriculum.hasClass('ui-layout-hidden')) {
            // do nothing, move on to next step
        } else {
            // close the curriculum
            cy.get('#sidenav-curriculum > .icon').click()
        }
    })
    cy.get('[ng-model="username"]').type('jeffrestesting') // in the future define variables for the user and pass
    cy.get('[ng-model="password"]').type('hello{enter}')
    //cy.get('#not-logged-in > [type="submit"]')    
    cy.get('body').then(($body) => {
        cy.get($body).find('#logged-in').should('be.visible')
    })
    
})

it('1: audio sample preview', () => {
    // click on first folder and check for dropdown (regardless of name)
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(1)').click()
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(1)').find('.flex-col:nth-child(2)')
    cy.intercept('GET', 'verifyclip*').as('sound1').then(() => {
        cy.intercept('GET', 'getunstretchedsample*').as('sound2')
    })
    cy.get('button[title="Preview sound"]').first().click()
    // make sure the sound was requested and played
    cy.wait('@sound1')
    cy.wait('@sound2')



    // make sure you can scroll through sound collection
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div').scrollTo('bottom')
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div').scrollTo('top')

})
it('2: audio sample metadata', () => {

})
it('3: Filters audio samples by artists, genre, instrument, and text', () => {
    // filter by ARTISTS
    cy.filter("Artists","MAKEBEAT")
    // check that there is only one sound pack there
    cy.get('div [title="MAKEBEAT"]').siblings().should('not.exist')
    // clear the filter
    cy.unfilter()

    // filter by GENRE
    cy.filter('Genres','WORLD PERCUSSION')
    // check that every sound starts with "WORLD_PERCUSSION"
    // this doesn't get everything, only what is visible (because of the infinite scroll mechanics). 
    // just to check one more thing, i will hardcode checking the number of sounds in this pack as well.
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div').children().each(($element) => {
        cy.get($element).find('div').contains('WORLD_PERCUSSION')
    })
    // check that there are less now.
    // hardcoding (71 world perc tracks):
    cy.get('div').contains('SOUND COLLECTION').invoke('text').then((txt) => {
        var newTxt = txt.split('(');
        var sounds = newTxt[1].split('/')[0]
        expect(sounds).to.eq('71');
    })        
    // clear the filter
    cy.unfilter()

    // filter by INSTRUMENT
    cy.filter('Instruments','SFX')
    // hardcoding (256 sfx tracks):
    cy.get('div').contains('SOUND COLLECTION').invoke('text').then((txt) => {
        var newTxt = txt.split('(');
        var sounds = newTxt[1].split('/')[0]
        expect(sounds).to.eq('256');
    })
    // clear the filter
    cy.unfilter()
})
it('4: upload a sound, verify in sound browser', () => {
    cy.get('.mr-3').contains("Add sound").click()
    cy.get('label #inputlabel').attachFile('cyTestAudio.wav')
    
// THIS ALWAYS ERRORS BECAUSE THE LOGIN DOESNT WORK... SOMETHING TO DO WITH CHROME???? talk about this with es devs
})
it('5: rename an uploaded sound', () => {
    // will work on this when i can upload a sound
})
it('6: delete an uploaded sound', () => {
    // will work on this when i can upload a sound
})
it.only('7: add and remove favorites', () => {
    // click on first folder and check for dropdown (regardless of name)
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(1)').then(($collection)=> {
        cy.get($collection).click()
        var collName = "";
        cy.get($collection).child().invoke('text').then((txt) => {
            collName = txt;
        })
    }).click()
    // add favorite to first sound
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(1)').find('.flex-col:nth-child(2)').find('[title="Mark as favorite"]').first().click()
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(1)').click()
    // add favorite to second sound
    cy.get('sound-browser > div > div.justify-start > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > :nth-child(2)').find('.flex-col:nth-child(2)').find('[title="Mark as favorite"]').first().click()


})
it('8: audio recommendations', () => {

})
