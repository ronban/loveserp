/* Injects this script into the webview in www/index.html */

//voicerecording bridge
sap.VoiceRecording = {};

var audioCaptureCommand = new CordovaBridgeCommand('audioCaptureEvent');
sap.VoiceRecording.audioCapture = function(successCallback, errorCallback, options) {
    console.debug('Server bridge: sap.VoiceRecording.audioCapture');
    audioCaptureCommand.addQueryParameter(options);
    audioCaptureCommand.execute(function(recording) {
        if (recording) {
            var mockedRecording = new Recording(recording);
            successCallback(mockedRecording);
        } else {
        	successCallback();
        }
    }, function() {
        errorCallback(arguments[0]);
    });
};

var getCommand = new CordovaBridgeCommand('getEvent');
sap.VoiceRecording.get = function(successCallback, errorCallback, options) {
    console.debug('Server bridge: sap.VoiceRecording.get');
    getCommand.addQueryParameter(options);
    getCommand.execute(function(recording) {
        var mockedRecording = new Recording(recording);
        successCallback(mockedRecording);
    }, function() {
        errorCallback(arguments);
    });
};

var getAllCommand = new CordovaBridgeCommand('getAllEvent');
sap.VoiceRecording.getAll = function(successCallback, errorCallback) {
    console.debug('Server bridge: sap.VoiceRecording.getAll');
    getAllCommand.execute(function(recordingObjects) {
        var recordings = [];
        for (var i = recordingObjects.length - 1; i >= 0; i--) {
            var mockedRecording = new Recording(recordingObjects[i]);
            recordings.push(mockedRecording);
        }
        successCallback(recordings);
    }, function() {
        errorCallback(arguments);
    });
};
// TODO : test this function
var removeAllDataCommand = new CordovaBridgeCommand('removeAllDataEvent');
sap.VoiceRecording.removeAllData = function(successCallback, errorCallback) {
    console.debug('Server bridge: sap.VoiceRecording.removeAllData');
    removeAllDataCommand.execute(successCallback, errorCallback);
};
var setFileNameCommand = new CordovaBridgeCommand('setFileNameEvent');
var getAsFileCommand = new CordovaBridgeCommand('getAsFileEvent');
var destroyCommand = new CordovaBridgeCommand('destroyEvent');
var playCommand = new CordovaBridgeCommand('playEvent');

var deleteFileFromPathCommand = new CordovaBridgeCommand('deleteFileFromPathEvent');
sap.VoiceRecording.deleteFileFromPath = function (path, successCallback, errorCallback) {
    console.debug('Server bridge: sap.VoiceRecording.deleteFileFromPath');
    deleteFileFromPathCommand.addQueryParameter({
        recordingPath: path
    });
    deleteFileFromPathCommand.execute(successCallback, errorCallback);
};

var closeDialogCommand = new CordovaBridgeCommand('closeDialogEvent');
sap.VoiceRecording.closeDialog = function(successCallback) {
    console.debug('Server bridge: sap.VoiceRecording.closeDialog');
    closeDialogCommand.execute(function(result) {
        successCallback();
    });
};

function Recording(recording) {
    this.getDuration = function() {
        return recording.duration;
    };

    this.getCreationDate = function() {
        var creationDate = new Date(recording.creationDate);
        return creationDate;
    };

    this.getFileName = function() {
        return recording.fileName;
    };

    this.setFileName = function(fileName, successCallback, errorCallback) {
        var options = {
            fileName: fileName,
            id: this.id
        };

        console.debug('Server bridge: recording.setFileName');
        setFileNameCommand.addQueryParameter(options);
        setFileNameCommand.execute(function() {
            console.log("break");
            successCallback();
        }, function() {
            errorCallback(arguments);
        });
    };

    this.getAsFile = function(successCallback, errorCallback) {
        var options = {
            recordingId: this.id
        };
        console.debug('Server bridge: recording.getAsFile');
        getAsFileCommand.addQueryParameter(options);
        getAsFileCommand.execute(successCallback, errorCallback);
    };

    this.destroy = function(successCallback, errorCallback) {
        var options = {
            recordingId: this.id
        };

        console.debug('Server bridge: recording.play');
        destroyCommand.addQueryParameter(options);
        destroyCommand.execute(successCallback, function() {
            errorCallback(arguments);
        });
    };

    this.play = function(successCallback, errorCallback, args) {
        var options = {
            recordingId: this.id
        };

        console.debug('Server bridge: recording.play');
        playCommand.addQueryParameter(options);
        playCommand.execute(function() {
            successCallback(arguments);
        }, function() {
            errorCallback(arguments);
        });
    };

    this.hasMaxLength = function() {
        return recording.maxLength != -1;
    };
    this.getMaxLength = function() {
        return recording.maxLength;
    };
    this.getPath = function() {
        console.log("recording.encryptedFilePath in getPath: " + recording.encryptedFilePath);
        return recording.encryptedFilePath;
    };

    var createId = function() {
        var retVal = recording.encryptedFilePath.replace(/^.*[\\\/]/, '');
        retVal = retVal.substring(0, retVal.indexOf(".encr"));
        //retVal = retVal.substring(0, retVal.lastIndexOf("."));

        return retVal;
    };

    this.id = createId();
}

onCordovaBridgeLoaded('sap.VoiceRecording');