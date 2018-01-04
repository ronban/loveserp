// 3.15.8
var exec = require('cordova/exec');

/**
 * Used to indicate when the app is busy doing something.  It uses the default indeterminite progress indicator
 * for the platorm.
 * 
 * @namespace
 * @alias Online
 * @memberof sap
 */
module.exports = {
    /**
     * Show the busy indicator.
     * @example
     * sap.Online.showBusyIndicator();
     */
    showBusyIndicator: function () {
        exec(null, null, 'Online', 'showBusyIndicator', []);
    },

    /**
     * Hide the busy indicator.
     * @example
     * sap.Online.hideBusyIndicator();
     */
    hideBusyIndicator: function () {
        exec(null, null, 'Online', 'hideBusyIndicator', []);
    }
};
