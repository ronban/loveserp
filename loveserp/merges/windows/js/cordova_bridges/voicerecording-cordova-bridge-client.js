/* This file is loaded in www/index.html and provides the client side of the proxy */
/* Makes the cordova calls here and returns result by invoking the script on the webview */

//setting up the receiver for voicerecording events
cordovaBridgeUtils.webView.addEventListener('MSWebViewFrameNavigationStarting', function(e) {
    var parameters = cordovaBridgeUtils.getUrlParameters(e.uri);
    var appBar = document.getElementById("appBar-bottom");

    if (parameters['EVENT'] == 'audioCaptureEvent') {
        if (sap.VoiceRecording) {
            appBar.hidden = true;
            sap.VoiceRecording.audioCapture(function(recording) {
                if (recording) {
                    var mockedRecording = new Recording(recording);
                    appBar.hidden = false;
                    cordovaBridgeUtils.successEvent('audioCaptureCommand', mockedRecording);
                } else {
                    appBar.hidden = false;
                    cordovaBridgeUtils.successEvent('audioCaptureCommand');
                }
            }, function() {
            	appBar.hidden = false;
            	// we can't give back the whole error, cause that can be too long and then the script injection won't work
				// the temporary solution is to send only the error code
            	cordovaBridgeUtils.errorEvent('audioCaptureCommand', arguments[0]);
            }, getConfigOptions(e.uri));
        } else {
            cordovaBridgeUtils.errorEvent('audioCaptureCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'getEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.get(function(result) {
                cordovaBridgeUtils.successEvent('getCommand', result);
            }, function() {
            	cordovaBridgeUtils.errorEvent('getCommand', arguments[0]);
            }, getRecordingId(e.uri));
        } else {
            cordovaBridgeUtils.errorEvent('getCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'getAllEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.getAll(function(recordingObjects) {
                var recordings = [];
                for (var i = recordingObjects.length - 1; i >= 0; i--) {
                    var mockedRecording = new Recording(recordingObjects[i]);
                    recordings.push(mockedRecording);
                }

                cordovaBridgeUtils.successEvent('getAllCommand', recordings);
            }, function() {
            	cordovaBridgeUtils.errorEvent('getAllCommand', arguments[0]);
            });
        } else {
            cordovaBridgeUtils.errorEvent('getAllCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'removeAllDataEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.removeAllData(function(result) {
                cordovaBridgeUtils.successEvent('removeAllDataCommand', result);
            }, function() {
            	cordovaBridgeUtils.errorEvent('removeAllDataCommand', arguments[0]);
            });
        } else {
            cordovaBridgeUtils.errorEvent('removeAllDataCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'setFileNameEvent') {
        if (sap.VoiceRecording) {
            var urlParameters = cordovaBridgeUtils.getUrlParameters(e.uri);
            var newFileName, recordingId;

            if (urlParameters['fileName'] !== null) {
                newFileName = urlParameters['fileName'];
            }

            if (urlParameters['id'] !== null) {
                recordingId = urlParameters['id'];
            }

            sap.VoiceRecording.get(function(recording) {
                    recording.setFileName(newFileName, function() {
                        console.log("setFileName was successfull in the cordova bridge");
                        cordovaBridgeUtils.successEvent('setFileNameCommand');
                    }, function() {
                        console.log("An error occurred at setFileName\n\n" + JSON.stringify(arguments));
                        cordovaBridgeUtils.errorEvent('setFileNameCommand', arguments[0]);
                    });
                },
                function() {
                	cordovaBridgeUtils.errorEvent('setFileNameCommand', arguments[0]);
                }, recordingId);
        } else {
            cordovaBridgeUtils.errorEvent('setFileNameCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'playEvent') {
        if (sap.VoiceRecording) {
            appBar.hidden = true;
            sap.VoiceRecording.get(function(recording) {
                recording.play(function() {
                    console.log("Playing finished successfully!");
                    appBar.hidden = false;
                    cordovaBridgeUtils.successEvent('playCommand');
                }, function() {
                    console.log("There was an error during playing: " + JSON.stringify(arguments));
                    appBar.hidden = false;
                    cordovaBridgeUtils.errorEvent('playCommand', arguments[0]);
                });
            }, function() {
            	cordovaBridgeUtils.errorEvent('playCommand', arguments[0]);
            }, getRecordingId(e.uri));

        } else {
            cordovaBridgeUtils.errorEvent('playCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'destroyEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.get(function(recording) {
                recording.destroy(
                    function() {
                        cordovaBridgeUtils.successEvent('destroyCommand');
                    },
                    function() {
                        console.log("An error occurred at destroy\n\n" + JSON.stringify(arguments));
                        cordovaBridgeUtils.errorEvent('destroyCommand', arguments[0]);
                    });
            }, function() {
            	cordovaBridgeUtils.errorEvent('destroyCommand', arguments[0]);
            }, getRecordingId(e.uri));
        } else {
            cordovaBridgeUtils.errorEvent('destroyCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'getAsFileEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.get(function(recording) {
                recording.getAsFile(
                    function(decryptedFilePath) {
                        cordovaBridgeUtils.successEvent('getAsFileCommand', decryptedFilePath);
                    },
                    function() {
                        console.log("An error occurred at getAsFile\n\n" + JSON.stringify(arguments));
                        cordovaBridgeUtils.errorEvent('getAsFileCommand', arguments[0]);
                    });
            }, function() {
            	cordovaBridgeUtils.errorEvent('getAsFileCommand', arguments[0]);
            }, getRecordingId(e.uri));
        } else {
            cordovaBridgeUtils.errorEvent('destroyCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'deleteFileFromPathEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.deleteFileFromPath(getRecordingPath(e.uri), function() {
                cordovaBridgeUtils.successEvent('deleteFileFromPathCommand');
            }, function() {
            	cordovaBridgeUtils.errorEvent('deleteFileFromPathCommand', arguments[0]);
            });

        } else {
            cordovaBridgeUtils.errorEvent('deleteFileFromPathCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    if (parameters['EVENT'] == 'closeDialogEvent') {
        if (sap.VoiceRecording) {
            sap.VoiceRecording.closeDialog(function() {
                appBar.hidden = false;
                cordovaBridgeUtils.successEvent('closeDialogCommand');
            });

        } else {
            cordovaBridgeUtils.errorEvent('closeDialogCommand', {
                code: 1,
                message: "Feature has been invalidated"
            });
        }
    }

    function getConfigOptions(uri) {
        var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
        var options = {};

        if (urlParameters['maxLength'] !== null) {
            options.maxLength = urlParameters['maxLength'];
        }

        if (urlParameters['continueRecording'] !== null) {
            options.continueRecording = urlParameters['continueRecording'];
        }

        return options;
    }

    function getRecordingId(uri) {
        var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
        var playingId;

        if (urlParameters['recordingId'] !== null) {
            playingId = urlParameters['recordingId'];
        }

        return playingId;
    }

    function getRecordingPath(uri) {
        var urlParameters = cordovaBridgeUtils.getUrlParameters(uri);
        var recordingPath;

        if (urlParameters['recordingPath'] !== null) {
            recordingPath = urlParameters['recordingPath'];
        }

        return recordingPath;
    }
});

function Recording(recording) {
    var _creationDate = recording.getCreationDate();

    this.duration = recording.getDuration();
    this.creationDate = _creationDate.getTime();
    this.fileName = recording.getFileName();
    this.maxLength = recording.hasMaxLength();
    this.id = recording.id;
    this.encryptedFilePath = recording.getPath();
}
