(function () {
	"use strict";
	/*global sap, jQuery */

	sap.ui.controller("sap.ovp.cards.charts.analytical.analyticalChart", {
		onInit: function () {
			sap.ovp.cards.charts.VizAnnotationManager.formatChartAxes();
			/* Chart Navigation */
//			var vizFrame = this.getView().byId("analyticalChart");
//			if (vizFrame) {
//				vizFrame.attachBrowserEvent("click", this.onHeaderClick.bind(this));
//				}
				this.bFlag = true;
				this.busyDelegate = {
						onBeforeRendering: function(){
							this.setBusy(true);
						}
					};
							
				this.freeDelegate = {
						onAfterRendering: function(){
							this.setBusy(false);
						}
					};
		},
		onBeforeRendering : function() {
			if (this.bCardProcessed) {
				return;
			}
			sap.ovp.cards.charts.VizAnnotationManager.validateCardConfiguration(this);
			var vizFrame = this.getView().byId("analyticalChart");
			var bubbleText = this.getView().byId("bubbleText");
			var bubbleSizeText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("BUBBLESIZE");
			var navigation;
			/*var navigation = vizFrame.getModel('ovpCardProperties').getProperty("/navigation");
			if (navigation == "chartNav") {
				vizFrame.attachBrowserEvent("click", this.onHeaderClick.bind(this));
			} else {
				sap.ovp.cards.charts.VizAnnotationManager.getSelectedDataPoint(vizFrame, this);
			}*/
			if (!vizFrame) {
				jQuery.sap.log.error(sap.ovp.cards.charts.VizAnnotationManager.constants.ERROR_NO_CHART +
						": (" + this.getView().getId() + ")");
			} else {
				navigation = vizFrame.getModel('ovpCardProperties').getProperty("/navigation");
				if (navigation == "chartNav") {
					vizFrame.attachBrowserEvent("click", this.onHeaderClick.bind(this));
				} else {
					sap.ovp.cards.charts.VizAnnotationManager.getSelectedDataPoint(vizFrame, this);
				}
				vizFrame.addEventDelegate(this.busyDelegate, vizFrame);
				sap.ovp.cards.charts.VizAnnotationManager.buildVizAttributes(vizFrame);
				if (bubbleText != undefined) {
					var feeds = vizFrame.getFeeds();
					jQuery.each(feeds,function(i,v){
						if (feeds[i].getUid() == "bubbleWidth") {
							bubbleText.setText(bubbleSizeText + " " + feeds[i].getValues());
						}
					});
				}
				sap.ovp.cards.charts.VizAnnotationManager.hideDateTimeAxis(vizFrame);
				var binding = vizFrame.getDataset().getBinding("data");
				
				// Handle KPI Header in Case of No Data in Analytical Cards
				this._handleKPIHeader();
				
				if (binding.getPath()) {
					binding.attachDataReceived(jQuery.proxy(this.onDataReceived, this));
					binding.attachDataRequested(jQuery.proxy(this.onDataRequested, this));
				} else {
					var noDataDiv = sap.ui.xmlfragment("sap.ovp.cards.charts.generic.noData");
					var cardContainer = this.getCardContentContainer();
					cardContainer.removeAllItems();
					cardContainer.addItem(noDataDiv);
				}
			}
			this.bCardProcessed = true;
		},
		onDataReceived: function(oEvent) {
			var vizFrame = this.getView().byId("analyticalChart");
			if (this.bFlag == true) {
			vizFrame.addEventDelegate(this.freeDelegate, vizFrame);
			this.bFlag = false;
			} else {
				setTimeout(function(){
					vizFrame.setBusy(false);
					},0);
			}
			sap.ovp.cards.charts.VizAnnotationManager.checkNoData(oEvent, this.getCardContentContainer(), vizFrame);
		},
		onDataRequested : function() {
			var vizFrame = this.getView().byId("analyticalChart");
			vizFrame.removeEventDelegate(this.freeDelegate, vizFrame);
			vizFrame.setBusy(true);
		},
		
		getCardItemsBinding: function() {
            var vizFrame = this.getView().byId("analyticalChart");
            return vizFrame.getDataset().getBinding("data");
        }
	});
})();
