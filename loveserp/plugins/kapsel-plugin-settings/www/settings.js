// 3.15.8
var exec = require("cordova/exec");


/**
 * Provides settings exchange functionality. See also <a href="sap.AppSettings.html">AppSettings</a>.
 *
 * @namespace
 * @alias Settings
 * @memberof sap
 */
var SettingsExchange = function () {};

SettingsExchange.prototype.connectionData   = null;
SettingsExchange.prototype.store            = null;
SettingsExchange.prototype.settingsSuccess  = null;
SettingsExchange.prototype.SettingsError    = null;
SettingsExchange.prototype.isInitialized    = false;


/**
 * Starts the settings exchange process upon onSapLogonSuccess event.
 * @private
 * @param {boolean} [forceUpdate] true if the current logon credentials should be updated.
 */
var doSettingExchange = function(forceUpdate) {
    if (typeof forceUpdate === 'undefined') {
        forceUpdate = false;
    }

    sap.Settings.isInitialized = true;
    var pd = "";

    var connectionInfoSuccess = function(connectionInfo) {
        if (typeof connectionInfo["registrationContext"] === 'undefined') {
            // If registrationContext is not defined, we should assume that an SMP registration
            // did not actually occur. This can happen if the resume event occurs while the
            // app is not registered to SMP.
            return;
        }
        var userName = connectionInfo["registrationContext"]["user"];
        var password = connectionInfo["registrationContext"]["password"];
        var applicationConnectionId = connectionInfo["applicationConnectionId"];
        var securityConfig = connectionInfo["registrationContext"]["securityConfig"];
        var endpoint = connectionInfo["applicationEndpointURL"];
        if (endpoint) {
            var keySSLEnabled = "false";
            var splitendpoint = endpoint.split("/");
            if (splitendpoint[0] == "https:") {
                keySSLEnabled = "true";
            }
            if (securityConfig == null) {
                securityConfig = "";
            }
            var burl = "";
            for (var i = 2; i < splitendpoint.length - 2; i++) {
                burl += splitendpoint[i] + "/";
            }
            burl += splitendpoint[splitendpoint.length - 2];
            var appId = splitendpoint[splitendpoint.length - 1];
            pd = appId + userName + password;
            connectionData = {
                "keyMAFLogonOperationContextConnectionData": {
                    "keyMAFLogonConnectionDataApplicationSettings": {
                        "DeviceType": device.platform,
                        "DeviceModel": device.model,
                        "ApplicationConnectionId": applicationConnectionId
                    },
                    "keyMAFLogonConnectionDataBaseURL": burl
                },
                "keyMAFLogonOperationContextApplicationId": appId,
                "keyMAFLogonOperationContextBackendUserName": userName,
                "keyMAFLogonOperationContextBackendPassword": password,
                "keyMAFLogonOperationContextSecurityConfig": securityConfig,
                "keySSLEnabled": keySSLEnabled
            };
            sap.Settings.start(connectionData,
                function(mesg) {
                    sap.Settings.isInitialized = true;
                    sap.Logger.debug("Setting Exchange is successful " + mesg, "SMP_SETTINGS_JS", function(m){}, function(m){});
                },
                function(mesg) {
                    sap.Settings.isInitialized = false;
                    sap.Logger.debug("Setting Exchange failed" + mesg, "SMP_SETTINGS_JS", function(m){}, function(m){});
                });
            sap.Settings.initNoLoadPolicy();
        }
    };
    var connectionInfoError = function() {
        sap.Logger.debug("unlock failed ", "SMP_SETTINGS_JS", function(m){}, function(m){});
    };

    sap.Settings.clearCache();
    sap.Settings.getConnectionInfo(connectionInfoSuccess, connectionInfoError, forceUpdate);
};

var normalSettingExchange = function() {
    doSettingExchange(false);
};
var forceCheckSettingExchange = function() {
    doSettingExchange(true);
};

if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
    WinJS.Application.addEventListener("onSapLogonSuccess", normalSettingExchange, false);
    WinJS.Application.addEventListener("onSapResumeSuccess", normalSettingExchange, false);
    WinJS.Application.addEventListener("onSMPPasswordChanged", forceCheckSettingExchange, false);
} else {
    document.addEventListener("onSapLogonSuccess", normalSettingExchange, false);
    document.addEventListener("onSapResumeSuccess", normalSettingExchange, false);
    document.addEventListener("onSMPPasswordChanged", forceCheckSettingExchange, false);
}

