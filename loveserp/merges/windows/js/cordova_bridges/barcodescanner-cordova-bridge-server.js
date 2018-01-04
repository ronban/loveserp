cordova = {};
cordova.plugins = {};
cordova.plugins.barcodeScanner = {};

var scanBarcodeCommand = new CordovaBridgeCommand('scanBarcodeEvent');
cordova.plugins.barcodeScanner.scan = function (successCallback, errorCallback) {
	console.debug('cordova.plugins.barcodeScanner.scan');
	scanBarcodeCommand.execute(successCallback, errorCallback);
};

onCordovaBridgeLoaded('cordova.plugins.barcodeScanner');