
// 
// A JavaScript background task runs a specified JavaScript file. 
// 
(function () {
	"use strict";

	// 
	// The background task instance's activation parameters are available via Windows.UI.WebUI.WebUIBackgroundTaskInstance.current 
	// 
	var cancel = false,
        progress = 0,
        backgroundTaskInstance = Windows.UI.WebUI.WebUIBackgroundTaskInstance.current,
        cancelReason = "";

	// adding a comment.
	console.log("Background " + backgroundTaskInstance.task.name + " Starting...");
	
	// 
	// Query BackgroundWorkCost 
	// Guidance: If BackgroundWorkCost is high, then perform only the minimum amount 
	// of work in the background task and return immediately. 
	// 
	//var cost = Windows.ApplicationModel.Background.BackgroundWorkCost.currentBackgroundWorkCost;
	//Windows.Storage.ApplicationData.current.localSettings.values["BackgroundWorkCost"] = cost.toString();

	// 
	// Associate a cancellation handler with the background task. 
	// 
	function onCanceled(cancelEventArg) {
		cancel = true;
		cancelReason = cancelEventArg;
	}
	//backgroundTaskInstance.addEventListener("canceled", onCanceled);

	function doWork() {
		/*
         Get a list of downloaded files
         Delete files that are more than 30 minutes old
        */
		if (cancel) {
			close();
		}
		Windows.Storage.ApplicationData.current.temporaryFolder.getFolderAsync("downloads").done(
		 function (folder) {
		 	folder.getFilesAsync().done(
				function (files) {
					var now = new Date().getTime();
					var i = null;
					deleteNextFile();

					function deleteNextFile() {
						i = (i == null) ? 0 : i + 1;

						if (i < files.length) {
							var creationDate = files[i].dateCreated;

							// clear files older than 30 minutes
							if (creationDate > 0 && (now - creationDate.getTime() > (30 * 1000 * 60))) {
								files[i].deleteAsync().done(
									function () {
										console.log("Deleted file");
										deleteNextFile();

									},
									function (error) {
										console.log("file delete error" + error);
										deleteNextFile();
									}
								);
							} else {
								deleteNextFile();
							}
						} else {
							close();
						}
					}
				}, function (error) {
					errorHandler("Get files async error", error);
				});
		 }, function (error) {
		 	errorHandler("Get folder async error", error);
		 });

		function errorHandler(errorMessagePrefix, error) {
			var errorMsg = (error && error.message) ? error.message : error;

			console.log(errorMessagePrefix + " " + errorMsg);			
			close();
		}
	}

	// 
	// This function is set to run every 1000 milliseconds ten times and perform background task activity. 
	// 
	function onTimer() {
		var key = null,
            settings = Windows.Storage.ApplicationData.current.localSettings,
            value = null;

		if ((!cancel) && (progress < 100)) {
			// 
			// Simulate work being done. 
			// 
			setTimeout(onTimer, 1000);

			// 
			// Indicate progress to the foreground application. 
			// 
			progress += 10;
			backgroundTaskInstance.progress = progress;

		} else {
			// 
			// Use the succeeded property to indicate if this background task completed successfully. 
			// 
			backgroundTaskInstance.succeeded = (progress === 100);
			value = backgroundTaskInstance.succeeded ? "Completed" : "Canceled with reason: " + cancelReason;
			console.log("Background " + backgroundTaskInstance.task.name + value);

			// 
			// Write to localSettings to indicate that this background task completed. 
			// 
			key = backgroundTaskInstance.task.name;
			settings.values[key] = value;

			// 
			// A JavaScript background task must call close when it is done. 
			// 
			close();
		}
	}

	// 
	// Start the timer function to simulate background task work. 
	// 
	//setTimeout(onTimer, 1000);
	doWork();
})();