/* Injects this script into the webview in www/index.html */

var watchIdIndex = null;

//geolocation bridge 
navigator.geolocation = {};

var getPositionCommand = new CordovaBridgeCommand('geoEvent');
navigator.geolocation.getCurrentPosition = function (successCallback, errorCallback, options) {
	console.debug('Server bridge: navigator.geolocation.getCurrentPosition');
	getPositionCommand.addQueryParameter(options);
	getPositionCommand.execute(successCallback, errorCallback);
};

var wathPositionCommand = new CordovaBridgeCommand('watchPositionEvent');
navigator.geolocation.watchPosition = function (successCallback, errorCallback, options) {
	console.debug('Server bridge: navigator.geolocation.watchPosition');
	watchIdIndex = watchIdIndex == null ? 0 : watchIdIndex + 1;
	wathPositionCommand.addQueryParameter(options);
	wathPositionCommand.addQueryParameter({ watchIdIndex : watchIdIndex });
	wathPositionCommand.execute(successCallback, errorCallback);

	return watchIdIndex.toString();
};

var clearWatchCommand = new CordovaBridgeCommand('clearWatchEvent');
navigator.geolocation.clearWatch = function (watchID) {
	console.debug('Server bridge: navigator.geolocation.clearWatch');
	clearWatchCommand.addQueryParameter({ watchIdIndex: watchID });
	clearWatchCommand.execute(null, null);
};

onCordovaBridgeLoaded('navigator.geolocation');