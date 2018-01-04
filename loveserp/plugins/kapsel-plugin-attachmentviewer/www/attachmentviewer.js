 var urlutil = require('cordova/urlutil');
 var i18bundle;
 var original_window_open = window.open;

var getExtension = function (url) {
    if (url) {
        var anchorEl = document.createElement('a');
        anchorEl.href = url;

        if (anchorEl.pathname) {
            var start = anchorEl.pathname.lastIndexOf('.') + 1;
            if (start >= 0 && start !== anchorEl.pathname.length) {
                return anchorEl.pathname.substring(start).toLowerCase();
            }
        }
    }
}

    var setupAttachmentViewer = function () {

        var exec = require('cordova/exec');
        if (device.platform == 'windows' || device.platform == 'Android' || device.platform[0] === 'i') {

            if (device.platform == 'windows') {
                document.removeEventListener("resume", fileCleaner);
                WinJS.Application.removeEventListener("revalidation", setupAttachmentViewer);
                document.addEventListener("resume", fileCleaner, false);
                WinJS.Application.addEventListener("revalidation", setupAttachmentViewer);
            }

            // Override window.open to use InAppBrowser by default.
            window.open = function (strUrl, strWindowName, strWindowFeatures) {
                // to check if iOS native attachment viewer is used
                var isIOSNativeAttachmentviewer = false;
                // open it in the InAppBrowser
                var originalWindowNameEmpty = false;
                if (!strWindowName || strWindowName === '') {
                    // If the target isn't specified, use _blank so that InAppBrowser is shown.
                    strWindowName = '_blank';
                    originalWindowNameEmpty = true;
                }

                if (device.platform == 'Android') {
                    if (!strWindowFeatures || strWindowFeatures === '') {
                        // Use these as default options.
                        console.log("setting window features.");
                        strWindowFeatures = 'location=no,toolbar=no';
                    }
                }

                else if (device.platform[0] === 'i') {
                    // check if iOS native attachment viewer will be used.
                    // HTML pages should use the IAB. Try do an initial check here.
                    // The native viewer will do extra checks on the content type
                    // and send the attachment to IAB if required.
                    if ( (strUrl && strUrl.length >= 0)) {
                        var extension = getExtension(strUrl);
                        if (extension !== "html" || extension !== "html")  {
                            isIOSNativeAttachmentviewer = true;
                        }
                    }
                }
               else if (device.platform == 'windows') {
                    if (!strWindowFeatures || strWindowFeatures === '') {
                        //Use these as default options.
                        strWindowFeatures = 'location=no,fullscreen=yes';
                    }  
                }

                if (platform === 'android' && strUrl.toLowerCase().indexOf("https://") == 0) {
                    if (sap.AuthProxy.isRedirectingRequestsSync()) {
                        // Make sure we are not opening an https url if AuthProxy is intercepting reqeusts.
                        // Http will allow AuthProxy to intercept the request and AuthProxy will switch it
                        // to https before sending it over the network.
                        strUrl = "http" + strUrl.substring(5);
                        if (!sap.AuthProxy.isHttpsConversionHost(strUrl)) {
                            sap.AuthProxy.addHTTPSConversionHost(function () { }, function () { }, strUrl);
                        }
                    }
                }

                var windowRef;

                // It is possible for the launchpad javascript to override window.open for purposes of
                // adding filters which can modify the URL.  If that is the case, run the filters here to
                // get the intended URL.
                if (sap && sap.ushell && sap.ushell.cloudServices && sap.ushell.cloudServices.interceptor && sap.ushell.cloudServices.interceptor.InterceptService) {
                    var interceptorService = sap.ushell.cloudServices.interceptor.InterceptService.getInstance();
                    if (interceptorService && interceptorService._invokeFilters) {
                        var filteredUrl = interceptorService._invokeFilters("filterWindowOpen", strUrl);
                        if (filteredUrl && filteredUrl != "") {
                            console.log("attachmentviewer using filtered URL: " + filteredUrl + " instead of given url: " + strUrl);
                            strUrl = filteredUrl;
                        }
                    }
                }

                if (platform === 'ios') {

                    function attachmentErrorHandling(result) {
                        //174128 / 2017 / Unable to navigate to a URL from SAP UI5 app.
                        //Do not close the inappbrowser windowRef here, as the html&js content may get some internal errors which do
                        //not affect the user's current operation. 
                        //May need to separate the native and webview error callback methods to avoid interfering with each other's logic
                        //if content type is 'text/html', inAppBrowser needs to open it.
                        if (result == 'openIAB') {
                            openInAppBrowser();
                        } else {
                            var i18n = require('kapsel-plugin-i18n.i18n');
                            i18n.load({
                                path: "plugins/kapsel-plugin-attachmentviewer/www"
                            },
                            function (bundle) {
                                //For now, only use the returned messages from native for error message in the error dialog.
                                //For other than the messages, use generic error message.
                                //error messages from inappbrowser can be used later after they are tested and confirmed.
                                // ##### error codes that have been tested #####
                                //-1001*: The request timed out.
                                //-1002*: unsupported url
                                //-1003*: A server with the specified hostname could not be found.
                                //-1009*: The internet connection appears to be offline.
                                //-1206*: The server requires a client certificate.
                                if (result &&
                                    (result.errorcode ==='-1001'
                                     || result.errorcode ==='-1002'
                                     || result.errorcode ==='-1003'
                                     || result.errorcode ==='-1009'
                                     || result.errorcode ==='-1206') &&
                                    result.errormessage !="" && typeof result.errormessage === 'string') {
                                    navigator.notification.alert(result.errormessage , function () { }, bundle.get("error"), bundle.get("close"));
                                } else {
                                    //174128 / 2017 / Unable to navigate to a URL from SAP UI5 app.
                                    //The html&js content may get some internal errors which does not affect the user's operation, so just log an error and
                                    //do not show alerts to users. The alert should only be shown for the known errors specified in above IF block
                                    console.log("Fail to open attachment: " + result);
                                }
                            });
                        }
                     }
               
               
                     function openInAppBrowser() {
                         // in case of using inappbrowser to open attachment.
                         if (!strWindowFeatures || strWindowFeatures === '') {
                             //Use these as default options.
                             strWindowFeatures = 'location=no,EnableViewPortScale=yes,showprintoption=yes';
                         }
                         windowRef = original_window_open(strUrl, strWindowName, strWindowFeatures);
                         windowRef.addEventListener('loaderror', attachmentErrorHandling);
                     }


                    if (isIOSNativeAttachmentviewer == true) {
                        //directly run native attachment viewer with 3rd party app launching
                        //encode attachment url to support foreign language file name for iOS native preview screen
              				
                        //encode if needed, and also convert url to absolute
                        strUrl = urlutil.makeAbsolute(strUrl);
                        exec(null, attachmentErrorHandling, "AttachmentHandler", "openDocumentWithOtherApps", [ strUrl]);
                        return {};  //fix bug 1680237596, FIORI: Pop-Up blocker deactivated but still getting pop-up error
                    } else {
                        openInAppBrowser();
                    }
                } else {
                    windowRef = original_window_open(strUrl, strWindowName, strWindowFeatures);
                }


                if (device.platform == 'Android' && originalWindowNameEmpty) {
                    windowRef.addEventListener('backbutton', function () {
                        windowRef.close();
                    });
                } else if (device.platform == 'windows') {
                    //On windows platform when the loaderror event has a subtype called MSWebViewUnviewableContentIdentified
                    //the plugin has to try to dowload it. If not, it is just a simple error. 
                    var iabDownloadFile = function (event) {
                        if (event.subType && event.subType === "MSWebViewUnviewableContentIdentified") {

                            var downloader = cordova.require('kapsel-plugin-attachmentviewer.Downloader');
                            var utils = cordova.require('kapsel-plugin-attachmentviewer.Utils');
                            var i18n = cordova.require("kapsel-plugin-i18n.i18n");

                            var url = event.url;
                            if (!i18bundle) {
                                var i18n = cordova.require("kapsel-plugin-i18n.i18n");
                                i18n.load({
                                    path: "plugins/kapsel-plugin-attachmentviewer/www"
                                }, function (bundle) {
                                    i18bundle = bundle;
                                    utils.mimeExtensionsTable.load("ms-appx:///www/mimeTypes.json", function () {
                                        downloader.downloadFile(url, i18bundle, iabErrorHandle);
                                        windowRef.close();
                                    });
                                });
                            } else {
                                utils.mimeExtensionsTable.load("ms-appx:///www/mimeTypes.json", function () {
                                    downloader.downloadFile(url, i18bundle, iabErrorHandle);
                                    windowRef.close();
                                });
                            }

                        }
                    }
                    // Error handling with popup message.
                    var iabErrorHandle = function (event) {
                        windowRef.close(event);
                        var i18n = require('kapsel-plugin-i18n.i18n');
                        i18n.load({
                            path: "plugins/kapsel-plugin-attachmentviewer/www"
                        },
                        function (bundle) {
                            navigator.notification.alert(bundle.get("attachment_open_failed"), function () { }, bundle.get("attachment_viewer_page"), bundle.get("close"));
                        });
                    }
                    //Remove event listeners.
                    var iabCloseHandle = function (event) {
                        windowRef.removeEventListener('loaderror', iabDownloadFile);
                        windowRef.removeEventListener('exit', iabCloseHandle);
                    }

                    windowRef.addEventListener('loaderror', iabDownloadFile);
                    windowRef.addEventListener('exit', iabCloseHandle);
                }
               

                //To handle attachment in the case of window.open without url (empty string) and set location later in fiori app.
                //bcp 213421/2016 (My travel expense-export as PDF in Fiori native client apps)
                if (device.platform == 'Android' || device.platform[0] === 'i') {
                    if(!strUrl || strUrl === '') {

                        var openAttachment = function(url) {
                            console.log ("new attachment viewer will appear. (iOS native attachment viewer will appear for iOS.)");
                            windowRef.addEventListener('exit', function() { window.open(url, '_blank'); });
                            windowRef.close();
                        }
               
                        Object.defineProperty(windowRef, 'location', {
                                     set: function (url) { openAttachment(url);}  //when location property on IAB object is set, call openAttachment(url)
                        }); 
                    }
                }

                return windowRef;
            };
        }

        var platform = cordova.require("cordova/platform").id;
        if (platform === 'ios' || platform === 'android' || platform === 'windows') {
            document.addEventListener('click', function (e) {
                e = e || window.event;
                var element = e.target || e.srcElement;
                if (element.href) {
                    // If a link of some sort has been clicked on Android, check to make sure it uses HTTP if it is an HTTPSConverionHost.
                    // Note that this method of checking the https conversion host list only works as long as the fiori attachments
                    // have the same host as the fiori server.  So far this is the case, but it is a potential concern for the future.
                    if (platform === 'android' && element.href.toLowerCase().indexOf("https://") == 0 && sap.AuthProxy.isHttpsConversionHost(element.href)) {
                        // Switch the href to http (native side will switch back to https)
                        element.href = "http" + element.href.substring(5);
                        // Stop this event, but click the element again so the event will trigger with the proper href value.
                        e.preventDefault();
                        e.stopPropagation();
                        element.click();
                    } else {
                        if (platform !== 'windows' && element.tagName == 'A' && (element.href.indexOf("http") === 0 || element.href.indexOf("https") === 0 || element.href.indexOf("file") === 0) && element.target == "_blank") {
                            e.preventDefault();
                            var windowRef = window.open(element.href, element.target);
                            var iabErrorHandle = function (event) {
                                windowRef.close(event);
                                var i18n = require('kapsel-plugin-i18n.i18n');
                                i18n.load({
                                    path: "plugins/kapsel-plugin-attachmentviewer/www"
                                },
                                function (bundle) {
                                    navigator.notification.alert(bundle.get("attachment_open_failed"), function () { }, bundle.get("attachment_viewer_page"), bundle.get("close"));
                                });
                            }
                            var iabCloseHandle = function (event) {
                                windowRef.removeEventListener('loaderror', iabErrorHandle);
                                windowRef.removeEventListener('exit', iabCloseHandle);
                            }

                            // These are IAB events.  The native attachment viewer on iOS does not support them
                            if (platform !== 'ios') {
                                windowRef.addEventListener('loaderror', iabErrorHandle);
                                windowRef.addEventListener('exit', iabCloseHandle);
                            }

                        } else if (platform === 'windows' && element.tagName == 'A' && (element.href.indexOf("http") === 0 || element.href.indexOf("https") === 0 || element.href.indexOf("ms-appx") === 0 || element.href.indexOf("file") === 0) && element.target == "_blank") {
                            e.preventDefault();
                            window.open(element.href, element.target);
                        } else if (platform === 'android' && element.tagName == 'A' && element.href.indexOf("sapauthenticator") === 0) {
                            e.preventDefault();
                            exec(null, null, "AttachmentHandler", "sapauthenticator", [element.href]);
                        }
                    }
                }
            });
        }
    }

    var fileCleaner = function () {
        // Cleaning dowloaded files
        var utils = cordova.require('kapsel-plugin-attachmentviewer.Utils');
        var cleaner = cordova.require("kapsel-plugin-attachmentviewer.FileCleaner");
        cleaner.cleanFolder(utils.DOWNLOAD_FOLDER);
    }

    document.addEventListener("deviceready", setupAttachmentViewer, false);
