// The following code is created by using code from the following two software components:
/*
    Logic of decoding barcode is from phonegap-barcode scanner plugin. https://github.com/phonegap/phonegap-plugin-barcodescanner
    Displaying the camera preview and handling orientation changes are from the Microsoft CameraStarterKit sample application. https://github.com/Microsoft/Windows-universal-samples/tree/master/Samples/CameraStarterKit
*/


// License for PhoneGap barcode scanner plugin
/*
*********************************************************

    The MIT License
    Copyright (c) 2010 Matt Kane
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*********************************************************
*/


//License for Microsoft CameraStarterKit sample application:
/*********************************************************

    Copyright (c) Microsoft. All rights reserved.
    his code is licensed under the MIT License (MIT).
    THIS CODE IS PROVIDED *AS IS* WITHOUT WARRANTY OF
    ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY
    IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR
    PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.

*********************************************************
*/

var
    width,
    height,
    raiseSuccess,
    raiseError,
    overlay = null,
    numberOfCamera = 1,
    cameraDirection = 2, //this is the rear camera
    isFlashEnabled = true,
    isSwitchCameraEnabled = true;

// Information about the camera device
var externalCamera = false,
    mirroringPreview = false;

var previewVidTag;

var Capture = Windows.Media.Capture;
var DeviceInformation = Windows.Devices.Enumeration.DeviceInformation;
var DeviceClass = Windows.Devices.Enumeration.DeviceClass;
var DisplayOrientations = Windows.Graphics.Display.DisplayOrientations;
var Media = Windows.Media;
var SimpleOrientation = Windows.Devices.Sensors.SimpleOrientation;
var SimpleOrientationSensor = Windows.Devices.Sensors.SimpleOrientationSensor;

// Receive notifications about rotation of the device and UI and apply any necessary rotation to the preview stream and UI controls
var oOrientationSensor = SimpleOrientationSensor.getDefault(),
    oDisplayInformation = Windows.Graphics.Display.DisplayInformation.getForCurrentView(),
    oDeviceOrientation = SimpleOrientation.notRotated;

// Prevent the screen from sleeping while the camera is running
var oDisplayRequest = new Windows.System.Display.DisplayRequest();

// For listening to media property changes
var oSystemMediaControls = Media.SystemMediaTransportControls.getForCurrentView();

// MediaCapture and its state variables
var oMediaCapture = null,
    isInitialized = false,
    isPreviewing = false;

// Rotation metadata to apply to the preview stream (MF_MT_VIDEO_ROTATION)
var RotationKey = "C380465D-2271-428C-9B83-ECEA3B4A85C1";

var isPhone = WinJS.Utilities.isPhone || (navigator.userAgent.indexOf("Windows Phone") > -1);

