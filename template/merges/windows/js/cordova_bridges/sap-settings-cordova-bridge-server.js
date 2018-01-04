/* Injects this script into the webview in www/index.html */

if (typeof sap === 'undefined') {
	sap = {};
}

if (!sap.Settings) {
	sap.Settings = {};
}

var sap_settings_isFeatureEnabledCommand = new CordovaBridgeCommand('sap_settings_isFeatureEnabled_Event');

/**
 *  This function return true if the feature is allowed and false if feature is not permitted.
 *  @public
 * @param (String} name Name of the feature to fetch.
 * @param {function} successCallback Function to invoke if the exchange is successful.
 * @param {function} errorCallback Function to invoke if the exchange failed.
 **/
sap.Settings.isFeatureEnabled = function (name, successCallback, errorCallback) {
	console.debug('Server bridge: sap.Settings.isFeatureEnabled');
	sap_settings_isFeatureEnabledCommand.addQueryParameter({ name: name });
	sap_settings_isFeatureEnabledCommand.execute(successCallback, errorCallback);
};

sap.Settings.SettingsCompleted = function (eventId, detailArg) {
	console.debug('Server bridge: sap.Settings.SettingsCompleted');
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent(eventId, false, false, { detail: detailArg });
	
	setTimeout(function () {
		console.debug('SETTINGS_COMPLETED');
		document.dispatchEvent(event);
	}, 0);
}


var sap_settings_getConfigPropertyMapCommand = new CordovaBridgeCommand('sap_settings_getConfigPropertyMap_Event');
sap.Settings.getConfigPropertyMap = function (successCallback, errorCallback) {
    console.debug('Server bridge: sap.Settings.getConfigPropertyMap');
    sap_settings_getConfigPropertyMapCommand.execute(successCallback, errorCallback);
};

var sap_settings_setConfigPropertyCommand = new CordovaBridgeCommand('sap_settings_setConfigProperty_Event');
sap.Settings.setConfigProperty = function (nameVals, successCallback, errorCallback) {
    console.debug('Server bridge: sap.Settings.setConfigProperty');
    sap_settings_setConfigPropertyCommand.addQueryParameter({ nameVals: JSON.stringify(nameVals) });
    sap_settings_setConfigPropertyCommand.execute(successCallback, errorCallback);
};

onCordovaBridgeLoaded('sap.Settings');