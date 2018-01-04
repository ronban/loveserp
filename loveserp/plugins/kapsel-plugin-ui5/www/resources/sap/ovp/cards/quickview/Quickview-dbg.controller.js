(function () {
    "use strict";
    /*global sap, jQuery */

    jQuery.sap.require( "sap.ovp.cards.AnnotationHelper" );
    sap.ui.controller( "sap.ovp.cards.quickview.Quickview" , {
        onInit: function () {
        },
        //In the quickview card header, if either one of the texts is not present, the colon is removed
        onBeforeRendering: function(){
            var oHeaders = this.byId('ovpQuickviewCardHeader');
            if (oHeaders){
                var sText = oHeaders.getText();
                var sSub = sText.substring(0);
                if (sText[0] === ':'){
                    sSub = sText.substring(2);
                } else if (sText[sText.length - 2] === ':'){
                    sSub = sText.substring(0, sText.length - 2);
                }
                oHeaders.setText(sSub);
                var oCustomData = oHeaders.getCustomData();
                if (oCustomData){
                    for (var i = 0; i < oCustomData.length; ++i){
                        if (oCustomData[i].getProperty('key') === 'aria-label'){
                            oCustomData[i].setValue(sSub);
                        }   	
                    }
	            }
	        }
        },
        onAfterRendering: function(){
            jQuery( ".sapMQuickViewPage" ).attr( 'tabindex','0' );
            /**
             * The shotFirstActionInFooter flag is set in manifest.json. This is to avoid redundant navigation from Stack and Quickview cards.
             * If true, the first action in the footer of Quickview cards will be visible.
             * By default, it is false.
             */
            var oCardPropertiesModel = this.getCardPropertiesModel();
            var bShowFirstActionInFooter = oCardPropertiesModel.getProperty("/showFirstActionInFooter") ? oCardPropertiesModel.getProperty("/showFirstActionInFooter") : false;
            if ( !bShowFirstActionInFooter ) {
                var oFooter = this.byId("ovpActionFooter");
                if (oFooter) {
                    var aFooterBtns = oFooter.getContent();
                    if (aFooterBtns && aFooterBtns.length) {
                        for (var i = 0; i < aFooterBtns.length; i++) {
                            if (aFooterBtns[i] instanceof sap.m.Button) {
                                aFooterBtns[i].setVisible(false);
                                break;
                            }
                        }
                    }
                }
            }
        }

    });
})();
