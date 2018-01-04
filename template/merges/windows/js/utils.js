function fireEvent(eventType, eventData) {
    logMessage("Fired " + eventType, "debug", "EVENT");
    WinJS.Application.queueEvent({ type: eventType, data: eventData });
}

function handleEvent(eventType, handleFunction) {
    logMessage("Handled " + eventType, "debug", "EVENT");
    WinJS.Application.addEventListener(eventType, handleFunction);
}

var SHORT_TIME = 2000; // 2 second
var LONG_TIME = 4000; // 4 second.
function displayNotification(message, duration) {
    var notifications = Windows.UI.Notifications;
    var template = notifications.ToastTemplateType.toastText01;
    var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);

    var toastTextElements = toastXml.getElementsByTagName("text");
    toastTextElements[0].appendChild(toastXml.createTextNode(message));
    var toast = new notifications.ToastNotification(toastXml);
    var toastNotifier = notifications.ToastNotificationManager.createToastNotifier();

    var toastNode = toastXml.selectSingleNode("/toast");
    toastNode.setAttribute("duration", duration);

    toastNotifier.show(toast);

    var time = SHORT_TIME;
    if (duration != null && duration === "long") {
        time = LONG_TIME;
    }

    setTimeout(function () {
        toastNotifier.hide(toast);
    }, time);
}

function showMessage(message, duration) {
    var messageDiv = document.createElement('div');
    messageDiv.id = 'messageDiv';
    messageDiv.className = 'messageClass';

    messageDiv.innerText = message;

    messageDiv.style.opacity = '0';
    document.body.appendChild(messageDiv);
    WinJS.UI.Animation.fadeIn(messageDiv);

    var time = SHORT_TIME;
    if (duration != null && duration === "long") {
        time = LONG_TIME;
    }

    setTimeout(function () {
        WinJS.UI.Animation.fadeOut(messageDiv);
        document.body.removeChild(messageDiv);
    }, time);
}

/**
 * Utility function to log messages. Logs messages to the sap.Logger if available.
 * if not, logs to console
 */
function logMessage(message, severity, tag) {
    if (sap.Logger) {
        if (severity && severity.toLowerCase() === "info") {
            sap.Logger.info(message, tag);
        }
        else if (severity && severity.toLowerCase() === "error") {
            sap.Logger.error(message, tag);
        }
        else if (severity && severity.toLowerCase() === "warn") {
            sap.Logger.warn(message, tag);
        }
        else if (severity && severity.toLowerCase() === "debug") {
            sap.Logger.debug(message, tag);
        }
    }
    else {
        console.log(message);
    }
}

/**
 * Utility function to clear webview cookies for a certain url. 
 * windows 8.1 lacks a function to clear all cookies. Revisit in Windows 10
 */
function clearWebviewCookies(url) {
    if (url) {
        try {
            var resourceAddress = new Windows.Foundation.Uri(url);
            var filter = new Windows.Web.Http.Filters.HttpBaseProtocolFilter();
            var cookieCollection = filter.cookieManager.getCookies(resourceAddress);

            cookieCollection.forEach(function (value, index, traversedObject) {
                filter.cookieManager.deleteCookie(value);
            });
        }
        catch (e) {
            logMessage("Error deleting all cookies due to: " + e.toString(), "ERROR", "Reset");
        }
    }
}

/**
 * Utility method to compare urls.
 */
var compareUrls = function (url1, url2) {
    if (!url1 || !url2)
        return false;
    return url1 === url2;
};

/**
 * Utility method which returns with the domain of the given url.
 */
function getDomain(url) {
    if (!url || url === "")
        return null;

    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];
    domain = domain.split('?')[0];
    domain = domain.replace(/^www\./, "");

    return domain;
}
/**
 * Utility method which can decide if the url has plugin permisson or not.
 */
var isUrlWhiteListed = function (uri, fioriUrl, idpUrl, whiteListedUrls) {
    if (compareUrls(getDomain(fioriUrl), getDomain(uri))) {
        return true;
    } else if (compareUrls(getDomain(idpUrl), getDomain(uri))) {
        return true;
    } else if (uri.toLowerCase().indexOf(("ms-appx-web://" + Windows.ApplicationModel.Package.current.id.name + "/www/CannotReachHost.html").toLowerCase()) > -1) {
        return true;
    } else if (uri.toLowerCase().indexOf(("ms-appx-web://" + Windows.ApplicationModel.Package.current.id.name + "/www/CertificateErrorPage.html").toLowerCase()) > -1) {
        return true;
    } else if (whiteListedUrls) {
        for (var i = 0; i < whiteListedUrls.length; i++) {
            if(whiteListedUrls[i] == "*") {
                return true;
            } else if (whiteListedUrls[i].startsWith("*") && new RegExp("(.*)(\." + whiteListedUrls[i].substring(1, whiteListedUrls[i].length) + ")").test(uri)) {
                return true;
            } else if (compareUrls(getDomain(whiteListedUrls[i]), getDomain(uri))) {
                return true;
            }
        }
    }
    return false;
};

var readJSONFile = function (fileName, success, fail) {
    var uri = new Windows.Foundation.Uri("ms-appx:///www/" + fileName);
    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).done(
        function (file) {
            WinJS.xhr({ url: uri.toString() }).done(function (response) {
                success(JSON.parse(response.responseText));
            }, function (error) {
                fail(error);
            });

        },
        function (error) {
            // error accessing file.
            console.log("error accessing: " + fileName);
            fail(error);
        }
  );
};