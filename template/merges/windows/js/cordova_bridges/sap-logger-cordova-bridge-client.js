/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for Settings events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function (e) {
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters['EVENT'] == 'sap_logger_log_Event') {
		var options = getOptions(e.uri);
		
		switch (options.method) {
			case 'debug':
				sap.Logger.debug(options.message, options.tag, successCallback, errorCallback);
				break;
			case 'info':
				sap.Logger.info(options.message, options.tag, successCallback, errorCallback);
				break;
			case 'warn':
				sap.Logger.warn(options.message, options.tag, successCallback, errorCallback);
				break;
			case 'error':
				sap.Logger.error(options.message, options.tag, successCallback, errorCallback);
				break;
		}

		function successCallback() {
			cordovaBridgeUtils.successEvent('sap_logger_logCommand', null);
		}

		function errorCallback(error) {
			cordovaBridgeUtils.errorEvent('sap_logger_logCommand', error);
		}		
	}
	
	function getOptions(uri) {
		var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
		return JSON.parse(urlParameters['options']);
	}
});