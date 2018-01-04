/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for GEo events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function (e) {
	var watchIds = {};
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters['EVENT'] == 'geoEvent') {        
		navigator.geolocation.getCurrentPosition(function (result) {
			cordovaBridgeUtils.successEvent('getPositionCommand', result)
		}, function (error) {
			cordovaBridgeUtils.errorEvent('getPositionCommand', error)
		}, getOptions(e.uri));
	}

	if (parameters['EVENT'] == 'watchPositionEvent') {    	
		watchIds[getWatchIdIndex(e.uri)] = navigator.geolocation.watchPosition(function (result) {				
			cordovaBridgeUtils.successEvent('wathPositionCommand', result)
    	}, function (error) {
    		cordovaBridgeUtils.errorEvent('wathPositionCommand', error)
    	}, getOptions(e.uri));
	}

	if (parameters['EVENT'] == 'clearWatchEvent') {
		var options = getOptions(e.uri);
		var watchId = watchIds[getWatchIdIndex(e.uri)];
		delete watchIds[getWatchIdIndex(e.uri)];
		navigator.geolocation.clearWatch(watchId);
	}

	function getOptions(uri) {
		var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
		var options = {};

		if (urlParameters['enableHighAccuracy'] != null) {
			options.enableHighAccuracy = urlParameters['enableHighAccuracy'];
		}

		if (urlParameters['timeout'] != null) {
			options.timeout = urlParameters['timeout'];
		}

		if (urlParameters['maximumAge'] != null) {
			options.maximumAge = urlParameters['maximumAge'];
		}

		return options;
	}

	function getWatchIdIndex(uri) {
		return cordovaBridgeUtils.getUrlParameters(uri)['watchIdIndex'];
	}
});