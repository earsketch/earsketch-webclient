const user = 'newaccount1';
const pass = 'hello';
describe('Setup for Scripts Browser Test', () => {
    it('0: setup', () => {
        // cy.visit('https://earsketch.gatech.edu/earsketch2/')
        cy.visit('https://earsketch-test.ersktch.gatech.edu/earsketch2/')
        // cy.visit('http://localhost:8081/')

        cy.get('button').contains(/skip/gi).click()

        // close the curriculum if it is open, bc it blocks our view
        cy.get('#curriculum').then(($curriculum) => {
            if ($curriculum.is(':visible')) {
                cy.get('#curriculum-header > :nth-child(1) > :nth-child(2)').click()
            }
        })
        cy.get('div').contains('SCRIPTS').click() // this is bad selection
        cy.get('div.truncate').contains('MY SCRIPTS')

        //login with my test user and password so that scripts can save
        cy.get('[ng-model="username"]').type(user) // in the future define variables for the user and pass
        cy.get('[ng-model="password"]').type(pass.concat('{enter}'))
        cy.get('#logged-in').should('be.visible')
    })
})


describe('Scripts Browser Test', () =>{
    // cy.intercept("**/newrelicbrowser.test.js", (req) => {
    //     req.reply("console.log('Fake New Relic script loaded');");
    // });
    beforeEach(() => {
        // Block new-relic.js outright due to issues with Cypress networking code.
        Cypress.on('uncaught:exception', (err) => {
            // returning false here prevents Cypress from
            // failing the test
            // console.warn(err);
            if (err.message && err.message.includes('Cannot set property \'status\' of undefined')){
                    return false;
            }
            return true;
        });
        cy.closeModal()
        // cy.unfilter()

        // logout and log back in before every test to save lcoal storage.
        cy.login(user,pass)
    })
                
    it('1: create new scripts', () => {
        cy.removeScripts()
        cy.newScript('SB_Test_1','Python')
        cy.newScript('SB_Test_2','Python')
        cy.newScript('SB_Test_3','Python')
        cy.newScript('SB_Test_4','JavaScript')
        cy.newScript('SB_Test_5','JavaScript')

    })
    it('2: sort scripts', () => {

        //sort by owner
        cy.get('.truncate').contains('Owner').click()
        cy.get('.select-none').contains(user).click()

        cy.get('div').contains('SB_Test_1.py') //should fail if this was not created by the logged in user - but THERES A WEIRD BUG SOMETIMES IDRK
        
        //unselect and close the menu
        cy.get('.pr-8 > .select-none:visible').contains('Clear').click()
        cy.get('.truncate').contains('Owner').click()

        //sort by file type
        cy.get('.truncate').contains('File Type').click()
        cy.get('.select-none').contains('Python').click()
        // check that only 3 scripts are python
        cy.get('div[title="MY SCRIPTS (3/5)"]')
        // second test - just in case 
        cy.get('div').should('not.contain','SB_Test_4.js')
        // clear selections and close menu
        cy.get('.pr-8 > .select-none:visible').contains('Clear').click()
        cy.get('.truncate').contains('File Type').click()

        // sort by A-Z
        cy.get('.truncate').contains('Sort By').click()
        cy.get('.select-none').contains('A-Z').click()
        cy.get('.select-none').contains('A-Z').siblings().children().then((iconToTest) => {
            if (iconToTest.hasClass('icon-arrow-up')){
                // check if first script is test 1
                cy.get('div[class="truncate"]:contains("SB_Test")').first().contains("SB_Test_1.py")
            } else{
                // check if last script is test 1
                cy.get('div[class="truncate"]:contains("SB_Test")').last().contains("SB_Test_1.py")
            }
        })
    })

    it('3: toggles show deleted scripts', () => {
        cy.unfilter()
        // check the show deleted scripts toggle
        cy.get('div').contains('Show deleted').siblings().find('[type="checkbox"]').check()

        // open deleted scripts
        cy.get("div").contains("DELETED SCRIPTS").click()

        // check if it is visible - there should be 3 visible sections (my scripts, shared scripts, and deleted scripts)
        cy.get('#content-manager > :nth-child(6) > div:visible').should('have.length',3)

        // close deleted scripts
        cy.get("div").contains("DELETED SCRIPTS").click()
    })

    it('4: downloads source code from a script', () => {
        // open menu next to first script 
        cy.get('i.icon-menu3.text-4xl.px-2.align-middle').first().trigger('mouseover').trigger("click")
        cy.get('div').contains("Download").click({force:true}) //force true to not trigger infinite scroll
        cy.get('i.glyphicon-download-alt').first().click()
        cy.get('button').contains('Close').click()

        // it is kinda complicated to check file path downloads and then if the file was correct. what do we want to do about this?
    })

    it('5: code indicator', () => {
        // open menu next to first script 
        cy.get('i.icon-menu3.text-4xl.px-2.align-middle').first().trigger('mouseover').trigger("click")
        cy.get('div').contains("Code Indicator").click({force:true}) //force true to not trigger infinite scroll
        cy.get('div.modal-content').should('be.visible')
        cy.get('td').contains('Conditionals with Booleans').should('be.visible')
        cy.get('button').contains('Exit').click()

    })
    it('6: show history', () => {
        // open menu next to first script 
        cy.get('i.icon-menu3.text-4xl.px-2.align-middle').first().trigger('mouseover').trigger("click")
        cy.get('div').contains('History').click({force:true}) //force true to not trigger infinite scroll
        cy.get('div.modal-content').should('be.visible')
        cy.get('[ng-click="close()"]').click()
    })

    it('7: duplicates a script', () => {
        cy.removeScripts()
        cy.newScript('dupeScript','Python')

        let origText;        
        // open first script
        cy.get('div[class="truncate"]').contains(/\s*(\.py|\.js)/g).first().click()        
        //get the text content of that first script
        cy.get('.ace_content').click().then(($div) => {
            // save original script text as a variable to test later
            origText = $div.text();
            console.log(origText)
            // make a copy of that first script
            cy.get('i.icon-menu3.text-4xl.px-2.align-middle').first().trigger('mouseover').trigger("click")
            // define the new savescript request to wait on later
            cy.intercept('/scripts/save?password=').as('savescript')
            cy.get('div').contains('Create Copy').click({force:true})
            // wait until the copy has been made to check if it has the same contents
            cy.wait('@savescript')
            cy.get('div[class="truncate"]').contains(/\s*(\.py|\.js)/g).first().click()
            // expecting the copied script to have the same contents as the original one.
            cy.get('.ace_content').click().should(($div) => {
                expect($div.text()).to.eq(origText);
            })
        })
    })

    it('8: searches within scripts', () => {
        cy.removeScripts()
        cy.newScript('search_test','Python')
        cy.get('input[type="text"][placeholder="Search"]:visible').type('search_test{enter}')
        // check if only one script is showing now
        cy.get('div').contains('MY SCRIPTS').invoke('text').then((txt) => {
            var newTxt = txt.split('(');
            var totalScripts = 0
            for (var i = 1; i < newTxt.length; i++) {
                totalScripts = newTxt[i].split(')')[0]
            }
            cy.wrap('1').should('eq',totalScripts)
        })

    })
})

// questions /to do:
// source code downloading - should I bother trying to implement that? 
// come up with a modal closing timeout solution in the newScript command


// close deletec scripts in the beforeeach

// check the video to get stuff to run heDlessly