// Helper calss to wrap the functions to decode a barcode
var BarcodeDecoder = function () {
    var self = this;

    var zxing;
    var isZxingInit = false;

    this.isCancelled = false;
    this.scanning = false;

    this.init = function () {
        console.log('- Creating ZXing instance...');
        if (!self.isZxingInit) {
            console.log('- ZXing instance has been created!');
            self.isZxingInit = true;
            self.zxing = new ZXing.BarcodeReader();
            self.zxing.autoRotate = true;
        } else {
            console.log('- ZXing instance has been recovered!');
        }
    };

    this.scan = function () {
        scanning = true;
        self.scanBarcodeAsync();
    };

    this.scanBarcodeAsync = function () {
        // Shortcuts for namespaces
        // *******************************
        // Code used from Phonegap BEGIN
        // *******************************
        var Imaging = Windows.Graphics.Imaging;
        var Streams = Windows.Storage.Streams;
        if (!barcodeDecoder.isCancelled && typeof oMediaCapture !== "undefined") {
            var frame = new Windows.Media.VideoFrame(Imaging.BitmapPixelFormat.bgra8, width, height);
            oMediaCapture.getPreviewFrameAsync(frame)
            .then(function (capturedFrame) {

                // Copy captured frame to buffer for further deserialization
                var bitmap = capturedFrame.softwareBitmap;
                var rawBuffer = new Streams.Buffer(bitmap.pixelWidth * bitmap.pixelHeight * 4);
                capturedFrame.softwareBitmap.copyToBuffer(rawBuffer);
                capturedFrame.close();

                // Get raw pixel data from buffer
                var data = new Uint8Array(rawBuffer.length);
                var dataReader = Streams.DataReader.fromBuffer(rawBuffer);
                dataReader.readBytes(data);
                dataReader.close();
                // *******************************
                // Code used from Phonegap END
                // *******************************

                var result = self.zxing.decode(data, width, height, ZXing.BitmapFormat.bgra32);

                if (result) {
                    console.log('- DECODED: ', result);
                    close(result);
                } else if (barcodeDecoder.isCancelled) {
                    console.log('- CANCELLED!');
                    close({ "cancelled": "true" });
                } else {
                    setTimeout(function () { self.scanBarcodeAsync() }, 150);
                }

            });
        } else if (barcodeDecoder.isCancelled) {
            console.log('- CANCELLED!');
            close({ "cancelled": "true" });
        }
    };
};

var barcodeDecoder = new BarcodeDecoder();

//flash click handler
function switchTorch() {
    if (oMediaCapture.videoDeviceController.torchControl.supported) {
        if (oMediaCapture.videoDeviceController.torchControl.enabled) {
            oMediaCapture.videoDeviceController.torchControl.enabled = false;
        } else {
            oMediaCapture.videoDeviceController.torchControl.enabled = true;
        }
    }
}

//switchcamera handler
function switchCamera() {
    if (numberOfCamera > 1) {
        if (cameraDirection > 1) {
            cameraDirection = 1;
        } else {
            cameraDirection = 2;
        }
        cleanupUI();
        initializeCameraAsync()
    }
}

//back click handler
function handleBackClick() {
    cancel();
    WinJS.Application.removeEventListener("backclick", handleBackClick);
    return true;
}

function cleanup() {
    cleanupUI();
    cleanupCameraAsync();
}

function cleanupUI() {
    if (isInitialized) {
        if (isPreviewing) {
            // The call to stop the preview is included here for completeness, but can be
            // safely removed if a call to MediaCapture.close() is being made later,
            // as the preview will be automatically stopped at that point
            stopPreview();
            cleanOverlay();

            isPreviewing = false;
        }
        isInitialized = false;
    }
}

/// <summary>
/// Cleans up the camera resources (after stopping any video recording and/or preview if necessary) and unregisters from MediaCapture events
/// </summary>
/// <returns></returns>
function cleanupCameraAsync() {
    console.log("cleanupCameraAsync");

    var promiseList = {};

    // When all our tasks complete, clean up MediaCapture
    return WinJS.Promise.join(promiseList)
    .then(function () {
        if (oMediaCapture != null) {
            oMediaCapture.close();
            oMediaCapture = null;
        }
    });
}

// close panel
function close(result) {
    barcodeDecoder.scanning = false;
    cleanup();
    raiseSuccess(result);
}


// cancel rendering
function cancel(e) {
    barcodeDecoder.isCancelled = true;
}

function setupUi() {
    registerEventHandlers();

    // Populate orientation variables with the current state
    if (oOrientationSensor != null) {
        oDeviceOrientation = oOrientationSensor.getCurrentOrientation();
    }
}

/// <summary>
/// Registers event handlers for hardware buttons and orientation sensors, and performs an initial update of the UI rotation
/// </summary>
function registerEventHandlers() {
    // If there is an orientation sensor present on the device, register for notifications
    if (oOrientationSensor != null) {
        oOrientationSensor.addEventListener("orientationchanged", orientationSensor_orientationChanged);
    }
}

