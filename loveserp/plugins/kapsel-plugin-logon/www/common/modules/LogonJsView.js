    var utils = sap.logon.Utils;
    var staticScreens = sap.logon.StaticScreens;
    var dynamicScreens = sap.logon.DynamicScreens;
    
    var windowRef;
    var events;
	var ownerID = null;
	var onWindowReady;
    var lastOperation;
    
    var state = 'NO_WINDOW';
    var currentScreenID;
    var previousScreenID;
    var currentContext;
    var previousContext;
    var STYLE = "fiori";
    var pathOpened;
    var previousIdentifier;
    var isFormListenerAdded;
    
    function findCordovaPath() {
        var path = null;
        var scripts = document.getElementsByTagName('script');
        var term = '/cordova.js';
        for (var n = scripts.length-1; n>-1; n--) {
            var src = scripts[n].src.replace(/\?.*$/, ''); // Strip any query param (CB-6007).
            if (src.indexOf(term) == (src.length - term.length)) {
                path = src.substring(0, src.length - term.length) + '/';
                break;
            }
        }
        return path;
    }
    
    function getViewURL(blank) {
        var cordovaPath = findCordovaPath();
        var path = blank ? 'smp/logon/ui/blank.html' : 'smp/logon/ui/iab.html';

        // For the UI5 view apply any custom theme that may have been provided
        if (!blank && currentContext && currentContext.registrationContext && currentContext.registrationContext.custom
            && currentContext.registrationContext.custom.theme) {
            path += "?sap-theme=" + currentContext.registrationContext.custom.theme;
        }

        if (cordova.require("cordova/platform").id == "android" &&
        cordovaPath.toLowerCase().indexOf("https://actuallylocalfile")===0) {
            // InAppBrowser can not resolve the custom URL we use currently.
            cordovaPath = "file:///android_asset/www/";
        }
        
        return cordovaPath += path;
    }

    
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
    
    var showScreenWithCheck = function(screenId, screenEvents, context, owner) {
      utils.debug('IAB showScreenWithCheck, '+ screenId);
      //check whether application wants to handle the showScreen event
      previousScreenID = currentScreenID;
      previousContext = currentContext
      currentScreenID = screenId;
      currentContext = context;

        if (owner) {
            ownerID = owner;
        }
        else {
            ownerID = null;
        }

      var bypassDefaultShowScreen = false;
      if (this.onShowScreen){
         bypassDefaultShowScreen = this.onShowScreen(screenId, screenEvents, currentContext);
      }
    
      if (!bypassDefaultShowScreen){
		  //switch screenid from old inappbrowserui to the new one
		  switch (screenId){
			case "SCR_SET_PASSCODE_OPT_ON":
			case "SCR_SET_PASSCODE_OPT_OFF":
			case "SCR_SET_PASSCODE_MANDATORY":
			   screenId = "setPasscode";
			   break;
			case "SCR_ENTER_CREDENTIALS":
				screenId = "enterRegistrationInfo";
				break;
			case "SCR_UNLOCK":
				screenId = "enterPasscode";
				break;
			case "SCR_SSOPIN_SET":
				screenId = "enterSSOPasscode";
				break;
			case "SCR_REGISTRATION":
				screenId = "enterRegistrationInfo";
				break;
			case "SCR_SHOW_REGISTRATION":
				screenId = "showRegistrationInfo";
				break;
			case "SCR_ENTER_EMAIL":
				screenId = "enterEmail";
				break;
			case "SCR_ENTER_AFARIA_CREDENTIAL":
				screenId = "enterAfariaUsernamePassword";
				break;
			case "SCR_CHOOSE_DEMO_MODE":
				screenId = "chooseDemoMode";
				break;
			case "SCR_CHANGE_PASSWORD":
			    screenId = "changePassword";
			    break;
            case "SCR_CHANGE_PASSCODE_MANDATORY":
                screenId="changePasscode";
                break;
            case "SCR_MANAGE_PASSCODE_OPT_ON":
            case "SCR_MANAGE_PASSCODE_OPT_OFF":
            case "SCR_MANAGE_PASSCODE_MANDATORY":
                screenId="changePasscode";
                break;
            case "SCR_ASK_USAGE_COLLECTION_PERMISSION":
                screenId="askUsageCollectionPermission";
                break;
            default:
                //TODO: log an console error if screen id startw with SCR but cannot find a match
                ;
        }

        // Check flag to disable the passcode screen
        if (currentContext && currentContext.registrationContext && currentContext.registrationContext.custom
            && currentContext.registrationContext.custom.disablePasscode
            && (currentContext.registrationContext.custom.disablePasscode.toString() == "true")) {
            
            if (screenId == "setPasscode") {
                currentContext.passcodeEnabled = false;
                screenEvents.onsubmit(currentContext);
                return true;
            } else if (screenId == "enterPasscode") {
                // Keep this elseif for the upgrade case. Previously instead of actually disabling
                // the passcode, the passcode was hard-coded to "Password1@".  When the passcode is
                // actually disabled the enterPasscode screen should never be shown.
                currentContext.unlockPasscode = "Password1@";
                screenEvents.onsubmit(currentContext);
                return true;
            }
        }

        if (state === 'NO_WINDOW') {
            utils.debug('IAB showScreenWithCheck, NO_WINDOW');
            state = 'INIT_IN_PROGRESS';
            lastOperation = function () {
                utils.debug("lastOperation invoked, currentContext: " + JSON.stringify(currentContext));
                showScreen(screenId, screenEvents, currentContext);
            }
            onWindowReady = function () {
                state = 'READY';
                if (lastOperation) {
                    lastOperation();
                }
            };

            // The plugin resources must be relative to cordova.js to resolve for
            // the case that cordova and plugins are local and the application resources/code
            // is remote.
            var pathToIabHtml = getViewURL(false);

            // Remove any old screen events so that the load events for the new screen don't get sent to them.
            // Once the new screen is loaded the new screen events will be applied.
            events = [];

            windowRef = newScreen(pathToIabHtml);
        }
        else if (state === 'INIT_IN_PROGRESS') {
            utils.debug('IAB showScreenWithCheck, INIT_IN_PROGRESS');
            lastOperation = function () {
                showScreen(screenId, screenEvents, currentContext);
            }
        }
        else if (state === 'READY') {
            utils.debug('IAB showScreenWithCheck, READY');
            showScreen(screenId, screenEvents, currentContext);
        }
      }
	};

	var showNotification = function(notificationKey,notificationMessage,notificationTitle,extraInfo) {
		utils.debug('iabui showNotification');

		var bypassShowNotification = false;

		if (this.onShowNotification){
			bypassShowNotification = this.onShowNotification(currentScreenID, notificationKey,notificationMessage,notificationTitle);
		}

		if (!bypassShowNotification) {
			if (!windowRef) {
				return false;
				//if inappbrowser is not ready to show the notification, return false to let caller
				//stops the registration and calls the registration or unlock method's onerrorcallback
			}
            var key = notificationKey?  "\"" + notificationKey + "\"" : "null";
			var message = notificationMessage ? "\"" + notificationMessage + "\"" : "null";
			var title = notificationTitle ? "\"" + notificationTitle + "\"" : "null";
            var info = extraInfo ? "\"" + extraInfo + "\"" : "null";
			var payload = "showNotification(" + key + "," + message + "," + title + "," + info + ");";
            
			windowRef.executeScript(
				{ code: payload },
				function (param) {
					utils.debug('executeScript returned:' + JSON.stringify(param));
				});
		}
		return true;
	};

	var showScreen = function(screenId, screenEvents, currentContext) {
        utils.debugJSON(screenEvents, 'showScreen: ' + screenId );
        isFormListenerAdded = false;

        if (currentContext) {
        	   utils.debugJSON(currentContext);
        }
        // saving event callbacks (by-id map)
        events = screenEvents;

        // saving event callbacks (by-id map)
        var uiDescriptor = {"viewID":screenId};

        if (!uiDescriptor) {
            screenEvents.onerror(new utils.Error('ERR_UNKNOWN_SCREEN_ID', screenId));
        }
        
        uiDescriptor.style = STYLE;
        var uiDescriptorJSON = JSON.stringify(uiDescriptor);
        utils.debug('LogonJsView.showScreen(): ' + uiDescriptorJSON + ', windowRef: ' + windowRef);

		var defaultContextJSON = '""';
        if (currentContext){
            if(currentContext.policyContext && currentContext.registrationContext && !currentContext.registrationContext.policyContext){
                currentContext.registrationContext.policyContext = currentContext.policyContext;
            }
            if (screenId === "SCR_GET_CERTIFICATE_PROVIDER_PARAMETER"
                || screenId === "SCR_ASK_USAGE_COLLECTION_PERMISSION"
                || currentContext.registrationContext == null) {
                defaultContextJSON = JSON.stringify(currentContext);
            }
            else {
                if (currentContext.busy){
                    currentContext.registrationContext.busy = currentContext.busy;
                }
               
                //SMP server side passcode policy is returned as part of root context, but when showing jsview, only
                //registration context is sent to jsview, so we need to copy the passcode policy from root context to
                //registration context
                if (currentContext.policyContext){
                    currentContext.registrationContext.policyContext = currentContext.policyContext;
                }
               
                defaultContextJSON = JSON.stringify(currentContext.registrationContext);
            }
        }
        		
        var payload = "showScreen(" + uiDescriptorJSON + "," + defaultContextJSON + ");";
        windowRef.executeScript(
            { code: payload },
            function (param) {
                utils.debug('executeScript returned:' + JSON.stringify(param));
            });
	}
    
	var evalIabEvent = function (event) {
        //for ios, the loadstop event is not fired for # command
        //for android, the loadstart event is not fired for # command
        //with the saml support, the loadstop event is used to detect saml auth finish flag for both ios and andorid client
        var handleEvent = {
            android :
            {
               loadstart: false,
               loadstop: true
            },
            ios :
            {
               loadstart: true,
               loadstop: false
            },
            windows :
            {
               loadstart: true,
               loadstop: false
            }

        };
               
        //The logic is:
        //1. for # command, android fire eithe loadstop or loadstart event to logoncontroller.
        //2. saml event will be fired only on loadstop event

        var url = document.createElement('a');
        //first check whether the submit payload is through localstorage
        if (event.url.indexOf("#SUBMIT&iabpayload") >= 0) {
            url.href = window.localStorage.getItem("iabpayload");
            if (event.type === "loadstop") {
                window.localStorage.removeItem("iabpayload");
            }
        }
        else {
            url.href = event.url;
        }
        var hash = decodeURIComponent(url.hash.toString());

        var fragments = hash.match(/#([A-Z]+)(\+.*)?/);
        if (fragments) {
            if (handleEvent[cordova.require("cordova/platform").id][event.type]) {
                if (device.platform == "windows") {
                    // On Windows, use the URL to get the information out of the IAB
                    var eventId = 'on' + fragments[1].toLowerCase();
                    var resultContext;
                    if (fragments[2]) {
                        // TODO Pass on as a string, or deserialize ?
                        resultContext = JSON.parse(fragments[2].substring(1));
                        //resultContext = fragments[2].substring(1);
                    }

                    if (typeof eventId === 'string' && eventId !== null ) {
                        utils.debug('event: "' + eventId + '"');
                        if (eventId === 'onready' && state === 'INIT_IN_PROGRESS') {
                            utils.debug('IAB calling onwindowready');
                            onWindowReady();
                        } else if (eventId === 'onlog') {
                            utils.debug('IAB CHILDWINDOW:' + resultContext.msg);;
                        }
                        else if (events[eventId]) {
                            utils.debugJSON(resultContext, 'calling parent callback');
                            events[eventId](resultContext);
                        } else {
                            utils.log('invalid event: ' + eventId);
                        }
                    }
                } else {
                    // On Android and iOS, use the new way to get information out of the IAB using executeScript
                    if (fragments[1] == "EVENTOCCURRED") {
                        var identifierKey = "+identifier=";
                        var identifier = hash.substring(hash.indexOf(identifierKey) + identifierKey.length);
                        var payload = "var event = eventsObject[" + identifier + "];\n"+
                                "delete eventsObject[" + identifier + "];\n"+
                                "event;"; // The last line must be the value we want returned to the callback.
                        var callback = function(result) {
                            var eventObject = result[0];
                            if (eventObject && eventObject.actionId) {
                                var eventId = 'on' + eventObject.actionId.toLowerCase();
                                utils.debug('event: "' + eventId + '"');
                                if (eventId === 'onready' && state === 'INIT_IN_PROGRESS') {
                                    utils.debug('IAB calling onwindowready');
                                    onWindowReady();
                                } else if (eventId === 'onlog') {
                                    utils.debug('IAB CHILDWINDOW:' + eventObject.info.msg);
                                } else if (events[eventId]) {
                                    utils.debugJSON(eventObject.info, 'calling parent callback');
                                    events[eventId](eventObject.info);
                                } else {
                                    utils.log('IAB invalid event: ' + eventId);
                                }
                            } else {
                                utils.log("IAB invalid event (event object not in expected format).");
                            }
                        }
                        var executeDetails = {"code":payload};
                        windowRef.executeScript(executeDetails, callback);
                    } else {
                        utils.log("IAB invalid event (IAB not using new callback method to pass information).");
                    }
                }
            } else {
                utils.log('invalid event');
            }
        } else{
            if (event.type== 'loadstop') {
               utils.debug(event);
                if (events && events["onevent"]) {
                    events["onevent"](event);
                } else {
                    utils.debug('no events to process');
                }
            }
        }
    }

	var iabLoadStart = function(event) {
		utils.debug('IAB loadstart: ' + device.platform ); // JSON.stringify(event), do not log url as it may contain sensitive information
        evalIabEvent(event);
	};
	var iabLoadError = function(event) {
		utils.log('IAB loaderror: ' + event.url);
        
        if (device.platform == "windows" || device.platform == "Android") {
            events["onerror"](event);
        }
	};
    
	var iabExit = function(event) {
		
		state = 'NO_WINDOW';
		lastOperation = null;
		windowRef = null;
        if (event != null && typeof event != "undefined") {
		    utils.debug('IAB exit: ' + event.url);
		    setTimeout(events['oncancel'], 30);
		}
	};

	var iabLoadStop = function(event) {
        utils.debug('IAB loadstop: ' + device.platform ); //  JSON.stringify(event), do not log url as it may contain sensitive information
        evalIabEvent(event);
    };

	var newScreen = function (path) {
	    utils.debug("create newScreen: " + path);
	    isFormListenerAdded = false;

		var windowRef = cordova.InAppBrowser.open( path, '_blank', 'location=no,toolbar=no,overridebackbutton=yes,allowfileaccessfromfile=yes,closebuttoncaption=Cancel,hidenavigation=yes,isFromLogon=true');
		windowRef.addEventListener('loadstart', iabLoadStart);
		windowRef.addEventListener('loadstop', iabLoadStop);
		windowRef.addEventListener('loaderror', iabLoadError);
		windowRef.addEventListener('exit', iabExit);
		windowRef.addEventListener('backbutton', function(){
            if (events['onbackbutton']) {
        			utils.log('IABUI onbackbutton');
        			events['onbackbutton']();
      			} else if (events['oncancel']) {
        			utils.log('IABUI onbackbutton oncancel');
        			events['oncancel']();
      			}
		});
		pathOpened = path;
		return windowRef;
	}
	
    
// onClosed callback method will be called once the native window of inappbrowser is closed. 
// Open the new inappbrowser window before onClosed is called may fail   
    var close = function(onClosed, bSkipCancelOnClose, owner) {
        if (ownerID) {
            if (owner != ownerID) {
                onClosed();
                return;
            }
        }

        if (state === 'NO_WINDOW') {
            utils.debug('IAB close, NO_WINDOW');
            // even if window is closed by others, the callback still needs to be invoked to continue the caller's logic
            if (typeof onClosed === 'function') {
                onClosed();
            }
        }
        else if (state === 'INIT_IN_PROGRESS') {
            utils.debug('IAB close, INIT_IN_PROGRESS');
            lastOperation = function() {
                clearWindow(onClosed, bSkipCancelOnClose);
            };
        }
		else if (state === 'READY') {
			utils.debug('IAB close, READY');
			clearWindow( onClosed, bSkipCancelOnClose);
		}
		else { //for android, the SAML window is closed when showing the previous screen, if no previous screen, then just close it
			clearWindow( onClosed, bSkipCancelOnClose);
		}
    }

    //when close method calls clearWindow, the inappbrowser window is not yet closed. so
    //do not reset the windowRef in this method. It will be reset when iabexit is called.
    //if cancel is skipped, it means just closing the inappbrowser, but do not cancel the registration or unlock
    //operation. To do so, temporarily set onCancel event handler to null.
    var clearWindow = function(onClosed, bSkipCancelOnClose) {
		utils.debug('IAB clear window');

                  
        var oncancel = null;
        if (bSkipCancelOnClose){
            oncancel = events['oncancel'];
            events['oncancel'] = null;
        }
        
        if (windowRef) {
            windowRef.close();
        }
        
        ownerID = null;
        
        if (device.platform == "windows") {
            iabExit();
        }
        
        if (typeof onClosed === 'function' ) {
            var interval = setInterval(function(){
                if (isClosed()){
                    clearInterval(interval);
                    events['oncancel'] = oncancel;
                    onClosed()
                }
            }, 100);
        }
        
	}

    var getPreviousScreenID = function() {
        return previousScreenID;
    }
 
    var getPreviousContext = function() {
        return previousContext;
    }
    
    var getStyle = function(){
        return STYLE;
    }
    
    var isClosed = function(){
        if (windowRef != null){
            return false;
        }
        else{
            return true;
        }
    }

	
//=================== Export with cordova ====================

    module.exports = {
    		showScreen: showScreenWithCheck,
			close: close,
			showNotification: showNotification,
            getPreviousScreenID: getPreviousScreenID,
            getPreviousContext: getPreviousContext,
            clearWindow:clearWindow,
            getStyle: getStyle,
            accessToken: null,
            refreshToken: null,
            tokenEndpoint: null,
            isClosed : isClosed
        };

