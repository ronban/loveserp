//fioriclient bridge

var observer;

var startLaunchpadObserver = function() {
    var isLaunchpadTimerSupported = function() {
        return (typeof MutationObserver !== 'undefined');
    };

    // MutationObserver is not supported on all platforms (e.g. Android 4.3 and bellow)
    if (!isLaunchpadTimerSupported()) {
        console.log('LaunchpadTimer is not supported');
        errors.push("LaunchpadTimer is not supported");
        return false;
    }

    observer = new MutationObserver(function() {
        var elementsLength = document.getElementsByClassName("sapUshellTile").length;
        if (elementsLength === 0) {
            console.log("MutationObserver called in the WebView");
            return;
        }

        observer.disconnect();
        observer = undefined;
        console.log("MutationObserver called = SAPUI5 tile elemnts (class=sapUshellTile) count " + elementsLength);

        stopLoadTimer(elementsLength);
    });

    var config = {
        childList: true,
        subtree: true
    };

    observer.observe(document.body, config);
    return true;
};

var errors = [];
if (!startLaunchpadObserver()) {
    console.log(JSON.stringify(errors));
}

var stopLoadTimerCommand = new CordovaBridgeCommand('stopLoadTimerEvent');
var stopLoadTimer = function(elements) {
    console.debug("Server bridge: stopLoadTimer");
    stopLoadTimerCommand.addQueryParameter({
        elementsLength: elements
    });
    stopLoadTimerCommand.execute(null, null);
};


var isLaunchpadTimerRunningCommand = new CordovaBridgeCommand('isLaunchpadTimerRunningEvent');
document.addEventListener("deviceready", function() {
    var isLaunchpadTimerRunning = function(callback) {
        isLaunchpadTimerRunningCommand.execute(function(isTimerRunning) {
            callback(isTimerRunning);
        }, null);
    };
    isLaunchpadTimerRunning(function (result) {
        if (!result && typeof observer !== "undefined") {
            observer.disconnect();
            observer = undefined;
        }
    });
}, false);

onCordovaBridgeLoaded('stopLoadTimer');
