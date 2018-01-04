// 3.15.8
var exec = require("cordova/exec");
var serviceVersion = "latest";
var forceRegistrationServiceVersion = false;

var cachedConfigMap = null;
var retrievingConfigMap = false;

var updateCached = function(map) {
    cachedConfigMap = map;
    retrievingConfigMap = false;
};

function noOp() {};

var getPort = function(port, bSkipDefaultPort) {
    if (port == 0 || port == null || port == "" || port =="0") {
        return "";
    }
    else {
        if (bSkipDefaultPort) {
            // theoretically if an app uses 80 for https or 443 for http, then we cannot skip the port.
            // but assume on one will configure the port in that way. So no need to handle the case.
            if (port == 80 || port == 443) {
                return "";
            }
            else {
                return ":"+port;
            }
        }
        else {
            return ":"+port;
        }
    }
};

function _setRegistrationServiceVersion(registrationServiceVersion) {
    var isVandNumber = /^v[0-9]+/i.test(registrationServiceVersion);
    if (isVandNumber) {
        serviceVersion = registrationServiceVersion;
    }
    else {
        serviceVersion = "latest";
    }
    forceRegistrationServiceVersion = true;
};

/**
 * Builds service version url from the logon information
 * @private
 * @param {object} info Logon information
 */
function _getServiceVersionURL(info) {
    var context = info.registrationContext;
    var scheme = context.https ? "https" : "http";
    var host = context.serverHost + getPort(context.serverPort);
    return scheme + "://" + host +"/mobileservices/management/versions";
};

/**
 * Get the service version value from the server
 * @private
 * @param {object} request the request object.
 * @param {function} successCallback Function to invoke if the exchange is successful.
 * @param {function} errorCallback Function to invoke if the exchange failed.
 **/
function _getServiceVersion(request, successCallback, errorCallback) {
    var lmSuccess = function(info) {
        var url = _getServiceVersionURL(info);
        var operation = request.method;
        if (operation == 'undefined' || operation == null) {
            operation = "GET";
        }

        // Add the headers from the request.
        var headers = {
            "Accept": "application/json",
        };

        if (request.headers) {
            for (var headerKey in request.headers) {
                headers[headerKey] = request.headers[headerKey];
            }
        }

        var onRequestSuccess = function(response) {
            try {
                var v = JSON.parse(response.responseText);
                successCallback(v.services.onboarding);
            }
            catch (e) {
                successCallback("latest");
            }
        };
        var onRequestError = function(response) {
            errorCallback(response);
        };

        if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
            // this seems to be specific to the Windows platform; but not for iOS or Android. Why?
            sap.AuthProxy.sendRequest(
                operation, url,
                headers, request.data,
                onRequestSuccess, onRequestError,
                info.registrationContext.user, info.registrationContext.password,
                0, null
            );
        }
        else {
            var configHandler = function(jsonconfig) {
                var authConfig = JSON.parse(jsonconfig);
                authConfig.handleChallenges = true;

                sap.AuthProxy.sendRequest2(
                    operation, url,
                    headers, request.data,
                    onRequestSuccess, onRequestError,
                    0, authConfig
                );
            };
            sap.Logon.getConfiguration(configHandler, noOp, "authentication");
        }
    };
    var lmError = function() {
        errorCallback({
                statusCode: 0,
                statusText: "Get Service version failed"
            });
    };

    sap.Logon.unlock(lmSuccess, lmError);
};

/**
 * Builds the connection url from the logon information
 * @private
 * @param {object} info Logon information
 */
function _getConnectionURL(info) {
    var context = info.registrationContext;
    var scheme = context.https ? "https" : "http";
    var host = context.serverHost + getPort(context.serverPort);

    var serviceVersionHandler = function(v) {
        _setRegistrationServiceVersion(v);
        var path = (context.resourcePath ? context.resourcePath : "") + (context.farmId ? "/" + context.farmId : "");
        return scheme + "://" + host + (path ? path + "/" : "/") + "odata/applications/" + serviceVersion + "/" + sap.Logon.applicationId + "/Connections('" + info.applicationConnectionId + "')";
    };

    if (context.serviceVersionForRegistration) {
        return serviceVersionHandler((context.serviceVersionForRegistration).toLowerCase());
    }
    else {
        // Note: this branch does not return a value
        _getServiceVersion({}, serviceVersionHandler, noOp);
    }
};

