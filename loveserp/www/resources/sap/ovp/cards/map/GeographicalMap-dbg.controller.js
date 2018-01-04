(function() {
	"use strict";
	/*global sap, jQuery */

	sap.ui.controller("sap.ovp.cards.map.GeographicalMap", {
		onInit: function (oEv) {
			this.showLabelText = this.getOwnerComponent().getComponentData().settings.showLabelText;
			return null;
		},
		resizeCard: function(newCardLayout) {
			//this.byId("mapPOC").setWidth(this.getView().$().width());
		},
		formatterGeo : function (latitude, longitude) {
			/* Reverse format from lat long to Visual Business Long;Lat;0 */
			return parseFloat(longitude) + ";" + parseFloat(latitude) + ";0";
		},
		formatterLabelText : function(streetName) {
				return this.showLabelText === "true" ? streetName : null;
		},
		onBeforeRendering: function() {
			var oVBI = this.getView().byId("oVBI");
			oVBI.getAggregation("vos")[0].getBinding("items").attachChange( function (item) {
				var zoomA = [],zoomB = [];

				this.getAggregation("vos")[0].getItems().forEach( function (item) {
					var pos = item.getPosition();
					if (pos != '0;0;0') {
						var Lon = item.getPosition().split(";")[0];
						var Lat = item.getPosition().split(";")[1];
						zoomA.push(Number(Lon));
						zoomB.push(Number(Lat));
					}
				});
				//zoom to one or multiple geo positions
				if (zoomA.length > 1) {
					//multiple spots. has no zoom level. remains at 10,000km
					this.zoomToGeoPosition(zoomA, zoomB);
				}
				if (zoomA.length <= 1) {
					//provide zoom level for a single spot. zooms to 500km.
					this.zoomToGeoPosition(zoomA, zoomB, 5);
				}
			}.bind(oVBI));

			//set the map using object oMapConfig created in Manifest file.
			var oMapConfig = this.getOwnerComponent().getComponentData().settings.oMapConfig;
			oVBI.setMapConfiguration(oMapConfig);
		}
	});
})();