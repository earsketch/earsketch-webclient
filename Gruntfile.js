module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-git');

    grunt.initConfig({
        appVersion: -1,
        gitSrcFiles: [],
        commitMsg: '',
        scriptsMode: 'dev',

        open: {
            doc: {
                path: 'doc/index.html'
            }
        },

        less: {
            development: {
                options: {
                    paths: ['css/earsketch'],
                    compress: true,
                    optimization: 2
                },
                files: [{
                    expand: true,
                    cwd: 'css/earsketch',
                    src: 'theme_dark.less',
                    dest: 'css/earsketch',
                    ext: '.css'
                }, {
                    expand: true,
                    cwd: 'css/earsketch',
                    src: 'theme_light.less',
                    dest: 'css/earsketch',
                    ext: '.css'
                }]
            }
        },

        connect: {
            server: {
                options: {
                    port: 8000,
                    hostname: '*',
                    keepalive: true,
                    open: true
                }
            }
        },

        'string-replace': {
            version: {
                files: {
                    'scripts/src/data/messages.js': 'scripts/src/data/messages.js',
                    'index.html': 'index.html',
                },
                options: {
                    replacements: [
                        {
                            pattern: /V 2.\d+/g,
                            replacement: 'V 2.<%= appVersion %>'
                        },
                        {
                            pattern: /BUILD_NUM=\d+/g,
                            replacement: 'BUILD_NUM="<%= appVersion %>"'
                        },
                        {
                            pattern: /SCRIPTS_MODE=.+;/g,
                            replacement: function() {
                              return 'SCRIPTS_MODE="' + grunt.config.get('scriptsMode') + '";';
                            }
                        },
                    ]
                }
            }
        },

        karma: {
            options: {
                reporters: ['progress'], // Add 'html' if you want a log file output
                browsers: ['Chrome', 'Firefox'] // Safari disabled as it has unsolvable errors with the current unit tests (Jul 8, 2016)
            },
            unit: {
                configFile: 'tests/unit/unit.conf.js'
            },
            continuous: {
                configFile: 'tests/integration/compiler/compiler.conf.js'
            }
        },

        gitcheckout: {
            task: {
                options: {
                    branch: 'master',
                    create: false
                }
            }
        },

        gitpull: {
            task: {
                options: {
                    branch: 'master'
                }
            }
        },

        gitadd: {
            task: {
                options: {
                    force: true
                },
                files: {
                    src: '<%= gitSrcFiles %>'
                }
            }
        },

        gitcommit: {
            task: {
                options: {
                    message: '<%= commitMsg %>',
                    noVerify: true,
                    allowEmpty: true
                },
                files: {
                    src: '<%= gitSrcFiles %>'
                }
            }
        },

        gitpush: {
            task: {
                options: {
                // Target-specific options go here.
                }
            }
        },

        gitstash: {
            task: {
                options: {
                // Target-specific options go here.
                }
            }
        }
    });

    grunt.registerTask('css', ['less']);
    grunt.registerTask('serve', ['connect']);
    grunt.registerTask('default', ['less', 'connect']);
    grunt.registerTask('test', ['karma:unit', 'karma:continuous']);
    grunt.registerTask('switch-to-branch', ['gitcheckout','gitpull']);
    grunt.registerTask('save-version', ['gitadd', 'gitcommit','gitpush']);
    grunt.registerTask('stash-changes', ['gitstash']);

    grunt.registerTask('checkin-app', '', function (version) {

        pkg = grunt.file.readJSON('package.json');

        grunt.config.set('commitMsg','EarSketch (V '+ pkg.ESVersion +'): App deployed to DEV');
        grunt.config.set('gitSrcFiles',['package.json','scripts/src/data/messages.js']);
        grunt.task.run('save-version');

    });

    grunt.registerTask('checkin-curriculum', '', function (version) {

        pkg = grunt.file.readJSON('package.json');

        grunt.config.set('commitMsg','EarSketch (V '+ pkg.ESVersion +'): Curriculum deployed to DEV');
        grunt.config.set('gitSrcFiles',['scripts/src/data/curr_toc.js','scripts/src/data/curr_pages.js','../curriculum-asciidoc/curriculum/*.html','package.json','scripts/src/data/messages.js']);
        grunt.task.run('save-version');

    });

    grunt.registerTask('update-version', '', function (version) {

        pkg = grunt.file.readJSON('package.json');
        if (arguments.length !== 0) {
            grunt.config.set('appVersion',version);
        } else {
            grunt.config.set('appVersion',parseInt(pkg.ESVersion) + 1);
        }
        grunt.log.writeln("AppVersion="+grunt.config.get('appVersion'));
        pkg.ESVersion = grunt.config.get('appVersion');
        grunt.file.write('package.json', JSON.stringify(pkg,null,2));

        // grunt.task.run('string-replace');
    });

    grunt.registerTask('minify', function(version) {
        grunt.config.set('scriptsMode', 'prod');
        var pkg = grunt.file.readJSON('package.json');
        grunt.config.set('appVersion',pkg.ESVersion);
        grunt.task.run('string-replace');
    });
};
