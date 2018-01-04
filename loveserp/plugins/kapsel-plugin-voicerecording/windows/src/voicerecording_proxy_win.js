﻿
var duration,
    currentState,
    recorder,
    initializeOptions,
    filePath,
    playPosition,
    maxLength,
    encryptionKey,
    remainingLength,
    keepCallback,
    initErrorCallback,
    timer,
    utils,
    mediaStates = {
        INITIALIZED: "INITIALIZED",
        RECORDING: "RECORDING",
        RECORDING_PAUSED: "RECORDING_PAUSED",
        PLAYING: "PLAYING",
        PLAYING_PAUSED: "PLAYING_PAUSED",
        MAX_LENGTH_PLAYING: "MAX_LENGTH_PLAYING",
        MAX_LENGTH_PLAYING_PAUSED: "MAX_LENGTH_PLAYING_PAUSED",
        CLOSED: "CLOSED"
    },
    vrError = {
        KEY_GENERATION_FAILED: "encryption_key_generation_failed",
        PERMISSION_DENIED: "permission_denied",
        INIT_ERROR: "init_failed",
        UNKNOWN_ERROR: "unknown_error",
        INVALID_OPERATION: "invalid_operation"
    };

utils = require("./VoiceRecording-Utils");

module.exports = {
    getEncryptionKeyAsString: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //              "getEncryptionKeyAsString", []);

        SAP.VoiceRecording.AudioRecorder.getCryptographicKeyAsString(function(key) {
                success(key);
            },
            function(error) {
                console.log("Get cryptographic key failed: " + error);
                fail({ code: vrError.KEY_GENERATION_FAILED, extra: "Get cryptographic key failed: " + error });
            });
    },

    initAudioRecorder: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "initAudioRecorder", [nativeOptions]);

        // store the callbacks for later use
        keepCallback = success;
        initErrorCallback = fail;

        try {
            filePath = args[0].path;
            encryptionKey = args[0].encryptionKey;

            if (filePath) {
                // we need the extension to get the duration from native
                console.log("Initialize with file path, play/resume: " + filePath);
                // if the event is play, then the appBarr is already hidden
                // if it's resume, then we need to hide it until UI5 supports WinJS
                document.getElementById("appBar-bottom").hidden = true;
            } else {
                console.log("Initialize without file path, record: " + filePath);
            }
            maxLength = args[0].maxLength;
            //maxLength = 10800000; // maximum length for a single recording on windows
            playPosition = parseInt(args[0].playPosition) / 1000;

            if (playPosition === -0.001) {
                // there is no playPosition, so it's a recording
                recorder = new SAP.VoiceRecording.AudioRecorder();
                recorder.initializeAsync(maxLength, encryptionKey, filePath).then(function(result) {
                    var JSONresult = JSON.parse(result);
                    currentState = JSONresult.newState;
                    console.log("Record duration in initAudioRecorder: " + JSONresult.duration);
                    remainingLength = maxLength - JSONresult.duration;
                    success(JSONresult, {
                        keepCallback: true
                    });
                }, function(error) {
                    console.log("Init audio recorder failed: " + error);
                    if (error.message.includes("permission_denied"))
                        fail({ code: vrError.PERMISSION_DENIED, extra: "The application doesn't have permission to perform recordings" });
                    else
                        fail({ code: vrError.INIT_ERROR, extra: "Init audio recorder failed: " + error });
                });
            } else {
                // there is playPosition, so it's a playback
                var initCallbackArgs;

                recorder = new SAP.VoiceRecording.AudioRecorder();
                recorder.initializeAsync(maxLength, encryptionKey, filePath).then(function(result) {
                    initCallbackArgs = JSON.parse(result);
                    currentState = initCallbackArgs.newState;

                    duration = initCallbackArgs.duration;
                    if (maxLength == -1 || duration < maxLength) {
                        recorder.setMediaState(mediaStates.PLAYING_PAUSED, function(state) {
                            currentState = state;
                        }, function(error) {
                            console.log("Set media state error: " + error);
                            fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state failed: " + error });
                        });
                    } else {
                        recorder.setMediaState(mediaStates.MAX_LENGTH_PLAYING_PAUSED, function(state) {
                            currentState = state;
                        }, function(error) {
                            console.log("Set media state error: " + error);
                            fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state failed: " + error });
                        });
                    }

                    initCallbackArgs.newState = currentState;
                    success(initCallbackArgs, {
                        keepCallback: true
                    });
                }, function(error) {
                    console.log("Init audio recorder failed: " + error);
                    if (error.message.includes("permission_denied"))
                        fail({ code: vrError.PERMISSION_DENIED, extra: "The application doesn't have permission to perform recordings" });
                    else
                        fail({ code: vrError.INIT_ERROR, extra: "Init audio recorder failed: " + error });
                });
                // add the audio element and set the playPosition if there's any
                addAudioTag(function(tag) {
                    if (playPosition !== -0.001) {
                        tag.currentTime = playPosition;
                        // loadedmetadata event fires more than once during the recording which is not needed
                        audioTag.onloadedmetadata = function() {};
                    }
                }, fail);
            }
        } catch (ex) {
            console.log("Initialization failed: " + ex.message);
            fail({ code: vrError.INIT_ERROR, extra: "Initialization failed: " + ex.message });
        }
    },

    startRecord: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "startRecord", []);
        recorder.getMediaState(function(state) {
            currentState = state;
        }, function(error) {
            console.log("Get media state failed: " + error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
        // check if we are in a valid state for this operation
        if (currentState != mediaStates.INITIALIZED && currentState != mediaStates.RECORDING_PAUSED && currentState != mediaStates.PLAYING_PAUSED) {
            fail({ code: vrError.INVALID_OPERATION, extra: "The current state is invalid for this operation. State: " + currentState });
        } else {
            recorder.startRecordingAsync().then(function(result) {
                    if (maxLength !== -1) {
                        createTimer(remainingLength, fail);
                    }
                    var JSONresult = JSON.parse(result);
                    currentState = JSONresult.state;
                    console.log("Record duration in start record: " + JSONresult.duration);
                    success(JSONresult, {
                        keepCallback: true
                    });
                },
                function(error) {
                    console.log("Start recording failed: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Start recording failed: " + error });
                });
        }
    },

    pause: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "pause", []);
        recorder.getMediaState(function(state) {
            currentState = state;
        }, function(error) {
            console.log("Get media state failed: " + error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
        // check if we are in a valid state for this operation
        if (currentState != mediaStates.RECORDING && currentState != mediaStates.PLAYING && currentState != mediaStates.MAX_LENGTH_PLAYING) {
            fail({ code: vrError.INVALID_OPERATION, extra: "The current state is invalid for this operation. State: " + currentState });
        } else {
            // check if we need to pause playback or a recording
            if (currentState === mediaStates.RECORDING) {
                recorder.pauseRecordingAsync().then(function(result) {
                        var JSONresult = JSON.parse(result);
                        if (maxLength !== -1) {
                            deleteTimer();
                            remainingLength = maxLength - JSONresult.duration;
                        }
                        currentState = JSONresult.state;
                        console.log("Record duration in pause recording: " + JSONresult.duration);
                        success(JSONresult);
                    },
                    function(error) {
                        console.log("Pause recording failed: " + error);
                        fail({ code: vrError.UNKNOWN_ERROR, extra: "Pause recording failed: " + error });
                    });
            } else {
                var tag = document.getElementById('audioTag');
                tag.pause();
                playPosition = tag.currentTime;
                recorder.setMediaState(mediaStates.PLAYING_PAUSED, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state error: " + error });
                });
                success({
                    state: currentState,
                    duration: playPosition * 1000
                });
            }
        }
    },

    startPlay: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "startPlay", []);
        recorder.getMediaState(function(state) {
            currentState = state;
        }, function(error) {
            console.log(error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
        // check if we are in a valid state for this operation
        if (currentState != mediaStates.RECORDING_PAUSED && currentState != mediaStates.PLAYING_PAUSED && currentState != mediaStates.MAX_LENGTH_PLAYING_PAUSED && currentState != mediaStates.INITIALIZED) {
            fail({ code: vrError.INVALID_OPERATION, extra: "The current state is invalid for this operation. State: " + currentState });
        } else {
            // TODO : check if MAX_LENGTH_PLAYING_PAUSED state is still needed
            if (currentState === mediaStates.MAX_LENGTH_PLAYING_PAUSED) {
                recorder.setMediaState(mediaStates.MAX_LENGTH_PLAYING, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state error: " + error });
                });
            } else {
                recorder.setMediaState(mediaStates.PLAYING, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state error: " + error });
                });
            }
            recorder.getRecordDurationAsync(filePath).then(function(result) {
                    duration = result;

                    var tag = document.getElementById('audioTag');
                    if (tag) {
                        tag.play();
                    } else {
                        console.log("There is no audioTag in startPlay");
                        fail({ code: vrError.UNKNOWN_ERROR, extra: "There is no audio tag for playing" });
                    }
                    console.log("Duration in start play: " + duration);
                    success({
                        state: currentState,
                        duration: duration
                    }, {
                        keepCallback: true
                    });
                },
                function(error) {
                    console.log("Get record duration failed: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Get record duration failed: " + error });
                });
        }
    },

    seekPlay: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "seekPlay", [position]);
        recorder.getMediaState(function(state) {
            currentState = state;
        }, function(error) {
            console.log(error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
        // check if we are in a valid state for this operation
        if (currentState != mediaStates.PLAYING && currentState != mediaStates.PLAYING_PAUSED && currentState != mediaStates.MAX_LENGTH_PLAYING && currentState != mediaStates.MAX_LENGTH_PLAYING_PAUSED) {
            fail({ code: vrError.INVALID_OPERATION, extra: "The current state is invalid for this operation. State: " + currentState });
        }
        playPosition = args[0] / 1000;

        var tag = document.getElementById('audioTag');
        tag.currentTime = playPosition;

        success({
            state: currentState,
            duration: duration
        });
    },

    close: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "close", []);
        recorder.getMediaState(function(state) {
            currentState = state;
        }, function(error) {
            console.log(error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
        // check if we are in a valid state for this operation
        if (currentState != mediaStates.INITIALIZED && currentState != mediaStates.RECORDING_PAUSED && currentState != mediaStates.PLAYING_PAUSED && currentState != mediaStates.MAX_LENGTH_PLAYING_PAUSED) {
            fail({ code: vrError.INVALID_OPERATION, extra: "The current state is invalid for this operation. State: " + currentState });
        }
        recorder.closeRecordingAsync().then(function(result) {
                var JSONresult = JSON.parse(result);
                currentState = JSONresult.newState;
                console.log("Record duration in close: " + JSONresult.duration);

                removeAudioTag(function() {
                    recorder.disposeRecorder();
                    keepCallback = null;
                    recorder = null;

                    success(JSONresult);
                });
            },
            function(error) {
                console.log("Close recording failed: " + error);
                fail({ code: vrError.UNKNOWN_ERROR, extra: "Close recording failed: " + error });
            });
    },

    getRecordDuration: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "getDuration", []);
        recorder.getRecordDurationAsync(filePath).then(function(result) {
                duration = result;
                success(duration);
            },
            function(error) {
                console.log("Get record duration failed: " + error);
                fail({ code: vrError.UNKNOWN_ERROR, extra: "Get record duration failed: " + error });
            });
    },

    getPlayPosition: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "getPosition", []);
        success(playPosition * 1000);
    },

    getState: function(success, fail, args) {
        //cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "getState", []);
        recorder.getMediaState(function(state) {
            currentState = state;
            success(currentState);
        }, function(error) {
            console.log(error);
            fail({ code: vrError.UNKNOWN_ERROR, extra: "Get media state failed: " + error });
        });
    },

    onSuspendEvent: function(success, fail, args) {
        // cordova.exec(successCallback, errorCallback, "VoiceRecording",
        //  "onSuspendEvent", []);

        // check the current state to decide which screen is being used
        if (playPosition === -0.001) {
            recorder.onSuspendEvent("recording").then(function(state) {
                if (maxLength !== -1) {
                    deleteTimer();
                }
                currentState = state;

                removeAudioTag(function() {
                    console.log("audioTag removed successfully on suspend");
                    keepCallback = null;
                    recorder = null;
                    success();
                });
            }, function() {
                console.log(arguments);
                fail({ code: vrError.UNKNOWN_ERROR, extra: arguments });
            });
        } else {
            var tag = document.getElementById('audioTag');
            if (currentState === mediaStates.PLAYING) {
                tag.pause();
            }
            tag = null;
            recorder.onSuspendEvent("playing").then(function(state) {
                currentState = state;

                removeAudioTag(function() {
                    console.log("audioTag removed successfully on suspend");
                    keepCallback = null;
                    recorder = null;
                    success();
                });
            }, function() {
                console.log(arguments);
                fail({ code: vrError.UNKNOWN_ERROR, extra: arguments });
            });
        }
    },

    closeDialog: function(success) {
        // cordova.exec(callBack, null, "VoiceRecording",
        //  "closeDialog", []);

        var activeScreen;

        // check the current state to decide which screen is being used
        if (playPosition === -0.001) {
            activeScreen = "recording";
        } else {
            activeScreen = "playing";
            var tag = document.getElementById('audioTag');
            if (currentState === mediaStates.PLAYING) {
                tag.pause();
            }
            tag = null;
        }
        recorder.closeDialog(activeScreen).then(function(result) {
            var JSONresult = JSON.parse(result);

            removeAudioTag(function() {
                recorder = null;
                initErrorCallback({
                    code: "interrupted",
                    extra: JSONresult
                }, {
                    keepCallback: false
                });
                keepCallback = null;
                initErrorCallback = null;

                success();
            });
        });
    }
};

