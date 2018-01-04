
cordovaBridgeUtils.webView.addEventListener("MSWebViewFrameNavigationStarting", function (e) {
    var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);
    var history = [];

    if (parameters["EVENT"] == 'windowOpenEvent') {
        var finalUrl = parameters.url;
        var iab = window.open(finalUrl, "_blank", "location=yes");
    };
});