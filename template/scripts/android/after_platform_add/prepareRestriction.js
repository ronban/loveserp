#!/usr/bin/env node

module.exports = function(context) {

    /** @external */
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        shell = context.requireCordovaModule('shelljs');

    var androidPlatformDir = path.join(context.opts.projectRoot,
            'platforms', 'android'),
        androidCordovaDir = path.join(androidPlatformDir, 'CordovaLib'),
        androidCordovaDirSrc = path.join(androidCordovaDir, 'src'),
        cordovaGradleFile = path.join(androidCordovaDir, 'build.gradle'),
        fileName = 'PluginAspect.aj',
        aspectFile = path.join(context.opts.projectRoot,
            'scripts', 'android', 'after_platform_add', fileName);

    if (fs.existsSync(androidPlatformDir)) {
        shell.cp('-f', aspectFile, path.join(androidCordovaDirSrc, fileName));

        shell.sed('-i', 'dependencies {', 'dependencies {\n\t\tclasspath \'com.uphyca.gradle:gradle-android-aspectj-plugin:0.9.14\'', cordovaGradleFile);
        shell.sed('-i', 'apply plugin: \'com.android.library\'', 'apply plugin: \'com.android.library\' \napply plugin: \'com.uphyca.android-aspectj\'', cordovaGradleFile);
    }
};
