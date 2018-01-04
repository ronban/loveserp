/*jslint browser:true*/
/*global sap*/

(function () {
    "use strict";

    //add an event listener for the Cordova deviceReady event.
    document.addEventListener('deviceready', function () {
        sap.FioriClient.loadByIndexPage = true;
        sap.logon.Utils.logPerformanceMessage("ondeviceready from index.js");
    });
}());
