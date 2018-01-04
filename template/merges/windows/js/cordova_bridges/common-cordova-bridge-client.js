var cordovaBridgeUtils = {
	webView: document.getElementById('webView'),
	successEvent: function (commandName, resultObject) {
		if (sap && sap.Logger) {
			sap.Logger.debug('Client bridge, successEvent: ' + commandName + ', result: ' + JSON.stringify(resultObject), 'CLIENT CORDOVA BRIDGE');
		}
		var evalString = 'var result = {};' +
		'result = ' + JSON.stringify(resultObject) + ';' +
		commandName + '.processResult(result, null);';

		var eval = WV.invokeScriptAsync('eval', evalString);
		eval.start();
	},
	errorEvent: function (commandName, errorObject) {
		var errorString = '';

		if (errorObject == null) {
			errorString += 'null';
		}
		else if (typeof errorObject === 'string') {
			errorString += '"' + errorObject + '"';
		} else {
			errorString += '{';

			if (typeof errorObject.code != 'undefined') {
				if (errorObject.code == null) {
					errorString += 'code : null,';
				} else {
					errorString += 'code : ' + errorObject.code + ',';
				}
			}

			if (typeof errorObject.message != 'undefined') {
				var errorMessage = errorObject.message != null ? errorObject.message.replace(/(?:\r\n|\r|\n)/g, '') : null;

				if (errorMessage == null) {
					errorString += 'message : null';
				} else {
					errorString += 'message : "' + errorMessage + '"';
				}
			}

			errorString += '}';
		}

		var evalString = 'var error = ' + errorString + ';';
		evalString += commandName + '.processResult(null,error);';

		if (sap && sap.Logger) {
			sap.Logger.error('Client bridge, errorEvent: ' + commandName + ', error: ' + errorString, 'CLIENT CORDOVA BRIDGE');
		}

		var eval = WV.invokeScriptAsync('eval', evalString);
		eval.start();
	},
	getUrlParameters: function (uri) {
		var result = new Array();
		if (typeof uri == 'undefined')
			return result;

		var urlParams = uri.split('?');
		var params = [];
		if (urlParams.length > 1)
			params = urlParams[1].split('&');

		for (var i = 0; i < params.length; i++) {
			var param = params[i].split('=');
			result[param[0]] = decodeURIComponent(param[1]);
		}

		return result;
	}
};

var framePrintButton;

cordovaBridgeUtils.webView.addEventListener("MSWebViewNavigationStarting", function (e) {
    framePrintButton && (framePrintButton.hidden = true);
});

cordovaBridgeUtils.webView.addEventListener("MSWebViewFrameNavigationStarting", function (e) {
    var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

    if (parameters["EVENT"] == 'printableContentEvent') {
        framePrintButton && (framePrintButton.hidden = false);
    }
});

// Subscribe for the server bridge's loaded event and fire it on native side.
cordovaBridgeUtils.webView.addEventListener("MSWebViewFrameNavigationStarting", function (e) {
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters["EVENT"] == 'cordovabridgeloadedEvent') {
		var pluginName = cordovaBridgeUtils.getUrlParameters(e.uri)['pluginName'];
		
		if (!pluginName) {
			sap.Logger.error('Argument is missing: cordovabridgeloadedEvent, pluginName parameter', 'CLIENT CORDOVA BRIDGE');
			return;
		}

		sap.Logger.info('Server bridge loaded: ' + pluginName, 'CLIENT CORDOVA BRIDGE');

		WinJS.Application.queueEvent({
			type: 'cordovabridgeloaded',
			detail: { pluginName: pluginName }
		});
	};
});