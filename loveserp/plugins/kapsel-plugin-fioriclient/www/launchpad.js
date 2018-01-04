var cc = function(msg) {
    console.log("[FioriClient][launchpad.js] " + msg);
};
var isToolbarSupported = function() {
    return (typeof sap !== "undefined" && typeof sap.Toolbar !== "undefined");
};
var isUsageSupported = function() {
    return (typeof sap !== "undefined" && typeof sap.Usage !== "undefined");
};

var fioriURL;
var tileObserver;

var launchpadTimer = function() {

    var startLoadTimer = function startLoadTimer(timeout, successCallback, errorCallback) {
        if (typeof successCallback !== "function") successCallback = function() {
            cc("startLoadTimer success");
        };
        if (typeof errorCallback !== "function") errorCallback = function(error) {
            cc("startLoadTimer error: " + JSON.stringify(error));
        };

        if (typeof timeout !== "undefined" && (typeof timeout !== "number" || timeout < 0)) {
            cc("If timeout is specified, it must be a number >= 0. current is: " + typeof timeout);
            errorCallback("invalid_argument", "Timeout must be undefined or a number");
            return;
        }

        if (isUsageSupported()) {
            var infoObj = {};
            if (typeof timeout === "number") {
                infoObj.timeout = timeout;
            }
            cordova.exec(successCallback, errorCallback, "FioriClient", "startLaunchpadLoadTimer", [infoObj]);
        } else {
            errorCallback("usage_not_supported", "Usage is not supported.");
        }
    };

    var stopLoadTimer = function stopLoadTimer(tileCount, infoType, successCallback, errorCallback) {
        if (typeof successCallback !== "function") successCallback = function() {
            cc("stopLoadTimer success");
        };
        if (typeof errorCallback !== "function") errorCallback = function(error) {
            cc("stopLoadTimer error: " + JSON.stringify(error));
        };

        if (typeof tileCount !== "undefined" && (typeof tileCount !== "number" || tileCount < 0)) {
            errorCallback("if tileCount specified, it must be a number >= 0. current is: " + tileCount);
            return;
        }
        if (typeof infoType !== "undefined" && typeof infoType !== "string") {
            errorCallback("If infoType is given, it must be a string. current is: " + typeof infoType);
            return;
        }

        if (isUsageSupported()) {
            var infoObj = {};
            if (typeof tileCount === "number") {
                infoObj.tileCount = tileCount;
            }
            if (typeof infoType === "string") {
                infoObj.infoType = infoType;
            }
            cordova.exec(successCallback, errorCallback, "FioriClient", "stopLaunchpadLoadTimer", [infoObj]);
        } else {
            errorCallback("usage_not_supported", "Usage is not supported.");
        }
    };

    return {
        startLoadTimer: startLoadTimer,
        stopLoadTimer: stopLoadTimer
    };

}();

function TileObserver(classToObserve, callback) {
    // on windows we need to start/stop the observer in the webview
    var isWindows = cordova.platformId.toLowerCase() === "windows";

    if (!TileObserver.isSupported) {
        throw new Error("MutationObserver is not supported.");
    }
    if (typeof classToObserve !== 'string') {
        throw Error("TileObserver's argument must be a string.");
    }

    var _observer;
    var _callback = (typeof callback === 'function') ? callback : function tileObserverDefaultCallback() {};
    var _isRunning = false;

    this.isRunning = function isRunning() {
        return _isRunning;
    };

    this.start = function startObserver() {
        if (isWindows)
            return;
        _observer = new MutationObserver(function launchpadObserver(mutations) {
            var elementsLength = document.getElementsByClassName(classToObserve).length;
            if (elementsLength > 0) {
                window.setTimeout(function tileObserverResult() {
                    _callback('result', elementsLength);
                }, 0);
            }
        });

        var elementsLength = document.getElementsByClassName(classToObserve).length;
        if (elementsLength > 0) {
            window.setTimeout(function tileObserverResult() {
                _callback('preresult', elementsLength);
            }, 0);
        }

        var observerConfig = {
            childList: true,
            subtree: true
        };
        _observer.observe(document.body, observerConfig);
        _isRunning = true;

        return true;
    };

    this.stop = function stopObserver() {
        if (isWindows)
            return;
        if (_isRunning) {
            _isRunning = false;
            _observer.disconnect();
            _observer = undefined;
            window.setTimeout(function tileObserverResult() {
                _callback('stopped');
            }, 0);
        }
    };
}
Object.defineProperty(TileObserver, 'isSupported', {
    configurable: false,
    enumerable: true,
    get: function() {
        return (typeof MutationObserver !== 'undefined');
    }
});

function getFioriURL() {
    sap.FioriClient.getFioriURL(function(link) {
        fioriURL = link;
    });
}

function setToolbar() {
    if (isToolbarSupported()) {
        sap.Toolbar.addEventListener(function launchpadEventListener(eventId, itemId) {
            if (typeof itemId !== "string") {
                return;
            }
            
            var locationURL = window.location.href;
            if (cordova.platformId.toLowerCase() === "windows") {
                locationURL = document.getElementById("webView").src
            }

            var fioriURLParser = document.createElement("a");
            fioriURLParser.href = fioriURL;
            var locationParser = document.createElement("a");
            locationParser.href = locationURL;

            // Make sure the origin and pathname match. The irrelevant fields are .hash and .search
            var URLcheck = ((fioriURLParser.origin === locationParser.origin)
                    && (fioriURLParser.pathname === locationParser.pathname));

            if (itemId.toLowerCase() === "home" || (itemId.toLowerCase() === "refresh" && URLcheck)) {
                launchpadTimer.startLoadTimer(120000);
            }
        });
    }
}

function onDeviceReady() {
    if (typeof WinJS !== "undefined" && typeof WinJS.Application !== "undefined") {
        WinJS.Application.addEventListener("onSapLogonSuccess", getFioriURL, false);
        WinJS.Application.addEventListener("onUsageInitialized", setToolbar, false);
    } else {
        document.addEventListener("onSapLogonSuccess", getFioriURL, false);
        document.addEventListener("onUsageInitialized", setToolbar, false);
    }

    cordova.fireWindowEvent('resize', {});

    cordova.exec(function launchadRunningCallback(result) {
        if (!result) {
            tileObserver.stop();
        }
    }, null, "FioriClient", "isLaunchpadTimerRunning", []);

}

try {
    tileObserver = new TileObserver('sapUshellTile', function tileObserverCallback(status, result) {
        if (status === 'result' || status === 'preresult') {
            launchpadTimer.stopLoadTimer(result);
            tileObserver.stop();
        }
    });
    tileObserver.start();
} catch (e) {
    console.error("[FioriClient][launchpad.js] Failed to create observer: " + e);
}

document.addEventListener("deviceready", onDeviceReady, false);

module.exports = {
    launchpadTimer: launchpadTimer,
    tileObserver: tileObserver
};
