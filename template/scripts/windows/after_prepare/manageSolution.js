#!/usr/bin/env node

module.exports = function (context) {

    /** @external */
    var path = context.requireCordovaModule('path');
    var platformRoot = path.join(context.opts.projectRoot, '/platforms/windows');

    function manageSolution(platformRoot, filename) {
        var fs = require('fs');
        var result = "";
        var array = fs.readFileSync(platformRoot + "/" + filename).toString().split("\n");
        for (var i in array) {
            if (array[i].indexOf("CordovaApp.Windows.jsproj") == -1 && array[i].indexOf("CordovaApp.Phone.jsproj") == -1) {
                result += array[i] + "\n";
            } else {
                delete array[++i];
            }
        }

        fs.writeFile(platformRoot + "/" + filename, result, function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
    }
    
    
    manageSolution(platformRoot, "CordovaApp.sln");
};