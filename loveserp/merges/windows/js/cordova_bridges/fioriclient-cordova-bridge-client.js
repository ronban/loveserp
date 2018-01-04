/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for fioriclient events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function(e) {
    var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);

    if (parameters['EVENT'] === 'stopLoadTimerEvent') {
        var launchpad = cordova.require("kapsel-plugin-fioriclient.FioriClient-Launchpad");
        if (typeof launchpad !== "undefined" && typeof launchpad.launchpadTimer !== "undefined" && typeof launchpad.launchpadTimer.stopLoadTimer === "function") {
                launchpad.launchpadTimer.stopLoadTimer(getElementsLength(parameters));
        } else {
            cordovaBridgeUtils.errorEvent('stopLoadTimerEvent', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] === 'isLaunchpadTimerRunningEvent') {
        try {
            cordova.exec(function (result) {
                cordovaBridgeUtils.successEvent('isLaunchpadTimerRunningCommand', result);
            }, null, "FioriClient", "isLaunchpadTimerRunning", []);
        } catch (e) {
            cordovaBridgeUtils.errorEvent('isLaunchpadTimerRunningEvent', {
                corde: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    function getElementsLength(uriParameter) {
        var elementsLength;

        if (uriParameter['elementsLength'] !== null) {
            elementsLength = uriParameter['elementsLength'];
        }

        return parseInt(elementsLength);
    }
});
