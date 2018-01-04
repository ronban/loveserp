    var exec = require('cordova/exec');
    var initialized = false;
    var logonCoreSubInstance = null;
    var firstRegistrationFlag = false;

    /*
    * Handle the background event
    */
    document.addEventListener("pause",
      function(){
        onEvent(
          function() {
            console.log("MAFLogonCoreCDVPlugin: Pause event successfully set.");
          },
          function() {
            console.log("MAFLogonCoreCDVPlugin: Pause event could not be set.");
          },
          "PAUSE"
        );
      },
      false);
               

               var initLogon = function(successCallback, errorCallback, applicationId, credentialProviderID, bIsODataRegistration, passcodePolicy, passcode, context) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in initLogon:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               if (logonCoreSubInstance && logonCoreSubInstance.initLogon){
                    var handled = logonCoreSubInstance.initLogon(successCallback, errorCallback, applicationId, credentialProviderID, bIsODataRegistration, passcodePolicy, passcode, context);
                    if (handled){
                        return;
                    }
               }
               
               var initMethod;
               if (bIsODataRegistration){
                  initMethod = "initWithSecureStoreId";
               }
               else{
                  initMethod = "initWithApplicationId";
               }
               
               //set to null if the provider is empty string or undefined, so native side needs not to validate all cases.
               if (!credentialProviderID){
                    credentialProviderID = null;
               }
               
               return exec(
                           function(certificateSet){
                           initialized = true;
                           successCallback(certificateSet);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           initMethod,
                           [applicationId, credentialProviderID, passcodePolicy, passcode, context]);
               };
               

               var getState = function(successCallback, errorCallback) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in getState:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               if (logonCoreSubInstance && logonCoreSubInstance.getState){
                    var handled = logonCoreSubInstance.getState(successCallback, errorCallback);
                    if (handled){
                        return;
                    }
               }
               
               return exec(
                           function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "getState",
                           []);
               };
               

               var getContext = function(successCallback, errorCallback) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in getContext:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
                 
               if (logonCoreSubInstance && logonCoreSubInstance.getContext){
                    var handled = logonCoreSubInstance.getContext(successCallback, errorCallback);
                    if (handled){
                        return;
                    }
               }

               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "getContext",
                           []);
               };


               var setUserCreationPolicy = function(successCallback, errorCallback, userCreationPolicy, appId, registrationContext, certificateProviderID, context) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in setUserCreationPolicy:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                               if (success){
                                successCallback(success.context, success.state);
                 }
                 else{
                   successCallback();
                 }
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setUserCreationPolicy",
                           [userCreationPolicy, appId, registrationContext, certificateProviderID, context]);
               };

               var isRegistered = function(successCallback, errorCallback, appId, context) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in isRegistered:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               if (logonCoreSubInstance && logonCoreSubInstance.isRegistered){
                            var handled = logonCoreSubInstance.isRegistered(successCallback, errorCallback);
                            if (handled){
                                return;
                            }
               }

               return exec(
                           function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "isRegistered",
                           [appId, context]);
               };
               
               

               var hasSecureStore = function(successCallback, errorCallback, appId) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                   throw ('Invalid parameters in isRegistered:' +
                          '\nsuccessCallback: ' + typeof successCallback +
                          '\nerrorCallback: ' + typeof errorCallback);
               }

                if (logonCoreSubInstance && logonCoreSubInstance.hasSecureStore){
                    var handled = logonCoreSubInstance.hasSecureStore(successCallback, errorCallback);
                    if (handled){
                        return;
                    }
                }
               
               return exec(
                           function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "hasSecureStore",
                           [appId]);
               };

               var startRegistration = function(successCallback, errorCallback, context) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof context !== 'object') {
               throw ('Invalid parameters in startRegistration:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\ncontext: ' + typeof context);
               }
               
               var input = JSON.stringify(context);
               
               return exec(
                           function(success){
                           firstRegistrationFlag = true;
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           firstRegistrationFlag = true;
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "registerWithContext",
                           [input]);
               };
               

               var cancelRegistration = function(successCallback, errorCallback) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in cancelRegistration:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "cancelRegistration",
                           []);
               };
               
               

               var createSecureStore = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in createSecureStore:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               var JSONLogonContext = JSON.stringify(param);
               
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "createSecureStore",
                           [JSONLogonContext]);
               };

               

               var persistRegistration = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in persistRegistration:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               var JSONLogonContext = JSON.stringify(param);
               
               return exec(
                           function(success){
                           sap.Logon.fireEvent("sapLogonRegistered", [JSONLogonContext]);
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "persistRegistration",
                           [JSONLogonContext]);
               };
               

               var deleteRegistration = function(successCallback, errorCallback) {
               
                    var doTheDelete = function() {
                        if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                        throw ('Invalid parameters in deleteRegistration:' +
                                '\nsuccessCallback: ' + typeof successCallback +
                                '\nerrorCallback: ' + typeof errorCallback);
                       }

                        return exec(
                                function(success){
                                    initialized = false;
                                    sap.Logon.onDeleteRegistrationFinished();
                                    if (logonCoreSubInstance && logonCoreSubInstance.onDeleteRegistrationFinished){
                                        logonCoreSubInstance.onDeleteRegistrationFinished();
                                    }
                                    successCallback(success.context, success.state);
                                },
                                function(error){
                                    errorCallback(error);
                                },
                                "MAFLogonCoreCDVPluginJS",
                                "deleteRegistration",
                                []);
                    }
                    if (device.platform.toLowerCase().indexOf("android") >= 0) {
                        sap.AuthProxy.stopIntercepting(doTheDelete,doTheDelete);
                    } else {
                        doTheDelete();
                    }
               };
               
               

               var removeDeviceUser = function(successCallback, errorCallback, userId) {
               
                    var doTheDelete = function() {
                        if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                        throw ('Invalid parameters in removeDeviceUser:' +
                                '\nsuccessCallback: ' + typeof successCallback +
                                '\nerrorCallback: ' + typeof errorCallback);
                       }

                        return exec(
                                function(success){
                                    successCallback(success.context, success.state);
                                },
                                function(error){
                                    errorCallback(error);
                                },
                                "MAFLogonCoreCDVPluginJS",
                                "removeDeviceUser",
                                [userId]);
                    }
                    if (device.platform.toLowerCase().indexOf("android") >= 0) {
                        sap.AuthProxy.stopIntercepting(doTheDelete,doTheDelete);
                    } else {
                        doTheDelete();
                    }
               };
               

               var removeAllDeviceUsers = function(successCallback, errorCallback) {
               
                    var doTheDelete = function() {
                        if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                        throw ('Invalid parameters in removeAllDeviceUsers:' +
                                '\nsuccessCallback: ' + typeof successCallback +
                                '\nerrorCallback: ' + typeof errorCallback);
                       }

                        return exec(
                                function(success){
                                    successCallback(success.context, success.state);
                                },
                                function(error){
                                    errorCallback(error);
                                },
                                "MAFLogonCoreCDVPluginJS",
                                "removeAllDeviceUsers",
                                []);
                    }
                    if (device.platform.toLowerCase().indexOf("android") >= 0) {
                        sap.AuthProxy.stopIntercepting(doTheDelete,doTheDelete);
                    } else {
                        doTheDelete();
                    }
               };

               

               var changePasscode = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in changePasscode:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               //if in multiuser mode, the third parameter is the current user id
               var parameters = [param.oldPasscode, param.passcode];
               if (param.multiUser && param.multiUserInfo.currentUser){
                    parameters.push(param.multiUserInfo.currentUser);
               }
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "changePasscode",
                           parameters);
               };
               

               var changePassword = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in changePassword:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               if (logonCoreSubInstance && logonCoreSubInstance.changePassword){
                    var handled = logonCoreSubInstance.changePassword(successCallback, errorCallback, param);
                    if (handled){
                        return;
                    }
               }
               
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "changePassword",
                           [param.newPassword]);
               };
               

               var lockSecureStore = function(successCallback, errorCallback) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in lockSecureStore:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "lockSecureStore",
                           []);
               };
               

               var unlockSecureStore = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in unlockSecureStore:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error, param);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "unlockSecureStore",
                           [param.unlockPasscode]);
               };
               

               var activateSecureStoreForUser = function(successCallback, errorCallback, param) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in unlockSecureStoreForUser:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               return exec(
                           function(success){
                           successCallback(success.context, success.state);
                           },
                           function(error){
                           errorCallback(error, param);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "activateSecureStoreForUser",
                           [param.unlockPasscode, param.currentSelectedUser ? param.currentSelectedUser.deviceUserId : "migration"]);
               };
               

               var deactivateCurrentUser = function(successCallback, errorCallback) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in deactivateCurrentUser:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                                successCallback(success);
                           },
                           function(error){
                                errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "deactivateCurrentUser",
                           []);
               };
               

               var getSecureStoreObject = function(successCallback, errorCallback, key) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in getSecureStoreObject:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }

               if (logonCoreSubInstance && logonCoreSubInstance.getSecureStoreObject){
                    var handled = logonCoreSubInstance.getSecureStoreObject(successCallback, errorCallback, key);
                    if (handled){
                        return;
                    }
               }
               
               return exec(
                           function(success){
                           successCallback(JSON.parse(success));
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "getSecureStoreObject",
                           [key]);
               
               };
               

               var setSecureStoreObject = function(successCallback, errorCallback, key, object) {
               
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in setSecureStoreObject:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               var JSONObject = JSON.stringify(object);
               
                if (logonCoreSubInstance && logonCoreSubInstance.setSecureStoreObject){
                    var handled = logonCoreSubInstance.setSecureStoreObject(successCallback, errorCallback, key, JSONObject);
                    if (handled){
                        return;
                    }
                }

               return exec(
                           function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setSecureStoreObject",
                           [key, JSONObject]);
               };

               var checkServerPasscodePolicyUpdate = function(successCallback, errorCallback) {
                   return exec( function(success){
                                   successCallback(success);
                                 },
                                function(error){
                                   errorCallback(error);
                                },
                                 "MAFLogonCoreCDVPluginJS",
                                              "checkServerPasscodePolicyUpdate",
                                       []);

               };
               

               var setSSOPasscode = function(successCallback, errorCallback, param) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' || typeof param !== 'object') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback +
                      '\nparam: ' + typeof param);
               }
               
               return exec(
                           function(success){
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                           successCallback(success.context, success.state);
                           }
                           else{
                           successCallback(success, null);
                           }
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setSSOPasscode",
                           [param.ssoPasscode]);
               };
               

               var skipClientHub = function(successCallback, errorCallback) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                           
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                           successCallback(success.context, success.state);
                           }
                           else{
                           successCallback(success, null);
                           }
                           
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "skipClientHub",
                           []);
               };
               

               var onEvent = function(successCallback, errorCallback, eventId, context) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                   function(success){
                           
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                           successCallback(success.context, success.state);
                           }
                           else{
                           successCallback(context, null);
                           }
                           
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "onEvent",
                           [eventId]);               
               };
               
               

               var setTimeout = function(successCallback, errorCallback, timeout) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                   function(success){
                           
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                           successCallback(success.context, success.state);
                           }
                           else{
                           successCallback(success, null);
                           }
                           
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setTimeout",
                           [timeout]); 
               };
               

               var getTimeout = function(successCallback, errorCallback) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                   function(success){
                           successCallback(success);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "getTimeout",
                           []);
               };
               

               var setAfariaCredential = function(successCallback, errorCallback, context) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               var input = JSON.stringify(context);
               
               return exec(
                           function(success){
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                           successCallback(success.context, success.state);
                           }
                           else{
                           successCallback(success, null);
                           }                           
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setAfariaCredential",
                           [input]);
               
               };
               
  

               var getCertificateFromProvider = function(successCallback, errorCallback, bForceRenew) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in updateContextWithMCIM:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                           if (typeof success.context !== 'undfined' && typeof success.state !== 'undefined') {
                              successCallback(success.context, success.state);
                           }
                           else{
                              successCallback(success, null);
                           }
                           },
                           function(error){
                              errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "getCertificateFromProvider",
                           [bForceRenew]);
               
               };


               var setParametersForProvider = function(successCallback, errorCallback, parameters) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
               throw ('Invalid parameters in setParametersForProvider:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               //settings is js object
               var jsonParams = JSON.stringify(parameters);
               
               
               return exec(
                           function(success){
                              successCallback(success);
                           },
                           function(error){
                              errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "setParametersForProvider",
                           [jsonParams]);
               
               };
               

           var useAfaria = function(successCallback, errorCallback, parameter) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                    throw ('Invalid parameters in useAfaria:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               return exec(
                           function(success){
                              successCallback(success);
                           },
                           function(error){
                              errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "useAfaria",
                           [parameter]);
               
            };
            
                            

              var startProxy = function(successCallback, errorCallback, proxyID, proxyURL, proxyExcetpionList ) {
               if (typeof successCallback !== 'function' || typeof errorCallback !== 'function' ) {
                    throw ('Invalid parameters in startProxy:' +
                      '\nsuccessCallback: ' + typeof successCallback +
                      '\nerrorCallback: ' + typeof errorCallback);
               }
               
               if ((!proxyID) || (!proxyURL)){
                    throw ('Invalid parameters in startProxy:' +
                      '\nproxyID: ' + proxyID +
                      '\nproxyURL: ' + proxyURL);
               }
                if (!proxyExcetpionList || proxyExcetpionList.length == 0){
                    proxyExcetpionList = null;
               }
               return exec(
                           function(success){
                              successCallback(success);
                           },
                           function(error){
                              errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "startProxy",
                          [proxyID, proxyURL, proxyExcetpionList]);
               
            };
            


               var isInitialized = function() {
                   return initialized;
               };

               var reset = function(successCallback,errorCallback, preferenceToKeep, options) {
                    var param = [];
                    if (preferenceToKeep){
                        var pref = JSON.stringify(preferenceToKeep);
                        param.push(pref);
                    }
                    else{
                        param.push(null);
                    }
               
                    if (options){
                        var opt = JSON.stringify(options);
                        param.push(opt);
                    }
               
                    exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS","reset", param);
               };


               var loadStartPage = function(successCallback,errorCallback) {
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS","loadStartPage",[]);
               };


               var getMDMConfiguration = function(successCallback,errorCallback) {
                    exec(function(result){
                  if (result != null && result.length > 0) {
                try {
                  var config = JSON.parse(result);
                  successCallback(config);
                } catch (e) {
                  //design time error
                  errorCallback("Invalid MDM configuration");
                }
              }
                          else{
                             successCallback(null);
                          }
          }, errorCallback, "MAFLogonCoreCDVPluginJS","getMDMConfiguration",[]);
               };
               

                var provisionCertificate = function (successCallback, errorCallback, providerID, bRefresh, options) {
                    return exec( successCallback, errorCallback,
                           "MAFLogonCoreCDVPluginJS",
                           "provisionCertificate",
                           [providerID, bRefresh, options]);
                }


                var deleteStoredCertificate = function (successCallback, errorCallback, providerID) {
                    return exec( successCallback, errorCallback,
                           "MAFLogonCoreCDVPluginJS",
                           "deleteStoredCertificate",
                           [providerID]);

                }


                var getNativeAppName = function(successCallback, errorCallback) {
                  if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                    throw ('Invalid parameters in getNativeAppName:' +
                          '\nsuccessCallback: ' + typeof successCallback +
                          '\nerrorCallback: ' + typeof errorCallback);
                  }

                  return exec(
                             successCallback,
                             errorCallback,
                             "MAFLogonCoreCDVPluginJS",
                             "getNativeAppName",
                             []);
                };
               

                var getMultiUserInfo = function(successCallback, errorCallback) {
                  if (typeof successCallback !== 'function' || typeof errorCallback !== 'function') {
                    throw ('Invalid parameters in getMultiUserInfo:' +
                          '\nsuccessCallback: ' + typeof successCallback +
                          '\nerrorCallback: ' + typeof errorCallback);
                  }

                  return exec(
                             successCallback,
                             errorCallback,
                             "MAFLogonCoreCDVPluginJS",
                             "getMultiUserInfo",
                             []);
                };


               var applyPasscodePolicy = function(successCallback, errorCallback) {
                   return exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "applyPasscodePolicy", []);
               }
               

               var applyLocalPasscodePolicy = function(successCallback, errorCallback, context) {
                   return exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "applyLocalPasscodePolicy", [context]);
               };
               

               var scanFingerprint = function(successCallback, errorCallback) {
                    if(device.platform.toLowerCase()=="android" && parseInt(device.version.charAt(0))>=6) { //Android 6
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "scanFingerprint", []);
                    }
   
                    else if(device.platform.toLowerCase()=="ios") {
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "getPasscodeWithTouchID", []);
                    }
                    
                    else {
                        errorCallback();
                    }
               };
               

               var isFingerprintAvailable = function(successCallback, errorCallback) {
                    if(device.platform.toLowerCase()=="android" && parseInt(device.version.charAt(0))>=6) { //Android 6
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "isFingerprintAvailable", []);
                    }
                    
                    else if(device.platform.toLowerCase()=="ios") {
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "isTouchIDEnabled", []);
                    }
                    
                    else {
                        successCallback(null);
                    }
               };
               
               var setFingerprintEnabled = function(successCallback, errorCallback, context) {
                    exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "setFingerprintEnabled", [context]);
               };
               
              var getPasswordPolicyForUser = function(successCallback, errorCallback, user) {
                    if (user != null){
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "getPasswordPolicyForUser", [user]);
                    }
                    else{
                        exec(successCallback, errorCallback, "MAFLogonCoreCDVPluginJS", "getPasswordPolicyForUser", []);
                    }
               };

               /*
                *  APIs to support alternative logon core library implementation. 
                *  sap.logon.CoreLocalStorage : replace data vault with local storage, if the subInstance method
                *                               return false, then do not call logoncore's instance method
                */
                var setLogonCoreSubInstance = function(obj){
                    logonCoreSubInstance = obj;
                }
               
                var onRegistrationFinished = function(isWebRegistration, context, state){
                    if (logonCoreSubInstance && logonCoreSubInstance.onRegistrationFinished){
                        logonCoreSubInstance.onRegistrationFinished(isWebRegistration, context, state);
                    }
                }
                
                var setInitialized = function(flag){
                    initialized = flag;
                }
               
                var isFirstRegistration = function(){
                    return firstRegistrationFlag;
                }
               

               /** @namespace
                   @alias Core
                   @memberof sap.Logon */

               module.exports = {
               /**
                * Method for initializing the logonCore component.
                * @method
                * @param successCallback: this method will be called back if initialization succeeds with parameter logoncontext;
                * @param errorCallback: this method will be called back if initialization fails with parameter error
                *   Error structure:
                *       "errorCode":
                *       "errorMessage":
                *       "errorDomain":
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *        -  1 (init failed)
                * @param applicationId: the application to be registered
                */
               initLogon: initLogon,
               /**
                * Method for reading the state of logonCore.
                * @method
                * @param successCallback: this method will be called back if read succeeds with parameter state
                *      state consists of the following fields:
                *          "applicationId":
                *          "status": new / registered / fullRegistered
                *          "secureStoreOpen":
                *          "defaultPasscodeUsed":
                *          "stateClientHub": notAvailable / skipped / availableNoSSOPin / availableInvalidSSOPin / availableValidSSOPin / error
                *          "stateAfaria": initializationNotStarted / initializationInProgress / initializationFailed / initializationSuccessful / credentialNeeded
        *        "isAfariaCredentialsProvided":
                * @param errorCallback: this method will be called back if initialization fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               getState: getState,
                              /**
                * Method for reading the context of logonCore.
                * @method
                * @param successCallback: this method will be called back if read succeeds with parameter context and state
                * @param errorCallback: this method will be called back if initialization fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       -2 (plugin not initialized)
                *
                * Context structure contains the following fields:
                * "registrationContext": &#123
                *       "serverHost": Host of the server.
                *       "domain": Domain for server. Can be used in case of SMP communication.
                *       "resourcePath": Resource path on the server. The path is used mainly for path based reverse proxy but can contains custom relay server path as well.
                *       "https": Marks whether the server should be accessed in a secure way.
                *       "serverPort": Port of the server.
                *       "user": Username in the backend.
                *       "password": Password for the backend user.
                *       "farmId": FarmId of the server. Can be nil. Used in case of Relay server or SitMinder.
                *       "communicatorId": Id of the communicator manager which will be used for performing the logon. Possible values: IMO / GATEWAY / REST
                *       "securityConfig": Security configuration. If nil the default configuration will be used.
                *       "mobileUser": Mobile User. Used in case of IMO manual user creation.
                *       "activationCode": Activation Code. Used in case of IMO manual user creation.
                *       "gatewayClient": The key string which identifies the client on the gateway. Used in Gateway only registration mode. The value will be used as adding the parameter: sap-client=<gateway client>
                *       "gatewayPingPath": The custom path of the ping url on the gateway. Used in case of Gateway only registration mode.
                *       "registrationServiceVersion": The version of the registration service used for SMP/HANA registration. DEPRECATED!
                *       "serviceVersionForRegistration": The version of the registration service used for SMP/HANA registration. Possible values: v1, v2, v3, v4, latest
                * &#125
                * "applicationEndpointURL": Contains the application endpoint url after a successful registration.
                * "applicationConnectionId": Id get after a successful SUP REST registration. Needed to be set in the download request header with key X-SUP-APPCID
                * "afariaRegistration": manual / automatic / certificate
                * "policyContext": Contains the password policy for the secure store &#123
                *      "alwaysOn":
                *      "alwaysOff":
                *      "defaultOn":
                *      "hasDigits":
                *      "hasLowerCaseLetters":
                *      "hasSpecialLetters":
                *      "hasUpperCaseLetters":
                *      "defaultAllowed":
                *      "expirationDays":
                *      "lockTimeout":
                *      "minLength":
                *      "minUniqueChars":
                *      "retryLimit":
                *      "allowFingerprint":
                * &#125
                * "registrationReadOnly": specifies whether context values are coming from clientHub / afaria
                * "policyReadOnly": specifies whether passcode policy is coming from afaria
                * "credentialsByClientHub": specifies whether credentials are coming from clientHub
                *
                *
                */
               getContext: getContext,

               /**
                * Method for registering user.
                * @method
                * @param successCallback(context,state): this method will be called back if registration succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if registration fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param context: the context which includes registration parameters as described in getContext method.
                */
               startRegistration: startRegistration,
               /**
                * Method for cancelling the registration.
                * @method
                * @param successCallback(context,state): this method will be called back if cancelling succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if cancelling fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               cancelRegistration: cancelRegistration,
               /**
                * Method for persisting the registration. Persisting will create the secure store and store the context.
                * @method
                * @param successCallback(context,state): this method will be called back if persisting succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param param: an object which must contain the field "passcode" for the store to be created. 
                * Optional field "policyContext" containing the passcode policy parameters described in method getContext.
                */
               persistRegistration: persistRegistration,
               /**
                * Method for creating the secure store.
                * @method
                * @param successCallback(context,state): this method will be called back if persisting succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param param: an object which must contain the field "passcode" for the store to be created. 
                * Optional field "policyContext" containing the passcode policy parameters described in method getContext.
                */
               createSecureStore: createSecureStore,
               /**
                * Method for deleting the registration. It will reset the client and remove the user from the SUP server.
                * @method
                * @param successCallback(context,state): this method will be called back if deletion succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               deleteRegistration: deleteRegistration,
               /**
                * Method for changing the application passcode.
                * @method
                * @param successCallback(context,state): this method will be called back if change passcode succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param param: an object which must contain 2 key-value pairs:
                * - oldPasscode :
                * - passcode :
                */
               changePasscode: changePasscode,
               /**
                * Method for changing the backend password that is stored on the client.  NOTE: this does not change the server's password.
                * @method
                * @param successCallback(context,state): this method will be called back if change password succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if change password fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param param: object containing the password for key "newPassword"
                */
               changePassword: changePassword,
               /**
                * Method for locking the secure store.
                * @method
                * @param successCallback(bool): this method will be called back if locking succeeds;
                * @param errorCallback: this method will be called back if change password fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               lockSecureStore: lockSecureStore,
               /**
                * Method for unlocking the secure store.
                * @method
                * @param successCallback(context,state): this method will be called back if unlocking succeeds;
                * @param errorCallback: this method will be called back if unlocking fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                *
                * @param param: object containing the passcode for key "unlockPasscode"
                */
               unlockSecureStore: unlockSecureStore,
               /**
                * Method for getting object from the store.
                * @method
                * @param successCallback(object): this method will be called back if get succeeds;
                * @param errorCallback: this method will be called back if get fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param key: the key for the object
                */
               getSecureStoreObject: getSecureStoreObject,
               /**
                * Method for setting object to the store.
                * @method
                * @param successCallback(bool): this method will be called back if set succeeds;
                * @param errorCallback: this method will be called back if set fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param key: the key for the object to be stored
                * @param object: the object to be stored
                */
               setSecureStoreObject: setSecureStoreObject,
               /**
                * Method for setting clientHub sso passcode.
                * @method
                * @param successCallback(context,state): this method will be called back if setting succeeds;
                * @param errorCallback: this method will be called back if update fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                * @param param: object containing the ssopasscode for key "ssoPasscode"
                */
               setSSOPasscode: setSSOPasscode,
               /**
                * Method for skipping registration through client hub.
                * @method
                */
               skipClientHub: skipClientHub,
               /*
                * Method for sending events.
                * @method
                * @param eventId: the id of event which was fired; possible values: PAUSE, RESUME
                */
               onEvent: onEvent,
               /*
                * Method for setting timeoutvalue
                * @method
                * @param timeout: timeout in minutes; after how many seconds the dataVault should be locked if the app is in the background;
                * makes only difference in case the passcode policy is not readonly; readonly flag is part of the logonContext: policyReadOnly
                */
               setTimeout: setTimeout,
               /*
                * Method for getting timeoutvalue
                * Return the timeout value in seconds 
                * @method
                */
               getTimeout: getTimeout,
               /**
                * Method for setting afaria credentials for retrieving seed data/afaria certificate
                * @method
                * @param successCallback(context,state): this method will be called back with parameters context and state if afaria credential is valid;
                * @param errorCallback: this method will be called back if registration fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param context: the context which must contain properties with following parameters:
                *       - afariaUser
                *       - afariaPassword
                */
               setAfariaCredential: setAfariaCredential,
               /**
                * Method for determining whether Logon has been initialized.
                * This method will return true if initLogon has been called,
                * and deleteRegistration has not been called since.  This
                * method will return false otherwise.
                * @method
                */
               isInitialized: isInitialized,
               /**
                * Reset the application. The callback method may not be called if
                * the reset results in loading the cordova start page
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @param preferenceToKeep : the preference list to keep after reset
                * @example
                * reset(
                *         function(successMsg) {alert("Succeess: " + successMsg);},
                *         function(errMsg) {alert("Error: " + errMsg);} );
                */
               reset:reset,
               /**
                * load cordova start page
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @example
                * sap.logon.Core.loadStartPage(
                *         function(successMsg) {alert("Succeess: " + successMsg);},
                *         function(errMsg) {alert("Error: " + errMsg);} );
                */
               loadStartPage:loadStartPage,
               //credential provider method
               /**
                * Method for getting certificate from third party provider
                * @method
                * @param successCallback(context,state): this method will be called back with parameters context and state if getting certificate succeeds
                * @param errorCallback: this method will be called back if getting certificate fails with parameter error
                * Possible error codes for error domains: (TODO: update comment)
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param closeScreenOnReturn: the flag to indicate whether to close the UI screen after getting the result,
                *                             the default value is false.
                */
               getCertificateFromProvider: getCertificateFromProvider,  //obsolete
               /**
                * Method for setting parameter for certificate provider
                * @method
                * @param successCallback(context,state): this method will be called back if parameters are set properly;
                * @param errorCallback: this method will be called back if setting parameters fails
                * Possible error codes for error domains: (TODO update comment)
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                * @param context: the context which must contain properties with following parameters:
                *       - afariaUser
                *       - afariaPassword
                */
               setParametersForProvider: setParametersForProvider,
               /**
                * Method for setting the UserCreationPolicy on the Logon Core.
                * This method is intended to be used to force registration
                * with a client certificate.  This method must be called before
                * initLogon to have any effect.
                * @method
                */
               setUserCreationPolicy: setUserCreationPolicy,

               /**
                * Method determining whether the app is registered before
                * calling initLogon.  This method is necessary because
                * setUserCreationPolicy must be called before initLogon,
                * so we need some information available before initLogon
                * is called.
                * @method
                */
               isRegistered: isRegistered,
               //new certificate provider methods for SP08
               /**
                * provision certificate, the method just provision the certificate to device, it does not set the certificate provide to logon plugin
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @param providerID: the provider id for the certificate provider
                * @param bRefresh: if true, check and delete the existing certificate first
                * @param options: dictionary contains the configuration for the certificate provider

                * @example
                * provisionCertificate(
                *         function() {alert("success");},
                *         function(errMsg) {alert("Error: " + errMsg);},
                          "afaria", false, null);
                *
                */
               provisionCertificate: provisionCertificate,
               /**
                * delete the stored certificate
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @param providerID: the provider id for the certificate provider
                * @example
                * deleteStoredCertificate(
                *         function(config) {alert("config: " + config);},
                *         function(errMsg) {alert("Error: " + errMsg);},
                          "afaria");
                */
               deleteStoredCertificate: deleteStoredCertificate,
               /**
                * Method determining whether the app is registered before
                * calling initLogon.  This method is necessary because
                * setUserCreationPolicy must be called before initLogon,
                * so we need some information available before initLogon
                * is called.
                * @method
                */
               hasSecureStore: hasSecureStore,
               //methods for loading configuration
               /**
                * Get MDM configuration. Currently only supported by ios
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @example
                * getMDMConfiguration(
                *         function(config) {alert("config: " + config);},
                *         function(errMsg) {alert("Error: " + errMsg);} );
                */
               getMDMConfiguration: getMDMConfiguration,
               /**
                * Method for disable or enable afaria
                * @method
                * @param successCallback(context,state): this method will be called back if succeeded;
                * @param errorCallback: this method will be called back if failed
                */
               useAfaria: useAfaria,
               /**
                * Method for start per app secure proxy
                * @method
                * @param successCallback(): success callback;
                * @param errorCallback: this method will be called back if failed
                * @param proxyID: the proxy cordova plugin id
                * @param proxyURL: the proxy url to initialize the proxy library
                * @param proxyExceptionList: the regex list for requests that should be handled by proxy library, application should ignore those requests 
                */
               startProxy: startProxy,
               /**
                * Method for checking to see if the password policy has changed.
                * @method
                * @param successCallback(): this method will be called back if set succeeds;
                * @param errorCallback: this method will be called back if set fails with parameter error
                */
               checkServerPasscodePolicyUpdate: checkServerPasscodePolicyUpdate,
               /**
                * Get the native app name displayed by operating system
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                *
                * @example
                * getNativeAppName(
                *         function(name) {alert("name: " + name);},
                *         function(errMsg) {alert("Error: " + errMsg);}
                * );
                */
               getNativeAppName: getNativeAppName,
               //method to support multiuser mode
               /**
                * Get user informaiton in multiuser mode
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                *
                * @example
                * getMultiUserInfo(
                *         function(userInfo) {alert("name: " + name);},
                *         function(errMsg) {alert("Error: " + errMsg);}
                * );
                */
               getMultiUserInfo: getMultiUserInfo,
               /**
                * Apply the current passcode policy.  This function is intended to be invoked by the listener registered
                * This function is needed for the case when the passcode policy has
                * changed, but the app does not need to be totally reset.
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                */
               applyPasscodePolicy: applyPasscodePolicy,
               /**
                * Apply the current local passcode policy.  This function is intended to be invoked by the listener registered
                * This function is needed for the case when the local passcode policy has
                * changed, but the app does not need to be totally reset.
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                */
               applyLocalPasscodePolicy: applyLocalPasscodePolicy,
               /**
                * Method for activate the secure store for a particular user in multiuser mode. This happens when 
                * log-in the first user after restarting the app, or when switching to a different user from currrent user
                * @method
                * @param successCallback(context,state): this method will be called back if unlocking succeeds;
                * @param errorCallback: this method will be called back if unlocking fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                *       - 3 (no input provided)
                *
                * @param param: object containing the passcode for key "unlockPasscode" and userid in currentSelectedUser.devcieUserId
                */
               activateSecureStoreForUser: activateSecureStoreForUser,
               /**
                * Method for deleting the registration in multiuser mode. It will delete user data vault, and also remove the user registration from the SUP server.
                * @method
                * @param successCallback(context,state): this method will be called back if deletion succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * @param user
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               removeDeviceUser: removeDeviceUser,
               /**
                * Method for deleting the all registrations in multiuser mode. It will delete all user registration.
                * @method
                * @param successCallback(context,state): this method will be called back if deletion succeeds with parameters context and state;
                * @param errorCallback: this method will be called back if persisting fails with parameter error
                * Possible error codes for error domains:
                *   Error domain: MAFLogonCoreCDVPlugin
                *       - 2 (plugin not initialized)
                */
               removeAllDeviceUsers: removeAllDeviceUsers,
               /**
                * Method for deactivate the current user in multiuser mode.
                * @method
                * @param successCallback(context,state): this method will be called back if unlocking succeeds;
                * @param errorCallback: this method will be called back if unlocking fails with parameter error
                */
               deactivateCurrentUser: deactivateCurrentUser,
               /**
                * Opens dialog window to prompt user to scan their fingerprint
                * Calls successCallback if scan is successful
                * Calls errorCallback if user closes dialog
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                */
               scanFingerprint: scanFingerprint,
               /**
                * Checks if fingerprint scanning is available
                * Calls successCallback if device has fingerprint hardware and fingerprints are registered
                * Calls errorCallback otherwise
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                */
               isFingerprintAvailable: isFingerprintAvailable,
               
               /**
                * Get password policy
                * Calls successCallback if password policy is retrieved
                * Calls errorCallback otherwise
                *
                * @method
                * @param {Function} [successCallback]
                * @param {Function} [errorCallback]
                * @param userid, set to null in single user mode
                */
               getPasswordPolicyForUser : getPasswordPolicyForUser,

               
               setFingerprintEnabled: setFingerprintEnabled,

               //methods for alternative logon core storage
               setLogonCoreSubInstance: setLogonCoreSubInstance,
               onRegistrationFinished: onRegistrationFinished,
               setInitialized: setInitialized,
               
               //flag to synchronously return true for the logon first registration.
               isFirstRegistration: isFirstRegistration
               };

