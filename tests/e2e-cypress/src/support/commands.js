// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
import 'cypress-file-upload';




// REMEMBER IT IS "JavaScript" NOT "Javascript" !!!
Cypress.Commands.add('newScript', (name, language) => {



    cy.get('body').then(($body) => {
        // the two ways to make a new script - click whichever one is visible when 'newScript' is run.
        if ($body.find('#create-script-button:visible').length) {
            cy.get('#create-script-button').click()
        }
        else {
            cy.get('a:visible').contains(/Click here to create a new script/ig).then(($newSelector) => {
                cy.get($newSelector).click()
            })
        }
    })


    // type the new script name and select the language in the modal.
    cy.get('#newscriptname').type(name)
    cy.get(':nth-child(2) > .form-control').first().select(language)
    cy.get('[ng-click="confirm()"]').contains('Create').click()

    cy.get('.modal-content').then(($modal) => {
        // can also do cy.get('body').contains but i wanted to use the selector we got already
        cy.wait(4000)

        if ($modal.find('[ng-show="error"]').length) {
            cy.get('button').contains('Cancel').click()
            // check the box to show deleted scripts
            cy.get('div').contains('Show deleted').siblings().find('[type="checkbox"]').check()
            // cy.get('input[type="checkbox"]').
            // cy.get('script-browser > div > div > div > div > [type="checkbox"]').check()

            // open deleted scripts browser
            cy.get("div.truncate").contains("DELETED SCRIPTS").click()
            // scroll to bottom in case the script is not visible
            cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', { ensureScrollable: false })
            // if it cant find the script, scroll to the top as well. DO THIS 
            let fullname = ""
            if (language == "Python") {
                fullname = name + ".py"
            }
            else if (language == "JavaScript") {
                fullname = name + ".js"
            }
            cy.findDeletedScript(fullname)

            // close the deleted scripts
            cy.get("div.truncate").contains("DELETED SCRIPTS").click()

        }
        else {
            cy.intercept('POST').as('newScriptCreated')
            cy.wait('@newScriptCreated')
        }


    })

    // cy.get('.modal-content').then(($modal2) => {


    //     if ($modal2.find("That name already exists. Please provide a unique name or first rename the existing script.").length) { 
    //         cy.get('button').contains('Cancel').click()
    //             // check the box to show deleted scripts
    //             cy.get('div').contains('Show deleted').siblings().find('[type="checkbox"]').check()
    //             // cy.get('input[type="checkbox"]').
    //             // cy.get('script-browser > div > div > div > div > [type="checkbox"]').check()

    //             // open deleted scripts browser
    //             cy.get("div.truncate").contains("DELETED SCRIPTS").click()
    //             // scroll to bottom in case the script is not visible
    //             cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', { ensureScrollable: false })
    //             // if it cant find the script, scroll to the top as well. DO THIS 
    //             let fullname = ""
    //             if (language == "Python") {
    //                 fullname = name + ".py"
    //             }
    //             else if (language == "JavaScript") {
    //                 fullname = name + ".js"
    //             }
    //             cy.findDeletedScript(fullname)

    //             // close the deleted scripts
    //             cy.get("div.truncate").contains("DELETED SCRIPTS").click()

    //     }
    //     else {
    //         cy.intercept('POST').as('newScriptCreated')
    //         cy.wait('@newScriptCreated')
    //     }
    // })




    // this is ugly - maybe come up with a timeout for the modal to be not visible anymore

    // wait for this to be visible with a timeout, if visible then move on.
    // That name already exists. Please provide a unique name or first rename the existing script.

    // cy.get('.modal-content').as('modal')
    // cy.intercept('POST').as('newScriptCreated')


    //cy.wait('@newScriptCreated')
    // if new script is never created after the 5 sec timeout, then close the modal and restore the script. 
    // THIS IS NOT WORKING AS OF NOW. FIX IT BY NOT USING WAIT INTERCEPT STUFF MAYBE YOU ONLY NEED SHOULD
    // cy.on('fail', (e) => {
    //     if (e.message !== "CypressError: Timed out retrying after 5000ms: `cy.wait()` timed out waiting `5000ms` for the 1st request to the route: `newScriptCreated`. No request ever occurred.") {
    //         console.log('it faialed sucessfully')


    //     }
    // })

    // look for modal that says that name already exists and then click cancel


    //cy.get('.modal-content').should('not.exist')
    //cy.wait(4000) // should has a 4 second cooldown so i will just copy that for now.




    // cy.get('body').then(($body) => {
    //     if ($body.find('.modal-content').length) {
    //         // wait until the modal is finished the xhr request? (looks like there's no xhr on the modal loading) 

    //         cy.get('button').contains('Cancel').click()
    //         // check the box to show deleted scripts
    //         cy.get('div').contains('Show deleted').siblings().find('[type="checkbox"]').check()
    //         // cy.get('input[type="checkbox"]').
    //         // cy.get('script-browser > div > div > div > div > [type="checkbox"]').check()

    //         // open deleted scripts browser
    //         cy.get("div.truncate").contains("DELETED SCRIPTS").click()
    //         // scroll to bottom in case the script is not visible
    //         cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', { ensureScrollable: false })
    //         // if it cant find the script, scroll to the top as well. DO THIS 

    //         cy.findDeletedScript(fullname)

    //         // close the deleted scripts
    //         cy.get("div.truncate").contains("DELETED SCRIPTS").click()

    //     }
    // })
})
Cypress.Commands.add('findDeletedScript', (name, limit = 10) => {
    let found = false
    if (limit < 0) {
        throw new Error('Recursion limit reached')
    }
    if (limit == 10) {
        cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', { ensureScrollable: false })
    }
    cy.log('remaining attempts: ', limit)
    cy.get('body').then(($body) => {
        console.log('bodyyes')
        // make sure to scroll the deleted scripts up to reset state
        // cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', {ensureScrollable: false})


        if ($body.text().includes(name)) {
            console.log('found it')
            cy.get('.truncate').contains(name).parent().siblings().last().click()
            found = true
        }
        else {
            console.log('didnt find, try again')
            // scroll down the deleted scripts and search again
            cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('0%', '25%', { ensureScrollable: false })
            // add in a wait for the scroll to occur???
            cy.wait(500)
            cy.findDeletedScript(name, limit - 1)
        }
    })






    // var found = false;
    // console.log("im finding the deleted script now")
    // while (!found) {

    //         // get current num of deleted scripts - to check against later
    //         var totalDeletedScripts = 0;
    //         var currentDeletedScripts = 0;
    //         cy.get('div').contains('DELETED SCRIPTS').invoke('text').then((txt) => {
    //             var newTxt = txt.split('(');
    //             for (var i = 1; i < newTxt.length; i++) {
    //                 totalDeletedScripts = newTxt[i].split(')')[0]
    //             }
    //             currentDeletedScripts = totalDeletedScripts;
    //             console.log(currentDeletedScripts)
    //         })
    //         console.log(currentDeletedScripts)

    //         var currentVisibleScripts = 0;
    //         // const timeout = 10000
    //         // while (!found) {
    //         console.log(found)


    //         cy.get('div[style="overflow: visible; height: 0px; width: 0px;"] > div > div ').children().then((deletedscripts) => {
    //             // get current num of dynamically loaded deleted scripts
    //             currentVisibleScripts = Cypress.$(deletedscripts).length
    //             console.log(currentVisibleScripts)

    //             // then check if the title of the script we are looking for is in the loaded scripts. if not, scroll so the bottom deleted script is at the top. MAYBE

    //             // scroll to top of deleted scripts to reset the state here.
    //             //cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('top', {ensureScrollable: false})

    //             // look through all the current visible scripts and print out each of their titles
    //             for (var j = 0; j < currentVisibleScripts; j++) {
    //                 cy.get(deletedscripts[j]).find('.truncate').contains(/\w*\.js|\w*\.py/gm).then(($title) => {
    //                     console.log($title.text())
    //                     if ($title.text() == name & !found) {
    //                         // click "restore" next to the name of the script
    //                         // cy.get($title).then(($restore) => {
    //                         cy.get($title).parent().siblings().last().click()
    //                         found = true
    //                         // })
    //                         console.log("", found)
    //                         console.log("found the script", $title.text())
    //                         // return false;
    //                     }
    //                     console.log(found)
    //                 })
    //             }

    //             console.log('end of the loop!')

    //             // scroll, and update deleted scripts
    //             // if (!found){
    //             cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('bottom', { ensureScrollable: true })
    //             // }

    //         })

    // }cy.get("div.truncate").contains("DELETED SCRIPTS").click()

})


