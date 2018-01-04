/* Runs on the AppHost container which has access to native functionality */
var WV = document.getElementById('webView');

var DOWNLOAD_FOLDER = "downloads";
// Handle downloads.
WV.addEventListener("MSWebViewUnviewableContentIdentified",
    function (param) {
        logMessage("unviewable content", "INFO", "Attachment");
        // Set the show picker option
        //downloadFile(param.uri);
        window.open(param.uri);
    }
);

getExtension = function (mime) {
    return mimeExtensionsTable.get(mime);
}