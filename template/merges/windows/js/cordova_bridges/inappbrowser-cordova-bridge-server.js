
var windowOpenCommand = new CordovaBridgeCommand('windowOpenEvent');
var originalWindowOpen = window.open;

function qualifyURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}

window.open = function (url, type) {
    console.debug('window.open.called');

    //Based on the useBrowser parameter we can decide whether open the new tab in inappbrowser or in the default browser
    if (typeof useBrowser !== "undefined" && useBrowser != null && useBrowser === true) {
        if (type == "_blank" || type == "blank") {
            originalWindowOpen(url, type);
        } else {
            console.debug('window.open.called');

            var urlParameter = window.location.href;

            if (("#" + window.location.href.split("#")[1]).indexOf(url) == 0) {
                window.history.go(0);
            }
            windowOpenCommand.addQueryParameter({ "url": urlParameter });
            windowOpenCommand.execute(null, null);
        }
    } else {
        window.history.go(0);
        windowOpenCommand.addQueryParameter({ "url": qualifyURL(url) });
        windowOpenCommand.execute(null, null);
    }
};

onCordovaBridgeLoaded('window.open');
