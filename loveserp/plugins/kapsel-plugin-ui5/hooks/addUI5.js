#!/usr/bin/env node

module.exports = function(context) {

    /** @external */
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        shell = context.requireCordovaModule('shelljs');

    var wwwPath = path.join(context.opts.projectRoot, 'www'),
        ui5Root = path.join(wwwPath, 'resources'),
        kapselUI5File = path.join(ui5Root, '.kapsel.ui5');

    // Add UI5 if it is not present
    if (!fs.existsSync(path.join(wwwPath, 'resources', 'sap-ui-core.js'))) {
        console.log("Adding Kapsel UI5 files");
        shell.cp('-R', path.join(context.opts.plugin.dir, 'www', 'resources', '*') , ui5Root);

        // Identify this UI5 as Kapsel so we know it is safe to modify
        fs.writeFileSync(kapselUI5File, '');
    }
};