/**
 * This function will return the connection information from the server in the first call.
 * In the subsequent call, the existing connection information will be used, unless a credential update is forced.
 * @public
 * @param {function} connectionInfoCallback A function that will be called with an info object as the parameter.
 * @param {function} errorCallback A function that will be called with the error object.
 * @param {boolean} forceUpdate True if a credential update should be performed. False if using the existing connection information is allowed.
 */
SettingsExchange.prototype.getConnectionInfo = function(connectionInfoCallback, errorCallback, forceUpdate) {
    var updateCredentials = function(connectionInfo) {
        exec(function() {
                connectionInfoCallback(connectionInfo);
            },
            function(){},
            "SMPSettingsExchangePlugin", "setConnectionInfo", [connectionInfo]);
    };

    if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
        sap.Logon.unlock(function(connectionInfo) {
                connectionInfoCallback(connectionInfo);
            });
    }
    else {
        if (forceUpdate) {
            sap.Logon.unlock(updateCredentials);
        }
        else {
            exec(function(connectionInfo) {
                    connectionInfoCallback(connectionInfo);
                },
                function() {
                    sap.Logon.unlock(updateCredentials);
                },
                "SMPSettingsExchangePlugin", "getConnectionInfo" , []);
        }
    }
};

SettingsExchange.prototype.reset = function(key, sucessCB, errorCB)
{
    if ((typeof(sap.Settings.store) != undefined) && (sap.Settings.store != null)) {
        sap.Settings.store.removeItem(key, sucessCB, errorCB);
    } else {
        errorCB("Cannot access setting store");
    }
}

SettingsExchange.prototype.updateDeviceToken = function(devtoken) {
    var updateVals = "";
    if (device.platform == "Android") {
      updateVals = {"AndroidGcmPushEnabled":true,AndroidGcmRegistrationId:devtoken};
    }
    else if (device.platform == "iPhone" || device.platform == "iPad" || device.platform == "iPod touch" || device.platform == "iOS") {
                    updateVals = {"ApnsPushEnable":true,ApnsDeviceToken:devtoken};
    }
    sap.Settings.setConfigProperty(updateVals,function(){}, function(){});
}


/**
 * Starts the settings exchange.
 * @public
 * @memberof sap.Settings
 * @method start
 * @param {String} connectionData This example below shows the structure of the connection data.
 * @param {function} successCallback Function to invoke if the exchange is successful.
 * @param {function} errorCallback Function to invoke if the exchange failed.
 * @example
 * connectionData = {
 *      "keyMAFLogonOperationContextConnectionData": {
 *      "keyMAFLogonConnectionDataApplicationSettings":
 *      {
 *      "DeviceType":device.platform,
 *      "DeviceModel":device.model,
 *      "ApplicationConnectionId":"yourappconnectionid"
 *      },
 *      "keyMAFLogonConnectionDataBaseURL":"servername:port"
 *  },
 *  "keyMAFLogonOperationContextApplicationId":"yourapplicationid",
 *  "keyMAFLogonOperationContextBackendUserName":"yourusername",
 *  "keyMAFLogonOperationContextBackendPassword":"password",
 *  "keyMAFLogonOperationContextSecurityConfig":"securityConfigName",
 *  "keySSLEnabled":keySSLEnabled
 *  };
 * sap.Settings.start(connectionData, function(mesg) {
 *                                    
 *                                         sap.Logger.debug("Setting Exchange is successful "+mesg,"SMP_SETTINGS_JS",function(m){},function(m){});
 *                                     },
 *                                    function(mesg){
 *                                        sap.Logger.debug("Setting Exchange failed" + mesg,"SMP_SETTINGS_JS",function(m){},function(m){});
 *                                    });
 */
SettingsExchange.prototype.start = function (connectionData, successCallback, errorCallback) {
    sap.Settings.settingsSuccess = successCallback;
    sap.Settings.SettingsError = errorCallback;
    sap.Settings.connectionData = connectionData;
    sap.Logger.debug("Accessing the data from vault","SMP_SETTINGS_JS",function(m){},function(m){});
    sap.logon.Core.getSecureStoreObject( sap.Settings.getStoreDataSuccess, sap.Settings.getStoreDataError, "settingsdata");
    
    
};