/**
 * Build a url from the logon information for the purpose of creating a new login registration id.
 * @private
 * @param {object} info Logon information
 */
function _getConnectionURLForRegistration(info) {
    var context = info.registrationContext;
    var scheme = context.https ? "https" : "http";
    var host = context.serverHost + getPort(context.serverPort);
    var path = (context.resourcePath.length > 0 && context.farmId.length > 0) ? (context.resourcePath + "/" + context.farmId + "/") : "";
    return scheme + "://" + host + (path?path:"/") + "odata/applications/" + serviceVersion + "/" + sap.Logon.applicationId + "/Connections";
};

/**
 * Makes request to SMP server
 * @private
 * @param {object} request
 * @param {function} successCallback Function to invoke if the request is successful.
 * @param {function} errorCallback Function to invoke if the request failed.
 */
function _request(request, successCallback, errorCallback) {
    var v1Fallback = function(response) {
        if (response && response.status == '404' && forceRegistrationServiceVersion == false) {
            // try with v1 version as fallback
            serviceVersion = "v1";
            _sendRequest(request, successCallback, errorCallback);
        }
        else {
            successCallback && successCallback(response);
        }
    };

    _sendRequest(request, v1Fallback, errorCallback);
}

/**
 * Sends request to SMP server
 * @private
 * @param {object} request
 * @param {function} successCallback Function to invoke if the request is successful.
 * @param {function} errorCallback Function to invoke if the request failed.
 */
function _sendRequest(request, successCallback, errorCallback) {
    var lmSuccess = function(info) {
        // Only send request for SMP servers.  Connection Id will not be present for Gateway
        if (!(info && info.applicationConnectionId)) {
           errorCallback({
                statusCode: 0,
                statusText: "Gateway not supported for settings"
            });
           return;
        }

        var url = _getConnectionURL(info); // + (request.path ? ("/" + request.path) : "");
        var operation = request.method;
        if (operation == 'undefined' || operation == null) {
          operation = "GET";
        }

        // Add the headers from the request.
        var headers = {
          "Accept": "application/json",
          "Content-Type": "application/json",
          // "X-SMP-APPCID": info.applicationConnectionId
        };

        if (request.headers) {
            for (var headerKey in request.headers) {
                headers[headerKey] = request.headers[headerKey];
            }
        }

        var onRequestSuccess = function(response) {
            successCallback(response);
        };
        var onRequestError = function(response) {
            errorCallback(response);
        };
        var configHandler = function(jsonconfig) {
            var authConfig = null;
            try {
                authConfig = JSON.parse(jsonconfig);
            }
            catch (e) {
                errorCallback(response);
                return;
            }
            authConfig.handleChallenges = true;

            sap.AuthProxy.sendRequest2(
                operation, url,
                headers, request.data,
                onRequestSuccess, onRequestError,
                0, authConfig);
        };

        if (cordova.require("cordova/platform").id.indexOf("windows") === 0)  {
            // this seems to be specific to the Windows platform; but not for iOS or Android. Why?
            sap.AuthProxy.sendRequest(
                operation, url,
                headers, request.data,
                onRequestSuccess, onRequestError,
                info.registrationContext.user, info.registrationContext.password,
                0, null
            );
        }
        else {
            sap.Logon.getConfiguration(
                configHandler, noOp, "authentication");
        }
    };
    var lmError = function() {
        errorCallback({
            statusCode: 0,
            statusText: "Logon failed"
        });
    };

    sap.Logon.unlock(lmSuccess, lmError);
};

/**
 * Used to access SMP application settings. See also <a href="sap.Settings.html">Settings</a>.
 * @namespace
 * @alias AppSettings
 * @memberof sap
 * @see {@link http://dcx-pubs.sybase.com/index.html#smp0300/en/com.sybase.smp3.developer/doc/html/mdw1371795615579.html|Application Connection Properties}
 */
