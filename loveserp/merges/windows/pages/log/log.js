// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/www/pages/log/log.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
        	if (WinJS.Utilities.isPhone) {
        		header.style.display = 'none';
        	} else {
        		backButton.disabled = false;
        		backButton.addEventListener("click", close, false);
        	}

        	WinJS.Binding.processAll(document.body, {
        		email_log: i18nBundle.get('email_log', 'Email Log')
        	});

        	this.refreshLogList();
        	sendLogViaEmailButton.addEventListener('click', this.emailLog, false);
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in layout.
        },

        refreshLogList: function () {
        	sap.Logger.getFormattedLog(function (formattedLog) {
        		if (formattedLog === '') {
        			logContainerDiv.innerHTML = i18nBundle.get('no_entries_in_log', 'No entries in the log');
        		} else {
        			logContainerDiv.innerHTML = window.toStaticHTML('<table>' + formattedLog + '</table>');
        		}
        	}, this.handleError);
        },

        emailLog: function () {
        	sap.Logger.emailLog(null, 'SAP Fiori Client Log', null, function () { }, this.handleError);
        },

        handleError: function (error) {
        	logContainerDiv.innerHTML += 'An unexpected error has occured.';
        }
    });

    function close() {    	    	
    	exitLogScreen();
    }
})();