/* Injects this script into the webview in www/index.html */
if (typeof sap === 'undefined') {
	sap = {};
}

if (!sap.Logger) {
	sap.Logger = {};
}
	
var sap_logger_logCommand = new CordovaBridgeCommand('sap_logger_log_Event');

function log(message, tag, successCallback, errorCallback, method) {
	sap_logger_logCommand.addQueryParameter({ options: JSON.stringify({ message: message, tag: tag, method: method }) });
	sap_logger_logCommand.execute(successCallback, errorCallback);
}

sap.Logger.debug = function (message, tag, successCallback, errorCallback) {
	log(message, tag, successCallback, errorCallback, 'debug');
};

sap.Logger.info = function (message, tag, successCallback, errorCallback) {
	log(message, tag, successCallback, errorCallback, 'info');
};

sap.Logger.warn = function (message, tag, successCallback, errorCallback) {
	log(message, tag, successCallback, errorCallback, 'warn');
};

sap.Logger.error = function (message, tag, successCallback, errorCallback) {
	log(message, tag, successCallback, errorCallback, 'error');
};


if (typeof console === 'undefined') {
	console = {};
}

console.debug = function (message) {
	sap.Logger.debug(message, 'CONSOLE - SERVER CORDOVA BRIDGE', null, null);
};

console.info = function (message) {
	sap.Logger.info(message, 'CONSOLE - SERVER CORDOVA BRIDGE', null, null);
};

console.warn = function (message) {
	sap.Logger.warn(message, 'CONSOLE - SERVER CORDOVA BRIDGE', null, null);
};

console.error = function (message) {
	sap.Logger.error(message, 'CONSOLE - SERVER CORDOVA BRIDGE', null, null);
};

console.trace = function (message) {
	sap.Logger.log(message, 'CONSOLE - SERVER CORDOVA BRIDGE', null, null);
};

onCordovaBridgeLoaded('sap.Logger');