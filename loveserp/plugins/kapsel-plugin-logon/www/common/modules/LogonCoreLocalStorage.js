      var exec = require('cordova/exec');
		
            // Method for initializing the logonCore component.
            var initLogon = function(successCallback, errorCallback, applicationId, credentialProviderID, bIsODataRegistration, passcodePolicy, passcode, context) {
               
                var localData = localStorage.getItem("context");
                if (localData != null){
                    //set to null if the provider is empty string or undefined, so native side needs not to validate all cases.
                    if (!credentialProviderID){
                        credentialProviderID = null;
                    }
               
                    exec(
                           function(certificateSet){
                                sap.logon.Core.setInitialized(true);
                                successCallback(certificateSet);
                           },
                           function(error){
                           errorCallback(error);
                           },
                           "MAFLogonCoreCDVPluginJS",
                           "initWithLocalStorage",
                           [applicationId, credentialProviderID, passcodePolicy, passcode, context, bIsODataRegistration]);
                 
                    return true;
                }
                else{
                   return false;
                }
            };
               
            var onRegistrationFinished = function(isWebRegistration, context, state){

                //save context and state to local storage. context with pwdStr is saved in session storage,
                //context without pwdStr is saved in local storage. pwdStr is saved in keychain
                if (localStorage.getItem("context") == null){
             
                     if (isWebRegistration){
                        localStorage.setItem("state",JSON.stringify(state));
                        localStorage.setItem("context", JSON.stringify(context));
                     }
                     else{
                        localStorage.setItem("state",JSON.stringify(state));
                        sessionStorage.setItem("context", JSON.stringify(context));
                        var credential = {};
                        credential.user = context.registrationContext.user;
                        credential.password = context.registrationContext.password;
                        if (window.location.protocol == "file:"){
                            //set credential to keychain for security reason, only need do this from index.html
                            setCredentialToKeyChain(null, null, context.applicationEndpointURL, credential, true);
                        }
                        context.registrationContext.user=null;
                        context.registrationContext.password = null;
                        localStorage.setItem("context", JSON.stringify(context)); //set to local storage without credential for restarting
                        context.registrationContext.user=credential.user;
                        context.registrationContext.password = credential.password;
                     }
                }
                return true;
            }
            
            //remove saved items in local storage and sesson storage when the registration is deleted.
            //The credential saved in keychain for localStorage was deleted with data vault, so no need to handle it here.
            var onDeleteRegistrationFinished = function(){
                localStorage.clear();
                sessionStorage.clear();
                return true;
            }
                
            //Method for reading the state of logonCore.
            var getState = function(successCallback, errorCallback) {
                 
               var localData = localStorage.getItem("state");
               if (localData != null){
                    successCallback(JSON.parse(localData));
                    return true;
               }
               else{
                    return false;
               }
            };
            
            var getContextWithCredentialFromLocalStorage = function(successCallback, errorCallback){
                    var context = sessionStorage.getItem("context");
                    if (context == null){
                        context = localStorage.getItem("context");
                        if (context != null){
                            var contextObj = JSON.parse(context);
                            if (contextObj.registrationContext){
                                getCredentialFromKeyChain(function(cred){
                                        //set credential to context and then set to session storage for future use
                                        contextObj.registrationContext.user= cred.user;
                                        contextObj.registrationContext.password = cred.password;
                                        sessionStorage.setItem("context", JSON.stringify(contextObj));
                                        successCallback(contextObj);
                                    },
                                    errorCallback,
                                    contextObj.applicationEndpointURL);
                            }
                            else{
                                sessionStorage.setItem("context", JSON.stringify(contextObj));
                                successCallback(contextObj)
                            }
                        }
                        else{
                            errorCallback();
                        }
                    }
                    else{
                        successCallback(JSON.parse(context));
                    }
            };
                

               
            //Method for reading the context of logonCore.
            var getContext = function(successCallback, errorCallback) {
               
               var localState = localStorage.getItem("state");
               var localContext = localStorage.getItem("context");
               if ( localState != null && localContext != null){
                        getContextWithCredentialFromLocalStorage(function(context){
                            successCallback(context, JSON.parse(localState));
                        }, errorCallback);

                    return true;
               }
               else{
                    return false;
               }
            };



           /**
            * Method determining whether the app is registered before
            * calling initLogon.  This method is necessary because
            * setUserCreationPolicy must be called before initLogon,
            * so we need some information available before initLogon
            * is called.
            */
           var isRegistered = function(successCallback, errorCallback, appId) {
           
               var localState = localStorage.getItem("context");
               if (localState != null){
                    successCallback(true);
                    return true;
               }
               else{
                    return false;
               }
            };