/// <summary>
/// Occurs each time the simple orientation sensor reports a new sensor reading.
/// </summary>
/// <param name="args">The event data.</param>
function orientationSensor_orientationChanged(args) {
    // If the device is parallel to the ground, keep the last orientation used. This allows users to take pictures of documents (FaceUp)
    // or the ceiling (FaceDown) in any orientation, by first holding the device in the desired orientation, and then pointing the camera
    // at the desired subject.
    if (args.orientation != SimpleOrientation.faceup && args.orientation != SimpleOrientation.facedown) {
        oDeviceOrientation = args.orientation;

        if (isPreviewing) {
            setPreviewRotationAsync();
        }
    }
}

/// <summary>
/// Unregisters event handlers for hardware buttons and orientation sensors
/// </summary>
function unregisterEventHandlers() {
    if (oOrientationSensor != null) {
        oOrientationSensor.removeEventListener("orientationchanged", orientationSensor_orientationChanged);
    }
}

/// <summary>
/// Gets the current orientation of the UI in relation to the device (when AutoRotationPreferences cannot be honored) and applies a corrective rotation to the preview
/// </summary>
/// <returns></returns>
function setPreviewRotationAsync() {
    // Calculate which way and how far to rotate the preview
    var rotationDegrees = 360 - convertDeviceOrientationToDegrees(getCameraOrientation());

    // The rotation direction needs to be inverted if the preview is being mirrored
    if (mirroringPreview) {
        rotationDegrees = (360 - rotationDegrees) % 360;
    }

    // Add rotation metadata to the preview stream to make sure the aspect ratio / dimensions match when rendering and getting preview frames
    var props = oMediaCapture.videoDeviceController.getMediaStreamProperties(Capture.MediaStreamType.videoPreview);
    props.properties.insert(RotationKey, rotationDegrees);
    oMediaCapture.setEncodingPropertiesAsync(Capture.MediaStreamType.videoPreview, props, null);

    // Change resolution
    var maxResProps = oMediaCapture.videoDeviceController.getAvailableMediaStreamProperties(Capture.MediaStreamType.videoPreview)[0];
    width = maxResProps.width;
    height = maxResProps.height;
    oMediaCapture.videoDeviceController.setMediaStreamPropertiesAsync(Capture.MediaStreamType.videoPreview, maxResProps);
    if (!barcodeDecoder.scanning) {
        barcodeDecoder.scan();
    }
}

/// <summary>
/// Converts the given orientation of the device in space to the corresponding rotation in degrees
/// </summary>
/// <param name="orientation">The orientation of the device in space</param>
/// <returns>An orientation in degrees</returns>
function convertDeviceOrientationToDegrees(orientation) {
    switch (orientation) {
        case SimpleOrientation.rotated90DegreesCounterclockwise:
            return 90;
        case SimpleOrientation.rotated180DegreesCounterclockwise:
            return 180;
        case SimpleOrientation.rotated270DegreesCounterclockwise:
            return 270;
        case SimpleOrientation.notRotated:
        default:
            return 0;
    }
}

/// <summary>
/// Calculates the current camera orientation from the device orientation by taking into account whether the camera is external or facing the user
/// </summary>
/// <returns>The camera orientation in space, with an inverted rotation in the case the camera is mounted on the device and is facing the user</returns>
function getCameraOrientation() {
    if (externalCamera) {
        // Cameras that are not attached to the device do not rotate along with it, so apply no rotation
        return SimpleOrientation.notRotated;
    }

    var result = oDeviceOrientation;

    // Account for the fact that, on portrait-first devices, the camera sensor is mounted at a 90 degree offset to the native orientation
    if (oDisplayInformation.nativeOrientation === DisplayOrientations.portrait) {
        switch (result) {
            case SimpleOrientation.rotated90DegreesCounterclockwise:
                result = SimpleOrientation.notRotated;
                break;
            case SimpleOrientation.rotated180DegreesCounterclockwise:
                result = SimpleOrientation.rotated90DegreesCounterclockwise;
                break;
            case SimpleOrientation.rotated270DegreesCounterclockwise:
                result = SimpleOrientation.rotated180DegreesCounterclockwise;
                break;
            case SimpleOrientation.notRotated:
            default:
                result = SimpleOrientation.rotated270DegreesCounterclockwise;
                break;
        }
    }

    return result;
}

