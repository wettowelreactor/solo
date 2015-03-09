module.exports = function(grunt) {

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['spec/**/*.js']
      }
    },

    browserify: {
        'public/app.js': ['client/app.js']
    },

    watch: {
      scripts: {
        files: ['**/*.js'],
        tasks: ['mochaTest', 'browserify', 'nodemon'],
        options: {
          spawn: false,
        },
      },
    },

    nodemon: {
      dev: {
        script: 'server.js'
      }
    }
  });

  // Don't worry about this one - it just works. You'll see when you run `grunt`.
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-nodemon');

  ////////////////////////////////////////////////////
  // Main grunt tasks
  ////////////////////////////////////////////////////

  grunt.registerTask('default', ['watch']);

};