// this doesnt work lol
//             cy.get('body').then((body) => {
//                 let found = false
//                 const timeout = 10000
//                 for(let onoff = 0; onoff<timeout && !found;onoff++){
// // get number of total deleted scripts!    
//                 var totalDeletedScripts = 0
//                 cy.get('div').contains('DELETED SCRIPTS').invoke('text').then((txt) => {
//                     var newTxt = txt.split('(');
//                     for (var i = 1; i < newTxt.length; i++) {
//                         totalDeletedScripts = newTxt[i].split(')')[0]
//                     }
//                     console.log(totalDeletedScripts)
//                 })
//                     for (let i = 0; i<totalDeletedScripts;i++) {
//                         console.log("i: ", i)
//                         cy.get('div[style="overflow: visible; height: 0px; width: 0px;"] > div > div ').children().then((deletedscripts) =>{
//                             // another for loop to look through all the current ones in view.
//                             let currentDeletedScripts = Cypress.$(deletedscripts).length
//                             for (let j = 0; j<currentDeletedScripts;j++) {
//                                 console.log("j: ", j)
//                                 cy.get(deletedscripts[j]).find('.truncate').contains(/\w*\.js|\w*\.py/gm).then(($title) => {
//                                     console.log($title.text())  
//                                     if ($title.text() == fullname) {
//                                         // click "restore" next to the name of the script
//                                         cy.get($title).parent().siblings().last().click()
//                                         found=true
//                                         console.log("found the script", $title.text())
//                                     }
//                                 })
//                             }   
//                             // scroll to the last previous found deleted script
//                             // cy.get('content-manager > div > div > :nth-child(3) > .flex-grow > [style="overflow: visible; height: 0px; width: 0px;"] > div').scrollTo('bottom', {ensureScrollable: true})
//                         })
//                         cy.get(deletedscripts[currentDeletedScripts-1]).scrollIntoView()
//                     }
//                 }

