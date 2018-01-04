#!/usr/bin/env node

module.exports = function(context) {

    /** @external */
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        shell = context.requireCordovaModule('shelljs');

    var configXml = path.join(context.opts.projectRoot,
            'platforms', 'android', 'res', 'xml', "config.xml");

    if (fs.existsSync(configXml)) {
        shell.sed('-i',/--disable-pull-to-refresh-effect/g,'--disable-pull-to-refresh-effect --disable-threaded-scrolling',configXml);
    }
};