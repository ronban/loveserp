#!/usr/bin/env node

module.exports = function (context) {

    /** @external */
    var path = context.requireCordovaModule('path');
    var platformRoot = path.join(context.opts.projectRoot, '/platforms/windows');

    var fs = require('fs'),
        xml2js = require('xml2js');
    
    // Here we check the Capabilities because Cordova doesn't generate all the necessary ones
    function addMissingCapabilities(result) {
        var temp = result.Package.Capabilities[0];
        var capabilities = {};
        capabilities['Capability'] = temp['Capability'];
        if (typeof temp['uap:Capability'] !== "undefined" && temp['uap:Capability'] != null) {
            capabilities['uap:Capability'] = temp['uap:Capability'];
        }
        DeviceCapability = [];
        DeviceCapability.push({ $: { Name: "location" } });
        DeviceCapability.push({ $: { Name: "microphone" } });
        DeviceCapability.push({ $: { Name: "webcam" } });
        capabilities['DeviceCapability'] = DeviceCapability;
        result.Package.Capabilities[0] = capabilities;
        var builder = new xml2js.Builder();
        writeManifest(builder.buildObject(result));
    }

    // Here we are reading our generated manifest file to object.
    function readManifest() {
        var parser = new xml2js.Parser();
        fs.readFile(platformRoot + '/package.windows10.appxmanifest', function (err, data) {
            parser.parseString(data, function (err, result) {
                addMissingCapabilities(result);
            });
        });
    }

    // Write back our manipulated object to file. 
    function writeManifest(resultString) {
        fs.writeFile(platformRoot + "/package.windows10.appxmanifest", resultString, function (err) {
            if (err) {
                return console.log(err);
            }
        });
    }

    readManifest(platformRoot);
};