//                     // }
//                 })





// close deleted scripts browser to reset state



Cypress.Commands.add('login', (user, pass) => {
    // if it looks like you're logged in, log out and log back in (so cypress can not delete the local storage)
    cy.get('#logged-in').then(($loggedin) => {
        if ($loggedin.is(':visible')) {
            cy.get($loggedin).click()
            cy.get('a').contains('Logout').click()
        }
    })
    // log back in
    cy.get('[ng-model="username"]').type(user)
    cy.get('[ng-model="password"]').type(pass + '{enter}')
    cy.get('#logged-in').should('be.visible')
})

Cypress.Commands.add('closeModal', () => {
    cy.wait(500) // this seems like a bad way to handle this. maybe we need async checking for modal being visible
    cy.get('body').then(($body) => {
        // synchronously query from body
        // to find which element was created
        let found = false
        const timeout = 10000
        for (let i = 0; i < timeout && !found; i++) {
            if ($body.find('.modal-content').length) {
                // modal was found, do something else here
                cy.get('button:visible').contains(/Close|Cancel/gm).click()
                found = true
            }
        }
    })
})
Cypress.Commands.add('unfilter', () => {
    cy.get('div.truncate.min-w-0').siblings().invoke('text').then((txt) => {
        if (txt.includes('(')) {
            cy.get('div.truncate.min-w-0').siblings().contains('(').then($filter => {
                cy.get($filter).click()
                cy.get($filter).parent().parent().parent().find('.select-none:visible').contains('Clear').click()
                cy.get($filter).siblings().click() // used the then statement to keep specificity on this object without needing the name of it
            })
        }
    })

})

Cypress.Commands.add('filter', (filterType, filterParam) => {
    // filterType = "Artists", "Genres", "Instruments", "Owner", "File Type", "Sort By"
    cy.get('.truncate').contains(filterType).click()
    // select the filterParam in the dropdown.
    cy.get('.select-none').contains(filterParam).click()
    // close the dropdown
    cy.get('.truncate').contains(filterType).click()

    // check that it successfully filtered as part of the main test.
})

Cypress.Commands.add('openAllScripts', () => {
    // select all scripts in script browser and click them (opening them)
    cy.get('script-browser > div > :nth-child(6) > :nth-child(1) > :nth-child(2) > :nth-child(1) > div > div > div').click({ multiple: true })
})

Cypress.Commands.add('removeScripts', () => {
    // find how many scripts you have currently - use the text in "MY SCRIPTS(x)" because the number of divs changes based on viewport.
    cy.get('div').contains('MY SCRIPTS').invoke('text').then((txt) => {
        var newTxt = txt.split('(');
        var totalScripts = 0
        for (var i = 1; i < newTxt.length; i++) {
            totalScripts = newTxt[i].split(')')[0]
        }
        // loop this for every script in the original scripts list
        for (i = 0; i < totalScripts; i++) {
            cy.intercept('delete?password=').as('deleterequest')

            // get the menu besides the script in the script browser
            cy.get('body').then(($body) => {
                // wait until the previous xhr is complete maybe
                // cy.wait(1000)
                cy.get('i.icon-menu3.text-4xl.px-2.align-middle').eq(0).trigger('mouseover').trigger("click")
                // click the delete button in the dropdown menu
                cy.get("div:visible > div > div").contains("Delete").click({ force: true })
                // click the delete button in the modal that opens
                cy.get('.modal-footer > .btn-primary').focus().click()

                cy.wait('@deleterequest')

            })

        }
    })
})


//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
