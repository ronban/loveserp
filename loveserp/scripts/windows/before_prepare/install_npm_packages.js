#!/usr/bin/env node

module.exports = function (context) {

    var exec = require('child_process').execSync,
        child;

    child = exec('npm install xml2js',
        function (error, stdout, stderr) {
            
            if(stdout && typeof stdout != "undefined") {
                console.log('stdout: ' + stdout);    
            }
            if(stderr && typeof stderr != "undefined") {
                console.log('stderr: ' + stderr);
            }
            
            if (error !== null) {
                console.log('exec error: ' + error);
            }
    });

};