/**
 * This function return true if the feature is allowed and false if feature is not permitted.
 * @public
 * @memberof sap.Settings
 * @method isFeatureEnabled
 * @param {String} name Name of the feature to fetch.
 * @param {function} successCallback Function to invoke if the exchange is successful.
 * @param {function} errorCallback Function to invoke if the exchange failed.
 **/            
SettingsExchange.prototype.isFeatureEnabled = function (name, successCallback, errorCallback) {
    var setFeatureEnabledValueCallback = function()
    {
         var callGetFeatureForName = function() {
             sap.Settings.getFeatureForName(function (feature) {
                    if (feature == null) {
                            successCallback(true);
                    } else {
                        successCallback(false);
                    }
                },
                function () {
                     errorCallback();
                }, name);
            }

        // The logon plugin must be initialized before callGetFeatureForName
            if (sap.logon.Core.isInitialized()) {
                    callGetFeatureForName();
            } else {
                    var logonSuccessCallback = function() {
                        document.removeEventListener("onSapLogonSuccess", logonSuccessCallback);
                        callGetFeatureForName();
                    }
            // The logon plugin has not been initialized yet, wait for it to be.
                    document.addEventListener("onSapLogonSuccess", logonSuccessCallback);
            }
    };
    
    if (!name) {
        successCallback(false);
    } else {
       if (sap.AppPreferences != undefined) {
        sap.AppPreferences.getPreferenceValue('fioriURLIsSMP',
           function(isSMP){
                if (isSMP == false) //It is not an SMP based app so there is no need to check
                {
                     successCallback(true);
                } else {
        
                setFeatureEnabledValueCallback();
          }
          },
          function(){});
         } else {
        setFeatureEnabledValueCallback();
     }
    }
}





/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function gets called after the start function is able to read the current settings from the secured storage.
 *  @private
 *  @param {String} value This is the value of the current setting exchange stored in the secured store.
 **/

