#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    shell = require('shelljs'),
    semver = require('semver'),
    et = require('elementtree');

var opts = process.argv.slice(2),
    config = readConfig(opts[0]),
    targetFolder = path.resolve(config.targetFolder),
    searchPath = path.normalize(path.join(__dirname, '..', '..', 'plugins')),
    cordovaVersion = '6.5.0'; 

//Protocol length check
validatePackageName();
	
// Make sure environment is ok.
checkEnvironment();

// Create the Fiori Client
createClient();

function checkEnvironment() {
    var result = shell.exec('cordova --version', {silent:true});

    if (result.code !== 0) {
        console.log('Cordova not found! Please run \'npm install -g cordova@' + cordovaVersion + '\'');
        process.exit(1);
    }
    else {
        var currentVersion = result.stdout ? result.stdout.trim().split(' ')[0] : null;

        try {
            if (semver.lt(currentVersion, cordovaVersion)) {
                console.log('Cordova ' + currentVersion + ' is not supported! Please run \'npm install -g cordova@' + cordovaVersion + '\'');
                process.exit(1);
            }
        } catch (e) {
            console.log('Failed to compare Cordova version. ' + e);
            console.log('Current Cordova version is: ' + currentVersion);
        }
    }
}

//Microsoft Windows package name length limitation
function validatePackageName() {
    if ((config.packageName + '.xcallbackurl').length > 39) {
        console.log('Package name cannot be longer than 26 characters.');
        process.exit(1);
    }
    
    if(!(/^[a-z+.-]+$/.test(config.packageName))) {
        console.log('Package name must contain only lowercase, dot, + and - characters.');
        process.exit(1);
    }
}

function createClient() {    
    // Die on script errors
    shell.config.fatal = true;

    // Create application with template
    shell.exec('cordova create \"' + [targetFolder, config.packageName, config.appName].join('" "') + '\" --template ' + path.join('template'));

    shell.config.silent = true;
    shell.pushd(targetFolder);
    shell.config.silent = false;

    updateConfigXML();

    // Add required platforms
    addPlatforms();

    // Update project
    shell.exec('cordova prepare ' + config.platformNames.join(' '));

    shell.popd();
    console.log('App created in the ' + targetFolder + ' directory.');
    console.log('Make sure that you navigate to ' +
        path.join(targetFolder, 'www', 'appConfig.js') +
        ' and enter your application settings, then run \'cordova prepare ' + config.platformNames.join(' ') + '\'.');

    // Updates requires to Windows platform
    manageWindowsSolution(fs, config, targetFolder); 
}

function getNameAndVersion(name) {
    if (name.indexOf('@') != -1)
    {
        var parts = name.split('@');
        return {
            name: parts[0],
            version: parts[1]
        }
    }
    else {
        return {
            name: name
        }
    }
}

