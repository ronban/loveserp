(function bridgeReady() {
    var customEvent = document.createEvent('Event');
    customEvent.initEvent('deviceready', true, true);
    document.dispatchEvent(customEvent);
})();
