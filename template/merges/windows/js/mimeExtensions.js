var mimeExtensionsTable = (function () {
    // List of mime types are read from a file. Used for attachment handling. 
    var extensionsMap;

	return {
		load: function (fileName, callback) {
		    var uri = new Windows.Foundation.Uri(fileName);
		    Windows.Storage.StorageFile.getFileFromApplicationUriAsync(uri).done(
                function (file) {
                    WinJS.xhr({ url: uri.toString() }).done(function (response) {
                        extensionsMap = JSON.parse(response.responseText);
                        callback();
                    }, function (error) {
                        console.log("error loading mime json content : " + error);
                        callback();
                    });

                },
                function (error) {
                    // error accessing file.
                    console.log("error accessing: " + fileName);
                    callback();
                }
            );
		},
		get: function (key) {
			if (extensionsMap) {
			    result = extensionsMap[key];
			}

			if (!result) {
			    result = ".unknowntype";
			}

			return result;
		}
	}
})();