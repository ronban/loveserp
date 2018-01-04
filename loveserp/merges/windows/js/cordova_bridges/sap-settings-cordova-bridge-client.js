/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for Settings events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function (e) {
	var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

	if (parameters['EVENT'] == 'sap_settings_isFeatureEnabled_Event') {
		sap.Settings.isFeatureEnabled(getNameParameter(e.uri), function (result) {
			cordovaBridgeUtils.successEvent('sap_settings_isFeatureEnabledCommand', result)
		}, function (error) {
			if (typeof error === 'undefined') {
				cordovaBridgeUtils.errorEvent('sap_settings_isFeatureEnabledCommand', 'An unexpected error has occurred in sap.Settings.isFeatureEnabled');
			} else {
				cordovaBridgeUtils.errorEvent('sap_settings_isFeatureEnabledCommand', error)
			}
		});
	} else if (parameters['EVENT'] == 'sap_settings_getConfigPropertyMap_Event' && typeof sap.Settings.getConfigPropertyMap === "function") {
	    sap.Settings.getConfigPropertyMap(function (result) {
	        cordovaBridgeUtils.successEvent('sap_settings_getConfigPropertyMapCommand', result)
	    }, function (error) {
	        if (typeof error === 'undefined') {
	            cordovaBridgeUtils.errorEvent('sap_settings_getConfigPropertyMapCommand', 'An unexpected error has occurred in sap.Settings.getConfigPropertyMap');
	        } else {
	            cordovaBridgeUtils.errorEvent('sap_settings_getConfigPropertyMapCommand', error)
	        }
	    });
	} else if (parameters['EVENT'] == 'sap_settings_setConfigProperty_Event') {
	    var nameValues = JSON.parse(parameters['nameVals']);
	    sap.Settings.setConfigProperty(nameValues,
        function () {
            cordovaBridgeUtils.successEvent('sap_settings_setConfigPropertyCommand')
	    }, function (error) {
	        if (typeof error === 'undefined') {
	            cordovaBridgeUtils.errorEvent('sap_settings_setConfigPropertyCommand', 'An unexpected error has occurred in sap.Settings.setConfigProperty');
	        } else {
	            cordovaBridgeUtils.errorEvent('sap_settings_setConfigPropertyCommand', error)
	        }
	    });
	}
	
	function getNameParameter(uri) {
		return cordovaBridgeUtils.getUrlParameters(uri)['name'];
	}
});


(function() {
	var sap_SettingsCompletedEval = null;
	var webViewNavigating = false;

	cordovaBridgeUtils.webView.addEventListener("MSWebViewNavigationStarting", function (event) {
		webViewNavigating = true;
	});

	WinJS.Application.addEventListener('cordovabridgeloaded', function (args) {
		if (args.detail.pluginName != 'sap.Settings') { return; }

		webViewNavigating = false;
		callSettingsCompletedOnRemotePage();
	});

	WinJS.Application.addEventListener('settingsDone', function (detail) {
		sap_SettingsCompletedEval = 'if (!(typeof sap === "undefined" || typeof sap.Settings === "undefined")) { sap.Settings.SettingsCompleted("settingsDone", ' + JSON.stringify(detail) + '); }';

		if (!webViewNavigating) {
			callSettingsCompletedOnRemotePage();
		}
	});

	function callSettingsCompletedOnRemotePage() {
		if (cordovaBridgeUtils.webView && cordovaBridgeUtils.webView.src != 'about:blank' && sap_SettingsCompletedEval) {
			var eval = WV.invokeScriptAsync('eval', sap_SettingsCompletedEval);
			eval.start();
		}
	}
})();