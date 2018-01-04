var exec = require('cordova/exec');
var cc = function(msg) {
    if (typeof console !== "undefined" && typeof console.log === "function") {
        console.log("[Usage][usage.js] " + msg);
    }
};
var usageIsEnabledOnServer = false;

/**
 * Provides usage support.
 *
 * The purpose of this plugin is to enable administrators to view and generate
 * reports on application usage KPI's, across dimensions of device type & version,
 * operating system type & version, and sdk type & version.
 *
 * @namespace
 * @alias Usage
 * @memberof sap
 */
Usage = function() {
    var sendUserPermissionToServer = false;
    var checkSendUserPermissionToServer = function(){
        var args = arguments;
        sap.Logon.get(function(value) {
            sendUserPermissionToServer = value;
            usageInitialization.eventListener.apply(this, args);
        }, function(error) {
            console.log(error);
            usageInitialization.eventListener.apply(this, args);
        }, 'sendUserPermissionToServer');
    }

    if (typeof WinJS !== "undefined" && typeof WinJS.Application !== "undefined") {
        WinJS.Application.addEventListener("onSapLogonSuccess", checkSendUserPermissionToServer, false);
    } else {
        document.addEventListener("onSapLogonSuccess", checkSendUserPermissionToServer, false);
    }

    this.isUsageEnabledOnServer = function() {
        return usageIsEnabledOnServer;
    }

    /**
     * Initialize usage plugin.
     * Note that this initialize call happens automatically if you have Logon plugin.
     * - In that case the use of this method is not recommended due to race condition.
     * - An application can subscribe to the 'onUsageInitialized' event ( {@link sap.Usage.onInitializedEvent} ), which is fired when the Usage has been initialized. (with Logon plugin only)
     * @memberof sap.Usage
     * @function init
     * @param {String} [uploadEndpoint] fully qualified URL, pointing to the Hana Mobile servers clientusage log upload endpoint, must be not null
     * @param {String} [dataEncryptionKey] encryption key, to encrypt database content, can be null.
     * @param {int} [timeFor3GUpload] time for 3G upload in days.
     * @param {function} [successCallback] the callback invoked on success
     * @param {sap.Usage.initErrorCb} [errorCallback] the callback invoked on error
     * @example
     * sap.Usage.init('uploadEndpoint', 'dataEncryptionKey', 2, function () {
     *    console.log("Initialization success");
     * }, function (errorCode, extra) {
     *    console.log("Initilization failed with error code: " + errorCode);
     * });
     */
    this.init = function(uploadEndpoint, dataEncryptionKey, timeFor3GUpload, successCallback, errorCallback) {
        sap.Usage.getUserConsent(
            function(value) {
                if (value == true) {
                    var usageInitSuccess = function() {
                        if (sendUserPermissionToServer) {
                            var result = value ? "true" : "false";
                            sap.Usage.log("userCollectionPermission",{"i_result":result},"permission", function(){
                                sendUserPermissionToServer = false;
                                // Don't need the callbacks here for this function.
                                sap.Logon.set(function(){}, function(){}, "sendUserPermissionToServer", false);
                            }, function(error){
                                console.log("error logging user collection permission: " + JSON.stringify(error));
                            });
                        }
                        successCallback.apply(this, arguments)
                    }
                    exec(usageInitSuccess, errorCallback, "Usage", "init", [uploadEndpoint, dataEncryptionKey, timeFor3GUpload]);
                } else {
                    if (cordova.platformId.toLowerCase() == "windows")
                        successCallback.apply(this, arguments)
                }
            },
            function (error) {
                console.log(error);
            }
        );
    };

    ///**
    //* Triggers usage data upload. Data upload is automatic with Usage initialization (performed with init
    //*/
    //this.uploadReport = function (successCallback, errorCallback) {
    //    exec(successCallback, errorCallback, "Usage", "uploadReport", []);
    //}

    /**
     * Checks whether the usage was already initialized by calling the Usage.init() method. The result of the check will be returned as argument of the successCallback.
     * @memberof sap.Usage
     * @function isInitialized
     * @param {function} successCallback the callback invoked on success with the result as parameter
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.isInitialized(function(result) { 
     *     console.log("Usage initialization status" + result);
     * }, function(error) {
     *     console.log("Something went wrong" + error);
     * });
     */
    this.isInitialized = function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, "Usage", "isInitialized", []);
    };

    /**
     * Checks whether the usage database was initialized. The result of the check will be returned as argument of the successCallback.
     * @memberof sap.Usage
     * @function checkExistence
     * @param {function} successCallback callback invoked on success with the result as parameter
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.checkExistence(function(result) { console.log("Usage database status" + result);}, function(error) {console.log("Something went wrong" + error);});
     */
    this.checkExistence = function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, "Usage", "checkExistence", []);
    };

    /**
     * Deletes the usage database.
     * @memberof sap.Usage
     * @function destroy
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.destroy(function(result) {}, function(error){});
     */
    this.destroy = function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, "Usage", "destroy", []);
    };

    /**
     * Change the data encryption key of the usage database.
     * @memberof sap.Usage
     * @function changeEncryptionKey
     * @param {String} [oldKey] the old key of the usage database, can be null
     * @param {String} [newKey] the new key of the usage database, can be null
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.changeEncryptionKey("abc", "123", function(result) {}, function(error) {});
     */
    this.changeEncryptionKey = function(oldKey, newKey, successCallback, errorCallback) {
        exec(successCallback, errorCallback, "Usage", "changeEncryptionKey", [oldKey, newKey]);
    };

    /**
     * Log timestamps for specific events.
     * Upon successful completion the successCallback function will be called with "OK".
     * @memberof sap.Usage
     * @function log
     * @param {String} [key] identifies the usage entry, must be not null
     * @param {sap.Usage.InfoType} [info] A value object containing several predefined elements, will be also logged in the record, can be null
     * @param {String} [type] the type of the event, can be null
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * var infoType = new sap.Usage.InfoType();
     * infoType.setScreen("1").setView("2").setAction("3");
     * sap.Usage.log("Test logging", infoType, "Sample type", successCallback, errorCallback);
     */
    this.log = function(key, info, type, successCallback, errorCallback) {
        if (typeof key === 'undefined' || key === null) {
            reportUndefinedTimerKey(errorCallback);
            return;
        }

        if (typeof info === 'undefined' || info === null) {
            info = new sap.Usage.InfoType();
        }

        if (typeof type === 'undefined' || type === null) {
            type = "";
        }
        exec(successCallback, errorCallback, "Usage", "log", [key, info, type]);
    };


    /**
     * * Starts a timer with a specific key. If a timer was already started with the same key, a new timer will be initialized. If a timer started Successfully, the timerId will be returned through the successCB callback function
     * parameter.
     * @memberof sap.Usage
     * @function makeTimer
     * @param {String} key The identifier for the timer, must be not null
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.makeTimer(timerKey, function(timerID) {
     *     alert("Timer with key " + timerKey + " and ID " + timerID + " successfully started.");
     * }, errorCallback);
     */
    this.makeTimer = function(key, successCallback, errorCallback) {
        if (typeof key === 'undefined' || key === null) {
            reportUndefinedTimerKey(errorCallback);
            return;
        }
        exec(successCallback, errorCallback, "Usage", "makeTimer", [key]);
    };

    /**
     * Stop a timer. Multiple stop calls on the same Timer instance is allowed. If the timer object was not initialized correctly, no further result will occur.
     * Upon successful completion the successCallback function will be called with "OK".
     * @memberof sap.Usage
     * @function stopTimer
     * 
     * @param {String} timerid The identifier for timer to stop. This value is obtained in the makeTimer call, must be not null
     * @param {sap.Usage.InfoType} info A value object containing several predefined elements, will be also logged in the record, can be null
     * @param {String} type type of the recorded event
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * var infoType = new sap.Usage.InfoType();
     * infoType.setAction("Timer stopped").setBehavior("normal").setCase("sample");
     * sap.Usage.stopTimer(timerID, infoType, "Sample timer", successCallback, errorCallback);
     */
    this.stopTimer = function(timerid, info, type, successCallback, errorCallback) {
        if (typeof timerid === 'undefined' || timerid === null) {
            reportUndefinedTimerID(errorCallback);
            return;
        }

        if (typeof info === 'undefined' || info === null) {
            info = new sap.Usage.InfoType();
        }

        if (typeof type === 'undefined' || type === null) {
            type = "";
        }
        exec(successCallback, errorCallback, "Usage", "stopTimer", [timerid, info, type]);
    };
    /**
     * Starts a timer with a specific key. If a timer was already started with the same key, a new timer will be initialized and the old timer will be deleted.
     * Upon successful completion the successCallback function will be called with "OK".
     * @memberof sap.Usage
     * @function timeStart
     * @param {String} key The key for the timer to create, must be not null.
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example sap.Usage.timeStart('keyvalue', successCallback, errorCallback);
     */
    this.timeStart = function(key, successCallback, errorCallback) {
        if (typeof key === 'undefined' || key === null) {
            reportUndefinedTimerKey(errorCallback);
            return;
        }
        exec(successCallback, errorCallback, "Usage", "timeStart", [key]);
    };

    /**
     * Stops the timer identified by the key argument. If the timer was already stopped by a previous method call, or the timer was not initialized by timeStart, no further result
     * will occur. Upon successful completion the successCallback function will be called with "OK".
     * @memberof sap.Usage
     * @function timeEnd
     * @param {String} key The key for the timer to end, must be not null.
     * @param {sap.Usage.InfoType} info A value object containing several predefined elements. The content of the info, will be also stored in the record, to allow more specific queries. Can be null.
     * @param {String} type type of the recorded event, can be null
     * @param {function} successCallback callback invoked on success
     * @param {function} errorCallback callback invoked on error
     * @example
     * infoType.setView("Custom View").setResult("Time end called");
     * sap.Usage.timeEnd(timerKey, infoType, "Timer", successCallback, errorCallback);
     */
    this.timeEnd = function(key, info, type, successCallback, errorCallback) {
        if (typeof key === 'undefined' || key === null) {
            reportUndefinedTimerKey(errorCallback);
            return;
        }

        if (typeof info === 'undefined' || info === null) {
            info = new sap.Usage.InfoType();
        }

        if (typeof type === 'undefined' || type === null) {
            type = "";
        }
        exec(successCallback, errorCallback, "Usage", "timeEnd", [key, info, type]);
    };

    /**
     * Returns Json representation of every Usage data stored locally in the argument of the success callback.
     * @memberof sap.Usage
     * @function getReports
     * @param {function} successCallback the callback invoked on success with the reports as parameter
     * @param {function} errorCallback callback invoked on error
     * @example
     * sap.Usage.getReports(function(reports) { console.log(reports); }, errorCallback);
     */
    this.getReports = function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, "Usage", "getReports", []);
    };

    /**
     * @constructor sap.Usage.PrivacyPolicy
     * @param {String} [id] A unique identifier for the privacy policy.
     * @param {String} [label] A short, descriptive label that will be displayed to the user on the Usage consent screen.
     * @param {String} [url] The URL that the full privacy policy is located at.
     * @param {String} [lastUpdated] A String that indicates the last update of the privacy policy.
     * Note that this is not required to be a date as long as each revision uses a unique, but it is strongly recommended.
     * @example
     * sap.Usage.PrivacyPolicy("mycompany", "My Company Privacy Policy", "http://mycompany.com/privacy", "2016-11-21T00:00");
     */
    var PrivacyPolicy = this.PrivacyPolicy = function PrivacyPolicy(id, label, url, lastUpdated) {
        this.id = id;
        this.label = label;
        this.url = url;
        this.lastUpdated = lastUpdated;
    };
    PrivacyPolicy.clone = function(pol) {
        return new PrivacyPolicy(pol.id, pol.label, pol.url, pol.lastUpdated);
    };

    // This URL http://go.sap.com/corporate/en/legal/privacy.html is a temporary link.  We should get one that's specific to us.
    var sapPrivacyPolicy = new PrivacyPolicy("sap", "SAP Privacy Policy", "http://go.sap.com/corporate/en/legal/privacy.html", "2016-11-21T00:00");
    var additionalPrivacyPolicies = [];

    /**
     * Sets the list of additional privacy policies and stores in AppPreferences.
     * @memberof sap.Usage
     * @function setAdditionalPrivacyPolicies
     * @param {Array} [policies] the list of additional privacy policies.
     * @param {function} [successCallback] the callback invoked on success
     */
    var setAdditionalPrivacyPolicies = this.setAdditionalPrivacyPolicies = function(policies, successCallback) {
        additionalPrivacyPolicies = policies
            .map(function(val) {
                    return new PrivacyPolicy(val.id, val.label, val.url, val.lastUpdated)
                });
        if (successCallback) {
            successCallback();
        }
        sap.AppPreferences.setPreferenceValue("privacyPolicies", additionalPrivacyPolicies, function() {}, function() {});
    };

    /**
     * Loads any additional privacy policies stored in AppPreferences.
     * @memberof sap.Usage
     * @function loadAdditionalPrivacyPolicies
     * @param {function} [successCallback] the callback invoked on success
     * @param {function} [errorCallback] the callback invoked on error
     */
    var loadAdditionalPrivacyPolicies = this.loadAdditionalPrivacyPolicies = function(successCallback, errorCallback) {
        sap.AppPreferences.getPreferenceValue("privacyPolicies",
            function(value) {
                var toPolicy = function(val) {
                    return new PrivacyPolicy(val.id, val.label, val.url, val.lastUpdated);
                };
                try {
                    if (value) {
                        if (value.constructor !== Array) {
                            // Stringified value on Android
                            value = JSON.parse(value);
                        }
                        additionalPrivacyPolicies = value.map(toPolicy);
                    }
                    if (successCallback) {
                        successCallback();
                    }
                }
                catch (error) {
                    console.log("Error parsing additional privacy policies: " + JSON.stringify(error));
                    if (errorCallback) {
                        errorCallback(error);
                    }
                }
            },
            function(error) {
                if (errorCallback) {
                    errorCallback(error);
                }
            });
    };

    /**
     * Gets the SAP-specific privacy policy.
     * @memberof sap.Usage
     * @function getSapPrivacyPolicy
     * @return privacy policy with sap ID
     * @example
     * sap.Usage.getSapPrivacyPolicy();
     */
    var getSapPrivacyPolicy = this.getSapPrivacyPolicy = function() {
        var sapPolicy = getPrivacyPolicies();
        for (var i = 0; i < sapPolicy.length; i++) {
            if (sapPolicy[i].id == "sap") {
                return sapPolicy[i];
            }
        }
    };

    /**
     * Gets all privacy policies, including the SAP-specific policy.
     * If multiple policies have the same id, only the latest will be included.
     * @memberof sap.Usage
     * @function getPrivacyPolicies
     * @return an array of privacy policies
     * @example
     * sap.Usage.getPrivacyPolicies();
     */
    var getPrivacyPolicies = this.getPrivacyPolicies = function() {
        var idMap = {};
        var out = [];

        // Clone all policies
        var unfiltered = [PrivacyPolicy.clone(sapPrivacyPolicy)];
        for (var i = 0; i < additionalPrivacyPolicies.length; i++) {
            unfiltered.push(PrivacyPolicy.clone(additionalPrivacyPolicies[i]));
        }

        // Limit to one of each policy id
        for (var i = 0; i < unfiltered.length; i++) {
            idMap[unfiltered[i].id] = i;
        }
        for (var i = 0; i < unfiltered.length; i++) {
            if (idMap[unfiltered[i].id] === i) {
                out.push(unfiltered[i]);
            }
        }
        return out;
    };

    /**
     * Get the changes between the current privacy policy list and the list of consented privacy policies.
     * Does not modify the original parameters.
     * The result is returned as an map of PrivacyPolicy objects with the type of change indicated in
     * an extra property, "change".
     * Possible Change State values: "UNCHANGED", "CHANGED", "ADDED", "REMOVED"
     * @private
     * @function getPrivacyPolicies
     * @param {sap.Usage.PrivacyPolicy} [currentPolicies] current list of privacy policies
     * @param {sap.Usage.PrivacyPolicy} [consentedPolicies] list of consented privacy policies
     */
    var getPrivacyPolicyChanges = function(currentPolicies, consentedPolicies) {
        if (typeof currentPolicies === "undefined" || currentPolicies === null) {
            currentPolicies = [];
        }
        if (typeof consentedPolicies === "undefined" || consentedPolicies === null) {
            consentedPolicies = [];
        }
        var arrayToMap = function(arrObj) {
            var mapObj = {};
            for (var i = 0; i < arrObj.length; i++) {
                if (!mapObj.hasOwnProperty(arrObj[i].id)) {
                    mapObj[arrObj[i].id] = arrObj[i];
                }
            }
            return mapObj;
        }

        var currentPolicyMap = arrayToMap(currentPolicies);
        var consentedPolicyMap = arrayToMap(consentedPolicies);

        var changeObj = {};
        for (var i = 0, keys = Object.keys(currentPolicyMap); i < keys.length; i++) {
            var id = keys[i];
            var currentPolicy = currentPolicyMap[id];
            var consentedPolicy = consentedPolicyMap[id];
            changeObj[id] = PrivacyPolicy.clone(currentPolicy);

            if (typeof consentedPolicy === "undefined") {
                changeObj[id].change = "ADDED";
            }
            else if (currentPolicy.label === consentedPolicy.label &&
                    currentPolicy.url === consentedPolicy.url &&
                    currentPolicy.lastUpdated === consentedPolicy.lastUpdated) {
                changeObj[id].change = "UNCHANGED";
            }
            else {
                changeObj[id].change = "CHANGED";
            }
        }
        for (var i = 0, keys = Object.keys(consentedPolicyMap); i < keys.length; i++) {
            var id = keys[i];
            var consentedPolicy = consentedPolicyMap[id];
            if (!currentPolicyMap.hasOwnProperty(id)) {
                changeObj[id] = PrivacyPolicy.clone(consentedPolicy);
                changeObj[id].change = "REMOVED";
            }
        }
        return changeObj;
    };

    /**
     * Gets the user consent state given the current privacy policy list and the list of consented privacy policies.
     * @private
     * @function getUserConsentState
     * @param {sap.Usage.PrivacyPolicy} [currentPolicies] current list of privacy policies
     * @param {sap.Usage.PrivacyPolicy} [consentedPolicies] list of consented privacy policies
     */
    var getUserConsentState = function(currentPolicies, consentedPolicies) {
        if (consentedPolicies === null) {
            return "NOT_SET";
        }
        else if (consentedPolicies && consentedPolicies.constructor === Array) {
            if (consentedPolicies.length === 0) {
                return "DECLINED";
            }
            else {
                var changes = getPrivacyPolicyChanges(currentPolicies, consentedPolicies);
                var changeType = "ACCEPTED";
                for (var i = 0, keys = Object.keys(changes); i < keys.length; i++) {
                    var keyChangeType = changes[keys[i]].change;
                    if (keyChangeType === "ADDED" || keyChangeType === "CHANGED") {
                        changeType = "EXPIRED";
                        break;
                    }
                }
                return changeType;
            }
        }
        else {
            return "NOT_SET";
        }
    };

    /**
     * A function to asynchonously get the value of user consent setting stored in secure storage depending
     * on whether the user has given consent to data collection.  Null means the user has not been asked.
     * @memberof sap.Usage
     * @function getUserConsent
     * @param {function} successCallback callback to be run if user consent value is successfully found.
     * The value given to the success callback will be either true, false, or null.  True or false indicates
     * the user has given consent or denied consent for usage collection.  Null indicates the usage consent
     * screen has not be shown to the user, so they haven't accepted or denied.
     * @param {function} errorCallback callback to be run if an error occured
     * @example
     * sap.Usage.getUserConsent(successCallback, errorCallback);
     */
    this.getUserConsent = function(successCallback, errorCallback) {
        if (!errorCallback) {
            // The logon plugin checks the error callback to make sure it is a function so we can't pass undefined.
            errorCallback = function(){};
        }

        var usageConsentPropertyHandler = function(consentedPolicies) {
            var currentPolicies = getPrivacyPolicies();
            var userConsent = getUserConsentState(currentPolicies, consentedPolicies);

            if (userConsent === "ACCEPTED") {
                if (currentPolicies.length < consentedPolicies.length) { // Only change was removing policies
                    sap.Usage.setUserConsent(true, function() {
                            if (successCallback) {
                                successCallback(true);
                            }
                        });
                }
                else {
                    if (successCallback) {
                        successCallback(true);
                    }
                }
            }
            else if (userConsent === "DECLINED") {
                if (successCallback) {
                    successCallback(false);
                }
            }
            else {
                if (successCallback) {
                    successCallback(null);
                }
            }
        }

        sap.Logon.get(usageConsentPropertyHandler, errorCallback, "KapselUsageConsentProperty");
    };

    /**
     * Sets a variable in localStorage regarding whether a particular user has given consent to data collection.
     * If a value of false is sent by the user, the Usage database is destroyed to ensure that data collection
     * stops as soon as user opts out of having their usage data collected
     * Note the user parameter here is used as a key for local storage, so it is assumed that all user keys.
     * @memberof sap.Usage
     * @function setUserConsent
     * @param {boolean} value sets the user consent value to true / false
     * @param {function} callback callbacks to be run after setUserContent succeeded
     * @example
     * sap.Usage.setUserConsent(true, callback);
     */
    this.setUserConsent = function(userConsentValue, callback) {
        sendUserPermissionToServer = true;
        var consentValue = userConsentValue ? getPrivacyPolicies() : [];

        var callbackCount = 0;
        // We only want to call callback when both values are saved.  callbackCheck ensures this.
        var callbackChecker = function() {
            callbackCount++;
            if (callbackCount >= 2) {
                callback();
            }
        };

        sap.Logon.core.setSecureStoreObject(callbackChecker,
            function (error) {
                console.log(error);
            },
            "sendUserPermissionToServer", true);
        sap.Logon.core.setSecureStoreObject(callbackChecker,
            function (error) {
                console.log(error);
            },
            "KapselUsageConsentProperty", consentValue);

        if (!userConsentValue) {
            sap.Usage.isInitialized(function(result) {
                console.log("Usage initialization status" + result);
                if (result) {
                    var destroyUsage = function() {
                        sap.Usage.destroy(function(result) {
                            console.log("Usage data deleted from client");
                        }, function(error){
                            console.log("error deleting usage: " + JSON.stringify(error));
                        });
                    }
                    sap.Usage.log("userCollectionPermission", {"i_result":"false"}, "permission", function(){
                        exec(destroyUsage, destroyUsage, "Usage", "uploadReport", []);
                    }, function(error){
                        console.log("error logging user collection permission: " + JSON.stringify(error));
                    });
                }
            }, function(error) {
                console.log("Error: Problem checking if usage is initialized.");
                console.log(error);
            });
        }
    };

    /**
     * Generates a pre-made dialog box which asks the user for consent to data collection. The result is automatically stored.
     * @memberof sap.Usage
     * @function showConsentDialog
     * @param {function} consentCallback callback to be run after the user clicks either "Allow" or "Deny"
     * @example
     * sap.Usage.showConsentDialog(consentCallback);
     */
    this.showConsentDialog = function(consentCallback) {
        var data = {callbackCount: 0};

        loadAdditionalPrivacyPolicies(
            function() {
                data.currentPolicies = getPrivacyPolicies();
                setupConsentDialog();
            },
            function() {
                data.currentPolicies = getPrivacyPolicies();
                setupConsentDialog();
            });

        sap.Logon.get(
            function(value) {
                if (value && value.constructor === Array) {
                    data.consentedPolicies = value;
                }
                else {
                    data.consentedPolicies = [];
                }
                setupConsentDialog();
            },
            function (error) {
                cc("Failed to retrieve consent value.");
                data.consentedPolicies = [];
                setupConsentDialog();
            }, "KapselUsageConsentProperty");

        function setupConsentDialog() {
            data.callbackCount++;
            if (data.callbackCount !== 2) {
                return;
            }

            var consentedPolicies = data.consentedPolicies;
            var currentPolicies = data.currentPolicies;
            var userConsentState = getUserConsentState(currentPolicies, consentedPolicies);
            var policyChanges = getPrivacyPolicyChanges(currentPolicies, consentedPolicies);
            for (var i = 0; i < currentPolicies.length; i++) {
                currentPolicies[i].change = policyChanges[currentPolicies[i].id].change;
            }

            var screenEvents = {};
            var showUsagePermissionScreenAgain = function() {
                sap.logon.LogonJsView.showScreen("SCR_ASK_USAGE_COLLECTION_PERMISSION", screenEvents, screenData, "usagePermission");
                document.removeEventListener('usageGause', showUsagePermissionScreenAgain);
            };
            var screenData = {
                "currentUsagePermission": userConsentState === "ACCEPTED",
                "privacyPolicies": currentPolicies
            };

            screenEvents.onsubmit = function (result) {
                sap.logon.LogonJsView.close(function () { }, true, "usagePermission");
                sap.Usage.setUserConsent(result.isPermissionGranted, consentCallback);
                if (cordova.require("cordova/platform").id == "windows" && typeof fireEvent !== "undefined" && fireEvent != null) {
                    fireEvent("consentpagefinished");
                }
            };
            screenEvents.oncancel = function() {
                sap.logon.LogonJsView.close(consentCallback, true, "usagePermission");
            };
            screenEvents.onlearnmore = function(policyNum) {
                var policyUrl = null;
                if (typeof policyNum === 'undefined') { // Legacy behaviour
                    cc("On Learn More called with undefined policy number.");
                    policyUrl = sap.Usage.getSapPrivacyPolicy().url;
                }
                else { // Multiple policies
                    policyUrl = screenData.privacyPolicies[policyNum].url;
                    screenData.privacyPolicies[policyNum].read = true;
                }
                if (cordova.require("cordova/platform").id == "ios" || cordova.require("cordova/platform").id == "windows") {
                    cordova.InAppBrowser.open(policyUrl, "_system");
                }
                else {
                    sap.logon.LogonJsView.close(function() {
                            cordova.InAppBrowser.open(policyUrl, "_system");
                            document.addEventListener('usageGause', showUsagePermissionScreenAgain);
                        }, true, "usagePermission");
                }
            };
            sap.logon.LogonJsView.showScreen("SCR_ASK_USAGE_COLLECTION_PERMISSION", screenEvents, screenData, "usagePermission");
        }
    };

    /**
     * @constructor sap.Usage.InfoType
     * @memberof sap.Usage
     * @example
     * sap.Usage.InfoType();
     */
    this.InfoType = function() {
        var i_screen, i_view, i_element, i_action, i_behavior, i_case, i_type, i_category, i_result, i_unit, i_measurement, i_value;

        /**
         * Set a value to the i_screen variable.
         * @memberof sap.Usage.InfoType
         * @function setScreen
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setScreen("main_window");
         */
        this.setScreen = function(value) {
            this.i_screen = value;
            return this;
        };

        /**
         * Set a value to the i_view variable.
         * @memberof sap.Usage.InfoType
         * @function setView
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setView("main_view");
         */
        this.setView = function(value) {
            this.i_view = value;
            return this;
        };

        /**
         *Set a value to the i_element variable.
         * @memberof sap.Usage.InfoType
         * @function setElement
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setElement("button");
         */
        this.setElement = function(value) {
            this.i_element = value;
            return this;
        };

        /**
         * Set a value to the i_action variable.
         * @memberof sap.Usage.InfoType
         * @function setAction
         * @instance
         * @param {String} new value.
         * @example
         *sap.Usage.InfoType.setAction("button pressed");
         */
        this.setAction = function(value) {
            this.i_action = value;
            return this;
        };

        /**
         * Set a value to the i_behavior variable.
         * @memberof sap.Usage.InfoType
         * @function setBehavior
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setBehavior("friendly");
         */
        this.setBehavior = function(value) {
            this.i_behavior = value;
            return this;
        };

        /**
         * Set a value to the i_case variable.
         * @memberof sap.Usage.InfoType
         * @function setCase
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setCase("first case");
         */
        this.setCase = function(value) {
            this.i_case = value;
            return this;
        };

        /**
         * Set a value to the i_type variable.
         * @memberof sap.Usage.InfoType
         * @function setType
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setType("custom");
         */
        this.setType = function(value) {
            this.i_type = value;
            return this;
        };

        /**
         * Set a value to the i_category variable.
         * @memberof sap.Usage.InfoType
         * @function setCategory
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setCategory("unknown");
         */
        this.setCategory = function(value) {
            this.i_category = value;
            return this;
        };

        /**
         * Set a value to the i_result variable.
         * @memberof sap.Usage.InfoType
         * @function setResult
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setResult("1234");
         */
        this.setResult = function(value) {
            this.i_result = value;
            return this;
        };
        /**
         *Set a value to the i_unit variable.
         * @memberof sap.Usage.InfoType
         * @function setUnit
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setUnit("IS");
         */
        this.setUnit = function(value) {
            this.i_action = value;
            return this;
        };
        /**
         * Set a value to the i_measurement variable.
         * @memberof sap.Usage.InfoType
         * @function setMeasurement
         * @instance
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setMeasurement("main_window");
         */
        this.setMeasurement = function(value) {
            this.i_measurement = value;
            return this;
        };
        /**
         * Set a value to the i_value variable.
         * @memberof sap.Usage.InfoType
         * @function setValue
         * @param {String} new value.
         * @example
         * sap.Usage.InfoType.setValue("main_window");
         */
        this.setValue = function(value) {
            this.i_value = value;
            return this;
        };
    };
};

