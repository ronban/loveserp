var EB = document.getElementById('eventBecon');

function CordovaBridgeCommand(eventName) {
	this.eventName = eventName;
	this.queryParemeters = '';

	this.execute = function (successCallback, errorCallback) {
		if (eventName != 'sap_logger_log_Event') {
			console.debug('Server bridge, command execute:' + this.eventName + ', parameters:' + this.queryParemeters);
		}		
		this.successCallback = successCallback;
		this.errorCallback = errorCallback;
		// Needed this protocol; else the request would be made to the server and get included in the webview history for some reason
		// requiring the backbutton to be pressed twice for each transition.
	    // Make sure this file does not exist; 
		EB.contentWindow.location.replace('ms-appx-web:///www/becon.html?EVENT=' + eventName + this.queryParemeters);
		this.queryParemeters = '';
	}

	this.addQueryParameter = function (parameter) {
		this.queryParemeters += this.parseQueryParameter(parameter);
	}

	this.parseQueryParameter = function (parameter) {
		var result = '';
		if (typeof parameter != 'undefined' && parameter != null) {
			for (var prop in parameter) {
				if (parameter[prop] != null) {
					result += "&" + prop + "=" + encodeURIComponent(parameter[prop]);
				}
			}
		}
		return result;
	}

	this.processResult = function (result, error) {
		if (typeof error != 'undefined' && error != null) {
			if (eventName != 'sap_logger_log_Event') {
				console.error('Server bridge, processresult-error: ' + this.eventName + ', error: ' + (error ? (error.message ? error.message : '-') : '-'));
			}
			if (this.errorCallback != null) {
				setTimeout(this.errorCallback, 0, error);
			}
			error = null;
		} else {
			if (eventName != 'sap_logger_log_Event') {
				console.debug('Server bridge, processresult: ' + this.eventName + ', result: ' + (typeof result !== 'undefined' ? JSON.stringify(result) : '-'));
			}
			if (this.successCallback != null) {
				setTimeout(this.successCallback, 0, result);
			}
		}
	}
}

function onCordovaBridgeLoaded(pluginName) {
    
	// cannot add ms-appx-web:// here as that prevents the webview from loading.
    // TODO: Investigate why ?
    // 2015.12.09 (FC 1.6 cc): adding ms-appx-web fixed the csrf issue leaving old comment for info
	var url = 'ms-appx-web:///www/becon.html?EVENT=cordovabridgeloadedEvent&pluginName=' + encodeURIComponent(pluginName);

	if (console && console.debug) {
		console.debug('Server bridge, onCordovaBridgeLoaded: ' + url);
	}
	EB.contentWindow.location.replace(url);
}

var printableContentCommand = new CordovaBridgeCommand('printableContentEvent');

if (document.body.firstChild.tagName === 'IMG' && document.body.firstChild.nextElementSibling.id === 'eventBecon') {
    printableContentCommand.execute();
}