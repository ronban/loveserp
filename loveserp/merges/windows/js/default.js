// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    var isWin10 = navigator.appVersion.indexOf('MSAppHost/3.0') !== -1;
    if (typeof WinJS.Utilities.isPhone === "undefined") {
        // WinJS 4+ doesn't have this property, checking userAgent for now
        WinJS.Utilities.isPhone = (navigator.userAgent.indexOf("Windows Phone") > -1);
    }

    var ERROR_PAGE = "ms-appx-web:///www/CannotReachHost.html";
    var fioriUrl; // cache this information for deleting the cookies.
    var protocolUrl = null;
    var idpUrl;
    var backClicked = false;
    var optionalPlugins; // plugins to disable if necessary
    var whiteListedUrls; // urls which are allowed for plugins
    var OPTIONAL_PLUGINS_FILE = "optionalPlugins.json";
    var WHITELISTED_URLS_FILE = "whiteListedUrls.json";
    var APPBAR_SECTION_ID = "appBar-bottom";
    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var urlChanged = false;
    var FIORI_HELP_URL = "https://help.sap.com/doc/d55f83e12e4b40779158fbaf08fe0f14/1.9/en-US/index.html";
    var urlHistory = new Array(); // Temporary workaround to hold a history of urls that are visited by the IAB.
    var getVersionNumber = function (showBuildNumber) {
        var version = Windows.ApplicationModel.Package.current.id.version;
        var result = version.major + '.' + version.minor + '.' + version.revision;

        if (showBuildNumber) {
            result += '.' + version.build;
        }

        return result;
    };

    var contentSection;
    var useBrowserInstead = false;
    var skipHeadRequest = false;
    var pluginsInvalidated = false;

    //Win8.1 security restriction shims for Win10
    if (typeof window.toStaticHTML == "undefined") {
        window.toStaticHTML = function (text) {
            return text;
        };
    }

    if (typeof MSApp != "undefined" && typeof MSApp.execUnsafeLocalFunction == "undefined") {
        MSApp.execUnsafeLocalFunction = function (func) {
            func();
        };
    }

    var injectWin10SecurityShim =
        "if (typeof this.toStaticHTML == 'undefined')" +
            "this.toStaticHTML = function (text) { return text; };" +
        "if (typeof MSApp != 'undefined' && typeof MSApp.execUnsafeLocalFunction == 'undefined')" +
            "MSApp.execUnsafeLocalFunction = function (c) { c(); };";

    //inject shim for window.navigator dialog functions into webview, as it is unavailable on Windows for now
    //see: www/app_prefs.js
    var injectWin10NavigatorShim =
        "if (window.navigator) {" +
            "window.navigator.notification = window.navigator.notification || {" +
                "alert: function (a, b, c) { new Windows.UI.Popups.MessageDialog(a, c).showAsync(); } };" +
            "window.navigator.splashscreen = {};" +
            "window.navigator.splashscreen.show = function () {};" +
            "window.navigator.splashscreen.hide = function () {};" +
        "}";

    // To use API bridging between remote and local contexts (mandatory on Win8.1, optional on Win10) inject iframe and bridge shims

    // Fiori launchpad adds the logon form to the iframe.
    // that messes up the layout. set display = none until we figure out the reason for this behaviour
    var injectBridgeIframe =
        "var kapsel=document.createElement('iframe');" +
        "kapsel.setAttribute('style','width:1px;height:1px;display:none');" +
        "kapsel.setAttribute('id', 'eventBecon'); " +
        "kapsel.setAttribute('src', 'ms-appx-web:///www/becon.html');" +
        "try {" +
            "document.body.appendChild(kapsel); console.log ('IFrame added successfully');" +
        "} catch (e){" +
            "console.log ('ERROR ADDING IFRAME');" +
        "}";

    var injectBridgeShims =
        "function addScript(fileName) {" +
            "var serverScript=document.createElement('script');" +
            "serverScript.setAttribute('type', 'text/javascript');" +
            "serverScript.setAttribute('src', 'ms-appx-web:///www/js/cordova_bridges/' + fileName);" +
            "try {" +
                "document.body.appendChild(serverScript); console.log ('Script ' + fileName + ' added successfully');" +
            "}catch(e){" +
                "console.log ('ERROR: adding script: ' + fileName + ', error: ' + e.message);" +
            "}" +
        "}" +
        "addScript('common-cordova-bridge-server.js');" +
        "addScript('sap-logger-cordova-bridge-server.js');" +
        "addScript('cordova-bridge-server.js');" +
        "addScript('barcodescanner-cordova-bridge-server.js');" +
        "addScript('camera-cordova-bridge-server.js');" +
        "addScript('geolocation-cordova-bridge-server.js');" +
        "addScript('sap-settings-cordova-bridge-server.js');" +
        "addScript('voicerecording-cordova-bridge-server.js');" +
        "addScript('fioriclient-cordova-bridge-server.js');" +
        "addScript('inappbrowser-cordova-bridge-server.js');" +
        "addScript('bridgeReady.js');"; // we need to notify the webview, that all bridge injection finished and the plugins are ready to use
    // Add cordova bridge after the voicerecording plugin and it's dependencies were added to the fiori client

    var injectUseBrowserInstead = "var useBrowser = true;"

    app.onready = function (args) {
        console.log('ONREADY CALLED');
    };

    app.onloaded = function (args) {
        contentSection = document.getElementById('content-section');
        setupWebview();
        handleBackButton();
        addIabListener(); // temporary until windows allows all cookies to be cleared.
    };

    app.onactivated = function (args) {
        var activationKind = args.detail.kind;
        var activation = Windows.ApplicationModel.Activation;

        if (activationKind === Windows.ApplicationModel.Activation.ActivationKind.protocol) {
            logMessage("protocol launch...", "DEBUG", "debug");
            var uriProtocol = args.detail.uri.absoluteUri;
            protocolUrl = uriProtocol;
            if (isNotNullOrUndefined(args.detail) && isNotNullOrUndefined(args.detail.detail[0]) && isNotNullOrUndefined(args.detail.detail[0].previousExecutionState) &&
                (args.detail.detail[0].previousExecutionState == Windows.ApplicationModel.Activation.ApplicationExecutionState.running ||
                args.detail.detail[0].previousExecutionState == Windows.ApplicationModel.Activation.ApplicationExecutionState.suspended)) {
                sap.FioriClient.handleOpenURL(function () {
                }, protocolUrl);
                protocolUrl = null;
            }
        }
    }

    function afterProcess() {
        sap.AttachmentViewer.FileCleaner.cleanFolder("downloads");
        i18nBundle.load(function () {
            addToolBarEvents();
            handleChangeFioriClientEvent();
            handlePauseResume();
            handleNetworkConnectivityChanges();

            if (protocolUrl != null) {
                sap.FioriClient.handleOpenURL(function () {
                }, protocolUrl);
                protocolUrl = null;
            }
        });
    }

    function isNotNullOrUndefined(object) {
        return object != null && typeof object != "undefined";
    }

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };


    app.start();

    function handleChangeFioriClientEvent() {

        handleEvent('fioriurl_initial_set', function (event) {
            logMessage("fioriurl_initial_set invoked", "DEBUG", "debug");
            fioriUrl = event.data.url;
            if (event.data.usebrowserinstead && event.data.usebrowserinstead == true) {
                useBrowserInstead = true;
            }
            if (event.data.skipheadrequest && event.data.skipheadrequest == true) {
                skipHeadRequest = true;
            }
            sap.FioriClient.getIdpLogonURL(function (idp) {
                idpUrl = idp;
                // load mime types. Needed for attachment handling.
                mimeExtensionsTable.load("ms-appx:///www/mimeTypes.json", function () {
                    loadingLabel.innerHTML = i18nBundle.get('loading_the_page', 'Loading Fiori');
                    navigateToUrl(event.data.url, event.data.smpRegContext, true);
                });

            });
        });

        handleEvent('fioriurl_changed', function (event) {
            if (!WinJS.Utilities.isPhone) {
                showMessage(i18nBundle.get('fiori_url_changed', 'Fiori URL changed'), 'short');
                navigateToUrl(event.data.url, null, true);
            }
            urlChanged = true;
            logMessage("Fiori url changed", "DEBUG", "User");
        });

        handleEvent('showLogScreen', function (event) {
            logMessage("Show Log", "DEBUG", "User");
            var logDiv = document.getElementById("logSection");
            logDiv.innerHTML = '';
            WinJS.UI.Pages.render("/www/pages/log/log.html", logDiv);
        });

        handleEvent('exitLogScreen', function (event) {
            logMessage("Exit Log", "DEBUG", "User");
            var logScreen = document.getElementById("logSection");
            var webviewScreen = document.getElementById("content-section");

            transition(webviewScreen, logScreen);
            logScreen.innerHTML = '';
            setAppbarVisibility(true);
        });

        // event raised from fioriclient.js when user taps the reset app settings button.
        // or if there is a logon error.
        handleEvent('resetSettings', function (event) {
            logMessage("Reset Application Settings", "DEBUG", "User");

            function resetWebviewCookies() {
                // need to clear the cookies especially when SMP is not used.
                clearWebviewCookies(fioriUrl);
                clearCookiesForUrlsInHistory();
            }

            resetWebviewCookies(); // clear webview cookies.
            //Clear the authentication header
            document.execCommand("ClearAuthenticationCache");
            setTimeout(function () {
                window.location.reload(true);
            }, 1000);
        });
    }

    function addToolBarEvents() {

        handleEvent('view_log_btn_clicked', function (event) {
            logMessage("view log", "debug", "USER");
            var logScreen = document.getElementById("logSection");
            var webviewScreen = document.getElementById("content-section");

            setAppbarVisibility(false);
            transition(logScreen, webviewScreen);

            logMessage("Show Log", "DEBUG", "User");
            var logDiv = document.getElementById("logSection");
            logDiv.innerHTML = '';
            WinJS.UI.Pages.render("/www/pages/log/log.html", logDiv);

            if (WinJS.Utilities.isPhone) {
                WinJS.Application.onbackclick = function (event) {

                    // re-instate the function.
                    WinJS.Application.onbackclick = onBackClick;
                    exitLogScreen();
                    return true;
                };
            }
        });

        handleEvent('help_btn_clicked', function (event) {
            logMessage("Help", "DEBUG", "User");
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(FIORI_HELP_URL));
        });

        // Add back button.
        if (!WinJS.Utilities.isPhone) {
            handleEvent('back_btn_clicked', function (event) {
                logMessage("Back", "DEBUG", "User");
                onBackClick(event);
            });
        }

        handleEvent('home_btn_clicked', function (event) {
            logMessage("Home", "DEBUG", "User");
            if (typeof sap.AppPreferences !== "undefined" && sap.AppPreferences != null) {
                sap.AppPreferences.getPreferenceValue('fioriUrl', function (result) {
                    //TODO: do I need to save the smp reg context? Probably not, since the session and cookies are already set.
                    navigateToUrl(result);
                });
            }
        });

        handleEvent('refresh_btn_clicked', function (event) {
            logMessage("Reload", "DEBUG", "User");
            var reloaded = reloadIfErrorPage();
            if (!reloaded) {
                // We are not on an error page so just simply refresh the webView.
                setAppbarVisibility(false);
                webView.refresh();
            }
        });

        handleEvent('print_btn_clicked', function (event) {
            window.Printer.registerForPrintContract();
            window.Printer.print(null, ["printQuality"]);
        });

        try {
            Windows.Graphics.Printing.StandardPrintTaskOptions.colorMode;//check(phone 8.1 does not support Printing )
            framePrintButton = getAppbar().winControl.getCommandById('print');
        } catch (namespaceEx) {
            console.log("Print not supported");
        } //if namespace check fails, we do not put the print button, but it's DC exception in any other perspectives
    }

    function navigateToUrl(url, smpRegContext, addFioriHeader) {
        setAppbarVisibility(false);
        contentSection.style.display = 'none';
        urlSection.className = 'xxsmall';
        var uri;
        try {
            uri = new Windows.Foundation.Uri(url);
            //urlSection.textContent = "(" + uri.host + ")";
        }
        catch (e) {
            // error ... just dont update the layout
        }

        /** Remove after MAF updates logon core to sync the cookie stores after registration **/
        uri = new Windows.Foundation.Uri(url);
        var request = new Windows.Web.Http.HttpRequestMessage(Windows.Web.Http.HttpMethod.get, uri);

        if (smpRegContext != null && smpRegContext.applicationConnectionId != null) {
            var filter = new Windows.Web.Http.Filters.HttpBaseProtocolFilter();

            // If cookie exists, setting a cookie results in a Runtime exception - operation identifier is invalid.
            if (!cookieExists(filter.cookieManager.getCookies(uri), "X-SMP-APPCID")) {
                var cookie = new Windows.Web.Http.HttpCookie("X-SMP-APPCID", uri.host, "/");
                cookie.value = smpRegContext.applicationConnectionId;
                filter.cookieManager.setCookie(cookie);
            }
        }

        /** **/

        /* There is no way of catching a BASIC auth challenge in a webview.
		Adding it pre-emptively is one option; but not recommended.
		For now, let the user enter the username / password.
		var username = "vishal";
		var password = "mobile";
		var buffer = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(username + ":" + password, Windows.Security.Cryptography.BinaryStringEncoding.Utf16LE);
		var base64token = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);

		request.headers.authorization = new Windows.Web.Http.Headers.HttpCredentialsHeaderValue("BASIC", base64token);
		*/

        if (addFioriHeader) {
            request.headers.append('User-Agent', navigator.userAgent + ' SAPFioriClient/' + getVersionNumber(false));
        }

        // Certificate workaround on phone
        // https://support.wdf.sap.corp/sap/support/message/1570147017
        if (WinJS.Utilities.isPhone && !skipHeadRequest) {
            var client = new Windows.Web.Http.HttpClient();
            transition(progressSection, contentSection);
            logMessage("Navigation workaround (certificate)", "DEBUG", "debug");

            // Create a HTTP head request based on the actual request and copy the headers.
            var headRequest = new Windows.Web.Http.HttpRequestMessage(Windows.Web.Http.HttpMethod.head, request.requestUri);
            var headerIterator = request.headers.first();
            while (headerIterator.hasCurrent) {
                headRequest.headers.append(headerIterator.current.key, headerIterator.current.value);
                headerIterator.moveNext();
            }

            client.sendRequestAsync(headRequest).done(
				function (response) {
				    logMessage(response, "DEBUG", "debug");
				    webView.navigateWithHttpRequestMessage(request);
				}, function (error) {
				    logMessage(JSON.stringify(error), "DEBUG", "debug");
				    webView.navigateWithHttpRequestMessage(request);
				}
			);
        } else {
            webView.navigateWithHttpRequestMessage(request);
        }
    }

    function getSSLErrorMessage(event) {
        var errorStatus = event.webErrorStatus;
        var certErrorText = "Err_Type_ServerCertificateInvalid";
        if (!event.isTrusted) {
            certErrorText = "Err_Type_ServerCertificateNotTrust";
        }

        switch (errorStatus) {
            case Windows.Web.WebErrorStatus.certificateContainsErrors:
                {
                    certErrorText = "The server certificate contains errors.";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateCommonNameIsIncorrect:
                {
                    certErrorText = "Err_Type_ServerCertificateCommonNameDoesNotMatchURL";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateExpired:
                {
                    certErrorText = "Err_Type_ServerCertificateExpired";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateIsInvalid:
                {
                    certErrorText = "Err_Type_ServerCertificateInvalid";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateRevoked: {
                certErrorText = "Err_Type_ServerCertificateRevoked";

                break;
            }
            default: {
                break;
            }
        }
        return certErrorText;
    }
    function getSSLErrorType(event) {
        var errorStatus = event.webErrorStatus;
        var certErrorText = null;
        if (!event.isTrusted) {
            certErrorText = "Err_Type_ServerCertificateNotTrust";
        }

        switch (errorStatus) {
            case Windows.Web.WebErrorStatus.certificateContainsErrors:
                {
                    certErrorText = "The server certificate contains errors.";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateCommonNameIsIncorrect:
                {
                    certErrorText = "Err_Type_ServerCertificateCommonNameDoesNotMatchURL";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateExpired:
                {
                    certErrorText = "THe certificate has expired.";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateIsInvalid:
                {
                    certErrorText = "The certificate is not valid. Further details are not available.";
                    break;
                }
            case Windows.Web.WebErrorStatus.certificateRevoked: {
                certErrorText = "The certificate has been revoked.";

                break;
            }
            default: {
                break;
            }
        }
        return certErrorText;
    }

    function cookieExists(cookies, cookieName) {
        for (var i = 0; i < cookies.size; i++) {
            var cookie = cookies.getAt(i);
            if (cookie.name === cookieName) {
                return true;
            }
        }
        return false;
    }

    function getOptionalPlugins(success, error) {
        if (optionalPlugins) {
            success(optionalPlugins);
        } else {
            readJSONFile(
                OPTIONAL_PLUGINS_FILE,
                function (result) {
                    optionalPlugins = result.plugins;
                    success(optionalPlugins);
                },
                error
            );
        }
    }

    function getWhiteListedURLs(success, error) {
        if (whiteListedUrls) {
            success(whiteListedUrls);
        } else {
            sap.Settings.getWhiteList(function (result) {
                whiteListedUrls = result;
                success(whiteListedUrls);
            }, function (error) {
                error(result);
            })

        }
    }

    function setupWebview() {
        //noBridge functionality, TODO error handling
        webView.addEventListener("MSWebViewContentLoading", function (event) {
            getOptionalPlugins(function (plugins) {
                getWhiteListedURLs(function (urls) {
                    if (!isUrlWhiteListed(event.uri, fioriUrl, idpUrl, urls)) {
                        sap.Settings.invalidatePlugins(function (result) {
                            pluginsInvalidated = true;
                            console.log(result);
                        }, function (error) {
                            console.log(error);
                        }, plugins);
                    } else if (pluginsInvalidated) {
                        sap.Settings.validatePlugins(function (result) {
                            fireEvent("revalidation");
                            pluginsInvalidated = false;
                            console.log(result);
                        }, function (error) {
                            console.log(error);
                        }, plugins);
                    }
                }, function (whitelist_error) { });
            }, function (plugins_error) { });
        });

        webView.addEventListener("MSWebViewNavigationCompleted", function (event) {
            // stop the progress bar.
            transition(contentSection, progressSection);
            //	setAppbarVisibility(true);

            if (!event.isSuccess) {
                webView.stop();

                var sslError = getSSLErrorType(event);
                logMessage('SSL Error navigating to : ' + event.uri + ';SSL Error=' + sslError, 'ERROR', 'Init');
                if (sslError != null) {
                    var encodedUrl = "ms-appx-web:///www/CertificateErrorPage.html?fioriUrl=Homepage" +
                                    "&" + "failingUrl=" + encodeURIComponent(event.uri) +
                                    "&" + "errorType=" + encodeURIComponent(sslError);

                    webView.navigate(encodedUrl);
                }
                else {
                    var displayErrorPage = function (result) {
                        logMessage('Error navigating to : ' + event.uri, 'ERROR', 'Init');
                        var errorPage = ERROR_PAGE;
                        if (result) {
                            errorPage = ERROR_PAGE + "?" + result;
                        }
                        webView.navigate(errorPage);
                    };
                    // this preference is set by fioriclient.js.
                    if (typeof sap.AppPreferences !== "undefined" && sap.AppPreferences != null) {
                        sap.AppPreferences.getPreferenceValue('nonetwork', function (result) {
                            if (!result) {
                                displayErrorPage(null);
                            }
                            else {
                                displayErrorPage("nonetwork=true");
                            }
                        },
                        function (error) {
                            displayErrorPage(null);
                        });
                    }
                }

                var appBar = getAppbar();

                if (appBar) {
                    setAppbarVisibility(true);
                    appBar.winControl.open();
                }
            } else {
                logMessage('Navigation successful', 'DEBUG', 'Init');
            }

            setAppbarVisibility(true);
        });

        webView.addEventListener("MSWebViewNavigationStarting", function (event) {
            if (isErrorPage(event.uri) && !isErrorPage(webView.src) && backClicked) {
                event.stopPropagation();
                onBackClick();
            }
            else if (typeof sap.AppPreferences !== "undefined" && sap.AppPreferences != null) {
                var url = sap.AppPreferences.getPreferenceValue('fioriUrl', function (url) {
                    progressSection.style.display = "inline";
                    contentSection.style.display = "none";
                });
            }
            backClicked = false;
        });

        webView.addEventListener("MSWebViewDOMContentLoaded", function (event) {
            if (event.uri.indexOf("ms-appx", 0) != 0) {
                // non-local-urls.
                var webView = document.getElementById('webView');

                webView.invokeScriptAsync("eval", injectWin10NavigatorShim).start();
                webView.invokeScriptAsync("eval", injectWin10SecurityShim).start();
                console.log("Loaded Windows 10 shims for url : " + event.uri);

                MSApp.execUnsafeLocalFunction(function () {
                    //injectPluginSamples();
                    webView.invokeScriptAsync("eval", injectBridgeIframe).start();
                    webView.invokeScriptAsync("eval", injectBridgeShims).start();
                    if (useBrowserInstead) {
                        webView.invokeScriptAsync("eval", injectUseBrowserInstead).start();
                    }
                    console.log("Loaded Cordova API shims for url : " + event.uri);
                });
            }
        });
    }

    // Returns the appbar element directly. 
    // It is used to hide the appbar and to show/hide the Print button.
    function getAppbar() {
        return document.getElementById(APPBAR_SECTION_ID) || null;
    }

    function setAppbarVisibility(visible) {
        var appBar = getAppbar();

        if (appBar) {
            appBar.hidden = !visible;

            if (visible) {
                appBar.focus();
                webView.focus();
            }
            // WinJS AppBar covers the bottom of the page (here, the fullscreen webview) by default
            // Make the webview smaller by the appbar's height to prevent this
            var toolbarHeight = appBar.clientHeight;
            if (appBar.winControl._isOpenedMode) {
                toolbarHeight = appBar.winControl._cachedClosedHeight;
            }
            contentSection.style.marginBottom = toolbarHeight - 1 + "px";
        }
    }

    function injectPluginSamples() {
        var commonSampleScript = "function getContainer(callback) {var container = document.getElementById('SAMPLE_CONTAINER'); if (!container) {container = document.createElement('DIV'); container.id = 'SAMPLE_CONTAINER'; container.style.zIndex = 1001; container.style.position = 'absolute'; container.style.backgroundColor = 'olive'; container.style.width = '600px'; if (document.body.childNodes.length > 0) {document.body.insertBefore(container, document.body.childNodes[0]); } else {document.body.appendChild(container); } } callback(container); } function addButton(id, label, clickFunction) {getContainer(function(container) {var button = document.createElement('BUTTON'); var buttonText = document.createTextNode(label); button.id = id; button.onclick = clickFunction; button.appendChild(buttonText); container.appendChild(button); }); } function addDiv(id) {getContainer(function(container) {var div = document.createElement('DIV'); div.id = id; div.style.marginTop = '20px'; div.style.minHeight = '100px'; div.style.backgroundColor = 'yellow'; div.style.color = 'red'; container.appendChild(div); }); } function showResult(resultDivId, result) {document.getElementById(resultDivId).innerHTML = JSON.stringify(result); } function showError(resultDivId, error) {document.getElementById(resultDivId).innerHTML = 'Unexpected error: ' + JSON.stringify(error); }";
        var barcodescannerSampleScript = "function plugintest_barcodescanner_scan() {cordova.plugins.barcodeScanner.scan(function (result) {showResult('scanResults', result); }, function (error) {showError('scanResults', error); }); } addButton('TEST_BARCODESCANNER_SCAN', 'TEST_BARCODESCANNER_SCAN', plugintest_barcodescanner_scan); addDiv('scanResults');";
        var cameraSampleScript = "function plugintest_camera_getPicture() {navigator.camera.getPicture(function (result) {showResult('getPictureResults', plugintest_camera_getOptions()); }, function (error) {showError('getPictureResults', error); }, plugintest_camera_getOptions()); } function plugintest_camera_cleanup() {navigator.camera.cleanup(function (result) {showResult('cleanupResults', result); }, function (error) {showError('cleanupResults', error); }); } function plugintest_camera_getOptions() {return {quality: 100, destinationType: Camera.DestinationType.FILE_URI, sourceType: Camera.PictureSourceType.CAMERA, allowEdit: false, encodingType: Camera.EncodingType.JPEG, targetWidth: null, targetHeight: null, mediaType: Camera.MediaType.PICTURE, correctOrientation: true, saveToPhotoAlbum: true, popoverOptions: new CameraPopoverOptions(), cameraDirection: Camera.Direction.BACK }; } addButton('TEST_CAMERA_GETPICTURES', 'TEST_CAMERA_GETPICTURES', plugintest_camera_getPicture); addButton('TEST_CAMERA_CLEANUP', 'TEST_CAMERA_CLEANUP', plugintest_camera_cleanup); addDiv('getPictureResults'); addDiv('cleanupResults');";
        var geoSampleScript = "var watchID = null; function plugintest_geo_getposition() {navigator.geolocation.getCurrentPosition(function (result) {showResult('getCurrentPositionResults', result); }, function (error) {showError('getCurrentPositionResults', error); }, plugintest_geo_getOptions()); } function plugintest_geo_watch() {document.getElementById('TEST_GEO_WATCH').disabled = true; document.getElementById('TEST_GEO_CLEARWATCH').disabled = false; watchID = navigator.geolocation.watchPosition(function (result) { showResult('watchPostionResults', result); }, function (error) { showError('watchPostionResults', error); }, plugintest_geo_getOptions()); } function plugintest_geo_clearWatch() {document.getElementById('TEST_GEO_WATCH').disabled = false; document.getElementById('TEST_GEO_CLEARWATCH').disabled = true; if (watchID != null) {navigator.geolocation.clearWatch(watchID); watchID = null; } } function plugintest_geo_getOptions() {return { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }; } addButton('TEST_GEO_GETPOSITION', 'TEST_GEO_GETPOSITION', plugintest_geo_getposition); addButton('TEST_GEO_WATCH', 'TEST_GEO_WATCH', plugintest_geo_watch); addButton('TEST_GEO_CLEARWATCH', 'TEST_GEO_CLEARWATCH', plugintest_geo_clearWatch); addDiv('getCurrentPositionResults'); addDiv('watchPostionResults');";
        var settingsSampleScript = "function plugintest_settings_isFeatureEnabled(pluginName) {sap.Settings.isFeatureEnabled(pluginName, function (result) {showResult('settings_isfeatureenabled_Results', 'FEATURE ENABLED: ' + result); }, function (error) {showError('settings_isfeatureenabled_Results', error); }); } addButton('TEST_SETTINGS_ISFEATUREENABLED_ENABLED', 'TEST_SETTINGS_ISFEATUREENABLED_ENABLED', function() { plugintest_settings_isFeatureEnabled('sap.me.BarcodeScanner') }); addButton('TEST_SETTINGS_ISFEATUREENABLED_NOTENABLED', 'TEST_SETTINGS_ISFEATUREENABLED_NOTENABLED', function() { plugintest_settings_isFeatureEnabled('itsnotanenabledplugin') });addDiv('settings_settingsDone_Results');addDiv('settings_isfeatureenabled_Results');document.addEventListener('settingsDone', function() { document.getElementById('settings_settingsDone_Results').innerHTML = 'SETTINGS DONE FIRED'; });console.log('SETTINGS_COMPLETED_EVENTHANDLER_ADDED');";

        //var script = commonSampleScript + geoSampleScript;
        var script = commonSampleScript + cameraSampleScript;
        //var script = commonSampleScript + barcodescannerSampleScript;
        //var script = commonSampleScript + settingsSampleScript;

        document.getElementById("webView").invokeScriptAsync("eval", script).start();
    }

    function handleBackButton() {
        var systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
        systemNavigationManager.addEventListener("backrequested", onBackClick);
    }

    /* Handle hardware back button on WP8.1 */
    /* does not apply to Win 8.1 */
    function onBackClick(event) {
        var webview = document.getElementById('webView');
        if (typeof webview !== "undefined" && webview.canGoBack) {
            backClicked = true;
            webview.goBack();
            event.handled = true;
        }
    }

    /* Workaround for clearing the cookies after restart. We are tracking all urls visited by the InAppBrowser
    */
    function addIabListener() {
        handleEvent("loadstop", function (event) {
            if (event && event.url) {
                try {
                    var url = new Windows.Foundation.Uri(event.url);
                    if (url.schemeName.indexOf("ms-appx") < 0) { // no local urls.
                        var urlString = url.schemeName + "://" + url.host;
                        addToUrlHistory(urlString);
                    }
                }
                catch (e) {
                    // ignore.
                    logMessage("error processing loadStop due to: " + e, "WARN", "Init");
                }
            }
        });
    }

    function addToUrlHistory(url) {
        if (urlHistory.indexOf(url) < 0) {
            urlHistory.push(url);
        }
    }

    //clears cookies for all urls in the history. remove after windows webview supports a function to delete all cookies. 
    function clearCookiesForUrlsInHistory() {
        for (var i = 0; i < urlHistory.length; i++) {
            clearWebviewCookies(urlHistory[i]);
        }
        urlHistory = new Array(); // reinitialize.
    }

    /* 
    Attempts to reload the page if we have hit an error page.
    Returns - true if the error page is visible and navigates to fiori URL
            - false otherwise
   */
    function reloadIfErrorPage() {
        if (isWebViewVisible() && isErrorPage(webView.src) && fioriUrl) {
            logMessage("Attempting to reload the url", "DEBUG", "Debug");
            showMessage(i18nBundle.get('loading_the_page', 'Loading'));
            navigateToUrl(fioriUrl);
            return true;
        }
        window.sap.Toolbar.show();
        return false;
    }

    function isErrorPage(url) {
        try {
            var uri = new Windows.Foundation.Uri(url);
            if (uri) {
                var tmp = uri.schemeName + "://" + uri.path;
                return tmp === ERROR_PAGE;
            }
            return false;
        }
        catch (e) {
            return false;
        }

    }

    function handlePauseResume() {

        handleEvent("onSapResumeSuccess", function () {
            logMessage("Resume success", "DEBUG", "debug");
            // display webview section on resume. Unless we were already on progress section.
            displaySectionsOnResume();

            if (protocolUrl != null) {
                sap.FioriClient.handleOpenURL(function () {
                }, protocolUrl);
                protocolUrl = null;
            }
        });

        handleEvent("onSapResumeError", function () {
            logMessage("Resume error", "DEBUG", "debug");
            displaySectionsOnResume();
        });

        document.addEventListener("resume", function () {
            logMessage("App resumed", "DEBUG", "debug");
            reloadIfErrorPage();
            var settingsSection = document.getElementById("settings-section");
            //In case of Phone the Settings page covers the whole screen so the appbar should not be displayed to prevent to show the Setting page twice
            if (settingsSection && settingsSection.style && settingsSection.style.display != "none") {
                setAppbarVisibility(false);
            } else {
                setAppbarVisibility(true);
            }
        });

        document.addEventListener("pause", function () {
            logMessage("App suspended", "DEBUG", "debug");
            // app being suspended
            setAppbarVisibility(false);
        });
    }

    function isWebViewVisible() {
        if (contentSection && contentSection.style && contentSection.style.display != "none") {
            return true;
        }
        return false;
    }

    function displaySectionsOnResume() {
        if (progressSection && progressSection.style && progressSection.style.display != "none") {
            // if progress is shown; dont change.
            // dont show appbar yet. Appbar will be displayed when the navigation completes.
        }
        else {
            if (WinJS.Utilities.isPhone) {
                // close the settings view.
                var settingsSection = document.getElementById("settings-section");
                if (settingsSection) {
                    settingsSection.style.display = "none";
                }
            }
            contentSection.style.display = "block";
            logSection.style.display = "none";
            progressSection.style.display = "none";
            setAppbarVisibility(true);
        }
    }

    var wasOffline = false;
    function handleNetworkConnectivityChanges() {
        document.addEventListener("offline", function () {
            showMessage(i18nBundle.get('network_connectivity_lost', 'Network connectivity lost. Please check your connection.'), "long");
            wasOffline = true;
        });

        document.addEventListener("online", function () {
            if (wasOffline) {
                showMessage(i18nBundle.get('network_connectivty_restored', 'Network connectivity restored.'), "short");
                wasOffline = false;
            }
        });
    }

    document.addEventListener('deviceready', function () {
        sap.AppPreferences.getPreferenceValue('logLevel', function (level) {
            sap.Logger.setLogLevel(level ? level : sap.Logger.ERROR);
        }, function (error) {
            console.log('ERROR - getPreferenceValue, logLevel: ' + error.message);
        });
        afterProcess();
    }, false);

})();