function updateConfigXML() {
    var configXMLFile = path.join(targetFolder, 'config.xml');
    var contents = fs.readFileSync(configXMLFile, 'utf-8');
    if(contents) {
        // Skip the Byte Order Mark.
        contents = contents.substring(contents.indexOf('<'));
    }

    var doc = new et.ElementTree(et.XML(contents));

    // Update platforms
    var engines = doc.findall('./engine');
    engines.map(function(engine) {
        var matchFound = false;

        config.platforms.forEach(function(platform) {
            var platformInfo = getNameAndVersion(platform);
            if (platformInfo.name === engine.attrib.name) {
                matchFound = true;
                if (platformInfo.version) {
                    engine.attrib.spec = platformInfo.version;
                }
            }
        });

        if (!matchFound) {
            // Remove platform if no match found
            var children = doc.getroot().getchildren();
            var idx = children.indexOf(engine);
            if(idx > -1){
                children.splice(idx,1);
            }
        }
    });

    // Update URL Scheme
    var pluginElement = doc.find('./plugin/[@name="cordova-plugin-customurlscheme"]');
    if (pluginElement) {
        var variableElements = pluginElement.findall('variable');
        variableElements.forEach(function(varElement) {
            if (varElement.attrib.name === 'URL_SCHEME') {
                varElement.attrib.value = config.packageName + '.xcallbackurl';
            }
        });
    }

    var getPluginInfo = function(plugin) {
        if (typeof plugin === 'object') {
            return {
                'id' : plugin.id,
                'version' : '*',
                "variables" : plugin.variables
            }
        }
        else {
            if (plugin.indexOf('@') != -1)
            {
                var parts = plugin.split('@');
                return {
                    'id': parts[0],
                    'version': parts[1]
                }
            }
            else {
                return {
                    'id': plugin,
                    'version' : '*'
                }
            }
        }
    }

    if (config.crosswalkEnabled === false) {
        if (!config.cordovaPluginExcludes) {
            config.cordovaPluginExcludes = [];
        }

        config.cordovaPluginExcludes.push('cordova-plugin-crosswalk-webview');
        config.cordovaPluginExcludes.push('kapsel-plugin-inappbrowser-xwalk');
    }

    // Add any extra plugins specified in the config
    if (config.cordovaPluginIncludes && config.cordovaPluginIncludes.length > 0) {
        config.cordovaPluginIncludes.forEach(function(plugin) {
            var pluginInfo = getPluginInfo(plugin);
            var el = new et.Element('plugin');
            el.attrib.name = pluginInfo.id;
            if (pluginInfo.version) {
                el.attrib.spec = pluginInfo.version;
            }
            if (pluginInfo.variables) {
                for (var variableName in pluginInfo.variables) {
                    el.append(new et.Element('variable', { name: variableName, value: pluginInfo.variables[variableName] }));
                }
            }
            doc.getroot().append(el);
        });
    }

    // Remove any plugins specified in the config
    if (config.cordovaPluginExcludes && config.cordovaPluginExcludes.length > 0) {
        config.cordovaPluginExcludes.forEach(function(plugin) {
            var pluginInfo = getPluginInfo(plugin);
            var plugins = doc.findall('./plugin/[@name="' + pluginInfo.id + '"]');
            var children = doc.getroot().getchildren();
            plugins.forEach(function (plugin) {
                var idx = children.indexOf(plugin);
                if (idx > -1) {
                    children.splice(idx, 1);
                }
            });
        });
    }

    // Write updated XML file
    fs.writeFileSync(configXMLFile, doc.write({indent: 4}), 'utf-8');
}

function addPlatforms() {
    if (config.platforms && config.platforms.length > 0) {
        console.log('Adding platform(s)...');
        shell.exec('cordova platform add ' + config.platforms.join(' ') + ' --searchpath ' + searchPath);
    }
}

function readConfig(configFile) {
    var config = null;

    if (!configFile) {
        configFile = path.join(__dirname, 'config.json');
    }

    console.log('Reading config file');

    try {
        config = JSON.parse(fs.readFileSync(configFile));
    } catch (e) {
        console.error('Failed to read config file: ' + configFile);
        console.error(e);
        process.exit(2);
    }

    ['packageName', 'targetFolder', 'appName', 'platforms'].forEach(function(property) {
        if (config[property] === undefined || config[property] === '') {
            console.error('Property ' + property + ' was not found. Please open the configuration file (config.json by default) and enter your settings.');
            process.exit(2);
        }
        if (property === "platforms") {
            config.platformNames = [];
            // Strip version information that may be present in the config
            config.platforms.forEach(function(element) {
                config.platformNames.push(element.split('@')[0])
            });
        }
    });

    return config;
}

function manageWindowsSolution(fs, config, targetFolder) {
    var platformPath = path.join(targetFolder, "platforms", "windows");

    if (fs.existsSync(platformPath)) {
        fs.unlinkSync(path.join(platformPath, "CordovaApp.Windows.jsproj"));
        fs.unlinkSync(path.join(platformPath,"CordovaApp.Phone.jsproj"));
        fs.unlinkSync(path.join(platformPath, "CordovaApp.vs2013.sln"));
        fs.unlinkSync(path.join(platformPath, "package.windows80.appxmanifest"));
	}
}
