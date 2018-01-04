(function () {
    "use strict";
    /*global sap, jQuery */

    sap.ui.controller("sap.ovp.cards.table.Table", {

        onInit: function () {
        },

        onColumnListItemPress: function (oEvent) {
            var aNavigationFields = this.getEntityNavigationEntries(oEvent.getSource().getBindingContext(), this.getCardPropertiesModel().getProperty("/annotationPath"));
            this.doNavigation(oEvent.getSource().getBindingContext(), aNavigationFields[0]);
        },

        /**
         * Gets the card items binding object for the count footer
         */
        getCardItemsBinding: function() {
            var table = this.getView().byId("ovpTable");
            return table.getBinding("items");
        },

        onAfterRendering: function () {
            var oTable = this.getView().byId("ovpTable");
            var aAggregation = oTable.getAggregation("columns");
            for (var iCount = 0; iCount < 3; iCount++) {
                if (aAggregation[iCount]) {
                    aAggregation[iCount].setStyleClass("sapTableColumnShow");
                }
            }
        }
    });
})();
