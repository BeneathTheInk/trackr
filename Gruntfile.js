module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: [ "dist/*.js" ],
		browserify: {
			dist: {
				src: "trackr.js",
				dest: "dist/trackr.js",
				options: {
					browserifyOptions: { standalone: "Trackr" }
				}
			},
			dev: {
				src: "trackr.js",
				dest: "dist/trackr.dev.js",
				options: {
					browserifyOptions: { debug: true, standalone: "Trackr" }
				}
			},
			test: {
				src: "test/*.js",
				dest: "dist/trackr.test.js",
				options: {
					browserifyOptions: { debug: true }
				}
			}
		},
		wrap2000: {
			dist: {
				src: 'dist/trackr.js',
				dest: 'dist/trackr.js',
				options: {
					header: "/*\n * Trackr\n * Copyright (c) 2015 Beneath the Ink, Inc.\n * Copyright (C) 2011--2015 Meteor Development Group\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			},
			dev: {
				src: 'dist/trackr.dev.js',
				dest: 'dist/trackr.dev.js',
				options: {
					header: "/*\n * Trackr\n * Copyright (c) 2015 Beneath the Ink, Inc.\n * Copyright (C) 2011--2015 Meteor Development Group\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			},
			test: {
				src: 'dist/trackr.test.js',
				dest: 'dist/trackr.test.js',
				options: {
					header: "/*\n * Trackr Tests\n * Copyright (c) 2015 Beneath the Ink, Inc.\n * Copyright (C) 2011--2015 Meteor Development Group\n * MIT License\n * Version <%= pkg.version %>\n */\n"
				}
			}
		},
		uglify: {
			dist: {
				src: "dist/trackr.js",
				dest: "dist/trackr.min.js"
			}
		},
		watch: {
			test: {
				files: [ "trackr.js", "test/*.js" ],
				tasks: [ 'test' ],
				options: { spawn: false }
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-wrap2000');

	grunt.registerTask('compile-dev', [ 'browserify:dev', 'wrap2000:dev' ]);
	grunt.registerTask('compile-test', [ 'browserify:test', 'wrap2000:test' ]);
	grunt.registerTask('compile-dist', [ 'browserify:dist', 'wrap2000:dist', 'uglify:dist' ]);

	grunt.registerTask('dev', [ 'clean', 'compile-dev' ]);
	grunt.registerTask('test', [ 'clean', 'compile-test' ]);
	grunt.registerTask('dist', [ 'clean', 'compile-dist' ]);

	grunt.registerTask('default', [ 'clean', 'compile-dist', 'compile-dev' ]);

}
