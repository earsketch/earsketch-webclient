/* eslint-disable no-undef */
describe("earsketch client", () => {
    beforeEach(() => {
        cy.visit("http://localhost:8888")
    })

    it("has bubble tour", () => {
        // no
        cy.intercept(/*"GET", */"https://api-dev.ersktch.gatech.edu/EarSketchWS/audio/standard", {
            statusCode: 500,

            // body:
            //     [{
            //         artist: "CIARA",
            //         folder: "CIARA_SET_VOCALS",
            //         genre: "RNB",
            //         genreGroup: "RNB",
            //         instrument: "VOCALS",
            //         name: "CIARA_SET_VOX_POST_1",
            //         path: "standard-library/Ciara/CIARA_SET_81_VOX_POST_1.wav",
            //         public: 1,
            //         tempo: 81,
            //         year: 2019,
            //     }],
        })
        cy.get("button").contains("Skip").click()
        cy.wait(5000)
        //
        // cy.get("button").contains("Start").click()
        // cy.get("button").contains("Next").click()
        // // make sure next is grayed out until you click run
        // cy.get("button").contains("Next").should("have.class", "cursor-not-allowed")
    })
})