/// <summary>
/// Initializes the MediaCapture, registers events, gets camera device information for mirroring and rotating, starts preview and unlocks the UI
/// </summary>
/// <returns></returns>
function initializeCameraAsync() {
    console.log("InitializeCameraAsync");

    // Get available devices for capturing pictures
    var expectedPanel = cameraDirection === 1 ? Windows.Devices.Enumeration.Panel.front : Windows.Devices.Enumeration.Panel.back;
    return findCameraDeviceByPanelAsync(expectedPanel)
    .then(function (camera) {
        if (camera === null) {
            console.log("No camera device found!");
            return;
        }
        // Figure out where the camera is located
        if (!camera.enclosureLocation || camera.enclosureLocation.panel === Windows.Devices.Enumeration.Panel.unknown) {
            // No information on the location of the camera, assume it's an external camera, not integrated on the device
            externalCamera = true;
        }
        else {
            // Camera is fixed on the device
            externalCamera = false;

            // Only mirror the preview if the camera is on the front panel
            mirroringPreview = (camera.enclosureLocation.panel === Windows.Devices.Enumeration.Panel.front);
        }

        oMediaCapture = new Capture.MediaCapture();


        var settings = new Capture.MediaCaptureInitializationSettings();
        settings.videoDeviceId = camera.id;
        settings.streamingCaptureMode = Capture.StreamingCaptureMode.video;

        // Initialize media capture and start the preview
        return oMediaCapture.initializeAsync(settings)
        .then(function () {
            isInitialized = true;
            startPreview();
            setupOverlay();
        }, function (reason) {
            console.log(reason);
            barcodeDecoder.scanning = false;
            raiseError(reason);
        });
    }, function (error) {
        console.log(error.message);
    }).done();
}

/// <summary>
/// Starts the preview and adjusts it for for rotation and mirroring after making a request to keep the screen on
/// </summary>
function startPreview() {
    //reset isCancelled
    barcodeDecoder.scanning = false;
    barcodeDecoder.isCancelled = false;

    // Prevent the device from sleeping while the preview is running
    oDisplayRequest.requestActive();

    // Set the preview source in the UI
    previewVidTag = document.createElement("video");
    previewVidTag.id = "cameraPreview";
    previewVidTag.style.position = 'absolute';
    previewVidTag.style.top = '0';
    previewVidTag.style.left = '0';
    previewVidTag.style.height = '100%';
    previewVidTag.style.width = '100%';
    previewVidTag.style.zIndex = '900';
    document.body.appendChild(previewVidTag);

    var previewUrl = URL.createObjectURL(oMediaCapture);
    previewVidTag.src = previewUrl;
    previewVidTag.play();

    previewVidTag.addEventListener("playing", function () {
        isPreviewing = true;
        setPreviewRotationAsync();
    });
}