// create a timer if a maximum length was set for the recording
function createTimer(time, fail) {
    timer = setTimeout(function() {
        recorder.pauseRecordingAsync().then(function(result) {
                var JSONresult = JSON.parse(result);
                duration = JSONresult.duration;
                recorder.setMediaState(mediaStates.MAX_LENGTH_PLAYING_PAUSED, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state failed: " + error });
                });
                keepCallback({
                    event: "maxLengthExceeded",
                    newState: currentState,
                    duration: duration
                }, {
                    keepCallback: true
                });
            },
            function(error) {
                console.log("Pause recording failed: " + error);
                fail({ code: vrError.UNKNOWN_ERROR, extra: "Pause recording failed: " + error });
            });
    }, time);
}

// delete the timer if there's any
function deleteTimer() {
    if (timer) {
        clearTimeout(timer);
    }
}

// create an audio element, which is used to playback recordings
function addAudioTag(success, fail) {
    var audioTag = document.getElementById("audioTag");
    if (!audioTag && filePath !== "") {
        console.log("Add audio tag");
        audioTag = document.createElement('audio');
        audioTag.autoplay = false;
        audioTag.setAttribute("id", "audioTag");
        audioTag.setAttribute("src", utils.pathForCordova(filePath));
        audioTag.setAttribute("type", "audio/mp4");
        document.body.appendChild(audioTag);
        audioTag.load();
        audioTag.onerror = function(e) {
            var extra;
            switch (e.target.error.code) {
                case e.target.error.MEDIA_ERR_ABORTED:
                    extra = "Fetching process aborted by user.";
                    break;
                case e.target.error.MEDIA_ERR_NETWORK:
                    extra = "Error occurred when downloading.";
                    break;
                case e.target.error.MEDIA_ERR_DECODE:
                    extra = "Error occurred when decoding.";
                    break;
                case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    extra = "Audio/video not supported.";
                    break;
                default:
                    extra = "An unknown error occurred.";
                    break;
            }
            console.log(extra);
            fail({ code: vrError.UNKNOWN_ERROR, extra: extra });
        };
        audioTag.onended = function() {
            // we need to reload the audioTag, because after file is ended we can seek and the file starts automatically
            audioTag.load();

            // TODO : check if MAX_LENGTH_PLAYING state is still needed
            if (currentState === mediaStates.MAX_LENGTH_PLAYING) {
                console.log("Audio on ended, Media state: max length playing paused");
                recorder.setMediaState(mediaStates.MAX_LENGTH_PLAYING_PAUSED, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state failed: " + error });
                });
            } else {
                recorder.setMediaState(mediaStates.PLAYING_PAUSED, function(state) {
                    currentState = state;
                }, function(error) {
                    console.log("Set media state error: " + error);
                    fail({ code: vrError.UNKNOWN_ERROR, extra: "Set media state failed: " + error });
                });
                console.log("audio on ended, playing paused");
                keepCallback({
                    event: "playStopped",
                    newState: currentState
                }, {
                    keepCallback: true
                });
            }
        };
        audioTag.onloadedmetadata = function() {
            console.log("metadata loaded");
            // we need to wait until the recording's metadata is loaded, so we can set the playposition
            success(audioTag);
        };
    }
}

