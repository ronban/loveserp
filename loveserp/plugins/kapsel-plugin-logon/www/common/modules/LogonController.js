    var utils = sap.logon.Utils;
    var TIMEOUT = 2000;

    var _oLogonCore;
    var _oLogonView;
    var _hasLogonSuccessEventFired = false;
    var _authenticationConfigured = false;

    var _providedContext;
    var _providedPasscodePolicyContext;

    var flowqueue;

    var _credentialProviderID;
    var _credentialProviderCertificateAvailable = false;
    var _registrationEventsForCredentialProvider = null;
    var _bIsWebRegistration = false;

    //startLogonInit can set appDelegate and appContext to allow registering new user in multiuser mode
    var appDelegate;
    var appContext;
    var _regNewUserInProgress = false;

    var currentConfigIndex = 0;
    var classicStyle = true;

    var authWindow;
    var code ="";
    var _resumeListenerErrorCallback;
    var _resumeListener = function() {
        resume(
            function() {
                fireEvent('onSapResumeSuccess', arguments);
            },
            function() {
                fireEvent('onSapResumeError', arguments);
                if (_resumeListenerErrorCallback) {
                    _resumeListenerErrorCallback.apply(this, arguments);
                }
            }
        );
    };

    // Listener for OAuth2 token change events
    var tokenChangeListener = function(event) {
        saveOAuth2Token(event.token, function() {
            utils.debug("Updated OAuth2 token saved");
        });
    }

    var loadConfiguration = function(appDelegateObj, contextObj) {
        utils.debug("start loadConfiguration");
        appDelegate = appDelegateObj;
        var context = contextObj;
        if (context == null) {
            context = {};
        }
        if (context.operation == null) {
            context.operation = {};
        }
        if (context.operation.configSources == null) {
            context.operation.configSources = ["saved", "appConfig.js", "mdm", /*"afaria", */ "user"]; //mobilePlace
        }

        //if logonview is null, set to default sap.logon.LogonJsView
        if (!context.operation.logonView) {
            context.operation.logonView = sap.logon.LogonJsView;
        }

        if (context.appConfig == null) {
            context.appConfig = {};
        }
        //if appid is null, get the app bundle id

        if (context.smpConfig == null) {
            context.smpConfig = {};
        }

        getAppConfig.call(this, context);
    };
    
    //Open a MessageDialog only on Windows
    function showConfirmDialog(message, buttons) {
        if (device.platform.toLowerCase().indexOf("windows") === 0) {

            var dialog = new Windows.UI.Popups.MessageDialog(message);
            for (var i = 0; i < buttons.length; i++) {
                var button = new Windows.UI.Popups.UICommand(buttons[i].text, buttons[i].callback, i);
                dialog.commands.append(button);
            }

            return dialog.showAsync();
        }
    };

    var findCordovaPath = function() {
        var path = null;
        var scripts = document.getElementsByTagName('script');
        var term = 'cordova.js';
        for (var n = scripts.length - 1; n > -1; n--) {
            var src = scripts[n].src;
            if (src.indexOf(term) == (src.length - term.length)) {
                path = src.substring(0, src.length - term.length);
                break;
            }
        }
        return path;
    };

    //get the configuration from mobile place and set it into context.operation.data,
    //then call appdelegate.onGetAppConfig to parse the configuraiton
    var getConfigFromMobilePlace = function(onGetConfigData, context) {
        var email = context.operation.data;

        var successCallback = function(result) {
            if (result.status == 200 && result.responseText) {
                utils.debug("got configuration from MobilePlace: " + result.responseText);
                try {
                    var config = JSON.parse(result.responseText);
                    context.operation.data = config;
                    onGetConfigData(context);
                } catch (e) {
                    context.operation.logonView.showNotification("ERR_MOBILE_PLACE_CONFIG_INVALID");
                }
            } else {
                context.operation.logonView.showNotification("ERR_MOBILE_PLACE_CONFIG_NOT_RETRIEVED");
            }
        }
        var errorCallback = function(error) {
            context.operation.logonView.showNotification("ERR_MOBILE_PLACE_CONFIG_NOT_RETRIEVED");
        }
        var appID = context.appConfig.appID;

        var mobilePlaceHost = "https://discovery.sapmobilesecure.com";
        //switch to dev testing mobile place server if the email domin include "mock.domain.test.only".
        var emailDomainIndex = email.indexOf("@");
        var emailDomain = email.substring(emailDomainIndex);
        if (emailDomain.indexOf("murray.sapmobileplace.com") != -1 ) { 
            mobilePlaceHost = "https://portal.murray.sapmobilesecure.com";
        } else if(emailDomain.indexOf("next.sapmobileplace.com") != -1 ){
            mobilePlaceHost = "https://portal.next.sapmobilesecure.com";
        } else if (emailDomain.indexOf("mock.domain.test.only") != -1 || emailDomain.indexOf("devtest.sapmobilesecure.com") != -1) {
            mobilePlaceHost = "https://portal.devtest.sapmobilesecure.com";
        }

        //update mobilePlaceHost if caller sets it in provided context
        if (context.appConfig.mobilePlaceHost != undefined) {
            mobilePlaceHost = context.appConfig.mobilePlaceHost;
        }

        var mobilePlaceAppID = appID;
        if (context.appConfig.mobilePlaceAppID != undefined) {
            mobilePlaceAppID = context.appConfig.mobilePlaceAppID;
        }
		else{
			//bug fix 1570631998 FioriClient must read from Discovery Service/HCPms config
			//For customized fioir client, if mobilePlaceAppID is not specified in appconfig.js, or if the app store fiori 
			//client is used, which cannot specify mobilePalaceAppID, appconfig.appID is used as mobilePlaceAppID. Since when
			//HCPms publishs configuration, it always appends 1.0 as version number, so in order to make it work with fiori client,
			//management decides to always add "1.0" after fiori client uses app appid to request configuration from mobile place
			mobilePlaceAppID += ":1.0";
		}

        var getAppConfigUrl = mobilePlaceHost + "/config-api.svc/ApplicationConfigurations/getApplicationConfiguration(AppConfigID='" + mobilePlaceAppID + "',EmailAddress='" + email + "')";
        sap.AuthProxy.sendRequest("GET", getAppConfigUrl, null, null, successCallback, errorCallback);

    };

    //get the configuration from MDM. if config is available, set it into context.operation.data, and set state to run to let app
    //delegate to handle it. Otherwise, set state to done to skip it
    var getConfigFromMDM = function(onGetConfigData, context) {

        var successCallback = function(config) {
            if (config){
                    context.operation.data = config;
                    onGetConfigData(context);
            }
            else{
                 //MDM config not available
                context.operation.currentConfigState = "done";
                onGetConfigData(context);
            }
        };
        var errorCallback = function(error) {
            var i18n = require('kapsel-plugin-i18n.i18n');
            i18n.load({
                        path: "smp/logon/i18n",
                        name: "i18n"
                      },
                      function(bundle){
                            alert(bundle.get("FAILED_TO_RETRIEVE_MDM_CONFIG"));
                            context.operation.currentConfigState = "done";
                            onGetConfigData(context);
                      }
            );

        };
        sap.logon.Core.getMDMConfiguration(successCallback, errorCallback);
    };

    var getAppConfig = function(context, errorCallback) {
        utils.debug("LogonController getAppConfig, currentConfigIndex=" + context.operation.currentConfigIndex + ", currentConfigType=" + context.operation.currentConfigType + ", currentConfigState=" + context.operation.currentConfigState);

        if (context.operation.currentConfigState == "complete" || context.operation.currentConfigIndex == context.operation.configSources.length && context.operation.currentConfigState == "done") {
            startLogonInit(context);
        } else if (context.operation.currentConfigIndex == null) {
            if (context.operation.configSources.length > 0) {
                context.operation.currentConfigIndex = 0;
                context.operation.currentConfigState = "begin";
            } else {
                startLogonInit(context);
            }
        } else if (context.operation.currentConfigState == "done") {
            ++context.operation.currentConfigIndex;
            
            //if all configuration source has been checked and the configuration is still not complete, then
            //call the onerrorcallback to report the error
            if (context.operation.currentConfigIndex >= context.operation.configSources.length){
                errorCallback("Unable to get valid configuration for fiori client.")
                return;
            }
            
            //as mdm is only supported by ios and android, so it should be skipped for other clients
            if (context.operation.configSources[context.operation.currentConfigIndex] == "mdm"
                && device.platform.toLowerCase() != "ios"  && device.platform.toLowerCase() != "android"){
                ++context.operation.currentConfigIndex;
            }
            context.operation.currentConfigState = "begin";
        }


        if (context.operation.currentConfigState == "begin") {
            if (appDelegate && appDelegate.onGetAppConfig) {
                appDelegate.onGetAppConfig(context, getAppConfig, appDelegate.onRegistrationError);
                return;
            } else {
                context.operation.currentConfigState = "run";
            }
        }

        if (context.operation.currentConfigState == "run") {
            //if configType is avilable, use it, otherwise use, context.operation.configSources[context.operation.currentConfigIndex] to get the config type
            var configType = context.operation.currentConfigType;
            if (!configType) {
                configType = context.operation.configSources[context.operation.currentConfigIndex];
            }
            if (configType == "saved" || configType == "appConfig.js") {
                //the saved configuration will be available if application is already registered
                //appConfig.js is available from index.html, both for online fiori app and prepackaged fiori app
                onGetConfigData(context);
            } else if (configType == "mdm") {
                getConfigFromMDM(onGetConfigData, context);
            }
            else if (configType == "user") {
                //show one or more screens to get user input and set the input value to context object.

                //before showing the screen, the appdelegate will be called with currentScreenState of "begin", appdelegate can
                //choose to skip the screen by changing the state to "done".

                //if appdelegate does not skip it, the screen state will be changed to "show", and the jsview will be shown in
                //the inappbrowser, after user submit the data, the screen's onsubmit handler will set the screen state to "done"
                //and call the appDelegate.onSubmitScreen method.

                //the appdelegate will validate the input, if the validation fails, it can show the screen again by calling
                //showScreen and setting the state to "show". If the input is valid, it can logonController's onGetConfigData with
                //config state to "complete" to start the registration. If the input is valid but incomplete, it should se config
                //state to "done" to let onGetConfigData to move to the next config source.

                //The config data are passed to appdelegate at context.operation.data
                context.operation.currentScreenID = "chooseDemoMode";
                context.operation.currentScreenState = "begin";
                context.operation.currentScreenEventHander = {
                    onsubmit: function(data) {
                        //once user submits the screen data, change the screen state to done to let appdelegate to handle the data
                        context.operation.currentScreenState = "done";
                        showScreen(context, data);

                    }
                };
                showScreen(context, {});

            } else if (configType == "mobilePlace") {
                getConfigFromMobilePlace(onGetConfigData, context);
            } else {
                errorCallback("Unknown config type: " + configType)
            }

        }

    };

    //show the screen in iab to get user input, two parameters are used as we do not want to merge data into context before validation
    var showScreen = function(context, screenContext) {
    	//copy appName property from context object (if existing) to screenContext as it is needed for resource customization
		if (context && context.appConfig && context.appConfig.appName){
			screenContext.appName = context.appConfig.appName;
		}
        
        //screen is submitted by user when state is set to "done" by onsubmit handler, the screen data is already in context, so if appdelegate provides the onSubmitScreen method, then let it handle it.
        //otherwise, call onGetConfigData to let logoncontroller onGetConfigData to handle it
        if (context.operation.currentScreenState == "done") {
            if (appDelegate && appDelegate.onSubmitScreen) {
                //if the configuration is valid, app delegate can call onGetConfigData to move to next config source.
                //if the configuration is invalid, app delegate can show the status or show an notification on iab
                appDelegate.onSubmitScreen(context, screenContext, onGetConfigData, showScreen, context.operation.logonView.showNotification);
                return;
            } else {
                context.operation.data = screenContext;
                onGetConfigData(context);
            }
        }

        if (context.operation.currentScreenState == "begin") {
            if (appDelegate && appDelegate.onShowScreen) {
                appDelegate.onShowScreen(context, screenContext, showScreen, appDelegate.onRegistrationError);
                return;
            } else {
                context.operation.currentScreenState = "show";
            }
        }

        //if screen state is set to "show", then let logonview to display it
        if (context.operation.currentScreenState == "show") {
            context.operation.logonView.showScreen(context.operation.currentScreenID, context.operation.currentScreenEventHander, screenContext);
        }

    }

    var onGetConfigData = function(context) {
        if (appDelegate && appDelegate.onGetAppConfig) {
            //client callback will continue the process by calling getAppConfig again
            appDelegate.onGetAppConfig(context, getAppConfig, appDelegate.onRegistrationError);
        } else {
            //no client delegate, just call getAppConfig here to continue the load config process
            setTimeout(function() {
                context.operation.currentConfigState = "done"; //move to next config source
                getAppConfig(context);
            }, 0);
        }

    };

    var startLogonInit = function(context, appDelegateObj){
        //kapsel project will call this method as starting point, in that case, appDelegateObj will be set by caller
        if (context){
            appContext = context;
        }
        else{
            context = appContext;
        }
        
        var providerID = (context.appConfig.certificate && context.appConfig.certificate.id) ? context.appConfig.certificate.id : context.appConfig.certificate;
        
        if (appDelegateObj) {
               appDelegate = appDelegateObj;
        }
        
        var onCallRegistrationError = function(error){
            if (context && context.operation && context.operation.logonView){
                context.operation.logonView.close(
                	function(){
                          appDelegate.onRegistrationError(error);
                    });
            }
            else{
            	appDelegate.onRegistrationError(error);
            }
        };
        
        //before calling logon.init, check the appConfig.certificate setting, if it is not set to afaria, then
        //disable the afaria for logon plugin. Otherwise, ios MAF will always start afaria client as long as it is installed on
        //device, even if the fiori client does not use it
        if (device.platform.toLowerCase() == "ios") {
            if (providerID == "afaria") {
                //if not yet registered, then need to set useAfaria and usercreation policy
                sap.logon.Core.isRegistered(function(bRegistered) {
                        if (!bRegistered) {
                            sap.logon.Core.useAfaria(
                                function() {
                                    sap.logon.Core.setUserCreationPolicy(logon, onCallRegistrationError, "certificate", context.appConfig.appID, context.smpConfig, providerID, context);
                                },
                                onCallRegistrationError, true);
                        } else {
                            logon();
                        }
                    },
                    onCallRegistrationError, context.appConfig.appID, context);
            } else {
                //first disable afaria function on logon
                sap.logon.Core.useAfaria(
                    function() {
                        //if certificate provider is null or empty, then start logon, otherwiser initialize the certificate provider
                        if (providerID) {
                            if (context.appConfig.isForSMP) {
                                sap.logon.Core.isRegistered(function(bRegistered) {
                                        //For SMP registration, if not yet registered, need to set usercreationpolicy to certificate before provisionCertificate
                                        if (!bRegistered) {
                                            sap.logon.Core.setUserCreationPolicy(
                                                function() {
                                                    sap.logon.Core.provisionCertificate(logon, onCallRegistrationError, providerID, !bRegistered, context);
                                                },
                                                onCallRegistrationError, "certificate", context.appConfig.appID, context.smpConfig, providerID, context);
                                        } else {

                                            sap.logon.Core.provisionCertificate(logon, onCallRegistrationError, providerID, !bRegistered, context);
                                        }
                                    },
                                    onCallRegistrationError, context.appConfig.appID, context);
                            } else {
                                //for non SMP registration case, no need to set usercreation policy
                                sap.logon.Core.hasSecureStore(function(bHasStore) {
                                        sap.logon.Core.provisionCertificate(logon, onCallRegistrationError, providerID, !bHasStore, context);
                                    },
                                    onCallRegistrationError, context.appConfig.appID);
                            }
                        } else {
                            logon();
                        }
                    },
                    onCallRegistrationError, false);
            }
        } else if (device.platform.toLowerCase() == "android") { //android client
            if (providerID == "afaria") {
                // In the future (when we have time), we should probably combine setUserCreationPolicy (on Android)
                // and userAfaria (on iOS) so we have less platform specific code since they appear to do a similar thing.
                sap.logon.Core.setUserCreationPolicy(logon, appDelegate.onRegistrationError, "certificate", context.appConfig.appID, context.smpConfig);
            } else if (providerID) {
                if (context.appConfig.isForSMP) {
                    sap.logon.Core.isRegistered(function(bRegistered) {
                            sap.logon.Core.provisionCertificate(logon, appDelegate.onRegistrationError, providerID, !bRegistered, context.appConfig);
                        },
                        appDelegate.onRegistrationError, context.appConfig.appID, context);
                } else {
                    sap.logon.Core.hasSecureStore(function(bHasStore) {
                            sap.logon.Core.provisionCertificate(logon, appDelegate.onRegistrationError, providerID, !bHasStore, context.appConfig);
                        },
                        appDelegate.onRegistrationError, context.appConfig.appID);
                }
            } else {
                logon();
            }
        } else if (device.platform.toLowerCase() == "windows") {
            // windows client
            if (providerID) {
                sap.logon.Core.isRegistered(function(bRegistered) {
                        sap.logon.Core.provisionCertificate(logon, appDelegate.onRegistrationError, providerID, !bRegistered, context.appConfig);
                    },
                    appDelegate.onRegistrationError, context.appConfig.appID, context);
            } else {
                logon();
            }
        } else { // other platforms
            logon();
        }

        function logon() {
            if (device.platform == "windows" && navigator && navigator.splashscreen && document.getElementById("extendedSplashScreen") != null) {
                navigator.splashscreen.hide();
            }
            //The appConfig has finished, start smp init. If context has the required property then use it, otherwise give the default value
            if (context.appConfig.isForSMP) {
                sap.Logon.init(function(m, forNewRegistration) {
                    appDelegate.onRegistrationSuccess(m, forNewRegistration);
                    persistAllowSaveFormCredentialsConfig(context.appConfig.allowSavingFormCredentials);
                },
                function(m) {
                    appDelegate.onRegistrationError(m);
                },
                context.appConfig.appID, context.smpConfig, context.operation.logonView, providerID);
            }
            else{
                if (context.appConfig.passcodePolicy !== undefined) {
                    context.smpConfig.policyContext = context.appConfig.passcodePolicy;
                }

                sap.Logon.initPasscodeManager(function(m) {
                    appDelegate.onRegistrationSuccess(m);
                    persistAllowSaveFormCredentialsConfig(context.appConfig.allowSavingFormCredentials);
                },
                function(m) {
                    appDelegate.onRegistrationError(m);
                },
                context.appConfig.appID, context.operation.logonView, context.appConfig.passcodePolicy, context.smpConfig, providerID);
            }
        }
    };

    var getSAMLConfig = function(inputContext) {

        if (inputContext != null && inputContext.auth != null && inputContext.auth.length > 0) {
            for (var i = 0; i < inputContext.auth.length; i++) {
                if (inputContext.auth[i]["type"] == "saml2.web.post") {
                    //if auth type is from fiori configurion screen, it may not have all required attributes,
                    //if so set the default value for the missing attributes
                    if (inputContext.auth[i]["config"] == null) {
                        inputContext.auth[i]["config"] = {};
                    }

                    if (inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.uri"] == null) {
                        inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.uri"] = "/SAMLAuthLauncher";
                    }

                    if (inputContext.auth[i]["config"]["saml2.web.post.authchallengeheader.name"] == null) {
                        inputContext.auth[i]["config"]["saml2.web.post.authchallengeheader.name"] = "com.sap.cloud.security.login";
                    }

                    if (inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.redirectparam"] == null) {
                        inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.redirectparam"] = "finishEndpointParam";
                    }

                    //convert relative path to absolute path
                    if (inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.uri"].substring(0, 4).toLowerCase() != "http") {
                        var path = 'http';
                        if (inputContext.https) {
                            path = 'https';
                        }
                        var proxyPath = (inputContext.resourcePath ? inputContext.resourcePath : "") +
                            (inputContext.farmId ? "/" + inputContext.farmId : "");

                        inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.uri"] = path + '://' + inputContext.serverHost + utils.getPort(inputContext.serverPort) + proxyPath + inputContext.auth[i]["config"]["saml2.web.post.finish.endpoint.uri"];

                    }
                    return inputContext.auth[i];
                }
            }
        }
        return null;
    }
	
    // read the OAuth connfiguration from the context; if one of parameters is missing, then null is returned
	var getOAuthConfig = function(inputContext) {

        if (inputContext != null && inputContext.auth != null && inputContext.auth.length > 0) {
            for (var i = 0; i < inputContext.auth.length; i++) {
                if (inputContext.auth[i]["type"] == "oauth2") {
                    //if config is empty or there are missing keys, then we drop it
                    if (inputContext.auth[i]["config"] == null) {
						utils.log('Empty OAuth configuration!');
                        return null;
                    }

                    if (inputContext.auth[i]["config"]["oauth2.authorizationEndpoint"] == null) {
						utils.log('Empty OAuth key: oauth2.authorizationEndpoint!');
                        return null;
                    }

                    if (inputContext.auth[i]["config"]["oauth2.tokenEndpoint"] == null) {
						utils.log('Empty OAuth key: oauth2.tokenEndpoint!');
                        return null;
                    }

                    if (inputContext.auth[i]["config"]["oauth2.clientID"] == null) {
						utils.log('Empty OAuth key: oauth2.clientID!');
                        return null;
                    }
					
					  if (inputContext.auth[i]["config"]["oauth2.grantType"] == null) {
						utils.log('Empty OAuth key: oauth2.grantType!');
                        return null;
                    }
                return inputContext.auth[i];
                }
                }
            }
        return null;
    };

    var passcodePolicyAttributeNames = [
        "minUniqueChars",
        "hasLowerCaseLetters",
        "hasSpecialLetters",
        "hasUpperCaseLetters",
        "minLength",
        "retryLimit",
        "lockTimeout",
        "hasDigits",
        "defaultAllowed",
        "expirationDays",
        "allowFingerprint"
    ];

    var checkForClassicStyle = function(logonView) {
        if (logonView.getStyle && logonView.getStyle() === "classic") {
            classicStyle = true;
        } else {
            classicStyle = false;
        }
    }

    var init = function(successCallback, errorCallback, applicationId, context, customView, credentialProviderID) {
        sap.logon.Utils.logPerformanceMessage("logonController.js: init");
        if (device.platform.toLowerCase() == "android" && context && context.multiUser) {
            // multi user is not implemented on Android - make sure it is set to false
            context.multiUser = false;
        }

        normalizeResourcePath(context);

        _resumeListenerErrorCallback = errorCallback;
        document.addEventListener("resume", _resumeListener, false);

        // The success callback used for the call to _oLogonCore.initLogon(...)
        var initSuccess = function(certificateSetToLogonCore) {
            utils.debug('LogonController: LogonCore successfully initialized.');

            _credentialProviderCertificateAvailable = certificateSetToLogonCore;

            // Now that Logon is initialized, registerOrUnlock is automatically called.
            registerOrUnlock(function(context, state) {
                    _oLogonCore.onRegistrationFinished(_bIsWebRegistration, context, state);
                    persistAllowSaveFormCredentialsConfig(_providedContext.allowSavingFormCredentials);

                    var url = (context.registrationContext.https ? "https" : "http") + "://" + context.registrationContext.serverHost + utils.getPort(context.registrationContext.serverPort, true) + "/";

                    sap.AuthProxy.addLogonCookiesToWebview(function() {
                        successCallback(context, _regNewUserInProgress);
                        _regNewUserInProgress = false;
                    }, errorCallback, url);
                },
                function(){
                    _regNewUserInProgress = false;
                    errorCallback.apply(this, arguments);
                },
                {
                    forceAuth: true
                });
        }

        var initError = function(error) {
            _regNewUserInProgress = false;
            // If a parameter describing the error is given, pass it along.
            // Otherwise, construct something to call the error callback with.
            if (error) {
                errorCallback(error);
            } else {
                errorCallback(utils.Error('ERR_INIT_FAILED'));
            }
        }

        var getCertificateProviderConfig = function(inputContext) {

            if (inputContext != null && inputContext.auth != null && inputContext.auth != null && inputContext.auth.length > 0) {
                for (var i = 0; i < inputContext.auth.length; i++) {
                    if (inputContext.auth[i]["type"] == "certificate.sdkprovider") {
                        return inputContext.auth[i];
                    }
                }
            }
            return null;
        }

        utils.debug('LogonController.init enter: ' + applicationId);

        module.exports.applicationId = applicationId;

        // Make note of the context given (if any)
        if (context) {
            _providedContext = context;
        } else {
            _providedContext = {};
        }

        sap.logon.Core.getNativeAppName(function(name) {
            _providedContext._defaultAppName = name;
        }, function(error) {
            utils.log('Failed to fetch native app name: ' + error);
            _providedContext._defaultAppName = 'app';
        });
        
        _oLogonView = customView;
        if (!_oLogonView) {
            _oLogonView = sap.logon.LogonJsView;
        }

        checkForClassicStyle(_oLogonView);

        flowqueue = new FlowRunnerQueue();

        //coLogonCore.cordova.require("com.sap.mp.cordova.plugins.logon.LogonCore");
        _oLogonCore = sap.logon.Core;

        _oLogonCore.setLogonCoreSubInstance(null);
        if (context && context.useLocalStorage){
            _oLogonCore.setLogonCoreSubInstance(sap.logon.CoreLocalStorage);
        }
        
        _credentialProviderID = credentialProviderID;
        _bIsWebRegistration = false;

        // We need to get the Mobile Place configuration BEFORE calling init.  This is
        // because if the configuration is set to use a client certificate, we need to
        // set that before calling init (because that's the only way Logon Core will
        // notice it properly).
        if (_providedContext && _providedContext.mobilePlace) {
            function onEnterEmailSubmit(context) {
                utils.debugJSON(context, 'logon.onEnterEmailSubmit');
                var email = context.email;
                // A very basic regex that does minimal validation of the email.
                var emailRegex = /.+@.+/;
                if (emailRegex.test(email)) {
                    var successCallback = function(result) {
                        if (result.status == 200 && result.responseText) {
                            utils.debug("got configuration from MobilePlace: " + result.responseText);
                            var configFromMobilePlace = {};
                            var config = JSON.parse(result.responseText);
                            if (config.host) {
                                configFromMobilePlace.serverHost = config.host;
                            }
                            if (config.resourcePath) {
                                configFromMobilePlace.resourcePath = config.resourcePath;
                            }
                            if (config.farmId) {
                                configFromMobilePlace.farmId = config.farmId;
                            }
                            if (config.port) {
                                configFromMobilePlace.serverPort = config.port;
                            }
                            if (config.protocol) {
                                if (config.protocol.toLowerCase() == "http") {
                                    configFromMobilePlace.https = false;
                                } else {
                                    configFromMobilePlace.https = true;
                                }
                            }
                            if (config.auth) {
                                configFromMobilePlace.auth = config.auth;
                            }
                            // If the host, port and protocol are set, then the config is valid.
                            // There are other optional properties that might also be set.
                            if (config.host && config.port && config.protocol) {

                                var initSuccessMobilePlace = function(certificateSetToLogonCore) {
                                        _oLogonCore.skipClientHub(function() {
                                            initSuccess(certificateSetToLogonCore);
                                        }, function(error) {
                                            utils.logJSON(error, "")
                                        });
                                    }
                                    // Merge the configFromMobilePlace into the _providedContext object.
                                    // _providedContext will later be merged into the registration context
                                    // before the registration is started.
                                mergeSettingsIntoRegistrationContext(configFromMobilePlace, _providedContext);

                                if (getCertificateProviderConfig(config) != null) {
                                    _credentialProviderID = getCertificateProviderConfig(config)['config']['certificate.sdkprovider.*'];
                                    var successOrError = function() {
                                        _oLogonCore.initLogon(initSuccessMobilePlace, initError, applicationId, _credentialProviderID, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
                                    }
                                    _oLogonCore.setUserCreationPolicy(successOrError, successOrError, "certificate", applicationId, _providedContext, _credentialProviderID);
                                } else {
                                    _oLogonCore.initLogon(initSuccessMobilePlace, initError, applicationId, _credentialProviderID, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
                                }

                            } else {
                                _oLogonView.showNotification("ERR_MOBILE_PLACE_CONFIG_INVALID");
                            }
                        } else {
                            _oLogonView.showNotification("ERR_MOBILE_PLACE_CONFIG_NOT_RETRIEVED");
                        }
                    }
                    var errorCallback = function(error) {
                        _oLogonView.showNotification("ERR_MOBILE_PLACE_CONFIG_NOT_RETRIEVED");
                    }
                    var appID = module.exports.applicationId;

                    var mobilePlaceHost = "https://discovery.sapmobilesecure.com";

                    //switch to dev testing mobile place server if the email domin include "mock.domain.test.only".
                    var emailDomainIndex = email.indexOf("@");
                    var emailDomain = email.substring(emailDomainIndex);
                    if (emailDomain.indexOf("murray.sapmobileplace.com") != -1) {
                        mobilePlaceHost = "https://portal.murray.sapmobilesecure.com";
                    } else if (emailDomain.indexOf("next.sapmobileplace.com") != -1) {
                        mobilePlaceHost = "https://portal.next.sapmobilesecure.com";
                    } else if (emailDomain.indexOf("mock.domain.test.only") != -1 || emailDomain.indexOf("devtest.sapmobilesecure.com") != -1) {
                        mobilePlaceHost = "https://portal.devtest.sapmobilesecure.com";
                    }


                    //update mobilePlaceHost if caller sets it in provided context
                    if (_providedContext.mobilePlaceHost != undefined) {
                        mobilePlaceHost = _providedContext.mobilePlaceHost;
                    }

                    var mobilePlaceAppID = appID;
                    if (_providedContext.mobilePlaceAppID != undefined) {
                        mobilePlaceAppID = _providedContext.mobilePlaceAppID;
                    }

                    //if mobile place app version is provided and the value is empty string,
                    //then do not append ':' after mobilePlaceHost,
                    //if mobile place App version is null or undefined, then set it to default value 1.0
                    var mobilePlaceAppVersion = "";
                    if (_providedContext.mobilePlaceAppVersion != undefined) {
                        if (_providedContext.mobilePlaceAppVersion != "") {
                            mobilePlaceAppVersion = ":" + _providedContext.mobilePlaceAppVersion;
                        }
                    } else {
                        mobilePlaceAppVersion = ":1.0";
                    }

                    var getAppConfigUrl = mobilePlaceHost + "/config-api.svc/ApplicationConfigurations/getApplicationConfiguration(AppConfigID='" + mobilePlaceAppID + mobilePlaceAppVersion + "',EmailAddress='" + email + "')";
                    sap.AuthProxy.sendRequest("GET", getAppConfigUrl, null, null, successCallback, errorCallback);
                } else {
                    _oLogonView.showNotification("ERR_INVALID_EMAIL");
                }
            }

            // We need to check whether this app is already registered.  If it is
            // then we just call initLogon normally.  If not, then we have to get
            // the configuration from Mobile Place.
            var isRegisteredCallback = function(result) {
                if (result) {
                    _oLogonCore.initLogon(initSuccess, initError, applicationId, credentialProviderID, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
                } else {
                    _oLogonView.showScreen('SCR_ENTER_EMAIL', {
                        onsubmit: onEnterEmailSubmit,
                        oncancel: function(error) {
                            _oLogonView.close();
                            initError(error);
                        }
                    }, _providedContext);
                }
            }
            _oLogonCore.isRegistered(isRegisteredCallback, initError, applicationId, _providedContext);
        } else {
            if (credentialProviderID) {
                var callbackMethod = function() {
                    _oLogonCore.initLogon(initSuccess, initError, applicationId, credentialProviderID, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
                }

                var isRegisteredCallback = function(result) {
                    if (result) {
                        _oLogonCore.initLogon(initSuccess, initError, applicationId, credentialProviderID, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
                    } else {
                        _oLogonCore.setUserCreationPolicy(callbackMethod, callbackMethod, "certificate", applicationId, _providedContext, credentialProviderID, _providedContext);
                    }
                }
                _oLogonCore.isRegistered(isRegisteredCallback, initError, applicationId, _providedContext);

            } else {
                _oLogonCore.initLogon(initSuccess, initError, applicationId, undefined, undefined, _providedContext.passcodePolicy, undefined, _providedContext);
            }

        }

        //update exports definition
        module.exports.core = _oLogonCore;
    }

    var initPasscodeManager = function(successCallback, errorCallback, applicationId, customView, passcodePolicy, context, credentialProviderID) {
        sap.logon.Utils.logPerformanceMessage("logonController.js: initPasscodeManager");
        if (context && context.multiUser) {
            // multi user is not supported for the passcode manager case - make sure it is set to false
            context.multiUser = false;
        }

        if (verifyPasscodePolicy(passcodePolicy)) {
            errorCallback(errorWithDomainCodeDescription("MAFLogon", "7", "Unrecognized attribute name: " + verifyPasscodePolicy(passcodePolicy) + " in the given passcode policy."));
            return;
        }

        _resumeListenerErrorCallback = errorCallback;
        document.addEventListener("resume", _resumeListener, false);

        // The success callback used for the call to _oLogonCore.initLogon(...)
        var initSuccess = function(certificateSetToLogonCore) {
            utils.debug('LogonController: LogonCore successfully initialized.');

            _credentialProviderCertificateAvailable = certificateSetToLogonCore;

            // Now that Logon is initialized, registerOrUnlock is automatically called.
            registerOrUnlock(function(context, state) {
                _oLogonCore.onRegistrationFinished(_bIsWebRegistration, context, state);
                successCallback(context);
                }, errorCallback);
        }

        var initError = function(error) {
            // If a parameter describing the error is given, pass it along.
            // Otherwise, construct something to call the error callback with.
            if (error) {
                errorCallback(error);
            } else {
                errorCallback(utils.Error('ERR_INIT_FAILED'));
            }
        }


        utils.debug('LogonController.initPasscodeManager enter: ' + applicationId);
 
        module.exports.applicationId = applicationId;

        _oLogonView = customView;
        if (!_oLogonView) {
            _oLogonView = sap.logon.LogonJsView;
        }

        checkForClassicStyle(_oLogonView);

        flowqueue = new FlowRunnerQueue();

        //coLogonCore.cordova.require("com.sap.mp.cordova.plugins.logon.LogonCore");
        _oLogonCore = sap.logon.Core;
        
        _oLogonCore.setLogonCoreSubInstance(null);
        if (context && context.useLocalStorage){
            _oLogonCore.setLogonCoreSubInstance(sap.logon.CoreLocalStorage);
        }

        // Make note of the context given (if any)
        if (context) {
            _providedContext = context;
        }
        else {
            context = {};
        }
        
        if (passcodePolicy) {
            _providedPasscodePolicyContext = passcodePolicy;
            context["policyContext"] = _providedPasscodePolicyContext;
        }

        sap.logon.Core.getNativeAppName(function(name) {
            context._defaultAppName = name;
        }, function(error) {
            utils.log('Failed to fetch native app name: ' + error);
            context._defaultAppName = 'app';
        });

        _bIsWebRegistration = true;

        _oLogonCore.initLogon(initSuccess, initError, applicationId, credentialProviderID, _bIsWebRegistration, null, null, context);

        //update exports definition
        module.exports.core = _oLogonCore;
    }

    var fireEvent = function(eventId, args) {
        if (typeof eventId === 'string') {
            //var event = document.createEvent('Events');
            //event.initEvent(eventId, false, false);

            if (!window.CustomEvent) {
                window.CustomEvent = function(type, eventInitDict) {
                    var newEvent = document.createEvent('CustomEvent');
                    newEvent.initCustomEvent(
                        type, !!(eventInitDict && eventInitDict.bubbles), !!(eventInitDict && eventInitDict.cancelable), (eventInitDict ? eventInitDict.detail : null));
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
            } else {
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
        } else {
            throw 'Invalid eventId: ' + JSON.stringify(event);
        }
    }

    var showCertificateProviderScreen = function(viewIDSettings) {
        if (!_registrationEventsForCredentialProvider) {
            // This case will only occur if showCertificateProviderScreen has been called
            // without refreshCertificate being called first.  This should only happen during
            // logon init on Android.  Since the call did not originate in the javascript, we
            // don't have to worry about many of the callbacks.  Either we'll call
            // setParametersForProvider with the context, or we'll call it with "cancelled".
            _registrationEventsForCredentialProvider = {
                onsubmit: function(context) {
                    utils.debugJSON(context, 'logonCore.setCertificateProviderCredential');
                    _oLogonCore.setParametersForProvider(function() {}, function() {}, context);
                },
                oncancel: function(error) {
                    _oLogonView.close();
                    _credentialProviderCertificateAvailable = true;
                    _oLogonCore.setParametersForProvider(function() {}, function() {}, "cancelled");
                },
                onerror: function(error) {
                    _oLogonView.showNotification(error.errorDomain + "@" + error.errorCode);
                }
            };
        }

        setTimeout(
            function() {
                var context = JSON.parse(viewIDSettings);
                _oLogonView.showScreen("SCR_GET_CERTIFICATE_PROVIDER_PARAMETER", _registrationEventsForCredentialProvider, context);
            }, 1);
    }

    var refreshCertificate = function(successCallback, errorCallback) {

        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            errorCallback(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        if (_bIsWebRegistration) {
            utils.log('refreshCertificate is not supported for passcode manager only initialization');
            errorCallback(errorWithDomainCodeDescription("MAFLogon", "6", "refreshCertificate is not supported for PasscodeManager only initialization"));
            return;
        }

        if (!_credentialProviderID) {
            utils.log('FlowRunner.run credential provider is not provided');
            errorCallback(errorWithDomainCodeDescription("MAFLogon", "4", "credential provider is not provided"));
            return;
        }

        _registrationEventsForCredentialProvider = {
            onsubmit: function(context) {
                utils.debugJSON(context, 'logonCore.setCertificateProviderCredential');
                _oLogonCore.setParametersForProvider(
                    function() {
                        utils.debug("setParameterForProvider success callback");
                    }, //only for debug
                    errorCallback,
                    context);
            },
            oncancel: function(error) {
                _oLogonView.close();
                _credentialProviderCertificateAvailable = true;
            },
            onerror: function(error) {
                _oLogonView.showNotification(error.errorDomain + "@" + error.errorCode);
            }
        };

        _oLogonCore.getCertificateFromProvider(
            function(success) {
                _oLogonView.close();
                _credentialProviderCertificateAvailable = true;
                successCallback(success);
            },
            function(error) {
                //if the error is user cancel, then close the window, otherwise keeping the screen to allow user corrects the error
                _oLogonView.showNotification(error.errorDomain + "@" + error.errorCode);
                _credentialProviderCertificateAvailable = false;
                //errorCallback(error);
            },
            true
        );
    }

    var getOAuth2Token = function(done) {
        var token = {};

        var getDataVaultValue = function(name , valueCallback) {
            sap.logon.Core.getSecureStoreObject(function (value) {
                valueCallback(value);
            }, function (e) {
                utils.debug('Failed to get' +  name + '. ' + JSON.stringify(e));
                valueCallback();
            }, name);
        }

        getDataVaultValue('accessToken', function(accessToken) {
            if (accessToken && accessToken.length > 0) {
                token.access_token = accessToken;
            }
            getDataVaultValue('refreshToken', function(refreshToken) {
                if (refreshToken && refreshToken.length > 0) {
                    token.refresh_token = refreshToken;
                }
                done(token);
            });
        });
    };

    var saveOAuth2Token = function(token, done) {
        var saveDataVaultValue = function(name, value, callback) {
            sap.logon.Core.setSecureStoreObject(callback, function (error) {
                utils.debug('Failed to save ' + name + '. ' + JSON.stringify(error));
                callback();
            }, name, value);
        }

        if (token) {
            if (token.access_token) {
                saveDataVaultValue('accessToken', token.access_token, function() {
                    if (token.refresh_token) {
                        saveDataVaultValue('refreshToken', token.refresh_token, function() {
                            done();
                        });
                    }
                });
            } else if (token.refresh_token) {
                saveDataVaultValue('refreshToken', token.refresh_token, function() {
                    done();
                });
            }
            else {
                done();
            }
        } else {
            done();
        }
    }

    var pingServer = function (context, successCallback, errorCallback, retry) {
        var win = function(result) {
            if (successCallback) {
                successCallback(result);
            }
        }

        var fail = function(error) {
            if (errorCallback) {
                errorCallback(error);
            }
        }

        // use cert from Logon in case a cert provider is configured. If the cert provider is not configured, the logon will return nil
        var logonCert;
        if (cordova.require("cordova/platform").id.indexOf("windows") === -1) {
            logonCert = new sap.AuthProxy.CertificateFromLogonManager(module.exports.applicationId);
        }
        var url = utils.getBaseServerURL(context) + "/odata/applications/v1/" + module.exports.applicationId;
        sap.AuthProxy.sendRequest("GET", url, null, null, function (result) {
            // We can't reliably detect a SAML2 challenge for redirect binding
            // The response here should be XML if it is HTML this is a SAML challenge
            if (getSAMLConfig(context) && !sap.AuthProxy.SAML2.isChallenge(result) && result && result.status === 200) {
                var mediaType = cordova.require('kapsel-plugin-authproxy.utils').getMediaTypeFromResponse(result)
                if (mediaType && mediaType.toLowerCase() === "text/html") {
                    console.log("WARNING: Unexpected SAML2 challenge detected.  If using Redirect Binding please consider using Post Binding instead.")
                    sap.AuthProxy.SAML2.authenticate(function() {
                        // No need to ping server again as we now have a session.
                        utils.debug("SAML2 authentication succeeded for pingServer request.");
                        win({
                            response: result
                        });
                    }, function(error) {
                        console.log("ERROR performing SAML2 authentication. " + JSON.stringify(error));
                        fail({
                            message: "ERROR performing SAML2 authentication. " + JSON.stringify(error)
                        });
                    });
                }
                else {
                    utils.debug("pingServer success with status " + result.status);
                    win({
                        response: result
                    });
                }
            } else {
                if (result.status >= 200 && result.status < 300) {
                    utils.debug("pingServer success with result in 200 range: " + result.status);
                    win({
                        response: result
                    });
                }else {
                    utils.log("Unexpected status from pingServer response: " + result.status);
                    fail({
                        message: "Ping request was not successful.  Status code: " + result.status
                    });
                }
            }
        }, function (error) {
            utils.log("error sending ping request" + JSON.stringify(error));

            if (retry) {
                var i18n = require('kapsel-plugin-i18n.i18n');
                i18n.load({
                    path: "smp/logon/i18n",
                    name: "i18n"
                }, function (bundle) {
                    navigator.notification.confirm(bundle.get("FAILED_TO_CONNECT"),
                        function (buttonIndex) {
                            if (buttonIndex === 1) {
                                pingServer(context, successCallback, errorCallback, retry);
                            } else {
                                fail({
                                    message: "Canceled retry attempt",
                                    error: error
                                });
                            }
                        },
                        undefined, [bundle.get("BUTTON_OK"), bundle.get("BUTTON_CANCEL")]
                    );
                });
            } else {
                fail({
                    message: "Request error.",
                    error: error
                });
            }
        }, null, null, null, logonCert);
    }

    //flowcontext is used to store information about a particular flow, such as whehter it is started from
    //init method or unlock method.
    //flowcontext is optional, but if it is passed by caller, it should have the below properties
    //caller: id to identify the caller who start the current flow, this is only for debug purpose
    //forceAuth: force OAuth/SAML authentication even if datavault is already unlocked. Usually, the SAML
    //               auth is only performed when data vaule is actually changed from lock to unlock state, 
    //               however, if passcode is disablled, then  datavaule it already unlocked.
    //               In this case, caller can set this flag to force to perform SAML auth.
    //               logon.init sets this flag to fix the issue of. Refer to CSS Bug 1453032 2014 "No SAML challenge if passcode is disabled"

    var FlowRunner = function(callbacks, pLogonView, pLogonCore, flowClass, flowContext) {

        var onFlowSuccess;
        var onFlowError;
        var onFlowCancel;

        var logonView;
        var logonCore;
        var flow;

        var onsuccess = callbacks.onsuccess;
        var onerror = callbacks.onerror;

        if (!flowContext) {
            flowContext = {};
        }


        logonView = pLogonView;
        logonCore = pLogonCore;

        onFlowSuccess = function onFlowSuccess() {
            utils.debug('onFlowSuccess');
    
            var originThis = this;
            var originArgument = arguments;

    		//do not cancel the flow on success callback
	        logonView.close(function(){
                onsuccess.apply(originThis, originArgument);
                //custom code (Loves) : Start auto logging the user in
                //Start auto login functionality
                //Open a url for the sap authenticator to authenticate if this page is from idp
                var obj = window.document.getElementById("mobile-loves-sso");
                if (obj !== null ){
                    var url = window.document.getElementById("mobile-loves-sso").getAttribute("url");
                    var upe = window.document.getElementById("mobile-loves-sso-underprocess");
                    if (upe === null){
                        obj.value = "Auto logging you in...";
                        obj.disabled = true;
                        var under_process = window.document.createElement("div");
                        under_process.setAttribute("id","mobile-loves-sso-underprocess")
                        obj.insertBefore(under_process,url);
                        
                        //remove the login and apassword and login and password buttons
                        var loginwindow = window.document.getElementById("uiloginwindow");
                        var loginbutton = window.document.getElementsByName("uidPasswordLogon");
    //                              var pwdbutton = window.document.getElementsByName("cancelIdPLogon");
                        
                        if(loginwindow !== null){
                            loginwindow.remove();
                        }
                        if (loginbutton[0] !== null){
                            loginbutton[0].remove();
                        }
    //                              if (pwdbutton[0] !== null){
    //                                  pwdbutton[0].remove();
    //                              }
                        url = "sapauthenticator://x-callback-url/setCredential?x-source=com.sap.authenticator&username_paramname=j_username&username_paramvalue=[username]&passcode_paramname=j_passcode&passcode_paramvalue=[passcode]&x-callback-scheme=com.loves.fioriclient.xcallbackurl";
                        //window.open(url,"_system");
                        var sApp = startApp.set("sapauthenticator://");
                    }
                }
                //end of custom code
            }, true);
        }



        onFlowError = function onFlowError() {
            utils.logJSON('onFlowError');
            
            var originThis = this;
            var originArgument = arguments;
            logonView.close( function(){
                onerror.apply(originThis, originArgument);
            });
        }

        onFlowCancel = function onFlowCancel() {
            utils.logJSON('onFlowCancel');

            onFlowError(new utils.Error('ERR_USER_CANCELLED'));
        }

        var handleCoreStateOnly = function(currentState) {
            utils.debug('handleCoreStateOnly called: ' + flow.flowID);
            handleCoreResult(null, currentState);
        }

        var handleCoreResult = function(currentContext, currentState) {
            if (typeof currentContext === undefined) currentContext = null;

            //workaround for defaultPasscodeAllowed. If caller provides the context, use it, otherwise using current context. 
            if (currentState && !currentState.hasOwnProperty("defaultPasscodeAllowed")) {
                if (_providedPasscodePolicyContext && _providedPasscodePolicyContext.hasOwnProperty("defaultAllowed")) {
                    if (_providedPasscodePolicyContext.defaultAllowed === 'true') {
                        currentState.defaultPasscodeAllowed = true;
                    } else if (_providedPasscodePolicyContext.defaultAllowed === 'false') {
                        currentState.defaultPasscodeAllowed = false;
                    } else {
                        currentState.defaultPasscodeAllowed = _providedPasscodePolicyContext.defaultAllowed;
                    }
                } else if (currentContext && currentContext.policyContext && currentContext.policyContext.hasOwnProperty("defaultAllowed")) {
                    if (currentContext.policyContext.defaultAllowed === 'true') {
                        currentState.defaultPasscodeAllowed = true;
                    } else if (currentContext.policyContext.defaultAllowed === 'false') {
                        currentState.defaultPasscodeAllowed = false;
                    } else {
                        currentState.defaultPasscodeAllowed = currentContext.policyContext.defaultAllowed;
                    }
                } else {
                    currentState.defaultPasscodeAllowed = true;
                }
            }

            utils.debugJSON(currentContext, 'handleCoreResult currentContext for flow: ' + flow.name);
            utils.debugJSON(currentState, 'handleCoreResult currentState for flow:' + flow.name);

            var matchFound = false;
            var rules = flow.stateTransitions;


            ruleMatching:
                for (key in rules) {

                    var rule = flow.stateTransitions[key];
                    utils.debugJSON(rule, rule.id);

                    if (typeof rule.condition === 'undefined') {
                        throw 'undefined condition in state transition rule';
                    }


                    if (rule.condition.state === null) {
                        if (currentState) {
                            continue ruleMatching; // non-null state (and rule) mismatch
                        }
                        //else {
                        //	// match: 
                        //	// rule.condition.state === null &&
                        //	// (typeof currentState === 'undefined') // null or undefined
                        //}
                    } else if (rule.condition.state !== 'undefined' && currentState) {

                        stateMatching: for (field in rule.condition.state) {

                            if (rule.condition.state[field] === currentState[field]) {
                                continue stateMatching; // state field match 
                            } else {
                                utils.debug('state field mismatching ' + field);
                                continue ruleMatching; // state field (and rule) mismatch
                            };
                        }
                    }

                    if (rule.condition.context === null) {
                        if (currentContext) {
                            continue ruleMatching; // non-null context (and rule) mismatch
                        }
                        //else {
                        //	// match: 
                        //	// rule.condition.context === null &&
                        //	// (typeof currentContext === 'undefined') // null or undefined
                        //}
                    } else if (rule.condition.context !== 'undefined' && currentContext) {

                        contextMatching: for (field in rule.condition.context) {
                            if (rule.condition.context[field] === currentContext[field]) {
                                continue contextMatching; // context field match 
                            } else {
                                utils.debug('context field mismatching ' + field);
                                continue ruleMatching; // context field (and rule) mismatch
                            };
                        }
                    }

                    if (rule.condition.method != null) {
                        if (!rule.condition.method(currentState, currentContext)) {
                            continue ruleMatching; // non-null context (and rule) mismatch
                        }
                    }

                    utils.debugJSON(rule, 'match found on rule: ' + rule.id);

                    //handle post match action
                    var action = rule.action;
                    if (flow.postMatchAction) {
                        action = flow.postMatchAction(rule);
                        if (action == null) {
                            return;
                        }
                    }

                    //set the smp registration settings such as farmId, communicatorId to context
                    //previously this is only set when showing lgoon view screen, but if
                    //the config is already provided by appconfig.js, then no screen will show before
                    //calling registerWithContext, in that case, some of the registration settings will get lost
               
                    if (!currentContext) {
                        currentContext = {};
                    }

                    if (!currentContext.registrationContext && _providedContext) {
                        // The current registrationContext is null, and we have been given a context when initialized,
                        // so use the one we were given.
                        if (currentContext !== _providedContext) {
                        currentContext.registrationContext = _providedContext;
                        }
                    } else if (currentContext.registrationContext && _providedContext && !currentContext.registrationReadOnly && !(currentState.stateAfaria == 'initializationSuccessful' && currentState.status != "registered")) {
                        for (key in _providedContext) {
                            currentContext.registrationContext[key] = _providedContext[key];
                        }
                    }

                    if (typeof action === 'function') {
                        action(currentContext, currentState);
                    } else if (typeof action === 'string') {
                        // the action is a screenId
                        var screenId = action;
                        utils.debug('handleCoreResult: ' + screenId);
                        utils.debugKeys(flow.screenEvents[screenId]);
                        if (currentContext && currentContext.registrationContext) {
                            currentContext.registrationContext.passcodeEnabled = !currentState.defaultPasscodeUsed;
                        }

                        if (screenId.indexOf("SCR_SET_PASSCODE") == 0 || screenId.indexOf("SCR_MANAGE_PASSCODE") == 0 || screenId.indexOf("SCR_CHANGE_PASSCODE") == 0 || screenId.indexOf("SCR_UNLOCK") == 0) {
                                if (currentContext && currentContext.registrationContext && currentContext.registrationContext.multiUser ){
                                    //add the user information to registration context for inappbrowser to validate the user
                                    currentContext.registrationContext.multiUserInfo = currentState.multiUser;
                                    logonView.showScreen(screenId, flow.screenEvents[screenId], currentContext);
                                }
                                else{
                                    var success = function(result) {
                                        if (currentContext && currentContext.registrationContext) {
                                            if (result === null) {
                                                currentContext.registrationContext.fingerprintScanAvailable = false;
                                                currentContext.registrationContext.fingerprintScanEnabled = false;
                                            } else {
                                                currentContext.registrationContext.fingerprintScanAvailable = result.isAvailable;
                                                currentContext.registrationContext.fingerprintScanEnabled = result.isAvailable && result.isEnabled;
                                            }
                                        }
                                        logonView.showScreen(screenId, flow.screenEvents[screenId], currentContext);
                                    }
                                    var error = function() {
                                        console.log("Error in isFingerprintAvailable");
                                        if (currentContext && currentContext.registrationContext) {
                                            currentContext.registrationContext.fingerprintScanAvailable = false;
                                        }
                                        logonView.showScreen(screenId, flow.screenEvents[screenId], currentContext);
                                    }
               
                                    if (_bIsWebRegistration) {
                                        if (window.fiori_client_appConfig && window.fiori_client_appConfig.passcodePolicy){  //app just restarted
                                            //by default, fingerprint is enabled. Only disable it if specified in config.
                                            if ((window.fiori_client_appConfig.passcodePolicy.allowFingerprint === "false" || window.fiori_client_appConfig.passcodePolicy.allowFingerprint === false) ){
                                                success({
                                                        isEnabled : false,
                                                        isAvailable : false
                                                });
                                            }
                                            else{
                                                sap.logon.Core.isFingerprintAvailable(success, error)
                                            }
                                        }
                                        else{  //app resumed
                                            sap.logon.Core.getPasswordPolicyForUser(function (policy){
                                                if (policy.allowFingerprint){
                                                    sap.logon.Core.isFingerprintAvailable(success, error);
                                                }
                                                else{
                                                    success({
                                                            isEnabled : false,
                                                            isAvailable : false
                                                    });
                                                }
                                            }, error, null);
                                        }
                                    }
                                    else { // SMP registration, if context is available, then this is the first registration
                                        if (currentContext && currentContext.policyContext){
                                            if (currentContext.policyContext.allowFingerprint == false ){
                                                //finger print is disabled by server policy
                                                success({
                                                        isEnabled : false,
                                                        isAvailable : false
                                                });
                                            }
                                            else{
                                                sap.logon.Core.isFingerprintAvailable(success, error);
                                            }
                                        }
                                        else{
                                            //if data vault is locked, then policyContext will not be available, 
                                            sap.logon.Core.getPasswordPolicyForUser(function (policy){
                                                if (policy.allowFingerprint){
                                                    sap.logon.Core.isFingerprintAvailable(success, error);
                                                }
                                                else{
                                                    success({
                                                            isEnabled : false,
                                                            isAvailable : false
                                                    });
                                                }
                                            }, error, null);
                                        }
                                    }
                                }
                        }
                        else {
                            //Skip UI for Kapsel Logon if specified in context's 'custom' field
                            if(screenId=="SCR_REGISTRATION" && currentContext && currentContext.registrationContext && currentContext.registrationContext.custom && currentContext.registrationContext.custom.skipRegistrationScreen){
                               _oLogonCore.startRegistration(onFlowSuccess, onFlowError, currentContext.registrationContext);
                            }
                            else{
                                logonView.showScreen(screenId, flow.screenEvents[screenId], currentContext);
                            }            
                        }
                    } else {
                        onFlowError(new utils.Error('ERR_INVALID_ACTION'));
                    }

                    matchFound = true;
                    break ruleMatching;
                }

            if (!matchFound) {
                onFlowError(new utils.Error('ERR_INVALID_STATE'));
            }
        }

        flow = new flowClass(logonCore, logonView, handleCoreResult, onFlowSuccess, onFlowError, onFlowCancel);

        flow.flowID = FlowRunner.currentID++; //unique id
        flow.forceAuth = flowContext.forceAuth;
        this.flow = flow;

        utils.debug("create new flow with id: " + flow.flowID + ", " + flow.caller);

        this.run = function() {
            utils.debugKeys(flow, 'FlowRunner.run new flow: ' + flowClass.name);
            logonCore.getState(handleCoreStateOnly, onFlowError);
        }
    }

    //static property to track flow id
    FlowRunner.currentID = 0;

    var FlowRunnerQueue = function() {
        var isRunning = false;
        var innerQueue = [];

        this.add = function(flowRunner) {
            innerQueue.push(flowRunner);
            if (isRunning == false) {
               utils.debug('FlowRunnerQueue.add, queue is idle, run ' + flowRunner.flow.name + ', id:' + flowRunner.flow.flowID);
               isRunning = true;
               process();
            }
            else{
                utils.debug('FlowRunnerQueue.add, queue is already running, queue the flow:' + flowRunner.flow.name + ', id:' + flowRunner.flow.flowID);
            }           
        }

        this.runNextFlow = function() {
            var flowRunner = innerQueue.shift();
             if(!flowRunner){
                utils.debug('FlowRunnerQueue.runNextFlow, no processed flowrunner?, return' + ', new queuecount: ' + innerQueue.length);
                return;
            }
            else{
               utils.debug('FlowRunnerQueue.runNextFlow, remove last processed flowrunner from queue: ' + flowRunner.flow.name + ', id:' + flowRunner.flow.flowID + ', new queuecount: ' +innerQueue.length);
            }


            if (innerQueue.length == 0) {
                utils.debug('FlowRunnerQueue.runNextFlow, flowqueue is empty, set running to false, queuecount: ' + innerQueue.length);
                isRunning = false;
            } else {
                utils.debug('FlowRunnerQueue.runNextFlow, process next flow, queuecount: ' + innerQueue.length);
                process();
            }
        }

        var process = function() {
            if (innerQueue.length > 0) {
                var flowRunner = innerQueue[0];
                utils.debug('FlowRunnerQueue.process, process first flow in queue: ' +  flowRunner.flow.name + ', id:' + flowRunner.flow.flowID + ', queuecount: ' + innerQueue.length);
                flowRunner.run();
            } else {
                utils.debug('FlowRunnerQueue.process, not flow to process, set isRunning to false, queuecount: ' + innerQueue.length);
                isRunning = false;
            }
        }
    }


    var MockFlow = function MockFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks
        //var flow = {};

        this.name = 'mockFlowBuilder';

        this.stateTransitions = [{
                id: "m0",
                condition: {
                    state: {
                        secureStoreOpen: false
                    }
                },
                action: 'SCR_MOCKSCREEN'
            }, {
                id: "m1",
                condition: {
                    state: {
                        secureStoreOpen: true
                    }
                },
                action: 'SCR_MOCKSCREEN'
            },

        ];

        this.screenEvents = {
            'SCR_TURN_PASSCODE_ON': {
                onsubmit: onFlowSuccess,
                oncancel: onFlowCancel,
                onerror: onFlowError
            }
        };

        utils.debug('flow constructor return');
        //return flow;
    }

    var RegistrationFlow = function RegistrationFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks

        this.name = 'registrationFlowBuilder';

        var registrationInProgress = false;
        var AuthState = "notInit";
        var bNewRegistration = false;
        var bUnlockPerformed = false;
        var startRegistrationContext = null;
        var onCancelSSOPin = function() {
            onFlowError(errorWithDomainCodeDescription("MAFLogon", "0", "SSO Passcode set screen was cancelled"));
        }

        var onCancelRegistration = function() {
            onFlowError(errorWithDomainCodeDescription("MAFLogon", "1", "Registration screen was cancelled"));
        }

        var onCancelAfariaRegistration = function() {
            _oLogonCore.setUserCreationPolicy(onCancelRegistration, onCancelRegistration, "automatic", sap.Logon.applicationId, _providedContext, _credentialProviderID);
        }

        // internal methods
        var showScreen = function(screenId) {
            return function(coreContext) {
                logonView.showScreen(screenId, this.screenEvents[screenId], coreContext);
            }.bind(this);
        }.bind(this);
        
        var onRegNewUser = function(context){
            var regNewUser = function(context){
                if (appContext){
                    _regNewUserInProgress = true;
                    startLogonInit(null, null);
                }
                else{
                    //no need to localize the below error message, as it is only for developers
                    logonView.showNotification("", "Application context is undefined.",  "Registration Error");
                }
            };
            //logout the current user if it is not null, and then start registering a new user
            if (context.multiUserInfo.currentUser){
               sap.logon.Core.deactivateCurrentUser(function(){
                    //start new registration
                    regNewUser();
                    },
                    onUnlockError
                );
            }
            else{
                regNewUser();
            }
            
        };

        var onUnlockSubmit = function(context) {
            utils.debugJSON(context, 'logonCore.unlockSecureStore');
            bUnlockPerformed = true;
            
            if (context.multiUser && context.multiUserInfo.currentUser != context.currentSelectedUser.deviceUserId){
                //in multiuser mode, if a different user is logged in during unlock operation, then close the inappbrowser and reload
                //the home url to starting from fresh.
                // Loading via window.history.go doesn't work on Android in some cases.
                logonCore.activateSecureStoreForUser(onCoreResult, onUnlockError, context);
 
            }
            else{
                logonCore.unlockSecureStore(
                    function(currentContext, state){
                        currentContext.fingerprintScanEnabled = context.newFingerprintScanEnabled;
                        currentContext.passcode = context.unlockPasscode;
                        var fingerprintScanEnabledChanged = context.newFingerprintScanEnabled!=undefined && context.newFingerprintScanEnabled != context.fingerprintScanEnabled;
                        if (fingerprintScanEnabledChanged && (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android")){
                            sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, onUnlockError, currentContext);
                        }
                        else{
                            onCoreResult(currentContext, state);
                        }
                    },
                    onUnlockError, context);
            }
        }
        
        var onPasscodeChangeRequired = function(error, context){

           // passcode expired, ask user to change passcode with passcode policy
            var screenContext = {};
            if(typeof context === 'object' && context != null) {
                screenContext = context;
            }
            //first check whether the old passcode is disabled or not, the information is return in defaultPasscodeUsed propert
            if (error.defaultPasscodeUsed){
                screenContext.oldPasscodeEnabled = false;
            }
            else{
                screenContext.oldPasscodeEnabled = true;
            }
           
            //always enable user to input the new passcode for change passcode screen
            screenContext.passcodeEnabled = true;
           
            //set passcode policy, normalize the passcode policy to always use string type
         	var policy = {};
            for (var p in error.passcodePolicy){
                policy[p] = error.passcodePolicy[p].toString();
            }
            
            screenContext.policyContext = policy;
           
            //the below property is used for customize the text in fiori change passcode screen
            if (error.errorCode == "8"){
                screenContext.passcodeChallengeReason = 1;  //1 expired, 2 passcode not comply
            }
            else {
                screenContext.passcodeChallengeReason = 2;
            }
            
            showScreen('SCR_CHANGE_PASSCODE_MANDATORY')(screenContext);
        };


        var onUnlockError = function(error, context) {
            utils.logJSON("onUnlockError: " + JSON.stringify(error));

            if (error && error.errorDomain && error.errorDomain === "MAFSecureStoreManagerErrorDomain" && error.errorCode && error.errorCode === "16") {
                // Too many attempts --> DV deleted
                var i18n = require('kapsel-plugin-i18n.i18n');
                i18n.load({
                                path: "smp/logon/i18n",
                                name: "i18n"
                          },
                          function(bundle){
                                var errDescription = bundle.get("ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE_MSG");
                                var appName = null;
                                if (_providedContext && _providedContext.appName){
                                    appName = _providedContext.appName;
                                } else {
                                    appName = _providedContext._defaultAppName;
                                }
                                var regex = /\{0\}/gi;
                                errDescription = errDescription.replace(regex, appName);
                                var errTitle = bundle.get("ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE_TITLE");

                                if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                                    logonView.showNotification("", errDescription, errTitle, "ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE");
                                } else {
                                    // Tell the user they have made too many attemps to enter a passcode.
                                    // When they tap OK reset the application.
                                    navigator.notification.confirm(
                                        errDescription,
                                        function () { onForgotAppPasscode(context); },
                                        errTitle,
                                        [bundle.get("BUTTON_OK")]
                                    );
                                }
                          });
            }  else if (error && error.errorDomain && error.errorDomain === "MAFSecureStoreManagerErrorDomain" && error.errorCode && (error.errorCode >= 8 && error.errorCode <= 15)) {
                        //errMAFSecureStoreManagerErrorPasswordExpired                8
                        //errMAFSecureStoreManagerErrorPasswordRequired               9
                        //errMAFSecureStoreManagerErrorPasswordRequiresDigit          10
                        //errMAFSecureStoreManagerErrorPasswordRequiresLower          11
                        //errMAFSecureStoreManagerErrorPasswordRequiresSpecial        12
                        //errMAFSecureStoreManagerErrorPasswordRequiresUpper          13
                        //errMAFSecureStoreManagerErrorPasswordUnderMinLength         14
                        //errMAFSecureStoreManagerErrorPasswordUnderMinUniqueChars    15
                onPasscodeChangeRequired(error, context);
            } else if (error && error.errorDomain && error.errorDomain === "MAFLogonCoreErrorDomain") {
                // User Cancelled                          -128
                // Fingerprint Environment Problem         -14
                // Fingerprint Decryption Failed           -13
                // Fingerprint Encryption Failed           -12
                // Fingerprint Invalidated                 -11
                // Fingerprint Authentication Failed       -1
                if (error.errorCode === "-128") {
                    logonView.showNotification();
                } else {
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                        path: "smp/logon/i18n",
                        name: "i18n"
                        },
                        function (bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName) {
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_LOGIN_FAILED");
                        }
                    );
                }
            } else {
                logonView.showNotification("ERR_UNLOCK_FAILED");
            }
        }

        var onSetAfariaCredentialError = function(error) {
            utils.logJSON("onSetAfariaCredentialError: " + JSON.stringify(error));

            logonView.showNotification("ERR_SET_AFARIA_CREDENTIAL_FAILED");
        }

        var noOp = function() {}

        var resetToStartAppScreen = function () {
            // Explicitly close the view, as it will not be closed if the same url is loaded after reset method.
            // If in multiuser mode, then just reload the index.html wihtou
            logonView.close(function(){
                if (appContext && appContext.appConfig && appContext.appConfig.multiUser){
                    if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                        logonCore.loadStartPage(null, function() {
                            console.error("Failed to load start page after deleting data vault.");
                        });
                    }
                    else{
                        setTimeout(function() {
                            window.location.reload(true);
                        }, 300);
                    }
                }
                else{
                    logonCore.reset();
  
                    if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                        // reload the app.
                        setTimeout(function() {
                            window.location.reload(true);
                        }, 300);
                    }
                }
            });
        }
        
        var onErrorAck = function(errorContext) {
            utils.logJSON(errorContext, 'logonCore.onErrorAck');
            if (errorContext && errorContext.extraInfo == "ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE") {
                if (device.platform.toLowerCase().indexOf("android") >= 0) {
                    sap.AuthProxy.stopIntercepting(resetToStartAppScreen,resetToStartAppScreen);
                } else {
                    resetToStartAppScreen();
                }
            }
        };

        var onRegistrationBackButton = function() {
            if (registrationInProgress == true) {
                utils.debug('back button pushed, no operation is required as registration is running');
            } else {
                onCancelRegistration();
            }
        }
        
        var callChangePasscode = function(context) {
            utils.debugJSON(context, 'logonCore.changePasscode');
            
            if (!context.oldPasscodeEnabled && (context.unlockPasscode == undefined || context.passcodeChallengeReason == undefined)){
                context.oldPasscode = null;
            }
            
            if (!context.passcodeEnabled){
                context.passcode = null;
            }

            sap.logon.Core.changePasscode(
                function(currentContext, state){
                    currentContext.fingerprintScanEnabled = context.fingerprintScanEnabled!=undefined && context.fingerprintScanEnabled;
                    currentContext.passcode = context.passcode;
                    if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                        sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, onChangePasscodeError, currentContext);
                    }
                    else{
                        onCoreResult(currentContext, state);
                    }
                },
                onChangePasscodeError,
                context);
        }
        
        var onChangePasscodeError = function(error) {
            utils.logJSON("onChangePasscodeError: " + JSON.stringify(error));
            logonView.showNotification(getSecureStoreErrorText(error));
        }

        var onUnlockVaultWithDefaultPasscode = function(context) {
            utils.debug('logonCore.unlockSecureStore - default passcode');
            bUnlockPerformed = true;
            var unlockContext = context.registrationContext;
            unlockContext.unlockPasscode = null;
            
            //error callback is used to handle the case of passcode expired
            var onErrorCallback = function(error, context){
                // Don't call change passcode if the passcode has been configured to be disabled.
                if (!(context && context.custom && context.custom.disablePasscode)) {
                    onPasscodeChangeRequired(error, context);
                } else {
                    error(error);
                }
            };
            
            logonCore.unlockSecureStore(onCoreResult, onErrorCallback, unlockContext);
        }

        var onRegSucceeded = function(context, state) {
            onCoreResult(context, state);
            registrationInProgress = false;
        }

        var onRegError = function(error) {
            utils.logJSON(error, 'registration failed');
            var notificationShowed = logonView.showNotification(getRegistrationErrorText(error));
            if (notificationShowed){
                registrationInProgress = false;
                _credentialProviderCertificateAvailable = false;
            }
            else{
                onFlowError(error);
            }
        }
        
        /* Called when there is no previous window i.e. no registration screen.
           We cannot display a notification in that case. We want to invoke the app's error callback
           to notify the app of the error.
        */
        var onRegErrorNoPreviousWindow = function (error) {
            utils.logJSON(error, 'registration failed no previous window');
            registrationInProgress = false;
            _credentialProviderCertificateAvailable = false;
            onFlowError(error);// will invoke the app's error callback.
        }

        var onCertificateProviderError = function(error) {
            utils.logJSON(error, 'CertificateProvider reports error: ' + JSON.stringify(error));
            logonView.showNotification(error.errorDomain + "@" + error.errorCode);
            registrationInProgress = false;
            _credentialProviderCertificateAvailable = false;
        }

        var onRegSubmit = function(context) {
            utils.debugJSON(context, 'startRegistration');
            normalizeResourcePath(context);
            registrationInProgress = true;
            startRegistration(onRegSucceeded, onRegError, context);
        }

        var onCreatePasscodeSubmit = function(context) {
            if (classicStyle) {
                utils.debugJSON(context, 'logonCore.persistRegistration');
                logonCore.persistRegistration(onCoreResult, onCreatePasscodeError, context);
            } else {
                if (context.passcodeEnabled) {
                    utils.debugJSON(context, 'logonCore.persistRegistration');
                    logonCore.persistRegistration(
                        function(currentContext, state){
                            currentContext.fingerprintScanEnabled = context.fingerprintScanEnabled!=undefined && context.fingerprintScanEnabled;
                            currentContext.passcode = context.passcode;
                            if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                                // The error callback for setFinerprintEnabled does the same thing as the success callback.
                                // Since persistRegistration has already finished, if we call onCreatePasscodeError here
                                // the user ends up on the set passcode screen - but the passcode has already been set
                                // (just the fingerprint part failed).
                                sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, function(){onCoreResult(currentContext, state)}, currentContext);
                            }
                            else{
                                onCoreResult(currentContext, state);
                            }
                        },
                        onCreatePasscodeError, context);
                } else {
                    callPersistWithDefaultPasscode(context);
                }
            }
        }

        var onCancelRegistrationError = function(error) {
            utils.logJSON("onCancelRegistrationError: " + JSON.stringify(error));
            logonView.showNotification(getRegistrationCancelError(error));
        }

        var onCreatePasscodeError = function (error) {
            utils.logJSON("onCreatePasscodeError: " + JSON.stringify(error));
            if (error && error.errorDomain === 'MAFLogonCoreErrorDomain') {
                // User Cancelled                          -128
                // Fingerprint Environment Problem         -14
                // Fingerprint Decryption Failed           -13
                // Fingerprint Encryption Failed           -12
                // Fingerprint Invalidated                 -11
                // Fingerprint Authentication Failed       -1
                if (error.errorCode === '-128') {
                    logonView.showNotification();
                } else {
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                        path: "smp/logon/i18n",
                        name: "i18n"
                        },
                        function (bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_SETUP_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName) {
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_SETUP_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_SETUP_FAILED");
                        }
                    );
                }
            } else {
                logonView.showNotification(getSecureStoreErrorText(error));
            }
        }

        var onSSOPasscodeSetError = function(error) {
            utils.logJSON("onSSOPasscodeSetError: " + JSON.stringify(error));
            logonView.showNotification(getSSOPasscodeSetErrorText(error));
        }

        var callGetContext = function() {
            utils.debug('logonCore.getContext');
            logonCore.getContext(onCoreResult, onFlowError);
        }

        var onFullRegistered = function(fullRegisteredResult) {
            sap.logon.Utils.logPerformanceMessage("logonController.js onFullRegistered");

            var getContextSuccessCallback = function(result, stateResult) {
                var getContextSuccessCallbackArgs = arguments;
                if (typeof result !== "undefined" && typeof result.registrationContext !== "undefined" && typeof result.registrationContext.password !== "undefined") {
                    var tmp = result.registrationContext.password;
                    result.registrationContext.password = "*** FILTERED ***";
                    utils.debug("context: " + JSON.stringify(result));
                    result.registrationContext.password = tmp;
                    tmp = undefined;
                } else {
                    utils.debug("context: " + JSON.stringify(result));
                }

                if (!_hasLogonSuccessEventFired) {
                    fireEvent("onSapLogonSuccess", getContextSuccessCallbackArgs);
                    _hasLogonSuccessEventFired = true;
                }
                      
                onFlowSuccess(result, stateResult);
            }

            // The given fullRegisteredResult does not have all the information needed, call getContext.
            utils.debug('logonCore.getContext');
            logonCore.getContext(getContextSuccessCallback, onFlowError);
        }

        var onFingerprintDialogueOpen = function(context) {
            var fingerprintScanSuccess = function(backupPasscode){
                context.unlockPasscode = backupPasscode;
                onUnlockSubmit(context);
            }
            sap.logon.Core.scanFingerprint(fingerprintScanSuccess,
                function(error) {
                    // User Cancelled                          -128
                    // Fingerprint Environment Problem         -14
                    // Fingerprint Decryption Failed           -13
                    // Fingerprint Encryption Failed           -12
                    // Fingerprint Invalidated                 -11
                    // Fingerprint Authentication Failed       -1
                    if (error && error.errorCode == "-128") {
                        console.log("fingerprint scan cancelled by user");
                        logonView.showNotification(); //if cancelled by user (-128), then just reset the logon screen
                        return;
                    }
                    else if (error && error.errorCode === "-11" || error.errorCode === "-13") {
                        // Fingerprint Unlock was invalidated by OS
                        console.log("fingerprint unlock was invalidated by OS");
                        // Reload the unlock screen with the checkbox unselected
                        context.fingerprintScanEnabled = false;
                        showScreen('SCR_UNLOCK')(context);
                    } else {
                        console.log("fingerprint scan failed with error code " + error.errorCode);
                    }
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                            path: "smp/logon/i18n",
                            name: "i18n"
                        },
                        function(bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName) {
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_LOGIN_FAILED");
                        }
                    );
                });
        }
        
        var onForgotAppPasscode = function(context) {
            utils.debug('logonCore.onForgotAppPasscode');
            var doReset = function() {
                // Explicitly close the view, as it will not be closed if the same url is loaded after reset method.
                logonView.close(
                    function(){
                        if (context.multiUser){
                            if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                                setTimeout(function () {
                                    window.location.reload(true);
                                }, 300);
                            }
                            else{
                                sap.logon.Core.loadStartPage(null, function() {
                                    console.error("Failed to load start page after removeDeviceUser on forgotAppPasscode.");
                                });
                            }
                        }
                        else{
                            logonCore.reset();

                            if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                                // reload the app.
                                setTimeout(function () {
                                    window.location.reload(true);
                                }, 300);
                            }
                        }
                    }
                );
            };
            
            var doDelete = function() {
                if (context.multiUser){
                    logonCore.removeDeviceUser(doReset, doReset, context.currentSelectedUser.deviceUserId);
                }
                else{
                    logonCore.deleteRegistration(doReset, doReset);
                }
            };
            
            if (device.platform.toLowerCase().indexOf("android") >= 0) {
                sap.AuthProxy.stopIntercepting(doDelete,doDelete);
            } else {
                doDelete();
            }
        }

        var onForgotSsoPin = function() {
            utils.debug('forgotSSOPin');
            logonView.showNotification("ERR_FORGOT_SSO_PIN");
        }

        var onSkipSsoPin = function() {
            utils.debug('logonCore.skipClientHub');
            logonCore.skipClientHub(onCoreResult, onFlowError);
        }

        var callPersistWithDefaultPasscode = function(context) {
            utils.debugJSON(context, 'logonCore.persistRegistration');
            context.passcode = null;
            logonCore.persistRegistration(
                onCoreResult,
                onFlowError,
                context)
        }

        var onGetCertificateFromProvider = function(context) {
            utils.debugJSON(context, 'logonCore.getCertificateFromProvider');
            _registrationEventsForCredentialProvider = {
                onsubmit: function(context) {
                    utils.debugJSON(context, 'logonCore.setCertificateProviderCredential');
                    logonCore.setParametersForProvider(
                        function() {
                            utils.debug("setParameterForProvider success callback");
                        }, //only for debug
                        onCertificateProviderError,
                        context);
                },
                oncancel: onCancelRegistration,
                onerror: onFlowError

            };

            //the on success callback needs to set _credentialProviderCertificateAvailable flag to continue screen flow
            logonCore.getCertificateFromProvider(
                function() {
                    utils.debug("getCertificateFromProvider success callback called");
                    _credentialProviderCertificateAvailable = true;
                    onCoreResult.apply(this, arguments);
                },
                function(error) {
                    onCertificateProviderError(error);
                    _credentialProviderCertificateAvailable = false;
                },
                false
            );
        }

        var onReadSavedContext = function(context, state) {
            utils.debugJSON(context, 'onReadSavedContext');

            //the on success callback needs to set _credentialProviderCertificateAvailable flag to continue screen flow
            logonCore.getSecureStoreObject(
                function(savedContext) {
                    utils.debugJSON(savedContext, 'onReadSavedContext');

                    if (savedContext) {
                        _providedContext = savedContext
                        if (getSAMLConfig(_providedContext) == null && getOAuthConfig(_providedContext) == null) {
                            AuthState = "notRequired";
                            onCoreResult(context, state);
                        } else {
                            AuthState = "required";
                            if (!_authenticationConfigured) {
                                configureAuthentication(savedContext, function() {
                                    onCoreResult(context, state);
                                }, onFlowError)
                            }
                            else {
                                onCoreResult(context, state);
                            }
                        }
                    } else {
                        AuthState = "notRequired";
                        onCoreResult(context, state);
                    }

                },
                onFlowError,
                "%%providedContext");

        }
        var startLogonCoreRegistration = function(onSuccess, onError, context) {
               _oLogonCore.startRegistration(
                                        function() {
                                            onSuccess.apply(this, arguments);
                                        },
                                        function(){
                                            onError.apply(this, arguments);
                                        },
                                context);
               
        }

        var startRegistration = function(onSuccess, onError, context) {
            sap.logon.Utils.logPerformanceMessage("logonController.js startRegistration");

            bNewRegistration = true;
            registrationContext = context;

            configureAuthentication(_providedContext, function() {
                if (getOAuthConfig(_providedContext) || getSAMLConfig(_providedContext)) {
                    // Remove current logon view if any so that we can use the IAB
                    logonView.close(function() {
                        pingServer(_providedContext, function() {
                            startLogonCoreRegistration(onSuccess, onError, context);
                        }, onError, true);
                    }, true);
                }
                else {
                    startLogonCoreRegistration(onSuccess, onError, context);
                }
            }, function(error) {
                onError(error);
            }, true);
        }

        var removeAuthentication = function(callback) {
            var disableOAuth2 = function(done) {
                sap.AuthProxy.OAuth2.removeEventListener('tokenchange', tokenChangeListener);
                sap.AuthProxy.OAuth2.disable(done, done);
            }
            
            var disableSAML2 = function(done) {
                sap.AuthProxy.SAML2.disable(done, done);
            }

            disableOAuth2(function() {
                disableSAML2(function() {
                    _authenticationConfigured = false;
                    callback();
                });
            })
        }

        var configureAuthentication = function(context, successCallback, errorCallback) {
            if (_authenticationConfigured) {
                removeAuthentication(function() {
                    configureAuthentication(context, successCallback, errorCallback);
                });
                return;
            }
            
            var win = function() {
                _authenticationConfigured = true;
                successCallback();
            }

            var oauthConfig = getOAuthConfig(context);
            if (oauthConfig) {
                var enableOAuth2 = function (token) {
                    sap.AuthProxy.OAuth2.enable({
                        protectedEndpointURL:  utils.getBaseServerURL(context),
                        authorizationEndpointURL: oauthConfig.config["oauth2.authorizationEndpoint"],
                        clientID: oauthConfig.config["oauth2.clientID"],
                        tokenEndpointURL: oauthConfig.config["oauth2.tokenEndpoint"]
                    }, function() {
                        if (!bNewRegistration) {
                            sap.AuthProxy.OAuth2.addEventListener('tokenchange', tokenChangeListener);
                        }
                        win();
                    }, errorCallback, token);
                }

                if (!bNewRegistration) {
                    getOAuth2Token(enableOAuth2);
                }
                else {
                    enableOAuth2();
                }
                return;
            }

            var saml2Config = getSAMLConfig(context);
            if (saml2Config) {
                sap.AuthProxy.SAML2.enable({
                    authorizationEndpointURL:  saml2Config.config["saml2.web.post.finish.endpoint.uri"],
                    finishEndpointURLParam: saml2Config.config["saml2.web.post.finish.endpoint.redirectparam"],
                    challengeHeaderName: saml2Config.config["saml2.web.post.authchallengeheader.name"]
                }, win, errorCallback);
                return;
            }

            // No OAuth2 or SAML2 to configure
            successCallback();
        }

        //save SAML configuration to data value, the %%providedContext is a reserved key in data vault
        var onSaveContext = function(context, state) {
            utils.debugJSON(_providedContext, 'onSaveProvidedContext');

            var win = function() {
                    AuthState = "saved";
                    onCoreResult(context, state);
            }

            //the on success callback needs to set _credentialProviderCertificateAvailable flag to continue screen flow
            logonCore.setSecureStoreObject(
                function(context) {
                    utils.debugJSON(_providedContext, 'onSavedContext');

                    // Also save OAuth2 token
                    if (bNewRegistration && getOAuthConfig(_providedContext)) {
                        sap.AuthProxy.OAuth2.getToken(function(token) {
                            saveOAuth2Token(token, function() {
                                sap.AuthProxy.OAuth2.addEventListener('tokenchange', tokenChangeListener);
                                win();
                            });
                        });
                    }
                    else {
                        win();
                    }
                },
                onFlowError,
                "%%providedContext",
                _providedContext
            );
        }

        // Makes a shallow copy of the object. functions and recursive structures will be not be deep-copied. i.e
         // the result object will still maintain references to inner functions and recursive objects/arrays.
         var shallowCopy = function (object) {
 		    var result = {};
 		    for (key in object) {
 		        result[key] = object[key];
 		    }
 		    return result;
 		}

        //this method is used to handle post action after a match found, it can change the matched rule based on additional condition.
        //there are several code path will lead to action of onFullRegistered, in order to support saml authentication, we need to load the
        //SAML configuration, we need to load the SAML configuraton before onFullRegistered is called. so that we can trigger the SAML logon
        //before full registration callback is called.
        this.postMatchAction = function(matchedRule) {
            if (matchedRule.action == onFullRegistered) {
                utils.debug('postMatchAction onFullRegistered: ' + AuthState + ', ' + bNewRegistration + ', ' + bUnlockPerformed);

                if (bNewRegistration) {
                    if (AuthState != "saved") {
                        return onSaveContext;
                    }
                }
                // No need to do saml authentication again if data vault is already unlocked when unlock method is called,
                // unless the call is started by logon.init.
                // Also check whether window.location.href is a file.  If this is a fiori application then the deviceready
                // event will fire twice: once on the initial load which is the local file://...index.html, and a second
                // time when the fiori launchpad loads.  We only want to force SAML authentication the first time.
                // windows does not start from a file:// url. Will need to revisit in Windows 10 when the webview will load all plugins.
                else if ( bUnlockPerformed || this.forceAuth ) {
                    //Read SAML settings for both index.html and fiori.html page, but only run SAML auth for index.html
                    if (AuthState == "notInit") {
                        return onReadSavedContext;
                    } else if (AuthState == "required" && ((window.location.href.toLowerCase().indexOf("file:") == 0) || (cordova.require("cordova/platform").id.indexOf("windows") === 0))) {
                        if (_providedContext.refreshSAMLSessionOnResume == "skip" || _providedContext.refreshOAUTHSessionOnResume == "skip"){
                            utils.debug("skip refresh session  on resume");
                        }
                        else {
                            var pingComplete = function() {
                                AuthState = "completed";
                                callGetContext();
                            }

                            // Try make a session with the server and fail silently if we can't
                            logonView.close(function() {
                                pingServer(_providedContext, pingComplete, pingComplete);
                            }, true);

                            return null;
                        }
                    }
                }
            }
            return matchedRule.action;
        }

        // exported properties
        this.stateTransitions = [{
                id: "r0",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        status: 'fullRegistered',
                        defaultPasscodeUsed: true
                    }
                },
                action: onUnlockVaultWithDefaultPasscode
            },

            {
                id: "r1",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        status: 'fullRegistered'
                    }
                },
                action: 'SCR_UNLOCK'
            },
                        {
                id: "r1.1",
                condition: {
                    state: {
                        hasSecureStore: false
                    },
					//if any user available in multiuser mode, then show unlock screen even if state.status equals to "new", except when starting a new user registration.
					method: function(state, context) {
					    if (state && state.multiUser && ((state.multiUser.userList && state.multiUser.userList.length > 0) || state.multiUser.shouldMigrateToMultiUserMode) && (!_regNewUserInProgress)) {
                                return true;
                            }
                            else{
                                return false;
                            }
					}
				},
                action: 'SCR_UNLOCK'
            },
            {
                id: "r2",
                condition: {
                    state: {
                        //secureStoreOpen: false, //TODO clarify
                        status: 'fullRegistered',
                        stateClientHub: 'availableNoSSOPin'
                    }
                },
                action: 'SCR_SSOPIN_SET'
            }, {
                id: "r3",
                condition: {
                    state: {
                        status: 'new'
                    },
                    context: null
                },
                action: callGetContext
            },

            {
                id: "r4",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableNoSSOPin'
                    }
                },
                action: 'SCR_SSOPIN_SET'
            },

            {
                id: "r5",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableInvalidSSOPin'
                    }
                },
                action: 'SCR_SSOPIN_SET'
            }, {
                id: "r6",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableValidSSOPin',
                        stateAfaria: 'initializationFailed',
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    }
                },
                action: 'SCR_ENTER_AFARIA_CREDENTIAL'
            }, {
                id: "r7",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableValidSSOPin',
                        stateAfaria: 'credentialNeeded'
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    }
                },
                action: 'SCR_ENTER_AFARIA_CREDENTIAL'
            }, {
                id: "r8",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'notAvailable',
                        stateAfaria: 'credentialNeeded'
                    }
                },
                action: 'SCR_ENTER_AFARIA_CREDENTIAL'
            }, { //condition to get certificate from third party certificate provider
                id: "r9",
                condition: {
                    state: {
                        status: 'new'
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    },
                    //the method must return true in order to match this state
                    method: function() {
                        return _credentialProviderID != null && _credentialProviderID != "afaria" && !_credentialProviderCertificateAvailable;
                    }
                },
                action: onGetCertificateFromProvider
            },
            //bug 243656 - Set requireCredential to true in context to show enterCredential screen even if certificate provider is configured.
            {
                id: "r10.0",
                condition: {
                    state: {
                        status: 'new'
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    },
                    //the method must return true in order to match this state
                    method: function() {
                        return _credentialProviderID != null && _credentialProviderCertificateAvailable && _providedContext.requireCredential;
                    }
                },
                action: 'SCR_ENTER_CREDENTIALS'
            },
            //condition to indicate third party certificate is available
            {
                id: "r10",
                condition: {
                    state: {
                        status: 'new'
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    },
                    //the method must return true in order to match this state
                    method: function() {
                        return _credentialProviderID != null && _credentialProviderCertificateAvailable;
                    }

                },
                action: function(context) {
                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }

            },

            {
                id: "r11",
                condition: {
                    state: {
                        status: 'new',
                        isAfariaCredentialsProvided: false
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    }
                },
                action: 'SCR_ENTER_AFARIA_CREDENTIAL'
            }, {
                id: "r12",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableValidSSOPin'
                    },
                    context: {
                        credentialsByClientHub: true,
                        registrationReadOnly: true
                    }
                },
                action: function(context) {
                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }
            }, {
                id: "r13",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableValidSSOPin',
                        stateAfaria: 'initializationSuccessful'
                    },
                    context: {
                        registrationReadOnly: true,
                        afariaRegistration: 'certificate'
                    }
                },
                action: function(context) {
                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }
            }, {
                id: "r14",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'notAvailable',
                        stateAfaria: 'initializationSuccessful'
                    },
                    context: {
                        afariaRegistration: 'certificate'
                    }
                },
                action: function(context) {
                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }
            }, {
                id: "r14.1", //if saml auth config is available, and host is provided, then start registration without asking credential
                condition: {
                    state: {
                        status: 'new'
                    },
                    //if saml config is available, then start registration
                    method: function() {
                        if (_providedContext && _providedContext.serverHost) {
                            return getSAMLConfig(_providedContext) != null;
                        } else {
                            return false;
                        }
                    }
                },
                action: function(context) {
                    if (context.registrationContext && _providedContext) {
                        for (key in _providedContext) {
                            context.registrationContext[key] = _providedContext[key];
                        }
                    }

                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }
            }, {
                id: "r14.2", //oauth flow
                condition: {
                    state: {
                        status: 'new'
                    },
                    //if OAuth config is available, then start the corresponding flow
                    method: function() {
                        if (_providedContext && _providedContext.serverHost) {
                            return getOAuthConfig(_providedContext) != null;
                        } else {
                            return false;
                        }
                    }
                },
                action: function(context) {
                    if (context.registrationContext && _providedContext) {
                        for (key in _providedContext) {
                            context.registrationContext[key] = _providedContext[key];
                        }
                    }

                    utils.debugJSON(context, 'startRegistration');
                    startRegistration(onCoreResult, onRegError, context.registrationContext);
                }
            }, {
                id: "r15",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'notAvailable',
                        stateAfaria: 'initializationSuccessful'
                    }
                },
                action: 'SCR_ENTER_CREDENTIALS'
            }, {
                id: "r16",
                condition: {
                    state: {
                        status: 'new',
                        stateClientHub: 'availableValidSSOPin'
                    },
                    context: {
                        registrationReadOnly: true,
                        credentialsByClientHub: false
                    }
                },
                action: 'SCR_ENTER_CREDENTIALS'
            },

            {
                id: "r18",
                condition: {
                    state: {
                        status: 'new',
                        //stateClientHub: 'notAvailable' | 'availableValidSSOPin' | 'skipped' | 'error'
                    }
                },
                action: 'SCR_REGISTRATION'
            },

            {
                id: "r20",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        status: 'registered',
                        defaultPasscodeUsed: true,
                        //                        defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_SET_PASSCODE_OPT_OFF'
            }, {
                id: "r21",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        status: 'registered',
                        defaultPasscodeUsed: false,
                        defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_SET_PASSCODE_OPT_ON'
            }, {
                id: "r22",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        status: 'registered',
                        //                        defaultPasscodeAllowed: false,
                    }
                },
                action: 'SCR_SET_PASSCODE_MANDATORY'
            },


            {
                id: "r23",
                condition: {
                    state: {
                        //secureStoreOpen: false, //TODO clarify
                        status: 'fullRegistered',
                        stateClientHub: 'availableInvalidSSOPin'
                    }
                },
                action: 'SCR_SSOPIN_CHANGE'
            }, {
                id: "r24",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        status: 'fullRegistered',
                        stateClientHub: 'notAvailable'
                    }
                },
                action: onFullRegistered
            }, {
                id: "r25",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        status: 'fullRegistered',
                        stateClientHub: 'availableValidSSOPin'
                    }
                },
                action: onFullRegistered
            }, {
                id: "r26",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        status: 'fullRegistered',
                        stateClientHub: 'skipped'
                    }
                },
                action: onFullRegistered
            },



        ];

        this.screenEvents = {
            'SCR_SSOPIN_SET': {
                onsubmit: function(context) {
                    utils.debugJSON(context, 'logonCore.setSSOPasscode');
                    logonCore.setSSOPasscode(onCoreResult, onSSOPasscodeSetError, context);
                },
                oncancel: onCancelSSOPin,
                onerror: onFlowError,
                onforgot: onForgotSsoPin,
                onskip: onSkipSsoPin
            },

            'SCR_ENTER_AFARIA_CREDENTIAL': {
                onsubmit: function(context) {
                    utils.debugJSON(context, 'logonCore.setAfariaCredential');
                    logonCore.setAfariaCredential(onCoreResult, onSetAfariaCredentialError, context);
                },
                oncancel: onCancelAfariaRegistration
            },

            'SCR_SSOPIN_CHANGE': {
                onsubmit: function(context) {
                    utils.debugJSON(context, 'logonCore.setSSOPasscode');
                    logonCore.setSSOPasscode(onCoreResult, onSSOPasscodeSetError, context);
                },
                oncancel: onSkipSsoPin,
                onerror: onFlowError,
                onforgot: onForgotSsoPin
            },

            'SCR_UNLOCK': {
                onsubmit: onUnlockSubmit,
                onnewuser: onRegNewUser,
                oncancel: noOp,
                onerror: onFlowError,
                onfingerprint: onFingerprintDialogueOpen,
                onforgot: onForgotAppPasscode,
                onerrorack: onErrorAck
            },

            'SCR_REGISTRATION': {
                onsubmit: onRegSubmit,
                oncancel: onCancelRegistration,
                onerror: onFlowError,
                onbackbutton: onRegistrationBackButton
            },

            'SCR_ENTER_CREDENTIALS': {
                onsubmit: onRegSubmit,
                oncancel: onCancelRegistration,
                onerror: onFlowError
            },
            'SCR_SET_PASSCODE_OPT_ON': {
                onsubmit: onCreatePasscodeSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                ondisable: showScreen('SCR_SET_PASSCODE_OPT_OFF'),
                onerrorack: noOp
            },
            'SCR_SET_PASSCODE_OPT_OFF': {
                onsubmit: callPersistWithDefaultPasscode,
                oncancel: noOp,
                onerror: onFlowError,
                onenable: showScreen('SCR_SET_PASSCODE_OPT_ON'),
                onerrorack: noOp
            },
            'SCR_SET_PASSCODE_MANDATORY': {
                onsubmit: onCreatePasscodeSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                onerrorack: noOp
            },
            'SCR_CHANGE_PASSCODE_MANDATORY': {
                onsubmit: callChangePasscode,
                oncancel: onFlowCancel,
                onerror: onFlowError,
                onerrorack: noOp
            }
        };

        utils.debug('flow constructor return');
    }

    //Web registrationFlow is used to onboard application without SMP logon 
    var WebRegistrationFlow = function WebRegistrationFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks

        this.name = 'registrationFlowBuilder';

        var registrationInProgress = false;

        var onCancelRegistration = function() {
            onFlowError(errorWithDomainCodeDescription("MAFLogon", "1", "Registration screen was cancelled"));
        }

        // internal methods
        var showScreen = function(screenId) {
            return function(coreContext) {
                logonView.showScreen(screenId, this.screenEvents[screenId], coreContext);
            }.bind(this);
        }.bind(this);

        var onUnlockSubmit = function(context) {
            utils.debugJSON(context, 'logonCore.unlockSecureStore');
            logonCore.unlockSecureStore(
                function(currentContext, state){
                    currentContext.fingerprintScanEnabled = context.newFingerprintScanEnabled;
                    currentContext.passcode = context.unlockPasscode;
                    var fingerprintScanEnabledChanged = context.newFingerprintScanEnabled!=undefined && context.newFingerprintScanEnabled != context.fingerprintScanEnabled;
                    if (fingerprintScanEnabledChanged && (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android")){
                        sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, onUnlockError, currentContext);
                    }
                    else{
                        onCoreResult(currentContext, state);
                    }
                },
                onUnlockError, context);
        };

        var noOp = function() {};

        var onErrorAck = function(errorContext) {
            utils.logJSON(errorContext, 'logonCore.onErrorAck');
            if (errorContext && errorContext.extraInfo == "ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE") {
                if (device.platform.toLowerCase().indexOf("android") >= 0) {
                    sap.AuthProxy.stopIntercepting(resetToStartAppScreen,resetToStartAppScreen);
                } else {
                    resetToStartAppScreen();
                }
            }
        };

        var onFingerprintDialogueOpen = function(context) {
            var fingerprintScanSuccess = function(backupPasscode){
                context.unlockPasscode = backupPasscode;
                onUnlockSubmit(context);
            }
            sap.logon.Core.scanFingerprint(fingerprintScanSuccess,
                function(error) {
                    // User Cancelled                          -128
                    // Fingerprint Environment Problem         -14
                    // Fingerprint Decryption Failed           -13
                    // Fingerprint Encryption Failed           -12
                    // Fingerprint Invalidated                 -11
                    // Fingerprint Authentication Failed       -1
                    if (error && error.errorCode == "-128") {
                        console.log("fingerprint scan cancelled by user");
                        logonView.showNotification(); //if cancelled by user (-128), then just reset the logon screen
                        return;
                    }
                    else if (error && error.errorCode === "-11" || error.errorCode === "-13") {
                        // Fingerprint Unlock was invalidated by OS
                        console.log("fingerprint unlock was invalidated by OS");
                        // Reload the unlock screen with the checkbox unselected
                        context.fingerprintScanEnabled = false;
                        showScreen('SCR_UNLOCK')(context);
                    } else {
                        console.log("fingerprint scan failed with error code " + error.errorCode);
                    }
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                            path: "smp/logon/i18n",
                            name: "i18n"
                        },
                        function(bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName){
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_LOGIN_FAILED");
                        }
                    );
                });
        }

        var onForgotAppPasscode = function() {
            utils.log('logonCore.deleteRegistration');
            logonCore.deleteRegistration(function() {
                resetToStartAppScreen();
            }, onFlowError);
        }

        var resetToStartAppScreen = function () {
            // Explicitly close the view, as it will not be closed if the same url is loaded after reset method.
            logonView.close(function(){
                    logonCore.reset();
  
                    if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                        // reload the app.
                        setTimeout(function () {
                            window.location.reload(true);
                        }, 300);
                    }
                });
        }

        var onPasscodeChangeRequired = function(error, context){

           // passcode expired, ask user to change passcode with passcode policy
            var screenContext = {};
            if(typeof context === 'object' && context != null) {
                screenContext = context;
            }
            //first check whether the old passcode is disabled or not, the information is return in defaultPasscodeUsed propert
            if (error.defaultPasscodeUsed){
                screenContext.oldPasscodeEnabled = false;
            }
            else{
                screenContext.oldPasscodeEnabled = true;
            }
           
            //always enable user to input the new passcode for change passcode screen
            screenContext.passcodeEnabled = true;
           
            //set passcode policy, normalize the passcode policy to always use string type
         	var policy = {};
            for (var p in error.passcodePolicy){
                policy[p] = error.passcodePolicy[p].toString();
            }
            screenContext.policyContext = policy;
           
            //the below property is used for customize the text in fiori change passcode screen
            if (error.errorCode == "8"){
                screenContext.passcodeChallengeReason = 1;  //1 expired, 2 passcode not comply
            }
            else {
                screenContext.passcodeChallengeReason = 2;
            }
            
            showScreen('SCR_CHANGE_PASSCODE_MANDATORY')(screenContext);
        };

        var onUnlockError = function(error, context) {
            utils.logJSON("onUnlockError: " + JSON.stringify(error));

            if (error && error.errorDomain && error.errorDomain === "MAFSecureStoreManagerErrorDomain" && error.errorCode && error.errorCode === "16") {
                    // Too many attempts --> DV deleted
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                                path: "smp/logon/i18n",
                                name: "i18n"
                          },
                          function(bundle){
                                var errDescription = bundle.get("ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE_MSG");
                                var appName = null;
                                if (_providedContext && _providedContext.appName){
                                    appName = _providedContext.appName;
                                } else {
                                    appName = _providedContext._defaultAppName;
                                }
                                var regex = /\{0\}/gi;
                                errDescription = errDescription.replace(regex, appName);
                                var errTitle = bundle.get("ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE_TITLE");

                                if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
                                    logonView.showNotification("", errDescription, errTitle, "ERR_TOO_MANY_ATTEMPTS_APP_PASSCODE");
                                } else {
                                    // Tell the user they have made too many attemps to enter a passcode.
                                    // When they tap OK reset the application.
                                    navigator.notification.confirm(
                                        errDescription,
                                        function () { onForgotAppPasscode(context); },
                                        errTitle,
                                        [bundle.get("BUTTON_OK")]
                                    );
                                }
                          });
            } else if (error && error.errorDomain && error.errorDomain === "MAFSecureStoreManagerErrorDomain" && error.errorCode && (error.errorCode >= 8 && error.errorCode <= 15)) {
                        //errMAFSecureStoreManagerErrorPasswordExpired                8
                        //errMAFSecureStoreManagerErrorPasswordRequired               9
                        //errMAFSecureStoreManagerErrorPasswordRequiresDigit          10
                        //errMAFSecureStoreManagerErrorPasswordRequiresLower          11
                        //errMAFSecureStoreManagerErrorPasswordRequiresSpecial        12
                        //errMAFSecureStoreManagerErrorPasswordRequiresUpper          13
                        //errMAFSecureStoreManagerErrorPasswordUnderMinLength         14
                        //errMAFSecureStoreManagerErrorPasswordUnderMinUniqueChars    15
                onPasscodeChangeRequired(error, context);
            } else if (error && error.errorDomain && error.errorDomain === "MAFLogonCoreErrorDomain") {
                // User Cancelled                          -128
                // Fingerprint Environment Problem         -14
                // Fingerprint Decryption Failed           -13
                // Fingerprint Encryption Failed           -12
                // Fingerprint Invalidated                 -11
                // Fingerprint Authentication Failed       -1
                if (error.errorCode === "-128") {
                    // User Cancelled
                    logonView.showNotification();
                } else {
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                        path: "smp/logon/i18n",
                        name: "i18n"
                        },
                        function (bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName) {
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_LOGIN_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_LOGIN_FAILED");
                        }
                    );
                }
            } else {
                logonView.showNotification("ERR_UNLOCK_FAILED");
            }
        }

        var onUnlockVaultWithDefaultPasscode = function(context) {
            sap.logon.Utils.logPerformanceMessage("logonController.js onUnlockVaultWithDefaultPasscode");
            if (context.registrationContext) {
                var unlockContext = context.registrationContext;
                unlockContext.unlockPasscode = null;
            } else {
                var unlockContext = {
                    "unlockPasscode": null
                };
            }
            logonCore.unlockSecureStore(onCoreResult, onUnlockError, unlockContext);
        }

        var onCreateSecureStoreSubmit = function(context) {
            if (classicStyle) {
                utils.debugJSON(context, 'logonCore.onCreateSecureStoreSubmit');
                if (_providedPasscodePolicyContext) {
                        context["policyContext"] = _providedPasscodePolicyContext;
                }
                logonCore.createSecureStore(onCoreResult, onCreatePasscodeError, context);
            } else {
                utils.logJSON(context, 'logonCore.onCreateSecureStoreSubmit');
                if (context.passcodeEnabled) {
                    if (_providedPasscodePolicyContext) {
                        context["policyContext"] = _providedPasscodePolicyContext;
                    }
                    logonCore.createSecureStore(
                        function(currentContext, state){
                            currentContext.fingerprintScanEnabled = context.fingerprintScanEnabled!=undefined && context.fingerprintScanEnabled;
                            currentContext.passcode = context.passcode;
                            if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                                sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, onCreatePasscodeError, currentContext);
                            }
                            else{
                                onCoreResult(currentContext, state);
                            }
                        },
                        onCreatePasscodeError, context);
                } else {
                    onCreateSecureStoreWithDefaultPasscodeSubmit(context);
                }
            }
        }

        var onCreateSecureStoreWithDefaultPasscodeSubmit = function(context) {
            utils.debugJSON(context, 'logonCore.onCreateSecureStoreWithDefaultPasscodeSubmit');
            if (_providedPasscodePolicyContext) {
                context["policyContext"] = _providedPasscodePolicyContext;
            }
            context.passcode = null;
            logonCore.createSecureStore(onCoreResult, onCreatePasscodeError, context);

        }

        var onCancelRegistrationError = function(error) {
            utils.logJSON("onCancelRegistrationError: " + JSON.stringify(error));
            logonView.showNotification(getRegistrationCancelError(error));
        }

        var onCreatePasscodeError = function (error) {
            utils.logJSON("onCreatePasscodeError: " + JSON.stringify(error));
            if (error && error.errorDomain === 'MAFLogonCoreErrorDomain') {
                // User Cancelled                          -128
                // Fingerprint Environment Problem         -14
                // Fingerprint Decryption Failed           -13
                // Fingerprint Encryption Failed           -12
                // Fingerprint Invalidated                 -11
                // Fingerprint Authentication Failed       -1
                if (error.errorCode === '-128') {
                    logonView.showNotification();
                } else {
                    var i18n = require('kapsel-plugin-i18n.i18n');
                    i18n.load({
                        path: "smp/logon/i18n",
                        name: "i18n"
                        },
                        function (bundle) {
                            var errDescription = bundle.get("ERR_FINGERPRINT_SETUP_FAILED_MSG");
                            var appName = null;
                            if (_providedContext && _providedContext.appName) {
                                appName = _providedContext.appName;
                            } else {
                                appName = _providedContext._defaultAppName;
                            }
                            var regex = /\{0\}/gi;
                            errDescription = errDescription.replace(regex, appName);
                            var errTitle = bundle.get("ERR_FINGERPRINT_SETUP_FAILED_TITLE");
                            logonView.showNotification("", errDescription, errTitle, "ERR_FINGERPRINT_SETUP_FAILED");
                        }
                    );
                }
            } else {
                logonView.showNotification(getSecureStoreErrorText(error));
            }
        }

        var onFullRegistered = function(context, state) {
            sap.logon.Utils.logPerformanceMessage("logonController.js onFullRegistered");
                if (!_hasLogonSuccessEventFired) {
                    fireEvent("onSapLogonSuccess", context);
                    _hasLogonSuccessEventFired = true;
                }
                onFlowSuccess(context, state);
        }

        var callPersistWithDefaultPasscode = function(context) {
            utils.debugJSON(context, 'logonCore.persistRegistration');
            context.passcode = null;
            logonCore.persistRegistration(
                onCoreResult,
                onFlowError,
                context)
        }
        
                
        var callChangePasscode = function(context) {
            utils.debugJSON(context, 'logonCore.changePasscode');
          
            if (!context.oldPasscodeEnabled && (context.unlockPasscode == undefined || context.passcodeChallengeReason == undefined)){
                context.oldPasscode = null;
            }
            
            if (!context.passcodeEnabled){
                context.passcode = null;
            }

            sap.logon.Core.changePasscode(
                function(currentContext, state){
                    currentContext.fingerprintScanEnabled = context.fingerprintScanEnabled!=undefined && context.fingerprintScanEnabled;
                    currentContext.passcode = context.passcode;
                    if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                        sap.logon.Core.setFingerprintEnabled(function(){onCoreResult(currentContext, state)}, onChangePasscodeError, currentContext);
                    }
                    else{
                        onCoreResult(currentContext, state);
                    }
                },
                onChangePasscodeError,
                context);
            
        }
        
        var onChangePasscodeError = function(error) {
            utils.debugJSON("onChangePasscodeError: " + JSON.stringify(error));
            logonView.showNotification(getSecureStoreErrorText(error));
        }

        // exported properties
        this.stateTransitions = [{
                id: "r0",
                condition: {

                    state: {
                        hasSecureStore: true,
                        secureStoreOpen: false,
                        defaultPasscodeUsed: true
                    }
                },
                action: onUnlockVaultWithDefaultPasscode
            }, {
                id: "r1",
                condition: {
                    state: {
                        hasSecureStore: true,
                        secureStoreOpen: false
                    }
                },
                action: 'SCR_UNLOCK'
            },

            {
                id: "r20",
                condition: {
                    state: {
                        hasSecureStore: true,
                        secureStoreOpen: false,
                        defaultPasscodeUsed: true,
                        //                   defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_SET_PASSCODE_OPT_OFF'
            }, {
                id: "r21",
                condition: {
                    state: {
                        secureStoreOpen: false,
                        defaultPasscodeUsed: false,
                        defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_SET_PASSCODE_OPT_ON'
            }, {
                id: "r22",
                condition: {
                    state: {
                        hasSecureStore: false
                            //                        status: 'registered',
                            //                        defaultPasscodeAllowed: false,
                    }
                },
                action: 'SCR_SET_PASSCODE_MANDATORY'
            },

            {
                id: "r26",
                condition: {
                    state: {
                        secureStoreOpen: true,
                    }
                },
                action: onFullRegistered
            },


        ];

        this.screenEvents = {

            'SCR_UNLOCK': {
                onsubmit: onUnlockSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                onfingerprint: onFingerprintDialogueOpen,
                onforgot: onForgotAppPasscode,
                onerrorack: onErrorAck
            },

            'SCR_SET_PASSCODE_OPT_ON': {
                onsubmit: onCreateSecureStoreSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                ondisable: showScreen('SCR_SET_PASSCODE_OPT_OFF'),
                onerrorack: onErrorAck,
                onbackbutton: noOp
            },
            'SCR_SET_PASSCODE_OPT_OFF': {
                onsubmit: onCreateSecureStoreWithDefaultPasscodeSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                onenable: showScreen('SCR_SET_PASSCODE_OPT_ON'),
                onerrorack: noOp
            },
            'SCR_SET_PASSCODE_MANDATORY': {
                onsubmit: onCreateSecureStoreSubmit,
                oncancel: noOp,
                onerror: onFlowError,
                onerrorack: onErrorAck
            },
            'SCR_CHANGE_PASSCODE_MANDATORY': {
                onsubmit: callChangePasscode,
                oncancel: onFlowCancel,
                onerror: onFlowError,
                onerrorack: noOp
            }

        };

        utils.debug('flow constructor return');
    }


    var ChangePasswordFlow = function ChangePasswordFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks

        this.name = 'changePasswordFlowBuilder';


        // internal methods      

        var callUnlockFlow = function() {
            utils.debug(this.name + ' triggered unlock');
            registerOrUnlock(onCoreResult, onFlowError);
        }

        var onChangePasswordSubmit = function(context) {
            utils.debugJSON(context, 'logonCore.changePassword');
            // this logonCore call does not return with context
            logonCore.changePassword(onPasswordChanged, onFlowError, context);
        }


        var onPasswordChanged = function() {
            utils.debug('onPasswordChanged');

            var getContextSuccessCallback = function(result, stateResult) {
                var getContextSuccessCallbackArgs = arguments;
                fireEvent("onSMPPasswordChanged", getContextSuccessCallbackArgs);
                onFlowSuccess(result, stateResult);
            };

            utils.debug('logonCore.getContext');
            logonCore.getContext(getContextSuccessCallback, onFlowError);
        }
		
        var onPasswordCancel = function() {
            utils.debug('onPasswordCancel');
            //fix bug 1770036779, [FC][IOS]Duplicated message at password change. Remove oncancel handler as oncancel is explicitly called here, so no need to call it again by iabexit when closing iab.
            if (this.oncancel){
                this.oncancel = null;
            }
            logonCore.getContext(onFlowCancel, onFlowCancel);
        }

        // exported properties
        this.stateTransitions = [{
                id: "cp0",
                condition: {
                    state: {
                        secureStoreOpen: false,
                    }
                },
                action: callUnlockFlow,
            }, {
                id: "cp1",
                condition: {
                    state: {
                        secureStoreOpen: true,
                    }
                },
                action: 'SCR_CHANGE_PASSWORD'
            },

        ];

        this.screenEvents = {
            'SCR_CHANGE_PASSWORD': {
                onsubmit: onChangePasswordSubmit,
                oncancel: onPasswordCancel,
                onerror: onFlowError
            }
        };


        utils.debug('flow constructor return');
    }

    var ManagePasscodeFlow = function ManagePasscodeFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks

        this.name = 'managePasscodeFlowBuilder';

        // internal methods
        var showScreen = function(screenId) {
            return function(coreContext) {
                logonView.showScreen(screenId, this.screenEvents[screenId], coreContext);
            }.bind(this);
        }.bind(this);


        var callChangePasscode = function(context) {
            utils.debugJSON(context, 'logonCore.changePasscode');
            
            if (!context.oldPasscodeEnabled && (context.unlockPasscode == undefined || context.passcodeChallengeReason == undefined)){
                context.oldPasscode = null;
            }
            
            if (!context.passcodeEnabled){
                context.passcode = null;
            }
            
            logonCore.changePasscode(
                function(currentContext, state){
                    currentContext.fingerprintScanEnabled = context.fingerprintScanEnabled!=undefined && context.fingerprintScanEnabled;
                    currentContext.passcode = context.passcode;
                    if (device.platform.toLowerCase() == "ios" || device.platform.toLowerCase() == "android"){
                        sap.logon.Core.setFingerprintEnabled(function(){onFlowSuccess(currentContext, state)}, onChangePasscodeError, currentContext);
                    }
                    else{
                        onFlowSuccess(currentContext, state);
                    }
                },
                onChangePasscodeError,
                context);
        }

        var onChangePasscodeError = function(error) {
            utils.logJSON("onChangePasscodeError: " + JSON.stringify(error));
            logonView.showNotification(getSecureStoreErrorText(error));
        }

        var onPasscodeCancel = function() {
            utils.debug('onPasscodeCancel');
             if (this.oncancel){
                this.oncancel = null;
            }
            logonCore.getContext(onFlowCancel, onFlowCancel);
        }
        
        var noOp = function() {}

        var callDisablePasscode = function(context) {
            utils.debugJSON(context, 'logonCore.disablePasscode');
            context.passcode = null;
            logonCore.changePasscode(
                onFlowSuccess,
                onChangePasscodeError,
                context)
        }

        var callGetContext = function() {
            utils.debug('logonCore.getContext');
            logonCore.getContext(onCoreResult, onFlowError);
        }

        var onPasscodeEnable = function(context) {
            utils.debugJSON(context, this.name + ' onPasscodeEnable: ');
            //logonCore.changePasscode(onFlowSuccess, onFlowError, context);
            onFlowError();
        }

        // exported properties
        this.stateTransitions = [{
                id: "mp0",
                condition: {
                    state: {
                        secureStoreOpen: true,
                    },
                    context: null
                },
                action: callGetContext
            }, {
                id: "mp1",
                condition: {
                    state: {
                        secureStoreOpen: false,
                    }
                },
                action: onFlowError
            }, {
                id: "mp2",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        defaultPasscodeUsed: true,
                        //                        defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_MANAGE_PASSCODE_OPT_OFF'
            }, {
                id: "mp3",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        defaultPasscodeUsed: false,
                        defaultPasscodeAllowed: true,
                    }
                },
                action: 'SCR_MANAGE_PASSCODE_OPT_ON'
            }, {
                id: "mp4",
                condition: {
                    state: {
                        secureStoreOpen: true,
                        //defaultPasscodeUsed: [DONTCARE],
                        defaultPasscodeAllowed: false,
                    }
                },
                action: 'SCR_MANAGE_PASSCODE_MANDATORY'
            },


        ];

        this.screenEvents = {
            'SCR_MANAGE_PASSCODE_OPT_ON': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                ondisable: callDisablePasscode,
                onerrorack: noOp
            },
            'SCR_MANAGE_PASSCODE_OPT_OFF': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                ondisable: onFlowSuccess,
                onerrorack: noOp
            },
            'SCR_MANAGE_PASSCODE_MANDATORY': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                onerrorack: noOp
            },


            'SCR_SET_PASSCODE_OPT_ON': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                ondisable: showScreen('SCR_SET_PASSCODE_OPT_OFF'),
                onerrorack: noOp
            },
            'SCR_SET_PASSCODE_OPT_OFF': {
                onsubmit: callDisablePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                onenable: showScreen('SCR_SET_PASSCODE_OPT_ON'),
                onerrorack: noOp
            },
            'SCR_CHANGE_PASSCODE_OPT_ON': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                ondisable: showScreen('SCR_CHANGE_PASSCODE_OPT_OFF'),
                onerrorack: noOp
            },
            'SCR_CHANGE_PASSCODE_OPT_OFF': {
                onsubmit: callDisablePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                onenable: showScreen('SCR_CHANGE_PASSCODE_OPT_ON'),
                onerrorack: noOp
            },
            'SCR_CHANGE_PASSCODE_MANDATORY': {
                onsubmit: callChangePasscode,
                oncancel: onPasscodeCancel,
                onerror: onFlowError,
                onerrorack: noOp
            },

        };


        utils.debug('flow constructor return');
    }

    var ShowRegistrationFlow = function ShowRegistrationFlow(logonCore, logonView, onCoreResult, onFlowSuccess, onFlowError, onFlowCancel) {
        //wrapped into a function to defer evaluation of the references to flow callbacks

        this.name = 'showRegistrationFlowBuilder';

        var showRegistrationInfo = function(context) {
            logonView.showScreen('SCR_SHOW_REGISTRATION', this.screenEvents['SCR_SHOW_REGISTRATION'], context);
        }.bind(this);

        var callGetContext = function() {
            utils.debug('logonCore.getContext');
            logonCore.getContext(onCoreResult, onFlowError);
        }

        // exported properties
        this.stateTransitions = [{
                id: "sr0",
                condition: {
                    state: {
                        secureStoreOpen: true,

                    },
                    context: null
                },
                action: callGetContext
            }, {
                id: "sr1",
                condition: {
                    secureStoreOpen: true,
                },
                action: showRegistrationInfo
            }

        ];

        this.screenEvents = {
            'SCR_SHOW_REGISTRATION': {
                oncancel: onFlowSuccess,
                onerror: onFlowError
            }
        };


        utils.debug('flow constructor return');
    }

    // === flow launcher methods =====================================


    var resume = function(onsuccess, onerror) {
        // function to be called after resuming application.
        var resumeAction = function(onsuccess, onerror) {
            if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
                utils.debug('FlowRunner.run MAFLogon is not initialized');
                onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
                return;
            }

            var onUnlockSuccess = function(context) {
                _oLogonCore.onEvent(onsuccess, onerror, 'RESUME', context);
            }

            var onGetStateSuccess = function(state) {
                //call registration flow only if the status is fullregistered in case of resume, so logon screen will not loose its input values
                if (state.status == 'fullRegistered' && !state.secureStoreOpen) {
                    registerOrUnlock(onUnlockSuccess, onerror);
                }
                if (cordova.require("cordova/platform").id != "ios"){
                    fireEvent('usageGause');
                }
            }
            getState(onGetStateSuccess, onerror);
        }

        if (cordova.require("cordova/platform").id.indexOf("windows") === 0) {
            // send resume event before unlocking on windows.
            // LogonCore needs this information before calling unlock.
            _oLogonCore.onEvent(
                function() {
                    resumeAction(onsuccess, onerror);
                },
                function() {
                    resumeAction(onsuccess, onerror);
                },
                'RESUME'
            );
        } else {
            // no change for other platforms. 
            resumeAction(onsuccess, onerror);
        }


    }


    var get = function(onsuccess, onerror, key) {

        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var onUnlockSuccess = function() {
            _oLogonCore.getSecureStoreObject(onsuccess, onerror, key);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }

    var getConfiguration = function(onsuccess, onerror, type) {

        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('getConfiguration MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var key;
        if (type == "authentication") {
            var samlConfig = "";
            //process the configuration data in _providedContext to get the SAML configuration and add it into the authentication configuration.
            //_providedContext comes from the init call on logon/passcodeManager, so we do not need to load the saved context from data vault.
            if (_providedContext) {
                var auth = getSAMLConfig(_providedContext);
                if (auth) {
                    var saml = auth["config"];
                    if (saml) {
                        var samlSettings = JSON.stringify(saml);
                        samlConfig = ',"saml":[{"type":"user", "data":' + samlSettings + '}]';
                    }
                }

            }
            var jsonConfig = '{"basic":[{"type":"logon"}],"clientCert":[{"type":"logon"}]' + samlConfig + '}';
            onsuccess(jsonConfig);
        } else {
            utils.log('getConfiguration: invalid data for "type" parameter');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "configType parameter is not specified"));
            return;
        }
    }

    var set = function(onsuccess, onerror, key, value) {

        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var onUnlockSuccess = function() {
            _oLogonCore.setSecureStoreObject(onsuccess, onerror, key, value);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }



    var lock = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        _oLogonCore.lockSecureStore(onsuccess, onerror);
    }

    var getState = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        _oLogonCore.getState(onsuccess, onerror);
    }

    var wrapCallbackWithQueueNext = function(callback) {
        return function() {
            //Need a try-cache block, so if application delegate callback function throws an exception, it will not stop the 
            //logon plugin to continue processing the next flow
            try {
                if (callback) {
                    callback.apply(this, arguments);
                }
            } catch (ex) {
                utils.log("Appliction callback exception: " + JSON.stringify(ex));
            }
            if (flowqueue) {
                flowqueue.runNextFlow();
            }
        }
    }

    var registerOrUnlock = function(onsuccess, onerror, flowContext) {
        var startTime = sap.logon.Utils.logPerformanceMessage("logonController.js registerOrUnlock");

        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var callbacks = {
            "onsuccess": wrapCallbackWithQueueNext(function(){
                 sap.logon.Utils.logPerformanceMessageSince("logonController.js registerOrUnlock", startTime);
                 onsuccess.apply(this, arguments);
             }),
            "onerror": wrapCallbackWithQueueNext(onerror)
        }

        var flow;
        if (_bIsWebRegistration) {
            flow = WebRegistrationFlow;
        } else {
            flow = RegistrationFlow;
        }
        var flowRunner = new FlowRunner(callbacks, _oLogonView, _oLogonCore, flow, flowContext);

        if (flowqueue) {
            flowqueue.add(flowRunner);
        } else {
            flowRunner.run();
        }
    }

    var changePassword = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        if (_bIsWebRegistration) {
            utils.log('ChangePassword is not supported for passcode manager only initialization');
            onerror(errorWithDomainCodeDescription("MAFLogon", "6", "ChangePassword is not supported for PasscodeManager only initialization"));
            return;
        }

        var onUnlockSuccess = function() {
            var callbacks = {
                "onsuccess": wrapCallbackWithQueueNext(onsuccess),
                "onerror": wrapCallbackWithQueueNext(onerror)
            }
            var innerFlowRunner = new FlowRunner(callbacks, _oLogonView, _oLogonCore, ChangePasswordFlow);

            // use setInterval to wait for the unlock flow to fully finish
            // (if the next flow is started to soon then Android can get
            // stuck with a blank screen).
            var intervalID = setInterval(function() {
                if (flowqueue) {
                    if (!flowqueue.isRunning) {
                        clearInterval(intervalID);
                        flowqueue.add(innerFlowRunner);
                    }
                } else {
                    clearInterval(intervalID);
                    innerFlowRunner.run();
                }
            }, 10);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }

    var deletePasscodeManager = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('deletePasscodeManager MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var onUnlockSuccess = function() {
            _oLogonCore.deleteRegistration(onsuccess, onerror);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }



    var managePasscode = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        var onUnlockSuccess = function() {
            var callbacks = {
                "onsuccess": wrapCallbackWithQueueNext(onsuccess),
                "onerror": wrapCallbackWithQueueNext(onerror)
            }
            var innerFlowRunner = new FlowRunner(callbacks, _oLogonView, _oLogonCore, ManagePasscodeFlow);

            // use setInterval to wait for the unlock flow to fully finish
            // (if the next flow is started to soon then Android can get
            // stuck with a blank screen).
            var intervalID = setInterval(function() {
                if (flowqueue) {
                    if (!flowqueue.isRunning) {
                        clearInterval(intervalID);
                        flowqueue.add(innerFlowRunner);
                    }
                } else {
                    clearInterval(intervalID);
                    innerFlowRunner.run();
                }
            }, 10);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }
    
    var showRegistrationData = function(onsuccess, onerror) {
        if (!_oLogonCore || !sap.logon.Core.isInitialized()) {
            utils.log('FlowRunner.run MAFLogon is not initialized');
            onerror(errorWithDomainCodeDescription("MAFLogon", "2", "MAFLogon is not initialized"));
            return;
        }

        if (_bIsWebRegistration) {
            utils.log('ShowRegistrationData is not supported for passcode manager only initialization');
            onerror(errorWithDomainCodeDescription("MAFLogon", "6", "ShowRegistrationData is not supported for PasscodeManager only initialization"));
            return;
        }

        var onUnlockSuccess = function() {
            var callbacks = {
                "onsuccess": wrapCallbackWithQueueNext(onsuccess),
                "onerror": wrapCallbackWithQueueNext(onerror)
            }
            var innerFlowRunner = new FlowRunner(callbacks, _oLogonView, _oLogonCore, ShowRegistrationFlow);

            // use setInterval to wait for the unlock flow to fully finish
            // (if the next flow is started to soon then Android can get
            // stuck with a blank screen).
            var intervalID = setInterval(function() {
                if (flowqueue) {
                    if (!flowqueue.isRunning) {
                        clearInterval(intervalID);
                        flowqueue.add(innerFlowRunner);
                    }
                } else {
                    clearInterval(intervalID);
                    innerFlowRunner.run();
                }
            }, 10);
        }

        registerOrUnlock(onUnlockSuccess, onerror);
    }

    var getSecureStoreErrorText = function(error) {
        utils.debug('LogonController.getSecureStoreErrorText: ' + JSON.stringify(error));

        var errorText;

        if (error.errorCode === '14' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_TOO_SHORT";
        else if (error.errorCode === '10' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_REQUIRES_DIGIT";
        else if (error.errorCode === '13' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_REQUIRES_UPPER";
        else if (error.errorCode === '11' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_REQUIRES_LOWER";
        else if (error.errorCode === '12' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_REQUIRES_SPECIAL";
        else if (error.errorCode === '15' && error.errorDomain === 'MAFSecureStoreManagerErrorDomain')
            errorText = "ERR_PASSCODE_UNDER_MIN_UNIQUE_CHARS";
        else {
            errorText = "ERR_SETPASSCODE_FAILED";
        }

        return errorText;
    }

    var getSSOPasscodeSetErrorText = function(error) {
        utils.debug('LogonController.getSSOPasscodeSetErrorText: ' + JSON.stringify(error));

        var errorText;

        if (error.errorDomain === 'MAFLogonCoreErrorDomain') {
            if (error.errorCode === '16') {
                errorText = "ERR_SSO_PASSCODE_SET_ERROR";
            }
        }

        return errorText;
    }

    var getRegistrationErrorText = function(error) {
        utils.debug('LogonController.getRegistrationErrorText: ' + JSON.stringify(error));

        var errorText;

        if (error.errorDomain === 'MAFLogonCoreErrorDomain') {
            if (error.errorCode === '80003') {
                errorText = "ERR_REG_FAILED_WRONG_SERVER";
            }
            //in case of wrong application id
            else if (error.errorCode === '404') {
                errorText = "ERR_REG_FAILED";
                
            //In order to properly handle an iOS 401, we need to check for "3" and the presence of specific text. See
            //MAFLogonCoreErrors.h in the Native SDK for details.
            //
            //Note that this will produce the same result for an iOS 403 error (based upon information provided in Internal message 1570801425,
            //which is the issue this change is designed to address), so we've added 403 to the error check to insure that Android behaves the same way (this now
            //insures that both Android and iOS return "ERR_REG_FAILED_UNATHORIZED" for 403 as well as 401, which makes sense (if anything, it makes more sense
            //for a 403 error). 
            //
            //We have not, however, corrected the spelling of "UNATHORIZED", as there is no doubt code out there that relies upon this
            //misspelling now.
                
            } else if (((error.errorCode === '401') || (error.errorCode === '403')) || ((error.errorCode === '3') && (error.errorMessage === 'keyErrDescrMAFLogonErrorInvalidLoginData'))) {
                errorText = "ERR_REG_FAILED_UNATHORIZED";
            } else if (error.errorCode === '22') {
                errorText = "ERR_REG_FAILED_WHITELIST_ERROR";
            } else if (error.errorCode === '-1') {
                errorText = "ERR_REG_FAILED_UNATHORIZED";
            } else if (error.errorCode === '-2') {
                errorText = "ERR_REG_FAILED_HOST_NOT_FOUND";
            } else if (error.errorCode === '-3') {
                errorText = "ERR_REG_FAILED_SERVER_UNREACHABLE";
            } else if (error.errorCode === '-4') {
                errorText = "ERR_REG_FAILED_BAD_SERVER_CERT";
            } else if (error.errorCode === '-5') {
                errorText = "ERR_REG_FAILED_NO_INTERNET_CONNECTION";
            } else if (error.errorCode === '-6') {
                errorText = "ERR_REG_FAILED_NETWORK_IO";
            } else if (error.errorCode === '-7') {
                errorText = "ERR_REG_FAILED_SECURE_CHANNEL_ERROR";
            } else if (error.errorCode === '-8') {
                errorText = "ERR_REG_FAILED_BAD_CLIENT_CERT";
            } else {
                errorText = "ERR_REG_FAILED";
            }
        }

        return errorText;
    }

    var getRegistrationCancelError = function(error) {
        utils.debug('LogonController.getRegistrationCancelError: ' + JSON.stringify(error));

        var errorText;

        errorText = "ERR_REGISTRATION_CANCEL";

        return errorText;
    }

    var errorWithDomainCodeDescription = function(domain, code, description) {
        var error = {
            errorDomain: domain,
            errorCode: code,
            errorMessage: description
        };

        return error;
    }

    function normalizeResourcePath(context) {
        //normalize resource path to absolute path (starting with '/')
        if (context && context.resourcePath) {
            context.resourcePath = context.resourcePath.trim();
            if (context.resourcePath.length > 0) {
                context.resourcePath = context.resourcePath.replace("\\", "/");
                if (context.resourcePath.charAt(0) !== '/') {
                    context.resourcePath = "/" + context.resourcePath;
                }

                //remove trailing '/' or '\'
                if (context.resourcePath.charAt(context.resourcePath.length - 1) === '/') {
                    context.resourcePath = context.resourcePath.substr(0, context.resourcePath.length - 1);
                }
            }
        }
    }

    //return null for succeess, otherwise, return the invalid key
    function verifyPasscodePolicy(policy) {
        for (var key in policy) {
            if (policy.hasOwnProperty(key)) {
                if (passcodePolicyAttributeNames.indexOf(key) == -1) {
                    return key;
                }
            }
        }
        return null;
    }

   /**
     *  Restore session with SMP server. This method is called upon unlock to 
     *  @private
     */
    var refreshSession = function (successCallback, errorCallback) {
        if (_providedContext) {
            pingServer(_providedContext, successCallback, errorCallback);
        } else {
            sap.logon.Core.getContext(function(context) {
                pingServer(context, successCallback, errorCallback);
            }, function(error) {
                if (errorCallback) {
                    errorCallback({ message: "Failed to get registration context to ping server.", error: error });
                }
            });
        }
    }

    // This function merges specific settings into the given context.
    // We can't indescriminately merge all properties because that would
    // mean the default values would override the values the user enters.
    function mergeSettingsIntoRegistrationContext(settings, context) {
        // only properties with the following names will be merged.
        var propertiesToMerge = ["serverHost", "serverPort", "https", "auth", "farmId", "resourcePath"];
        if (settings && typeof(settings) == "object") {
            if (context && typeof(context) == "object") {
                for (var index = 0; index < propertiesToMerge.length; index++) {
                    if (settings.hasOwnProperty(propertiesToMerge[index])) {
                        context[propertiesToMerge[index]] = settings[propertiesToMerge[index]];
                    }
                }
            }
        }
    }

    //when afaria is used for ios client, ios appdelegate will call javascriipt method window.handleOpenURL to handle it,
    // if this method is not defined on javascript side, then it will hang the app
    if (cordova.require("cordova/platform").id === "ios" || cordova.require("cordova/platform").id === "android") {
        if (!window.handleOpenURL || typeof window.handleOpenURL !== 'function') {
            window.handleOpenURL = function(url) {
               //if fiori client is launched by SAP authenticator, then before logon passcode is
			   //unlocked, the appdelegate will not be set. In that case, save the url and fiori
			   //will read it later after the data vault it unlocked and gotoFioriUrl is called.
               
               //If fiori client's appdelegate object defines openurl method, then invoke it
               if (appDelegate != null && (typeof appDelegate.handleOpenURL === 'function')){
                    appDelegate.handleOpenURL(appDelegate.onRegistrationError, url);
               }
               else{
                   //When appdelegate see the fioriPendignOpenURL, it needs to handle it in gotoFioriURL method.
                   window.fioriPendingOpenURL = url;
               }
            };
        }
    }

    // This section of code implements the saving of form credentials.  If the user chooses to save the
    // form credentials, next time that form is shown the credentials will be prepopulated for them.
    document.addEventListener("onSapLogonSuccess", function() {
        var addFormListener = function() {
            var forms = document.forms
            var formToSaveCredentialsFor;
            if (forms) {
                var formKeys = Object.keys(forms);
                // Look for a form with a password field.
                for (var key in formKeys) {
                    if (forms[key]){
                        var elements = forms[key].elements;
                        if (elements) {
                            for (var i=0; i<elements.length; i++) {
                                if(elements[i].type == "password") {
                                    formToSaveCredentialsFor = forms[key];
                                    break;
                                }
                            }
                        }
                    }
                    if (formToSaveCredentialsFor) {
                        break;
                    }
                }
                if (formToSaveCredentialsFor) {
                    var previouslySavedCredentials;
                    var listenToSubmit = function() {
                        formToSaveCredentialsFor.onsubmit = function(event) {
                            var that = this;
                            var elements = formToSaveCredentialsFor.elements;
                            var saveCredentials = function() {
                                var savedFields = {};
                                for (var i=0; i<elements.length; i++) {
                                    if (elements[i].type == "password" || elements[i].type == "text") {
                                        savedFields[elements[i].name] = elements[i].value;
                                    }
                                }
                                sap.Logon.set(function(){
                                    sap.Logger.debug("Saved form credentials for form with name: " + formToSaveCredentialsFor.name);
                                }, function(){
                                    sap.Logger.debug("Failed to save logon form credentials.");
                                }, "formCredentials" + window.location.protocol + window.location.host + window.location.pathname + formToSaveCredentialsFor.name, JSON.stringify(savedFields));
                            }
                            var neverSaveCredentials = function() {
                                sap.Logon.set(function(){}, function(){sap.Logger.debug("Failed to save user's choice to never save credentials.");}, "userSaidNever" + window.location.protocol + window.location.host + window.location.pathname + formToSaveCredentialsFor.name, "true");
                            }
                            var clearSavedCredentials = function() {
                                sap.Logon.set(function(){
                                    sap.Logger.debug("Cleared form credentials for form with name: " + formToSaveCredentialsFor.name);
                                }, function() {
                                    sap.Logger.debug("Failed to clear saved logon form credentials.");
                                }, "formCredentials" + window.location.protocol + window.location.host + window.location.pathname + formToSaveCredentialsFor.name, null);
                            }
                            var onConfirmResponse = function(buttonIndex) {
                                if (buttonIndex == 1) { // User pressed "no"
                                    clearSavedCredentials();
                                } else if (buttonIndex == 2) { // User pressed "yes"
                                    saveCredentials();
                                } else if (buttonIndex == 3) { // User pressed "never"
                                    clearSavedCredentials();
                                    neverSaveCredentials();
                                }
                                that.submit();
                            }
                            if (previouslySavedCredentials) {
                                // check if the user changed the saved values
                                var valuesChanged = false;
                                for (var i=0; i<elements.length; i++) {
                                    if (previouslySavedCredentials[elements[i].name] && elements[i].value != previouslySavedCredentials[elements[i].name]) {
                                        valuesChanged = true;
                                        break;
                                    }
                                }
                            }
                            if (!previouslySavedCredentials || valuesChanged) {
                                event.preventDefault();
                                var i18n = require('kapsel-plugin-i18n.i18n');
                                i18n.load(
                                    {
                                        path: "smp/logon/i18n",
                                        name: "i18n"
                                    },
                                    function (bundle) {
                                        navigator.notification.confirm(
                                            bundle.get("ask_user_save_credentials"),
                                            onConfirmResponse,
                                            bundle.get("save_credentials"),
                                            [bundle.get("not_now"), bundle.get("save"), bundle.get("never")]
                                        );
                                    }
                                );
                            }
                        }
                    }
                    var getPreviouslySavedFormCredentials = function() {
                        sap.Logon.get(function(savedCredentialsString){
                            listenToSubmit();
                            if (savedCredentialsString && savedCredentialsString != "") {
                                var savedCredentialsObject = JSON.parse(savedCredentialsString);
                                var loginForm = formToSaveCredentialsFor;
                                var elements = loginForm.elements;
                                for (var i=0; i<elements.length; i++) {
                                    if (savedCredentialsObject[elements[i].name]) {
                                        elements[i].value = savedCredentialsObject[elements[i].name];
                                    }
                                }
                                previouslySavedCredentials = savedCredentialsObject;
                            }
                        }, function(error){
                            listenToSubmit();
                        }, "formCredentials" + window.location.protocol + window.location.host + window.location.pathname + formToSaveCredentialsFor.name);
                    }
                    // Check to see if the user previously selected "never" for this form
                    sap.Logon.get(function(userSaidNever){
                        if (!userSaidNever) {
                            getPreviouslySavedFormCredentials();
                        }
                    }, function(error){
                        getPreviouslySavedFormCredentials();
                    }, "userSaidNever" + window.location.protocol + window.location.host + window.location.pathname + formToSaveCredentialsFor.name);
                }
             }
         }

        var checkPasscodeIsEnabled = function() {
            sap.logon.Core.getState(function (state) {
                // Only if the passcode is enabled should we allow the option to save form credentials.
                if (!state.defaultPasscodeUsed) {
                    addFormListener();
                }
            },
            function(error){
                sap.Logger.debug("Failed to get Logon state to see if the passcode is enabled.");
            });
        }
        sap.Logon.get(function(allowSavingFormCredentials) {
            if (allowSavingFormCredentials == "true") {
                checkPasscodeIsEnabled();
            }
        }, function(){
            sap.Logger.debug("failed to get preference " + allowSavingFormCredentials);
        }, "allowSavingFormCredentials");
    });

    var persistAllowSaveFormCredentialsConfig = function(givenAllowSaveCredentials) {
        var allowed = "false";
        if (typeof givenAllowSaveCredentials !== "undefined" && givenAllowSaveCredentials && (givenAllowSaveCredentials+"").toLowerCase() != "false") {
            allowed = "true";
        }
        sap.Logon.set(function(){}, function(){}, "allowSavingFormCredentials", allowed);
    }

    var onDeleteRegistrationFinished = function() {
        _hasLogonSuccessEventFired = false;
        document.removeEventListener("resume", _resumeListener, false);
    }

    // =================== exported (public) members ====================

    /**
     * The Logon plugin provides screen flows to register an app with an SAP Mobile Platform server.<br/>
     * <br/>
     * The logon plugin is a component of the SAP Mobile Application Framework (MAF), exposed as a Cordova plugin. The basic
     * idea is that it provides screen flows where the user can enter the values needed to connect to an SAP Mobile Platform 3.0 server and
     * stores those values in its own secure data vault. This data vault is separate from the one provided with the
     * encrypted storage plugin. In an OData based SAP Mobile Platform 3.0 application, a client must onboard or register with the SAP Mobile Platform 3.0
     * server to receive an application connection ID for a particular app. The application connection ID must be sent
     * along with each request that is proxied through the SAP Mobile Platform 3.0 server to the OData producer.<br/>
     * <br/>
     * <b>Adding and Removing the Logon Plugin</b><br/>
     * The Logon plugin is added and removed using the
     * <a href="http://cordova.apache.org/docs/en/edge/guide_cli_index.md.html#The%20Command-line%20Interface">Cordova CLI</a>.<br/>
     * <br/>
     * To add the Logon plugin to your project, use the following command:<br/>
     * cordova plugin add kapsel-plugin-logon<br/>
     * <br/>
     * To remove the Logon plugin from your project, use the following command:<br/>
     * cordova plugin rm kapsel-plugin-logon
     *
     * @namespace
     * @alias Logon
     * @memberof sap
     */
    module.exports = {
        /** This funciton is used for firing an Event 
         ** Usage sap.Logon.fireEvent(eventid, arguments);
         **/
        fireEvent: fireEvent,
        /**
         * Initialization method to set up the Logon plugin.  This will register the application with the SMP server and also authenticate the user
         * with servers on the network.  This step must be done first prior to any attempt to communicate with the SMP server.<br/>
         * <br/>
         * This function and {@link sap.Logon.initPasscodeManager} are mutually exclusive.  Do not call both.
         *
         * @method
         * @param {sap.Logon~successCallback} successCallback The function that is invoked if initialization is successful.  The current
         * context is passed to this function as the parameter.
         * @param {sap.Logon~errorCallback} errorCallback The function that is invoked in case of an error.
         * @param {string} applicationId The unique ID of the application.  Must match the application ID on the SAP Mobile Platform server.
         * @param {object} [context] The context with default values for application registration, as well as options to customize the Logon plugin screens.  See {@link sap.Logon~successCallback} for the structure
         * of the context object.  Note that all properties of the context object are optional, and you only need to specify the properties
         * for which you want to provide default values for.  The values will be presented to the application users during the registration process and given them
         * a chance to override these values during runtime.  There are two additional values that can be specified in the context that are not described in
         * {@link sap.Logon~successCallback}: "mobilePlaceAppID" and "mobilePlaceAppVersion".  If left blank, the mobilePlaceAppID will default to the
         * applicationId provided to this function.  mobilePlaceAppVersion defaults to "1.0". The mobile place app ID and version are used in combination to
         * retrieve the configuration from Mobile Place.
         * @param {string} [logonView=sap.logon.LogonJsView] The cordova module ID of a custom renderer for the logon,
         * implementing the [showScreen(), close()] interface.  Please use the default module unless you are absolutely sure that you can provide your own
         * custom implementation.  Please refer to JavaScript files inside your Kapsel project's plugins\logon\www\common\modules\ folder as example.
         * @param {string} [certificateProviderClassName] The name identifying the custom certificate provider to use.  This parameter should only be
         * specified if the app is supposed to use a custom certificate provider.  In that case, the string specified by this parameter must match
         * the android:name of the meta-data tag in AndroidManifest.xml (the value for that tag will be the classpath and classname).
         * @example
         * // a custom UI can be loaded here
         * var logonView = sap.logon.LogonJsView;
         *
         * // The app ID
         * var applicationId = "someAppID";
         *
         * // You only need to specify the fields for which you want to set the default.   These values are optional because they will be 
         * // used to prefill the fields on Logon's UI screen.
         * // You can override UI defaults by setting the "custom" property.
         * var defaultContext = {
         *  "appName": "My App",
         *  "serverHost": "defaultServerHost.com",
         *  "https": false,
         *  "serverPort": "8080",
         *  "user": "user1",
         *  "password": "Zzzzzz123",
         *  "communicatorId": "REST",
         *  "securityConfig": "sec1",
         *  "farmId": "",
         *  "resourcePath": "",
         *  "passcode": "Aaaaaa123",
         *  "unlockPasscode": "Aaaaaa123",
         *
         *  "custom": {
         *      // This is the Fiori Client background image
         *      "backgroundImage": "../../../background.jpg",
         *
         *      // These fields will be hidden, but any default values specified above will still be sent
         *      "hiddenFields": ["resourcePath", "farmId", "securityConfig"],
         *
         *      // This option hides the logo and copyright information
         *      "hideLogoCopyright": true,
         *
         *      // This option specifies a custom logo image
         *      "copyrightLogo": "../../../sapLogo.png",
         *
         *      // This option specifies both lines of the copyright message
         *      "copyrightMsg": ["Copyright 2016 SAP", "All rights reserved."],
         *
         *      // This option skips the passcode screen
         *      "disablePasscode": false
         *
         *      // This option specifies the css file used to customize the logon screen
         *      "styleSheet": "../../../custom.css"
         *  }
         * };
         *
         * var app_context;
         *
         * var successCallback = function(context){
         *     app_context = context;
         * }
         *
         * var errorCallback = function(errorInfo){
         *     alert("error: " + JSON.stringify(errorInfo));
         * }
         * sap.Logon.init(successCallback, errorCallback, applicationId, defaultContext, logonView, "customCertProvider");
         */
        init: init,
        /**
         * Initialization method to set up the Logon plugin as a passcode and datavault manager only.
         * When this method is called, the Logon plugin will not do anything with regards to registering
         * with any server.<br/>
         * <br/>
         * This function and {@link sap.Logon.init} are mutually exclusive.  Do not call both.
         *
         * @method
         * @param {sap.Logon~successCallback} successCallback The function that is invoked if initialization is successful.  The current
         * state is passed to this function as the parameter.
         * @param {sap.Logon~errorCallback} errorCallback The function that is invoked in case of an error.
         * @param {string} applicationId The unique ID of the application.  This value will be used as the datavault store ID.
         * @param {string} [customView=sap.logon.LogonJsView] The cordova module ID of a custom renderer for the logon,
         * implementing the [showScreen(), close()] interface.  Please use the default module unless you are absolutely sure that you can provide your own
         * custom implementation.  Please refer to JavaScript files inside your Kapsel project's plugins\logon\www\common\modules\ folder as example.
         * @param {Object} passcodePolicy The passcode policy. Contains information such as expiration days, whether or not the passcode must have digits, 
         * lower case letters, special letters or upper case letters, if a default passcode is allowed, whether or not there is a time out and it's associated 
         * retry limit, minimum length of passcode and minimum unique characters in the passcode.
         * @param {Object} context If a context is passed, the method simply makes note of it and stores it for future use with other functions. 
         * The initPasscodeManager function itself does not use it.
         * @param {string} credentialProviderID The name identifying the custom certificate provider to use.  This parameter should only be
         * specified if the app is supposed to use a custom certificate provider.  In that case, the string specified by this parameter must match
         * the android:name of the meta-data tag in AndroidManifest.xml (the value for that tag will be the classpath and classname). 
         * For ios client, the string specified by this parameter must be added as key into the application info plist file, the value of the key (in string) type 
         * is the actual interface name that implements the custom certificate provider.
         * @example
         * // a custom UI can be loaded here
         * var logonView = sap.logon.LogonJsView;
         *
         * // The app ID
         * var applicationId = "someAppID";
         *
         * var successCallback = function(state){
         *     alert("successfully initialzed, resulting state: " + JSON.stringify(state));
         * }
         *
         * var errorCallback = function(errorInfo){
         *     alert("error: " + JSON.stringify(errorInfo));
         * }
         * sap.Logon.initPasscodeManager(successCallback, errorCallback, applicationId, customView, passcodePolicy, context, credentialProviderID);
         */
        initPasscodeManager: initPasscodeManager,
               
        /**
        * startLogonInit is a helper method for Kapsel project to support certain fiori client features such as third party certificate provider and multiuser
        * If third party certificate provider is specified, the method will first get certificate from certificate provider before starting the device registration.
        * <br/>
   	    * When this function is used, then no need to call {@link sap.Logon.init} or {@link sap.Logon.initPasscodeManager}.
        *
        * @method
        * @param {Object} context The context parameter includes appConfig, smpConfig and operation properties. smpConfig contains the registration context for SMP registration. appConfig contains appID, isForSMP and certificate settings. operation property contains logon view information.
        * @param {Object} appDelegateObj The appDelegate parameter includes both onRegistrationError and onRegistrationSuccess callback methods.
        * @example
        *
        * var context = {};
        * var appDelegate = {}; 
     
        * context.appConfig.appID = "com.mycompany.logon"; // Change this to app id on server
        * context.appConfig.isForSMP = true;
        * context.appConfig.certificate = "X509FileCertificateProvider"; //the value must match the key defined in the plist file
     
        * context.operation.logonView = sap.logon.LogonJsView;

        * appDelegate.logonSuccessCallback(result) {
        *      alert("Successfully Registered");
        *      applicationContext = result;
        * }
     
        * appDelegate.logonErrorCallback(error) {   //this method is called if the user cancels the registration.
        *      utils.log("An error occurred:  " + JSON.stringify(error));
        *      if (device.platform == "Android") {  //Not supported on iOS
        *          navigator.app.exitApp();
        *      }
        * }
     
        *  // Optional context for initial values and UI customization
        * context.smpConfig = {
        *   "appName": "My App",
        *   "serverHost": "torn00461340a.amer.global.corp.sap", //Place your SMP 3.0 server name here
        *   "https": true,
        *   "serverPort": 8081,
        *   "communicatorId": "REST",
        *   "passcode": "password",  //note hardcoding passwords and unlock passcodes are strictly for ease of use during development
        *   //once set can be changed by calling sap.Logon.managePasscode()
        *   "unlockPasscode": "password",
        *   "passcode_CONFIRM":"password",
        *   "multiUser": true,
        *
        *   // Use this to customize the Logon plugin UI
        *   "custom": {
        *      // This is the Fiori Client background image
        *      "backgroundImage": "../../../background.jpg",
        *
        *      // These fields will be hidden, but any default values specified above will still be sent
        *      "hiddenFields": ["resourcePath", "farmId", "securityConfig"],
        *
        *      // This option hides the logo and copyright information
        *      "hideLogoCopyright": true,
        *
        *      // This option specifies a custom logo image
        *      "copyrightLogo": "../../../sapLogo.png",
        *
        *      // This option specifies both lines of the copyright message
        *      "copyrightMsg": ["Copyright 2016 SAP", "All rights reserved."],
        *
        *      // This option skips the passcode screen
        *      "disablePasscode": false,
        *
        *      // This option specifies the css file used to customize the logon screen
        *      "styleSheet": "../../../custom.css",
        *
        *      // This option specifies the UI5 theme to use for the logon screens.
        *      "theme" : "sap_bluecrystal"
        *   }
        * };
     
        * sap.Logon.startLogonInit(context, appDelegate);
        */

        startLogonInit : startLogonInit,
               
        /**
         * Function to delete the datavault and all data stored therein.
         * This function is intended to be used when Logon has been initialized as a passcode manager via {@link sap.Logon.initPasscodeManager}.
         * However, if it has been initialized for server registration (via {@link sap.Logon.init}), calling this function will
         * delete the registration and all data.
         *
         * @method
         * @param {sap.Logon~successCallbackNoParameters} successCallback The function that is invoked if the deletion is successful.
         * @param {sap.Logon~errorCallback} errorCallback The function that is invoked in case of an error.
         * @example
         * var successCallback = function(){
         *     alert("successfully deleted all data");
         * }
         *
         * var errorCallback = function(errorInfo){
         *     alert("error: " + JSON.stringify(errorInfo));
         * }
         * sap.Logon.deletePasscodeManager(successCallback, errorCallback);
         */
        deletePasscodeManager: deletePasscodeManager,

        /**
         * The application ID with which {@link sap.Logon.init} was called.  It is available here so it is easy to access later.
         * @example
         * // After calling the init function
         * alert("The app ID for this app is: " + sap.Logon.applicationId);
         */
        applicationId: null,
        /**
         * Direct reference to the logon core object used by the Logon plugin.  This property is 
         * obsolete, and it is only kept for backward compatible purpose. Caller should replace
         * it with sap.logon.Core.
         */
        core: _oLogonCore,

        /**
         * Get an  (JSON serializable) object from the DataVault for a given key.
         * @method
         * @param {sap.Logon~getSuccessCallback} onsuccess The function that is invoked
         * upon success.  It is called with the resulting object as a single parameter.
         * This can be null or undefined, if no object is defined for the given key.
         * @param {sap.Logon~errorCallback} onerror The function to invoke in case of error.
         * @param {string} key The key with which to query the DataVault.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var getSuccess = function(value){
         *     alert("value retrieved from the store: " + JSON.stringify(value));
         * }
         * var setSuccess = function(){
         *     sap.Logon.get(getSuccess,errorCallback,'someKey');
         * }
         * sap.Logon.set(setSuccess,errorCallback,'someKey', 'some string (could also be an object).');
         */
        get: get,

        /**
         * Get an  (JSON serializable) configuration object from the logon based on configuration type.
         * @method
         * @param {sap.Logon~getSuccessCallback} onsuccess The function that is invoked
         * upon success.  It is called with the resulting object as a single parameter.
         * This can be null or undefined, if no object is defined for the given type.
         * @param {sap.Logon~errorCallback} onerror The function to invoke in case of error.
         * @param {string} key The type for the configuration. Currently only valid type is 'authentication', 
         * the returned configuration data can be used by authproxy plugin's sendReqeust2 method
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var getSuccess = function(value){
         *     alert("value retrieved from the store: " + JSON.stringify(value));
         * }
         *     sap.Logon.getConfiguration(getSuccess,errorCallback,'authentication');
         */
        getConfiguration: getConfiguration,

        /**
         * Set an (JSON serializable) object in the DataVault.
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess The function to invoke upon success.
         * onsuccess will be called without parameters for this method. 
         * @param {sap.Logon~errorCallback} onerror The function to invoke in case of error.
         * @param {string} key The key to store the provided object on.
         * @param {object} value The object to be set on the given key.  Must be JSON serializable (ie:
         * cannot contain circular references).
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var getSuccess = function(value){
         *     alert("value retrieved from the store: " + JSON.stringify(value));
         * }
         * var setSuccess = function(){
         *     sap.Logon.get(getSuccess,errorCallback,'someKey');
         * }
         * sap.Logon.set(setSuccess,errorCallback,'someKey', 'some string (could also be an object).');
         */
        set: set,

        /**
         * Locks the Logon plugin's secure data vault.  
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess The function to invoke upon success. 
         * @param {sap.Logon~errorCallback} onerror The function to invoke in case of error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(){
         *     alert("Locked!");
         * }
         * sap.Logon.lock(successCallback,errorCallback);
         */
        lock: lock,

        /**
         * Unlock the Logon plugin's secure data vault if it has been locked (due to being inactive, or
         * {@link sap.Logon.lock} being called), then the user is prompted for the passcode to unlock the
         * application.<br/>
         * If the application is already unlocked, then nothing will be done.<br/>
         * If the application has passcode disabled, then passcode prompt will not be necessary.
         * In all cases if an error does not occur, the success callback is invoked with the current logon context
         * as the parameter.
         * @method
         * @param {sap.Logon~successCallback} onsuccess - The callback to call if the screen flow succeeds.
         * onsuccess will be called with the current logon context as a single parameter. 
         * @param {sap.Logon~errorCallback} onerror - The callback to call if the screen flow fails.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(context){
         *     alert("Registered and unlocked.  Context: " + JSON.stringify(context));
         * }
         * sap.Logon.unlock(successCallback,errorCallback);
         */
        unlock: registerOrUnlock,
        /**
         * This method will launch the UI screen for application users to manage and update the data vault passcode or, 
         * if the SMP server's Client Passcode Policy allows it, enable or disable the passcode to the data vault.
         * 
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The function to invoke upon success.  
         * @param {sap.Logon~errorCallback} onerror - The function to invoke in case of error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(context){
         *     alert("Passcode successfully managed.");
         * }
         * sap.Logon.managePasscode(successCallback,errorCallback);
         */
        managePasscode: managePasscode,

        /**
         * This method will launch the UI screen for application users to manage and update the back-end passcode that Logon stores in the 
         * data vault that is used to authenticate the client to the server. When this method is called, the new password will be validated 
         * on the application's backend endpoint.
         * 
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The callback to call if the screen flow succeeds.
         * onsuccess will be called without parameters for this method.
         * @param {sap.Logon~errorCallback} onerror The function that is invoked in case of an error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(context){
         *     alert("Password successfully changed.");
         * }
         * sap.Logon.changePassword(successCallback,errorCallback);
         */
        changePassword: changePassword,

        /**
         * Calling this method will show a screen which displays the current registration settings for the application.
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The callback to call if the screen flow succeeds.
         * onsuccess will be called without parameters for this method.
         * @param {sap.Logon~errorCallback} onerror The function that is invoked in case of an error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(context){
         *     alert("The showRegistrationData screenflow was successful.");
         * }
         * sap.Logon.showRegistrationData(successCallback,errorCallback);
         */
        showRegistrationData: showRegistrationData,
        
        /**
         * Calling this method will execute a SAML authentication.
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The callback to call if saml auth succeeds.
         * onsuccess will be called without parameters for this method.
         * @param {sap.Logon~errorCallback} onerror The function that is invoked in case of an error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(){
         *     alert("The saml authentication was successful.");
         * }
         * sap.Logon.performSAMLAuth(successCallback,errorCallback);
         */
        performSAMLAuth: refreshSession,

        /**
         * Calling this method will show a screen which displays the third party certificate provider settings screen for the application.
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The callback to call if the screen flow succeeds.
         * onsuccess will be called without parameters for this method.
         * @param {sap.Logon~errorCallback} onerror The function that is invoked in case of an error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(context){
         *     alert("The showRegistrationData screenflow was successful.");
         * }
         * sap.Logon.showCertificateProviderScreen(successCallback,errorCallback);
         */
        showCertificateProviderScreen: showCertificateProviderScreen,


        /**
         * Calling this method to delete the stored certificate and get a new one.
         * @method
         * @param {sap.Logon~successCallbackNoParameters} onsuccess - The callback to call if the screen flow succeeds.
         * onsuccess will be called without parameters for this method.
         * @param {sap.Logon~errorCallback} onerror The function that is invoked in case of an error.
         * @example
         * var errorCallback = function(errorInfo){
         *     alert("Error: " + JSON.stringify(errorInfo));
         * }
         * var successCallback = function(){
         *     alert("The certificate is refreshed.");
         * }
         * sap.Logon.refreshCertificate(successCallback,errorCallback);
         */
        refreshCertificate: refreshCertificate,

        /**
         * Calling this method to load the configuration before starting registration.
         * 
         */
        loadConfiguration: loadConfiguration,

        /**
         * Pings the server and gets a valid session.
         * for a new, valid session cookie.
         * @method
         * @param onsuccess - The callback to call if the operation succeeds.
         * @param onerror - The function that is invoked in case of an error.
         *
         *
         * @example
         * var successCallback = function(){
        *     alert("Refreshing the session was successful");
        * }
         * var errorCallback = function(errorInfo){
        *     alert("Error: " + JSON.stringify(errorInfo));
        * }
         * sap.Logon.refreshSession(successCallback,errorCallback);
         */
        refreshSession: refreshSession,

        /**
         * This is an OAuth specific function, which can be used to request new access and refresh tokens.
         * @method
         * @deprecated Calls refresh session now.  If a new access token is required it will be requested.
         */
        refreshAccessToken: refreshSession,

        /**
         * This function is called by MAFLogonCorePlugin as a notification that the registration has been deleted.
         * @private
         */
        onDeleteRegistrationFinished: onDeleteRegistrationFinished
    };

    /**
     * Callback function that is invoked in case of an error.
     *
     * @callback sap.Logon~errorCallback
     *
     * @param {Object} errorObject Depending on the origin of the error the object can take several forms.
     * (Unfortunately the error object structure and content is not uniform among the platforms, this will
     * probably change in the future.)
     *
     * Errors originating from the logon plugin have only an 'errorKey' property.
     * The possible values for 'errorKey':
     *
     * ERR_CHANGE_TIMEOUT_FAILED
     * ERR_FORGOT_SSO_PIN
     * ERR_INIT_FAILED
     * ERR_INVALID_ACTION
     * ERR_INVALID_STATE
     * ERR_PASSCODE_REQUIRES_DIGIT
     * ERR_PASSCODE_REQUIRES_LOWER
     * ERR_PASSCODE_REQUIRES_SPECIAL
     * ERR_PASSCODE_REQUIRES_UPPER
     * ERR_PASSCODE_TOO_SHORT
     * ERR_PASSCODE_UNDER_MIN_UNIQUE_CHARS
     * ERR_REGISTRATION_CANCEL
     * ERR_REG_FAILED
     * ERR_REG_FAILED_UNATHORIZED
     * ERR_REG_FAILED_WRONG_SERVER
     * ERR_SETPASSCODE_FAILED
     * ERR_SET_AFARIA_CREDENTIAL_FAILED
     * ERR_SSO_PASSCODE_SET_ERROR
     * ERR_UNKNOWN_SCREEN_ID
     * ERR_UNLOCK_FAILED
     * ERR_USER_CANCELLED
     * ERR_PASSCODE_EXPIRED
     *
     * Errors originating in the logon core (either iOS or Android) have the following properties: 'errorCode', 
     * 'errorMessage', and 'errorDomain'.
     * The 'errorCode' is just a number uniquely identifying the error.  The 'errorMessage'
     * property is a string with more detailed information of what went wrong.  The 'errorDomain' property specifies
     * the domain that the error occurred in.
     *
     * On iOS the 'errorDomain' property of the core errors can take the following values: MAFLogonCoreErrorDomain, MAFSecureStoreManagerErrorDomain, and MAFLogonCoreCDVPluginErrorDomain.
     * 
     * In the MAFLogonCoreErrorDomain the following errors are thrown (throwing methods in paren):
     *
     *  3   errMAFLogonErrorCommunicationManagerError       (register, update settings, delete, change backend password)
     *  9   errMAFLogonErrorCouldNotDecideCommunicator      (register)
     *  11  errMAFLogonErrorOperationNotAllowed             (all)
     *  12  errMAFLogonErrorInvalidServerHost               (register)
     *  13  errMAFLogonErrorInvalidBackendPassword          (changeBackendPassword)
     *  15  errMAFLogonErrorUploadTraceFailed               (uploadTrace)
     *  16  errMAFLogonErrorInvalidMCIMSSOPin               (setMCIMSSOPin)
     *  18  errMAFLogonErrorCertificateKeyError             (register)
     *  19  errMAFLogonErrorCertificateError                (register)
     *  20  errMAFLogonErrorAfariaInvalidCredentials        (setAfariaCredentialWithUser)
     *
     * In the MAFSecureStoreManagerErrorDomain the following errors are thrown (throwing methods in paren):
     *
     *  0   errMAFSecureStoreManagerErrorUnknown    (persist, unlock, changePasscode, delete, getContext)
     *  1   errMAFSecureStoreManagerErrorAlreadyExists  (persist)
     *  2   errMAFSecureStoreManagerErrorDataTypeError  (unlock, getContext)
     *  3   errMAFSecureStoreManagerErrorDoesNotExist   (unlock, persist, getContext)
     *  4   errMAFSecureStoreManagerErrorInvalidArg unlock, (persist, getContext)
     *  5   errMAFSecureStoreManagerErrorInvalidPassword    (unlock)
     *  6   errMAFSecureStoreManagerErrorLocked     (getContext)
     *  7   errMAFSecureStoreManagerErrorOutOfMemory    (persist, unlock, changePasscode, delete, getContext)
     *  8   errMAFSecureStoreManagerErrorPasswordExpired    (unlock, getContext)
     *  9   errMAFSecureStoreManagerErrorPasswordRequired   (persist, changePasscode)
     *  10  errMAFSecureStoreManagerErrorPasswordRequiresDigit  (persist, changePasscode)
     *  11  errMAFSecureStoreManagerErrorPasswordRequiresLower  (persist, changePasscode)
     *  12  errMAFSecureStoreManagerErrorPasswordRequiresSpecial    (persist, changePasscode)
     *  13  errMAFSecureStoreManagerErrorPasswordRequiresUpper  (persist, changePasscode)
     *  14  errMAFSecureStoreManagerErrorPasswordUnderMinLength (persist, changePasscode)
     *  15  errMAFSecureStoreManagerErrorPasswordUnderMinUniqueChars    (persist, changePasscode)
     *  16  errMAFSecureStoreManagerErrorDeleted    (unlock)
     *
     * In the MAFLogonCoreCDVPluginErrorDomain the following errors are thrown:
     * 
     *  1 (init failed)
     *  2 (plugin not initialized)
     *  3 (no input provided)
     *
     * On Android the 'errorDomain' property of the core errors can take the following values: MAFLogonCoreErrorDomain and MAFLogonCoreCDVPluginErrorDomain.
     * There are no logon specific error codes, the 'errorCode' property only wraps the error values from the underlying libraries. 
     */

    /**
     * Callback function that is invoked upon successfully registering or unlocking or retrieving the context.
     *
     * @callback sap.Logon~successCallback
     *
     * @param {Object} context An object containing the current logon context.  Two properties of particular importance
     * are applicationEndpointURL, and applicationConnectionId. It also includes options to customize the UI.
     * The context object contains the following properties:<br/>
     * "registrationContext": {<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"appName": The name of the app.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"serverHost": Host of the server.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"domain": Domain for server. Can be used in case of SAP Mobile Platform communication.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"resourcePath": Resource path on the server. The path is used mainly for path based reverse proxy but can contain a custom relay server path as well.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"https": Marks whether the server should be accessed in a secure way.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"serverPort": Port of the server.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"user": Username in the backend.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"password": Password for the backend user.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"farmId": FarmId of the server. Can be nil. Used in case of Relay server or SiteMinder.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"communicatorId": Id of the communicator manager that will be used for performing the logon. Possible values: IMO / GATEWAY / REST<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"securityConfig": Security configuration. If nil, the default configuration is used.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"mobileUser": Mobile User. Used in case of IMO manual user creation.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"activationCode": Activation Code. Used in case of IMO manual user creation.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"gatewayClient": The key string that identifies the client on the gateway. Used in Gateway only registration mode. The value will be used as adding the parameter: sap-client=<gateway client><br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"gatewayPingPath": The custom path of the ping URL on the gateway. Used in case of Gateway only registration mode.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"custom": {<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"backgroundImage": Background for the Logon UI; the default is "../../../background.jpg"<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hiddenFields": An array for field names to be hidden, e.g. ["resourcePath", "farmId", "securityConfig"]<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hideLogoCopyright": This option hides the logo and copyright information<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"copyrightLogo": This option specifies the logo in the footer; default is "../../../sapLogo.png"<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"copyrightMsg": This option specifies both lines of the copyright message, e.g. ["Copyright 2016 SAP", "All rights reserved."]<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"disablePasscode": This option skips the passcode screen<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"styleSheet": This option specifies the css file used to customize the logon screen; the default is "../../../custom.css"<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"theme": This option specifies the UI5 theme to use for the logon screens.  Please note that the theme must exist in the UI5 resources folder.<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}<br/>
     * }<br/>
     * "applicationEndpointURL": Contains the application endpoint URL after a successful registration.<br/>
     * "applicationConnectionId": ID to get after a successful SUP REST registration. Needs to be set in the download request header with key X-SUP-APPCID<br/>
     * "afariaRegistration": manual / automatic / certificate<br/>
     * "policyContext": Contains the password policy for the secure store {<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"alwaysOn":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"alwaysOff":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"defaultOn":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hasDigits":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hasLowerCaseLetters":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hasSpecialLetters":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hasUpperCaseLetters":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"defaultAllowed":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"expirationDays":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"lockTimeout":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"minLength":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"minUniqueChars":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"retryLimit":<br/>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"allowFingerprint":<br/>
     * }<br/>
     * "registrationReadOnly": specifies whether context values are coming from clientHub / afaria<br/>
     * "policyReadOnly": specifies whether passcode policy is coming from afaria<br/>
     * "credentialsByClientHub": specifies whether credentials are coming from clientHub
     */

    /**
     * Callback function that will be invoked with no parameters.
     * 
     * @callback sap.Logon~successCallbackNoParameters
     */

    /**
     * Callback function that is invoked upon successfully retrieving an object from the DataVault.
     * 
     * @callback sap.Logon~getSuccessCallback
     *
     * @param {Object} value The object that was stored with the given key.  Can be null or undefined if no object was stored
     * with the given key.
     */
