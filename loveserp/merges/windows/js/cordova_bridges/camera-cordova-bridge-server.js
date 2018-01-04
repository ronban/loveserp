/* Injects this script into the webview in www/index.html */

navigator.camera = {};

var getPictureCommand = new CordovaBridgeCommand('getPictureEvent');

navigator.camera.DestinationType = {
    DATA_URL: 0,      // Return image as base64-encoded string
    FILE_URI: 1,      // Return image file URI
    NATIVE_URI: 2     // Return image native URI (e.g., assets-library:// on iOS or content:// on Android)
};navigator.camera.PictureSourceType = {
    PHOTOLIBRARY: 0,
    CAMERA: 1,
    SAVEDPHOTOALBUM: 2
};navigator.camera.MediaType = {
    PICTURE: 0,    // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,      // allow selection of video only, WILL ALWAYS RETURN FILE_URI
    ALLMEDIA: 2   // allow selection from all media types};navigator.camera.EncodingType = {
    JPEG: 0,               // Return JPEG encoded image
    PNG: 1                 // Return PNG encoded image
};
navigator.camera.Direction = {
    BACK: 0,      // Use the back-facing camera
    FRONT: 1      // Use the front-facing camera
};
/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=FILE_URI.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
navigator.camera.getPicture = function (successCallback, errorCallback, options) {
	console.log('Server bridge: navigator.camera.getPicture');
	getPictureCommand.addQueryParameter({ options: JSON.stringify(options)});
	getPictureCommand.execute(successCallback, errorCallback);
};

var cleanupCommand = new CordovaBridgeCommand('cleanupEvent');

/**
 * @param {Function} successCallback
 * @param {Function} errorCallback
 */
navigator.camera.cleanup = function (successCallback, errorCallback) {
	console.debug('Server bridge: navigator.camera.cleanup');
	cleanupCommand.execute(successCallback, errorCallback);
};

// Copied from CameraPopoverOptions.js
/**
 * Encapsulates options for iOS Popover image picker
 */
var CameraPopoverOptions = function (x, y, width, height, arrowDir) {
	// information of rectangle that popover should be anchored to
	this.x = x || 0;
	this.y = y || 32;
	this.width = width || 320;
	this.height = height || 480;
	// The direction of the popover arrow
	this.arrowDir = arrowDir || Camera.PopoverArrowDirection.ARROW_ANY;
};

onCordovaBridgeLoaded('navigator.camera');