// remove the audio element from the document, when our dialog is closed
function removeAudioTag(success) {
    var tag = document.getElementById("audioTag");
    if (tag) {
        console.log("remove audio tag");
        tag.setAttribute("src", "");
        document.body.removeChild(tag);
        success();
    } else {
        console.log("There is no audio tag to remove");
        success();
    }
}

function clearEncryptedStorage() {
    console.log("resetData event called");
    // Get the application's local folder
    var localFolder = Windows.Storage.ApplicationData.current.localFolder;
    var folderName = "VoiceRecordingPluginData";
    var store = utils.getEncryptedStorage();

    localFolder.tryGetItemAsync(folderName).then(function(folder) {
        if (folder !== null) {
            return folder.deleteAsync();
        } else {
            console.log("Folder", folderName, "does not exist.");
        }
    }).done(function() {
        console.log(folderName + " folder deleted");
    });

    store.clear(function() {
        console.log("store.clear was successful: " + JSON.stringify(arguments));
    }, function() {
        console.log("store.clear error: " + JSON.stringify(arguments));
    });
}

// add event listener, to clear the encrypted storage when the dataVault is deleted
WinJS.Application.addEventListener(
    "resetData",
    clearEncryptedStorage,
    false
);

require("cordova/exec/proxy").add("VoiceRecording", module.exports);
