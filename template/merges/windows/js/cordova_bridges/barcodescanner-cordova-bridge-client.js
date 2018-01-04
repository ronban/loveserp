cordovaBridgeUtils.webView.addEventListener("MSWebViewFrameNavigationStarting", function (e) {
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters["EVENT"] == 'scanBarcodeEvent') {
	    if (window.cordova.plugins.barcodeScanner) {
	        window.cordova.plugins.barcodeScanner.scan(function (result) {
	            var resultCallback = {};

	            if (!result.cancelled) {
	                resultCallback.text = result.text;
	            } else {
	                resultCallback.canceled = result.canceled;
	            }

	            cordovaBridgeUtils.successEvent('scanBarcodeCommand', resultCallback);
	        }, function (error) {
	            cordovaBridgeUtils.errorEvent('scanBarcodeCommand', error);
	        });
	    }
	    else {
	        cordovaBridgeUtils.errorEvent('scanBarcodeCommand', {code: -99, message: "Feature has been invalidated"});
	    }
	};
});