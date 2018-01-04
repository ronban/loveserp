#!/usr/bin/env node

module.exports = function(context) {

    /** @external */
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        shell = context.requireCordovaModule('shelljs');

    var wwwPath = path.join(context.opts.projectRoot, 'www'),
        ui5Root = path.join(wwwPath, 'resources'),
        kapselUI5File = path.join(ui5Root, '.kapsel.ui5');

    // Remove Kapsel UI5 if present
    if (fs.existsSync(kapselUI5File)) {
        console.log("Removing Kapsel UI5 files");
        shell.rm('-rf', ui5Root);
    }
};
