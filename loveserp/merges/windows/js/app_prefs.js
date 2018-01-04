
/* Implementations of various plugin functionality that is not available in Windows */
/* Longer term, we expect this file to be replaced by the actual plugins */

var sap = sap || {};
sap.CacheManager = {
    // no-ops
    setUrl: function (fioriURL) {

    },
    clearCache: function () {

    },
    setCacheEnabled: function (enableCache) {

    },
    setSAPUI5LifecycleManagementEnabled: function (enableCache) {

    },
    setCheckForUpdatesEvents: function (events) {

    },
    oncacheinvalidated: function () {

    }
};

alert = function (message, fn, title, buttonText) {
    var messageElement = document.createElement("div");
    messageElement.textContent = message;
    var options = {
        title: title,
        primaryCommandText: buttonText
    };

    document.body.appendChild(messageElement);
    var messageBoxControl = new WinJS.UI.ContentDialog(messageElement, options);
    messageBoxControl._dom.commands[0].id = "about_ok_103";
    messageBoxControl.show();
}

document.addEventListener("deviceready", function () {
    if (window.navigator) {

        // use WinJS dialogs for alerts, because they fully support RTL alignment
        if (window.navigator.notification) {
            window.navigator.notification.alert = alert;
        } else {
            window.navigator.notification = {
                alert: alert
            };
        }

        // No navigator plugin on Windows.
        window.navigator.splashscreen = {};

        window.navigator.splashscreen.show = function () {
            // no - op
        };

        window.navigator.splashscreen.hide = function () {
            // no - op
        };
    }
});
