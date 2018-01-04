

var utils = require('kapsel-plugin-attachmentviewer.Utils');

getExtension = function (mime) {
    return utils.mimeExtensionsTable.get(mime);
}

openFile = function (_file) {
    var options = new Windows.System.LauncherOptions();
    options.displayApplicationPicker = true;

    Windows.System.Launcher.launchFileAsync(_file, options).then(
       function (success) {
           if (success) {
               utils.logMessage("Attachment opened successfully", "INFO", "Attachment");
           } else {
               navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
               utils.logMessage("Failed to open attachment; file = " + _file, "ERROR", "Attachment");
           }
       });

}

module.exports = {
    downloadFile: function (urlToLaunch,i18nBundle, errorCB) {
        utils.showMessage(i18nBundle.get("downloading_file", "Downloading file ... "), "short");
        WinJS.xhr({
            url: urlToLaunch, responseType: "blob",
            // use this header to ensure that winjs does not use cached responses.
            headers: {
                "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT"
            }
        })
         .done(function complete(result) {
             utils.showMessage(i18nBundle.get("downloading_complete", "Download complete. File will be opened in external app."), "short");
             var arrayResponse = result.response;
             var mime = result.getResponseHeader("Content-Type");
             utils.logMessage("Mime = " + mime, "INFO", "Attachment")
             var filename = "download-" + new Date().getTime() + getExtension(mime);
             var size = arrayResponse.size;
             var parentFolder = Windows.Storage.ApplicationData.current.temporaryFolder;
             parentFolder.createFolderAsync(utils.DOWNLOAD_FOLDER, Windows.Storage.CreationCollisionOption.openIfExists).done(
                 function (folder) {
                     var file = folder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting).then(
                     function (_file) {
                         var stream = arrayResponse.msDetachStream();
                         var reader = new Windows.Storage.Streams.DataReader(stream);
                         var iBuffer;
                         reader.loadAsync(size).then(function (count) {
                             iBuffer = reader.readBuffer(size);
                             Windows.Storage.FileIO.writeBufferAsync(_file, iBuffer).then(
                             function () {
                                 if (_file.fileType && _file.fileType == ".unknowntype") {
                                     //The msg file mime-type is not correct and it cannot be received from the result.
                                     //Therefore we need to load the unknowntype file back to the memory as binary data.
                                     //Binary data cannot be accessed from the stream or from the iBuffer variables that is the reason why we save it first and reload it.
                                     var reader = new FileReader();
                                     reader.onload = function (event) {
                                         var dataContent = event.target.result;
                                         //http://stackoverflow.com/questions/31071425/how-to-get-the-mime-type-of-a-msg-file
                                         //https://blogs.msdn.microsoft.com/openspecification/2013/01/16/determining-office-binary-file-format-types/
                                         //If the first 8 bytest are D0 CF 11 E0 A1 B1 1A E1 then we assume that it is an office file
                                         //As all the other office files report their mime-type therefore we assume that this file is an msg file
                                         //This is not 100% sure but it seems to be right.
                                         if (String.fromCharCode(parseInt("D0", 16)) == dataContent[0] &&
                                             String.fromCharCode(parseInt("CF", 16)) == dataContent[1] &&
                                             String.fromCharCode(parseInt("11", 16)) == dataContent[2] &&
                                             String.fromCharCode(parseInt("E0", 16)) == dataContent[3] &&
                                             String.fromCharCode(parseInt("A1", 16)) == dataContent[4] &&
                                             String.fromCharCode(parseInt("B1", 16)) == dataContent[5] &&
                                             String.fromCharCode(parseInt("1A", 16)) == dataContent[6] &&
                                             String.fromCharCode(parseInt("E1", 16)) == dataContent[7]) {
                                             filename = filename.replace(".unknowntype", ".msg");
                                             //Save the file with msg extension and open it
                                             var msgfile = folder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting).then(function (msgFile){
                                                 Windows.Storage.FileIO.writeBufferAsync(msgFile, iBuffer).then(function () {
                                                     openFile(msgFile);
                                                 },
                                                 function (err) {
                                                     navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                                                     utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
                                                 });
                                             },
                                             function (err) {
                                                 navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                                                 utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
                                             });

                                         } else {
                                             openFile(_file);
                                         }
                                     };
                                     //This function is deprecated so it might happen in the future that it won't work
                                     reader.readAsBinaryString(_file);
                                 } else {
                                     openFile(_file);
                                 }
                             },
                             function (err) {
                                 navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                                 utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
                             });
                         }, function (err) {
                             navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                             utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
                         }
                     );
                     },
                 function (err) {
                     navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                     utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
                 });
                 },
             function (err) {
                 navigator.notification.alert(i18nBundle.get("attachment_open_failed", "Failed to open attachment"), function () { }, i18nBundle.get("attachment_viewer_page", "Attachment Viewer page"), i18nBundle.get("close", "Close"));
                 utils.logMessage("Failed to open attachment due to " + err, "ERROR", "Attachment");
             });
         },
         errorCB);
    }
}