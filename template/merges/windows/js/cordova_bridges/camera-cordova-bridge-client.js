/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for GEo events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function (e) {
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters['EVENT'] == 'getPictureEvent') {
	    if (navigator.camera) {
	        navigator.camera.getPicture(function (result) {
	            cordovaBridgeUtils.successEvent('getPictureCommand', result)
	        }, function (error) {
	            cordovaBridgeUtils.errorEvent('getPictureCommand', error)
	        }, getOptions(e.uri));
	    }
	    else {
	        cordovaBridgeUtils.errorEvent('getPictureCommand', { code: -99, message: "Feature has been invalidated" });
	    }
	}

	if (parameters['EVENT'] == 'cleanupEvent') {
	    if (navigator.camera) {
	        navigator.camera.cleanup(function (result) {
	            cordovaBridgeUtils.successEvent('cleanupCommand', result)
	        }, function (error) {
	            cordovaBridgeUtils.errorEvent('cleanupCommand', error)
	        });
	    }
	    else {
	        cordovaBridgeUtils.errorEvent('cleanupCommand', { code: -99, message: "Feature has been invalidated" });
	    }
	}

	function getOptions(uri) {
		var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
		return JSON.parse(urlParameters['options']);
	}

	function checkFeatureEnabled() {
	    return navigator.camera !== undefined;
	}
});