/**
 * Method determining whether the app is registered before
 * calling initLogon.  This method is necessary because
 * setUserCreationPolicy must be called before initLogon,
 * so we need some information available before initLogon
 * is called.
 */
var hasSecureStore = function(successCallback, errorCallback, appId) {
    var localState = localStorage.getItem("context");
    if (localState != null) {
        successCallback(true);
        return true;
    }
    else {
        return false;
    }
};

// Method for getting object from the store.
var getSecureStoreObject = function(successCallback, errorCallback, key) {
    var localData = localStorage.getItem(key);
    successCallback(JSON.parse(localData));
    return true;
};

var getCredentialFromKeyChain = function(successCallback, errorCallback, key) {
    if (key== null) {
    throw ('Invalid parameters in getCredentialFromKeyChain:' +
        '\nkey: ' + typeof key );
    }
    return exec(successCallback, errorCallback,
        "MAFLogonCoreCDVPluginJS", "getCredentialFromKeyChain",
        [key]);
}

/**
 * Method for setting object to the store.
 * @param successCallback(bool): this method will be called back if set succeeds;
 * @param errorCallback: this method will be called back if set fails with parameter error
 * Possible error codes for error domains:
 *   Error domain: MAFLogonCoreCDVPlugin
 *       - 2 (plugin not initialized)
 *       - 3 (no input provided)
 * @param key: the key for the object to be stored
 * @param object: the object to be stored
 */
var setSecureStoreObject = function(successCallback, errorCallback, key, jsonobject) {
    var localData = localStorage.setItem(key, jsonobject);
    successCallback();
    return true;
};

//object is a javascript object mapped to native dictionary
var setCredentialToKeyChain = function(successCallback, errorCallback, key, object) {
    if (key == null) {
        throw ('Invalid parameters in setCredentialToKeyChain:' +
            '\nkey: ' + typeof key );
    }

    return exec(successCallback, errorCallback,
        "MAFLogonCoreCDVPluginJS", "setCredentialToKeyChain",
        [key, object, true]); // always skip reload
};

/**
 * SMP registration only.
 * Change pwdStr saved in keychain, also need to clear the context loaded into current session storage
 * @param param: object containing the pwdStr for key "newpwdStr"
 */
var changePassword = function(successCallback, errorCallback, param) {
    // save context and state to local storage. context with pwdStr is saved in session storage,
    // context without pwdStr is saved in local storage. pwdStr is saved in keychain
    var sessionContext = sessionStorage.getItem("context");
    if (sessionContext == null) {
        errorCallback("Unable to load registration context");
    }
    else {
        var contextObj = JSON.parse(sessionContext);
        //set credential to keychain for security reason, only need do this from index.html
        var credential = {};
        credential.user = contextObj.registrationContext.user;
        credential.password = param.password;
        setCredentialToKeyChain(function() {
                contextObj.registrationContext.password = credential.password;
                sessionStorage.setItem("context", JSON.stringify(contextObj))
                successCallback(contextObj);
            }, null, contextObj.applicationEndpointURL, credential);
    }
    return true;
};

module.exports = {
    initLogon: initLogon,
    getState: getState,
    getContext: getContext,
    isRegistered: isRegistered,
    hasSecureStore: hasSecureStore,
    getSecureStoreObject: getSecureStoreObject,
    setSecureStoreObject: setSecureStoreObject,
    changePassword: changePassword,

    //new subinstance helper api
    onRegistrationFinished: onRegistrationFinished,
    onDeleteRegistrationFinished: onDeleteRegistrationFinished
};
