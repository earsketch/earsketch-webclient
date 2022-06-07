const { beforeRunHook, afterRunHook } = require("cypress-mochawesome-reporter/lib")

module.exports = (on) => {
    on("before:run", async (details) => {
        await beforeRunHook(details)
    })

    on("after:run", async () => {
        await afterRunHook()
    })
}
