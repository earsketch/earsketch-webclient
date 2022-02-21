module.exports = function (grunt) {
    grunt.loadNpmTasks("grunt-contrib-less")

    grunt.initConfig({
        appVersion: -1,
        gitSrcFiles: [],
        commitMsg: "",
        scriptsMode: "dev",

        less: {
            development: {
                options: {
                    paths: ["css/earsketch"],
                    compress: true,
                    optimization: 2,
                },
                files: [{
                    expand: true,
                    cwd: "css/earsketch",
                    src: "theme_dark.less",
                    dest: "css/earsketch",
                    ext: ".css",
                }, {
                    expand: true,
                    cwd: "css/earsketch",
                    src: "theme_light.less",
                    dest: "css/earsketch",
                    ext: ".css",
                }],
            },
        },
    })

    grunt.registerTask("css", ["less"])
}