SettingsExchange.prototype.getStoreDataSuccess  = function(value){
    storedSettings = value;
    sap.Logger.debug("Exchanging the data","SMP_SETTINGS_JS",function(m){},function(m){});
    sap.Settings.startSettings(sap.Settings.SettingsExchangeDone,
         sap.Settings.SettingsExchangeError,
         [JSON.stringify(connectionData),storedSettings]);
    
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the start function is unable to read the current settings from the secured storage.
 *  @private
 *  @param {String} message This is the error message produced by the encrypted storage.
 **/
SettingsExchange.prototype.getStoreDataError  = function(mesage){
    sap.Logger.debug("Setting exchange failed to read data store: Proceeding without data",function(m){},function(m){});
}


/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the settings exchange completes succefully.
 *  @private
 *  @param {String} message This is the  message produced when the settings plugin completes successfully.
 **/

SettingsExchange.prototype.SettingsExchangeDone = function(message) {
    sap.Logger.debug("Setting Exchange Success","SMP_SETTINGS_JS",function(m){},function(m){});
    var jsondata =  JSON.parse(message);
    settingsString = jsondata["data"];
    sap.logon.Core.setSecureStoreObject(sap.Settings.SettingsWriteDone,sap.Settings.SettingsWriteError,"settingsdata",settingsString); 
    if (sap.Settings.settingsSuccess != null) {
        sap.Logger.debug("Setting exchange successful","SMP_SETTINGS_JS",function(m){},function(m){});
        sap.Settings.settingsSuccess("Exchange Completed");
        /* Windows8 changes */
         eventId = "settingsDone";
         if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                WinJS.Application.queueEvent({
                    type: eventId,
                    detail: { 'id': eventId, 'args': "SettingCompleted" }
                });
            }
            else {
                var event = new CustomEvent(eventId, { 'detail': { 'id': eventId, 'args': "SettingCompleted" } });
                setTimeout(function () {
                    document.dispatchEvent(event);
                }, 0);
            }
    }
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the settings exchange completes succefully
 *  @private
 *  @param {String} message This is the error message produced when the settings plugin has an error.
 **/
SettingsExchange.prototype.SettingsExchangeError = function(message) {
    sap.Logger.error("Setting Exchange failed calling the error callback funciton","SMP_SETTINGS_JS",function(m){},function(m){});
    if (sap.Settings.SettingsError != null) {
        sap.Settings.SettingsError("Exchange Failed");
    }
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the setting data is stored successfully.
 *  @private
 *  @param {String} message This is the message produced upon successful storing of settings to the encrypted store.
 **/
SettingsExchange.prototype.SettingsWriteDone  = function(message) {
    sap.Logger.debug("Setting stored","SMP_SETTINGS_JS",function(m){},function(m){});
     sap.Settings.applyFeatureVectorPolicy();
    
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the storing of the setting data fails.
 *  @private
 *  @param {String} message This is the message produced upon failure to store the settings to the encrypted store.
 **/
SettingsExchange.prototype.SettingsWriteError  = function(message) {
    sap.Logger.error("Setting store failed","SMP_SETTINGS_JS",function(m){},function(m){});
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called after the deviceready. This uploads the logs to the server.
 *  @private
 *  @param {boolean} uploadLog This indicates whether the upload log is currently enabled or disbled.
 **/
SettingsExchange.prototype.logLevelUpdated  = function(logLevel)
{
    sap.Logger.setLogLevel(logLevel, sap.Settings.LogLevelSetSuccess, sap.Settings.LogLevelSetFailed);
    sap.Logger.upload(sap.Settings.logUploadedSuccess, sap.Settings.logUploadFailed);
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the log upload succeeds.
 *  @private
 *  @param {mesg} logupload message
 **/
SettingsExchange.prototype.LogLevelSetSuccess = function(mesg){
    sap.Logger.debug("Log level set successful","SMP_SETTINGS_JS",function(m){},function(m){});
}
/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the log upload succeeds.
 *  @private
 *  @param {mesg} logupload message
 **/
SettingsExchange.prototype.LogLevelSetFailed = function(mesg){
    sap.Logger.error("Log level set failed","SMP_SETTINGS_JS",function(m){},function(m){});
}

/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the log upload succeeds.
 *  @private
 *  @param {mesg} logupload message
 **/
SettingsExchange.prototype.logUploadedSuccess = function(mesg){
    sap.Logger.debug("Log upload successful","SMP_SETTINGS_JS",function(m){},function(m){});
}
/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the log upload fails.
 *  @private
 *  @param {mesg} logupload failure message
 **/
SettingsExchange.prototype.logUploadFailed = function(mesg) {
    sap.Logger.error("upload log failed","SMP_SETTINGS_JS",function(m){},function(m){});
    
}
/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the FVplugin is installed.
 *  @private
 *  
 **/

SettingsExchange.prototype.applyFeatureVectorPolicy = function()
{
    sap.Settings.allFeatures(
          function(features) {
			  if (cordova.require("cordova/platform").id.indexOf("windows") == 0) {
				 // Other properties (i.e. plugin id) are also needed on Windows so we should pass the feature vector result as parameter.
				 sap.Settings.invalidateModuleList(function () { }, function () { }, features ? features.results : []);
			  } else if (features) {
                 var featureLength = features.results.length;
                 var jsonData = {};
                 for (i=0; i<featureLength; i++) {
                     jsonData[features.results[i].PluginName] =  [features.results[i].JSModule];
                 }
                 sap.Settings.invalidateModuleList(function(){}, function(){}, jsonData);
             }
           },
           function() {
              console.log("Feature vector policy enforcement failed");
           }
     );
  
}

SettingsExchange.prototype.initNoLoadPolicy = function()
{
   if (sap.AppPreferences != undefined) {
        sap.AppPreferences.getPreferenceValue('fioriURL',
            function(url){
               exec(function(){}, function(){}, "SMPSettingsExchangePlugin", "setFioriURL" , [url]);
            },
            function(){});
    }
               
}


SettingsExchange.prototype.setIdpUrl = function(url, onSuccess, onError)
{
   if (url){
        exec(onSuccess, onError, "SMPSettingsExchangePlugin", "setWhiteList" , [url]);
    }
    else if (sap.AppPreferences != undefined) {
        sap.AppPreferences.getPreferenceValue('idpLogonURL',
               function(url){
                  exec(onSuccess, onError, "SMPSettingsExchangePlugin", "setWhiteList" , [url]);
               },
               onError);
    }

}

/**
     * Function calledinternally to get connection information.
     * @private
     * @memberof sap.Push
     * @function setFormFactor()
     * @example
     * sap.Push.setFormFactor();
     **/
SettingsExchange.prototype.setFormFactor = function() {

   callbackFunc = function(screenSize) {
       var deviceFormFactor = null;
       if (screenSize >= 7) {
          deviceFormFactor = "tablet";
       } else {
          deviceFormFactor = "phone";
       }
       sap.Settings.setConfigProperty({ "FormFactor": deviceFormFactor },
                                                     function () {
                                                     sap.Logger.debug("Device Formfactor Update Successful","SMP_SETTINGS_JS",function(m){},function(m){});
                                                     },
                                                     function () {
                                                     sap.Logger.debug("Device Formfactor Update failed","SMP_SETTINGS_JS",function(m){},function(m){});
                                                     });

   };
   exec(
        callbackFunc,
        function(){ sap.Logger.debug("Plugin Initialization","SMP_SETTINGS_JS",function(m){},function(m){}); } ,
                'SMPSettingsExchangePlugin',
                "getScreenSize",
                []);

}
/**
 *  This is a private function. End user will not use this plugin directly.
 *  This function is called when the FVplugin is installed.
 *  @private
 *  @param {moduleList} list of module to be disabled
 **/

SettingsExchange.prototype.invalidateModuleList = function(successCallback, errorCallback, moduleList)
{
   exec(successCallback, errorCallback, "SMPSettingsExchangePlugin", "invalidateModuleList" , [JSON.stringify(moduleList)]);
}


               

/**
 *  This function enables all types of data (calendar events, addresses, etc.) in text format to be automatically converted into pressable links.
 *  Pressing on an enabled link will open the corresponding application (e.g. pressing on an address will open up the map). Note that this functionality
 *  takes effect only after the screen is reloaded.
 *  <br/><b>Only supported on iOS platform, NOT Android.</b> 
 *  @public
 *  @memberof sap.Settings
 *  @method enableDataLink
 *  @param {function} successCallback Function to invoke if the method is successful.
 *  @param {function} errorCallback Function to invoke if the method failed.
 **/
SettingsExchange.prototype.enableDataLink = function(successCallback, errorCallback)
{
    if (cordova.require("cordova/platform").id === "ios")
    {
        exec(successCallback, errorCallback, "SMPSettingsExchangePlugin","enableDataLink",[] )
    }
        
}

/**
 *  This function disables all types of data (phone numbers, addresses, etc.) in text format to be automatically converted into pressable links, 
 *  effectively leaving them as plain text. This is the default setting upon installation of the Settings plugin. If trying to disable an enabled link,
 *  note that this functionality takes effect only after the screen is reloaded.
 *  <br/><b>Only supported on iOS platform, NOT Android.</b> 
 *  @public
 *  @memberof sap.Settings
 *  @method disableDataLink
 *  @param {function} successCallback Function to invoke if the method is successful.
 *  @param {function} errorCallback Function to invoke if the method failed.
 **/
SettingsExchange.prototype.disableDataLink = function(successCallback, errorCallback)
{
    if (cordova.require("cordova/platform").id === "ios")
    {
        exec(successCallback, errorCallback, "SMPSettingsExchangePlugin","disableDataLink",[] )
    }
    
}

/**
 *  This function invalidates a list of optional plugins if the plugins to be disabled are specified at the feature vector configuration on the server.
 *  This function is called when the user tries to navigate from a whitelisted url to a non-whitelisted url. This is private because an end user will
 *  not use this directly.
 *  <br/><b>Only supported on Windows platform, NOT Android or iOS.</b> 
 *  @private
 *  @memberof sap.Settings
 *  @method invalidatePlugins
 *  @param {function} successCallback Function to invoke if the method is successful.
 *  @param {function} errorCallback Function to invoke if the method failed.
 *  @param {Object} jsonData Data regarding the feature vector list in json format.
 **/
SettingsExchange.prototype.invalidatePlugins = function (successCallback, errorCallback, jsonData) {
    if (cordova.require("cordova/platform").id === "windows") {
        exec(successCallback, errorCallback, "SMPSettingsExchangePlugin", "invalidatePlugins", [jsonData])
    }
}

/**
 *  This function validates a list of optional plugins if the plugins to be enabled are specified at the feature vector configuration on the server.
 *  This function is called when the user tries to navigate from a non-whitelisted url to a whitelisted url. This is private because an end user will
 *  not use this directly.
 *  <br/><b>Only supported on Windows platform, NOT Android or iOS.</b>
 *  @private
 *  @memberof sap.Settings
 *  @method validatePlugins
 *  @param {function} successCallback Function to invoke if the method is successful.
 *  @param {function} errorCallback Function to invoke if the method failed.
 *  @param {Object} jsonData Data regarding the feature vector list in json format.
 **/
SettingsExchange.prototype.validatePlugins = function (successCallback, errorCallback, jsonData) {
    if (cordova.require("cordova/platform").id === "windows") {
        exec(successCallback, errorCallback, "SMPSettingsExchangePlugin", "validatePlugins", [jsonData])
    }
}

/**
 * This function is used to get the whitelisted urls from the settings plugin.
 * This function is used when we are trying to check if the url is allowed to reach the plugins or not.
 * @public but only for windows 
 */
SettingsExchange.prototype.getWhiteList = function (successCallback, errorCallback) {
    if (cordova.require("cordova/platform").id === "windows") {
        exec(successCallback, errorCallback, "SMPSettingsExchangePlugin", "getWhiteList")
    }
}

SettingsExchange.prototype.initWhiteList = function()
{
    var theUrl = null;
    //fix the js exception of undefined variable of fiori_client_appConfig when loading settings plugin from fiori url
    if (window.fiori_client_appConfig && window.fiori_client_appConfig.finalConfig && window.fiori_client_appConfig.finalConfig.noBridgewhitelist) {
        var whitelistlength = window.fiori_client_appConfig.finalConfig.noBridgewhitelist.length;
        for (var i=0; i< whitelistlength; i++)
        {
          theUrl = window.fiori_client_appConfig.finalConfig.noBridgewhitelist[i];
                   exec(function(){}, function(){}, "SMPSettingsExchangePlugin", "setWhiteList" , [theUrl]);
        }
    } else {
       if (typeof(sap.AppPreferences) != 'undefined') {
               sap.AppPreferences.getPreferenceValue('noBridgewhitelist',
               function(whitelist){
                   if ((typeof(whitelist) != 'undefined') && (whitelist != null) && (whitelist.length > 0))
                   {
                  
                       var whitelistArray = null;
                       if (typeof(whitelist) == 'string')
                       {
                         whitelistArray = JSON.parse(whitelist);
                       } else if (typeof(whitelist) == 'object')
                       {
                         whitelistArray = whitelist;
                       }
                       var whitelistlength = (whitelistArray != null) ? whitelistArray.length : 0;
                       for (var i=0; i< whitelistlength; i++)
                        {
                          theUrl = whitelistArray[i];
                          exec(function(){}, function(){}, "SMPSettingsExchangePlugin", "setWhiteList" , [theUrl]);
                        }
                    }

                }
                 ,
                 function(){});

       }
    }
}



module.exports = new SettingsExchange();
//The following comment shoud be removed once windows side changes are done
if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
      WinJS.Application.addEventListener("onSapLogonSuccess", module.exports.initWhiteList, false);
      WinJS.Application.addEventListener("onSapResumeSuccess", module.exports.initWhiteList, false);
} else {
      document.addEventListener('onSapLogonSuccess', module.exports.initWhiteList, false);
      document.addEventListener('onSapResumeSuccess', module.exports.initWhiteList, false);
      document.addEventListener('deviceready', function() {
          module.exports.disableDataLink(function(m) {
              sap.Logger.debug("Data Link disabled by default","SMP_SETTINGS_JS",function(m){},function(m){});
          }, function(m) {
              sap.Logger.warn("Disabling Data Link failed: "+m,"SMP_SETTINGS_JS",function(m){},function(m){});
          })
      }, false);
}