module.exports = {

    "applicationConnectionId": "",
    createRegistration: function(successCB, errorCB) {
        _createRegistration(successCB, errorCB);
    },

    startSettings: function(successCB, errorCB, connectionData) {
        var configMapHandler = function(args) {
            // Currently, when HTTP requests to SMP server returns 401, the HTTP conversation does not finish and thus, never returns a callback.
            // If the config property map check would have returned 401, then the passcode policy update would have also done so.
            sap.logon.Core.checkServerPasscodePolicyUpdate(noOp, noOp);

            var uploadLog = args['UploadLogs'];
            var logLevel = args['ConnectionLogLevel'];
            if ((logLevel != 'NONE') && (uploadLog == true)) {
                sap.Logger.upload(noOp, noOp);
            }
            /** Ignore server log level if it is NONE. Client Take precedence */
            if (logLevel != 'NONE') {
               sap.Logger.setLogLevel(logLevel);
            }
            var deviceType = args['DeviceType'];

            if (deviceType == undefined || deviceType == null || deviceType.toLowerCase() == 'unknown') {
                if (device.platform == "iPhone" || device.platform == "iPad" || device.platform == "iPod touch" || device.platform == "iOS") {
                    deviceType = "iOS";
                }
                else if (device.platform == "Android") {
                    deviceType = "Android";
                }
                else {
                    deviceType = "Windows8";
                }

                sap.Settings.setConfigProperty({ "DeviceType": deviceType },
                    function(m) {
                        sap.Logger.debug("Device Type Update Successful","SMP_SETTINGS_JS",function(m){},function(m){});
                    },
                    function(mesg) {
                        sap.Logger.debug("Device Type Update failed","SMP_SETTINGS_JS",function(m){},function(m){});
                    });
            };
            var jsonStringValue = JSON.stringify({"data":JSON.stringify(args)});
            successCB(jsonStringValue);
        };

        module.exports.getConfigPropertyMap(configMapHandler, errorCB);
    },

    /**
     * This is a private function. End user will not use this plugin directly.
     * This function gets list of all the blackliste features through featureVector policy from the server.
     * @private
     * @param {function} successCB Function to invoke if the exchange is successful.
     * @param {function} errorCB Function to invoke if the exchange failed.
     **/
    allFeatures: function(successCB, errorCB) {
        var ssoSuccess = function(datastr) {
            try {
                var args = JSON.parse(datastr);
                if (args) {
                    var featureVectorPolicyAllEnabled = args['FeatureVectorPolicyAllEnabled'];
                    if (featureVectorPolicyAllEnabled == true) {
                        successCB(null);
                    }
                    else {
                        var featureVector = args.FeatureVectorPolicy;
                        successCB(featureVector);
                    }
                }
                else {
                    successCB(null);
                }
            }
            catch (e) {
                errorCB(e.message);
            }
        };
        var ssoError = function() {
            errorCB("Failed to retrive setting information");
        };

        sap.Logon.unlock(
            function() {
                sap.logon.Core.getSecureStoreObject(ssoSuccess, ssoError, "settingsdata");
            },
            function() {
                errorCB("Failed to get Settings, make sure that you have done logon register succesfully");
            });
    },

    /**
     * This is a private function. End user will not use this plugin directly.
     * This function gets feature specified in the name parameter.
     * @private
     * @param {String} name Name of the feature to fetch.
     * @param {function} successCB Function to invoke if the exchange is successful.
     * @param {function} errorCB Function to invoke if the exchange failed.
     **/
    getFeatureForName: function(successCB, errorCB, name) {
        var fvSuccess = function(featureVect) {
            if (featureVect == null) {
                successCB(null);
            }
            else {
                var feature = null;
                var vectorList = featureVect.results; // featureVect['features'];
                for (i = 0; i < vectorList.length; i++) {
                    var vectorSubList = vectorList[i]['JSModule'].split(",");
                    for (j=0; j< vectorSubList.length; j++) {
                        if (vectorSubList[j] == name) {
                            feature = vectorList[i];
                            break;
                        }
                    }
                    if (feature != null) { // We have found a match
                        break;
                    }
                }
                successCB(feature);
            }
        };
        var fvError = function() {
            errorCB("Failed to get feature lists");
        };

        module.exports.allFeatures(fvSuccess, fvError);
    },

    /**
     * Retrieves a config property by name.
     * @param {function} successCallback Called with the value of the property.
     * @param {function} errorCallback Called with error object that contains status and statusText.
     * @param {string} name The property name
     * @example
     * sap.AppSettings.getConfigProperty(function(token) {
     *    console.log("DeviceToken: " + token);
     * }, function(error) {
     *    alert("Failed to get setting. Status code" + error.statusCode + " text: " + error.statusText);
     * }, "ApnsDeviceToken");
     */
    getConfigProperty: function(successCallback, errorCallback, name) {
        var configMapHandler = function(response) {
            successCallback(response[name]);
        };

        module.exports.getConfigPropertyMap(configMapHandler, errorCallback);
    },

    /**
     * Updates the provided Name-Value pairs of config properties.
     * @param {object} nameVals Object that contains name value pairs.
     * @param {function} successCallback Called if set is successful.
     * @param {function} errorCallback Called with error object that contains status and statusText.
     * @example
     * sap.AppSettings.setConfigProperty({ "ApnsDeviceToken" : "mytoken" }, function() {
     *    console.log("Device token set");
     * }, function(error) {
     *    alert("Failed to set setting. Status code" + error.statusCode + " text: " + error.statusText);
     * });
     */
    setConfigProperty: function(nameVals, successCallback, errorCallback) {
        _request({
                method: "POST",
                headers: {
                    "X-HTTP-METHOD": "MERGE"
                },
                data: JSON.stringify(nameVals)
            }, function(response) {
                successCallback();
            }, errorCallback);
    },

    /**
     * Returns all the settings in Name-Value pairs.
     * @param {function} successCallback Called with object that contains a collection of name value pairs.
     * @param {function} errorCallback Called with error object that contains status and statusText.
     * @example
     * sap.AppSettings.getConfigPropertyMap(function(properties) {
     *    for (var name in properties) {
     *       console.log("Property Name: " + name + " value: " + properties[name]);
     *     }
     * }, function(error) {
     *     alert("Failed to get settings. Status code" + error.statusCode + " text: " + error.statusText);
     * });
     *
     */
    getConfigPropertyMap: function(successCallback, errorCallback) {
        var onRequestSuccess = function(response) {
            if (typeof response.responseText === "undefined") {
                updateCached(null);
                errorCallback({statusCode: 0, statusText: "No property map in response!"});
                return;
            }
            try {
                var obj = JSON.parse(response.responseText);

                if (typeof obj.d === "undefined") {
                    if (typeof obj.error !== "undefined") {
                        console.log("[AppSettings][appsettings.js] Error in getConfigPropertyMap: " + JSON.stringify(obj.error));
                        errorCallback(obj.error);
                    }
                    else {
                        console.log("[AppSettings][appsettings.js] unknown_error in getConfigPropertyMap");
                        errorCallback("unknown_error");
                    }
                    updateCached(null);
                    return;
                }
                var map = obj.d;
                delete map["__metadata"]; // remove metadata

                updateCached(map);
                successCallback(map);
            }
            catch (e) {
                console.log("[AppSettings][appsettings.js] Parse error in getConfigPropertyMap");

                updateCached(null);
                errorCallback("parse_error");
            }
        };
        var onRequestError = function(error) {
            updateCached(null);
            errorCallback(error);
        };
        var completionChecker = function() {
            if (!retrievingConfigMap) {
                console.log("[AppSettings][appsettings.js] Using cached property map.");
                if (!cachedConfigMap) {
                    errorCallback("Unable to retrieve config property map!");
                }
                else {
                    successCallback(cachedConfigMap);
                }
            }
            else {
                setTimeout(completionChecker, 50);
            }
        };

        if (!cachedConfigMap && !retrievingConfigMap) {
            retrievingConfigMap = true;
            console.log("[AppSettings][appsettings.js] Retrieving config property map.");
            _request({}, onRequestSuccess, onRequestError);
        }
        else { // Wait for completion then return
            completionChecker();
        }
    },

    /**
     * Synchronously clears any cached Settings data.
     */
    clearCache: function() {
        if (cachedConfigMap) {
            console.log("[AppSettings][appsettings.js] Clearing cached property map.");
        }
        cachedConfigMap = null;
    },

    /**
     * Retrieves the application end-point with which the application can access business data.
     * @param {function} successCallback Called with the value of the ProxyApplicationEndpoint.
     * @param {function} errorCallback Called with error object that contains status and statusText.
     * @example
     * sap.AppSettings.getApplicationEndpoint(function(endpoint) {
     *    console.log("Endpoint: " + endpoint);
     * }, function(error) {
     *    alert("Failed to get setting. Status code" + error.statusCode + " text: " + error.statusText);
     * });
     *
     */
    getApplicationEndpoint: function(successCallback, errorCallback) {
        module.exports.getConfigProperty("ProxyApplicationEndpoint", successCallback, errorCallback);
    },

};