function setupOverlay() {
    overlay = document.createElement('div');
    overlay.style.zIndex = "901";
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    var border = '2.5em';
    overlay.style.borderLeft = border;
    overlay.style.borderTop = border;
    overlay.style.borderRight = border;
    overlay.style.borderBottom = '4em';
    overlay.style.borderColor = 'rgba(0,0,0,0.5)';
    overlay.style.borderStyle = 'solid';

    //create red line to overlay
    var line = document.createElement('div');
    line.style.width = "100%";
    line.style.height = "2px";
    line.style.backgroundColor = "red";
    line.style.margin = "auto";
    line.style.position = "absolute";
    line.style.top = "0";
    line.style.bottom = "0";
    line.style.left = "0";
    line.style.right = "0";
    overlay.appendChild(line);

    //flash button
    if (isFlashEnabled && oMediaCapture.videoDeviceController.torchControl.supported) {
        var flashBtn = document.createElement("button");
        flashBtn.innerText = "Flash";
        flashBtn.style.cssText = "position:absolute;bottom: 0; display: inline-block; margin-bottom: -3em; z-order: 1001 ;";
        flashBtn.addEventListener('click', switchTorch, false);
        overlay.appendChild(flashBtn);
    }

    //switch camera button
    if (isSwitchCameraEnabled && (numberOfCamera > 1)) {
        var swBtn = document.createElement("button");
        swBtn.innerText = "Switch Camera";
        swBtn.style.cssText = "position:absolute;bottom:0; display: inline-block; margin-bottom: -3em; z-order: 1001 ;";
        swBtn.addEventListener('click', switchCamera, false);
        overlay.appendChild(swBtn);
    }

    //cancel button only winrt (phone has back button)
    // WinJS 4+ doesn't have isPhone, so we check the device type in userAgent
    if (WinJS.Utilities.isPhone == undefined && !(navigator.userAgent.indexOf("Windows Phone") > -1) || WinJS.Utilities.isPhone == false) {
        var cancelBtn = document.createElement("button");
        cancelBtn.innerText = "Cancel";
        cancelBtn.style.cssText = "position:absolute;bottom:0; display: inline-block; margin-bottom: -3em; z-order: 1001 ;";
        cancelBtn.addEventListener('click', cancel, false);
        overlay.appendChild(cancelBtn);
    }

    document.body.appendChild(overlay);

    var margin = 0;
    if (flashBtn) {
        flashBtn.style.marginLeft = margin + "px";
        margin = margin + flashBtn.offsetWidth + 20;
    }
    if (swBtn) {
        swBtn.style.marginLeft = margin + "px";
        margin = margin + swBtn.offsetWidth + 20;
    }
    if (cancelBtn) {
        cancelBtn.style.marginLeft = margin + "px";
    }
}

/// <summary>
/// Attempts to find and return a device mounted on the panel specified, and on failure to find one it will return the first device listed
/// </summary>
/// <param name="panel">The desired panel on which the returned device should be mounted, if available</param>
/// <returns></returns>
function findCameraDeviceByPanelAsync(panel) {
    var deviceInfo = null;
    // Get available devices for capturing pictures
    return DeviceInformation.findAllAsync(DeviceClass.videoCapture)
    .then(function (devices) {
        numberOfCamera = devices.length;
        devices.forEach(function (cameraDeviceInfo) {
            if (cameraDeviceInfo.enclosureLocation != null && cameraDeviceInfo.enclosureLocation.panel === panel) {
                deviceInfo = cameraDeviceInfo;
                return;
            }
        });

        // Nothing matched, just return the first
        if (!deviceInfo && devices.length > 0) {
            deviceInfo = devices.getAt(0);
        }

        return deviceInfo;
    });
}

/// <summary>
/// Stops the preview and deactivates a display request, to allow the screen to go into power saving modes
/// </summary>
/// <returns></returns>
function stopPreview() {
    unregisterEventHandlers();

    // Cleanup the UI
    var previewVidTag = document.getElementById("cameraPreview");
    previewVidTag.pause();
    previewVidTag.src = null;


    document.body.removeChild(previewVidTag);
    previewVidTag = null;

    // Allow the device screen to sleep now that the preview is stopped
    oDisplayRequest.requestRelease();
}

function cleanOverlay() {
    document.body.removeChild(overlay);
    overlay = null;
}

// starting camera
exports.start = function (win, fail) {
    console.log('- Starting camera device...');

    // saving references
    raiseSuccess = win;
    raiseError = fail;

    WinJS.Application.addEventListener("backclick", handleBackClick, false);

    // init objects
    barcodeDecoder.init();

    setupUi();
    initializeCameraAsync();
};

require('cordova/exec/proxy').add('CameraHandler', exports);