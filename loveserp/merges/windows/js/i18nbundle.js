var i18nBundle = (function () {
	var bundle;

	return {
		load: function (callback) {
			var i18n = cordova.require("kapsel-plugin-i18n.i18n");

			i18n.load({
				path: "plugins/kapsel-plugin-fioriclient/www"
			}, function (loadedBundle) {
				bundle = loadedBundle;
				callback();
			});
		},
		get: function (key, defaultValue) {
			if (bundle) {
				result = bundle.get(key);
			}

			if (!result) {
				result = defaultValue ? defaultValue : key;
			}

			return result;
		}
	}
})();