reportUndefinedTimerKey = function(errorCallback) {
    errorCallback("Timer key must be not null.");
};

reportUndefinedTimerID = function(errorCallback) {
    errorCallback("Timer ID must be not null.");
};

var isToolbarSupported = function() {
    if (typeof sap === "undefined" || typeof sap.Toolbar === "undefined") {
        console.log("Toolbar is not supported");
        return false;
    }
    return true;
};

var usageInitialization = function() {
    // Used by the SAP LOGON events, passing the registration object as argument
    var eventListener = function() {
        var registrationObj;
        try {
            registrationObj = arguments[0].detail.args[0];
        }
        catch (e) {
            cc("No registration object in onSapLogonSuccess event");
            return;
        }

        var prepareForInit = function(registrationObj, successCallback, errorCallback) {
            if (typeof successCallback === "undefined") successCallback = function() {};
            if (typeof errorCallback === "undefined") errorCallback = function() {
                if (arguments.length > 0) {
                    cc(JSON.stringify(arguments));
                } else {
                    cc("Error during Usage initialization");
                }
            };
            if (typeof registrationObj !== "object") {
                errorCallback("Invalid registration object type: " + typeof registrationObj);
                return;
            }
            if (typeof registrationObj.registrationContext === "undefined" || registrationObj.registrationContext.serverHost === "undefined") {
                errorCallback("Invalid registration object");
                return;
            }

            var usageIsEnabled = function() {

                var getState = function() {

                    var dataVauiltUnlock = function() {
                        sap.logon.Core.unlockSecureStore(
                            function(context, state) {
                                dvIsOpen();
                            },
                            function(error) {
                                console.log("An error occurred during unlockSecureStore: " + JSON.stringify(error));
                                errorCallback(error);
                            }, {
                                // TODO: What will be the passcode?
                                unlockPasscode: 'unlockPasscode'
                            }
                        );
                    };

                    var dvIsOpen = function() {
                        var keyUsageEncryptionKey = "usageEncryptionKey";

                        var usageInit = function(encryptionKey) {
                            var host = registrationObj.registrationContext.serverHost;
                            var port = registrationObj.registrationContext.serverPort ? ":" + registrationObj.registrationContext.serverPort : "";
                            var prot = registrationObj.registrationContext.https ? 'https' : 'http';
                            var path = (registrationObj.registrationContext.resourcePath ? registrationObj.registrationContext.resourcePath : "") + (registrationObj.registrationContext.farmId ? "/" + registrationObj.registrationContext.farmId : "") + '/clientusage';
                            var uploadUrl = prot + '://' + host + port + path;
                            var timeFor3GUpload = 3;

                            var doHttpsConversionIfNeeded = function(url, callback) {
                                if (device.platform.toLowerCase().indexOf("android") >= 0) {
                                    sap.AuthProxy.isInterceptingRequests(function(isInterceptingRequests) {
                                        if (isInterceptingRequests && url.toLowerCase().indexOf("https") === 0) {
                                            // Since AuthProxy is intercepting the request, make sure it is sent initially with http.
                                            // When AuthProxy sends the request over the network, it will be converted to https
                                            // (since we are calling the addHTTPSConversionHost function with the fiori URL).
                                            var splitArray = url.split('://');
                                            splitArray.shift();
                                            url = "http://" + splitArray.join('://');
                                            httpsConversionInEffect = true;
                                            sap.AuthProxy.addHTTPSConversionHost(function() {
                                                callback(url);
                                            }, function() {
                                                callback(url);
                                            }, url);
                                        } else {
                                            httpsConversionInEffect = false;
                                            callback(url);
                                        }
                                    });
                                } else {
                                    callback(url);
                                }
                            };

                            doHttpsConversionIfNeeded(uploadUrl, function(uploadEndpoint) {
                                //
                                // Prepare-flow end
                                //
                                console.log("fioriclient.js handleUsage() sap.Usage.init(" + uploadEndpoint + ")");
                                successCallback(uploadEndpoint, encryptionKey, timeFor3GUpload);
                            });
                        };

                        var gotEncryptionKey = function(encryptionKey) {
                            sap.Usage.checkExistence(
                                function(exists) {
                                    if (exists) {
                                        sap.Usage.destroy(
                                            function() {
                                                usageInit(encryptionKey);
                                            },
                                            function(error) {
                                                console.log("An error occurred during destroy: " + JSON.stringify(error));
                                                errorCallback(error);
                                            }
                                        );
                                    } else {
                                        usageInit(encryptionKey);
                                    }
                                },
                                function(error) {
                                    console.log("An error occurred during checkExistence: " + JSON.stringify(error));
                                    errorCallback(error);
                                }
                            );
                        };

                        sap.logon.Core.getSecureStoreObject(
                            function(encryptionKey) {
                                if (!encryptionKey && cordova.platformId.toLowerCase() !== "windows") {
                                    cordova.exec(function(encryptionKey) {
                                        sap.logon.Core.setSecureStoreObject(
                                            function() {
                                                gotEncryptionKey(encryptionKey);
                                            },
                                            function(error) {
                                                console.log("An error occurred during setSecureStoreObject: " + JSON.stringify(error));
                                                errorCallback(error);
                                            },
                                            keyUsageEncryptionKey,
                                            encryptionKey
                                        );
                                    }, errorCallback, "Usage", "getRandomBytes", []);
                                } else {
                                    usageInit(encryptionKey);
                                }
                            },
                            function(error) {
                                console.log("An error occurred during getSecureStoreObject: " + JSON.stringify(error));
                                errorCallback(error);
                            },
                            keyUsageEncryptionKey
                        );
                    };

                    sap.logon.Core.getState(
                        function(state) {
                            if (state.secureStoreOpen) {
                                dvIsOpen();
                            } else {
                                // datavault unlock
                                dataVauiltUnlock();
                            }
                        },
                        function(error) {
                            // it can happen only if sap.logon.Core is not initialized
                            // error = {code:2, domain: "MAFLogonCoreCDVPlugin"}
                            console.log("An error occurred during get state from store: " + JSON.stringify(error));
                            errorCallback(error);
                        }
                    );
                };

                module.exports.isInitialized(
                    function(initialized) {
                        if (!initialized) {
                            getState();
                        } else {
                            // Usage is already initialized
                            successCallback(true);
                        }
                    },
                    function(error) {
                        console.log("Error occurred at sap.Usage.isInitialized: " + JSON.stringify(error));
                        errorCallback(error);
                    }
                );
            };

            var usageIsEnabledOnServerCallback = function() {
                var firstPromptCallback = function(consentVal) {
                    usageIsEnabled();
                }
                sap.Usage.getUserConsent(
                    function (value) {
                        if (value != null) {
                            usageIsEnabled();
                        } else if (typeof sap.FioriClient == "undefined") {
                            sap.Usage.showConsentDialog(firstPromptCallback);
                        }
                    },
                    function (error) {
                        // Empty
                    }
                );
                sap.Logon.core.setSecureStoreObject(function(){}, function(){}, "usageIsEnabledOnServer", true);
            }

            sap.Settings.getConfigProperty(
                function(enable) {
                    usageIsEnabledOnServer = enable;

                    if (enable) {
                        usageIsEnabledOnServerCallback();
                    } else {
                        // Usage is not enabled
                        successCallback(false);
                        sap.Logon.core.setSecureStoreObject(function(){}, function(){}, "usageIsEnabledOnServer", false);
                    }
                },
                function(error) {
                    sap.Logger.error("Failed to get setting. Status code" + error.statusCode + " text: " + error.statusText + "\nUsing previously stored value.");
                    sap.Logon.core.getSecureStoreObject(function(enable){
                        if (enable) {
                            usageIsEnabledOnServerCallback();
                        } else {
                            // Usage is not enabled
                            successCallback(false);
                        }
                    }, function() {
                        errorCallback(error);
                    }, "usageIsEnabledOnServer");
                },
                "CollectClientUsageReports"
            );
        };

        var fireUsageReadyEvent = function(eventId, args) {
            if (typeof eventId === 'string') {
                if (!window.CustomEvent) {
                    window.CustomEvent = function(type, eventInitDict) {
                        var newEvent = document.createEvent('CustomEvent');
                        newEvent.initCustomEvent(type,
                                !!(eventInitDict && eventInitDict.bubbles), 
                                !!(eventInitDict && eventInitDict.cancelable), 
                                (eventInitDict ? eventInitDict.detail : null));
                        return newEvent;
                    };
                }

                /* Windows8 changes */
                if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                    WinJS.Application.queueEvent({
                            type: eventId,
                            detail: {
                                'id': eventId,
                                'args': args
                            }
                        });
                }
                else {
                    var event = new CustomEvent(eventId, {
                            'detail': {
                                'id': eventId,
                                'args': args
                            }
                        });
                    setTimeout(function() {
                            document.dispatchEvent(event);
                        }, 0);
                }
            }
            else {
                throw 'Invalid eventId: ' + typeof eventId;
            }
        };

        var onInitSuccess = function() {
            if (isToolbarSupported()) {
                sap.Toolbar.enableUsage('com.sap.sdk.kapsel.fioriclient');
            }
            fireUsageReadyEvent("onUsageInitialized", true);
        };

        var onInitFailure = function() {
            cc("Usage init error: " + JSON.stringify(arguments));
            fireUsageReadyEvent("onUsageInitialized", false);
        };

        var prepareForInitDone = function() {
            var uploadEndpoint = arguments[0],
                encryptionKey = arguments[1],
                timeFor3GUpload = arguments[2];

            if (arguments.length === 0) {
                cc("Error: Prepare for init returned no arguments");
                return;
            }

            if (typeof arguments[0] === "boolean") {
                if (arguments[0]) {
                    onInitSuccess();
                }
                else {
                    onInitFailure();
                }
                return;
            }

            if (arguments.length !== 3) {
                cc("Wrong set of arguments for usage init! " + JSON.stringify(arguments));
                return;
            }

            // sap.Usage.init
            module.exports.init(uploadEndpoint, encryptionKey, timeFor3GUpload,
                onInitSuccess, onInitFailure);
        };


        var doPrepare = function() {
            prepareForInit(registrationObj, prepareForInitDone, onInitFailure);
        };
        sap.Usage.loadAdditionalPrivacyPolicies(doPrepare, doPrepare);

    };

    return {
        eventListener: eventListener
    };

}();
module.exports = new Usage();

/**
 * Error callback upon initialization error
 *
 * Error codes:
 * already_initialized
 *
 * @callback sap.Usage.initErrorCb
 * @param {String} errorCode the initialization error
 * @param {String=} extra information associated with the error
 */

/**
 * Initialization event
 *
 * @callback sap.Usage.onInitializedEvent
 * @param {CustomEvent} initialized contains property initialized.detail.args which is true if the Usage initialization was successful, false otherwise
 * @example
 * document.addEventListener('onUsageInitialized', function(initialized) {
 *     if (initialized.detail.args)
 *         console.log('Usage is initialized');
 *     else
 *         console.log('Usage is not initialized');
 * });
 */
 