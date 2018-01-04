(function () {
    "use strict";
    /*global sap, jQuery */
    jQuery.sap.require("sap.ovp.ui.ObjectStream");
    jQuery.sap.require("sap.ovp.cards.AnnotationHelper");

    sap.ui.controller("sap.ovp.cards.stack.Stack", {
        onInit: function () {
            var oVbox = this._oCard = this.getView().byId("stackContent");
            oVbox.addEventDelegate({
                onclick: this.openStack.bind(this),
                //when space or enter is pressed on stack card, we open ObjectStream
                onkeydown: function (oEvent) {
                    if (!oEvent.shiftKey && (oEvent.keyCode == 13 || oEvent.keyCode == 32)) {
                        oEvent.preventDefault();
                        this.openStack();
                    }
                }.bind(this)
            });
        },
        onExit: function () {
            if (this.oObjectStream) {
                this.oObjectStream.destroy();
            }
        },

        onAfterRendering: function () {
            var oView = this.getView();
            var oModel = oView.getModel();
            var oCardPropsModel = oView.getModel("ovpCardProperties");
            var sEntitySet = oCardPropsModel.getProperty("/entitySet");
            var oObjectStreamCardsSettings = oCardPropsModel.getProperty("/objectStreamCardsSettings");
            var oMetaModel = oModel.getMetaModel();
            var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
            var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

            //in order to support auto expand, the annotationPath property contains a "hint" to the
            //annotaionPath of the stack card content. There might be more then 1 annotationPath value due to support of Facets
            var sAnnotationPath = oCardPropsModel.getProperty("/annotationPath");
            var aAnotationPath = (sAnnotationPath) ? sAnnotationPath.split(",") : [];
            var oAppComponent, oOwner, oGlobalFilter;
            if (this.getOwnerComponent() && this.getOwnerComponent().getComponentData()) {
                oAppComponent = this.getOwnerComponent().getComponentData().appComponent;
                oOwner = this.getOwnerComponent().getComponentData().mainComponent;
            }
            if (oOwner) {
                oGlobalFilter = oOwner.getView().byId("ovpGlobalFilter");
            }
            function getSetting(sKey) {
                if (sKey === "ovpCardProperties") {
                    return oCardPropsModel;
                } else if (sKey === "dataModel") {
                    return oModel;
                } else if (sKey === "_ovpCache") {
                    return {};
                }
            }

            var aFormatItemsArguments = [{
                getSetting: getSetting,
                bDummyContext: true
            }, oEntitySet].concat(aAnotationPath);
            var sBindingInfo = sap.ovp.cards.AnnotationHelper.formatItems.apply(this, aFormatItemsArguments);
            var oBindingInfo = sap.ui.base.BindingParser.complexParser(sBindingInfo);

            var sObjectStreamCardsNavigationProperty = oCardPropsModel.getProperty("/objectStreamCardsNavigationProperty");
            var bStackFlavorAssociation = sObjectStreamCardsNavigationProperty ? true : false;
            var oStackFilterMapping;
            var sObjectStreamCardsTemplate = oCardPropsModel.getProperty("/objectStreamCardsTemplate");


            // if we are in the association-flavor scenario we need to determine bot filter AND entity set for the object stream cards
            if (bStackFlavorAssociation) {
                if (sObjectStreamCardsTemplate === "sap.ovp.cards.quickview") {
                    jQuery.sap.log.error("objectStreamCardsTemplate cannot be 'sap.ovp.cards.quickview' when objectStreamCardsNavigationProperty is provided");
                    this.setErrorState();
                    return;
                }

                oStackFilterMapping = this._determineFilterPropertyId(oModel, oEntitySet, oEntityType, sObjectStreamCardsNavigationProperty);
                oObjectStreamCardsSettings.entitySet = oModel.getMetaModel().getODataAssociationSetEnd(oEntityType, sObjectStreamCardsNavigationProperty).entitySet;
            } else {
                if (sObjectStreamCardsTemplate !== "sap.ovp.cards.quickview") {
                    jQuery.sap.log.error("objectStreamCardsTemplate must be 'sap.ovp.cards.quickview' when objectStreamCardsNavigationProperty is not provided");
                    this.setErrorState();
                    return;
                }

                /**
                 * We are in the regular scenario (QuickView cards for collection entities).
                 * Check if a separate identification annotation has been added for the object stream.
                 */
                var sIdentificationPath = null;
                var sIdentificationAnnotationPath = oCardPropsModel.getProperty("/identificationAnnotationPath");
                var aIdentificationPath = (sIdentificationAnnotationPath) ? sIdentificationAnnotationPath.split(",") : [];
                if (aIdentificationPath && aIdentificationPath.length > 1) {
                    sIdentificationPath = aIdentificationPath[1];
                }

                if (sIdentificationPath) {
                    oObjectStreamCardsSettings.identificationAnnotationPath = sIdentificationPath;
                }

                if (oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"] &&
                    oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName &&
                    oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName.String) {
                    oObjectStreamCardsSettings.title = oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName.String;
                } else {
                    oObjectStreamCardsSettings.title = oEntityType.name;
                }
                oObjectStreamCardsSettings.entitySet = sEntitySet;
            }


            oBindingInfo.factory = function (sId, oContext) {
                var oSettings = oObjectStreamCardsSettings, oFilters;

                if (bStackFlavorAssociation) {

                    oFilters = {
                        filters: [{
                            path: oStackFilterMapping.foreignKey,
                            operator: "EQ",
                            value1: oContext.getProperty(oStackFilterMapping.key)
                        }]
                    };

                    oSettings = jQuery.extend(oFilters, oObjectStreamCardsSettings);
                }


                var oComponent = sap.ui.component({
                    name: oCardPropsModel.getProperty("/objectStreamCardsTemplate"),
                    componentData: {
                        model: oModel,
                        settings: oSettings,
                        appComponent: oAppComponent,
                        mainComponent: oOwner
                    }
                });

                // set the globalFilter property
                if (oGlobalFilter) {
                    oComponent.oComponentData.globalFilter = {
                        getFilterDataAsString: oGlobalFilter.getDataSuiteFormat.bind(oGlobalFilter)
                    };
                }
                var oi18nModel = oView.getModel("@i18n");
                if (oi18nModel) {
                    oComponent.setModel(oi18nModel, "@i18n");
                }

                var oCardComp = new sap.ui.core.ComponentContainer({component: oComponent});
                /* we need to override the setBindingContext method as from some reason
                 * when calling it on the container its not set on the inner component
                 */
                oCardComp.setBindingContext = function (oContext) {
                    oComponent.setBindingContext(oContext);
                };
                return oCardComp;
            };

            /**
             * The object stream title is an angregation to the object stream custom control.
             * Since we need to handle the navigation, we have the handler in the stack controller itself.
             */
            var sObjectStreamTitle = oCardPropsModel.getObject("/title");
            var oObjectStreamTitle = new sap.m.Link({
                text: sObjectStreamTitle,
                subtle: true,
                press: this.handleObjectStreamTitlePressed.bind(this)
            }).addStyleClass("sapOvpObjectStreamHeader");
            oObjectStreamTitle.addCustomData(new sap.ovp.ui.CustomData({
                key: "tabindex",
                value: "0",
                writeToDom: true
            }));
            oObjectStreamTitle.addCustomData(new sap.ovp.ui.CustomData({
                key: "aria-label",
                value: sObjectStreamTitle,
                writeToDom: true
            }));
            oObjectStreamTitle.addCustomData(new sap.ovp.ui.CustomData({
                key: "role",
                value: "heading",
                writeToDom: true
            }));
            this.oObjectStream = new sap.ovp.ui.ObjectStream({
                title: oObjectStreamTitle,
                content: oBindingInfo
            });
            //this.getView().addDependent(this.oObjectStream);
            this.oObjectStream.setModel(oModel);

            // place holder card is relevant only for the regular Stack-Card flavor (not the AssociationSet flavor)
            if (!bStackFlavorAssociation) {
                //Check if we have navigate target, if there is create placeHolder card and set it
                var aNavigationFields = this.getEntityNavigationEntries();
                if (aNavigationFields.length > 0) {
                    var sAppName = aNavigationFields[0].label;
                    var oPlaceHolder = this._createPlaceHolder(sObjectStreamTitle, sAppName);
                    var that = this;

                    oPlaceHolder.addEventDelegate({
                        onclick: function () {
                            that.doNavigation(null);
                        }
                    });

                    this.oObjectStream.setPlaceHolder(oPlaceHolder);
                }
            }


            var oListBinding = this.oObjectStream.getBinding("content");
            oListBinding.attachDataReceived(function () {
                var category = this.getView().getModel("ovpCardProperties").getObject("/category"),
                    nCardCount = oListBinding.getCurrentContexts().length,
                    nTotalCardCount = oListBinding.getLength();
                oView.byId("stackSize").setText(nCardCount);
                oView.byId("stackTotalSize").setText(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Total_Size_Stack_Card", [nTotalCardCount]));
                var stackContentDomRef = this.getView().byId("stackContent").getDomRef();
                jQuery(stackContentDomRef).attr("aria-label", sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("stackCardContent", [nCardCount, nTotalCardCount, category]));
                var stackSizeDomRef = this.getView().byId("stackSize").getDomRef();
                jQuery(stackSizeDomRef).attr("aria-label", sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("stackCard", [nCardCount]));
            }, this);
        },

        _determineFilterPropertyId: function (oModel, oEntitySet, oEntityType, sNavigationProperty) {
            var oNavigationProperty, ns = oEntityType.namespace, sRelationshipName, oAssociation;

            // find the relevant navigation property on the entity type
            for (var i = 0; i < oEntityType.navigationProperty.length; i++) {
                if (oEntityType.navigationProperty[i].name === sNavigationProperty) {
                    oNavigationProperty = oEntityType.navigationProperty[i];
                    break;
                }
            }

            // find the Association ID / object which is the navigation property relationship member
            sRelationshipName = oNavigationProperty.relationship;
            oAssociation = sap.ovp.cards.AnnotationHelper.getAssociationObject(oModel, sRelationshipName, ns);

            // find the filter value for stack card - by looking at the Association Object
            var oRefs = oAssociation.referentialConstraint, filterMapping = {};
            if (oRefs) {
                filterMapping.foreignKey = oRefs.dependent.propertyRef[0].name;
                filterMapping.key = oRefs.principal.propertyRef[0].name;
                return filterMapping;
            }
        },

        _createPlaceHolder: function (sObjectStreamTitle, sAppName) {

            var iIcon = new sap.ui.core.Icon({
                src: "sap-icon://display-more",
                useIconTooltip: false,
                layoutData: new sap.m.FlexItemData({
                    alignSelf: sap.m.FlexAlignSelf.Center,
                    styleClass: "sapOvpStackPlaceHolderIconContainer"
                })
            });

            iIcon.addStyleClass("sapOvpStackPlaceHolderIcon");

            var strText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("SeeMoreContentAppName", [sObjectStreamTitle, sAppName]);
            var txtText = new sap.m.Text({
                text: strText,
                textAlign: "Center",
                layoutData: new sap.m.FlexItemData({
                    alignSelf: sap.m.FlexAlignSelf.Center,
                    maxWidth: "14rem"
                })
            });
            txtText.addCustomData(new sap.ovp.ui.CustomData({
                key: "role",
                value: "heading",
                writeToDom: true
            }));
            txtText.addCustomData(new sap.ovp.ui.CustomData({
                key: "aria-label",
                value: strText,
                writeToDom: true
            }));

            txtText.addStyleClass("sapOvpStackPlaceHolderTextLine");

            var oDivVbox = new sap.m.VBox({items: [txtText]});
            oDivVbox.addStyleClass("sapOvpStackPlaceHolderLabelsContainer");
            oDivVbox.addCustomData(new sap.ovp.ui.CustomData({
                key: "tabindex",
                value: "0",
                writeToDom: true
            }));
            oDivVbox.addCustomData(new sap.ovp.ui.CustomData({
                key: "role",
                value: "button",
                writeToDom: true
            }));

            var oVbox = new sap.m.VBox({items: [iIcon, oDivVbox]});
            oVbox.addStyleClass("sapOvpStackPlaceHolder");
            oVbox.addEventDelegate({
                //when space or enter is pressed on Placeholder, we trigger click
                onkeydown: function (oEvent) {
                    if (!oEvent.shiftKey && (oEvent.keyCode == 13 || oEvent.keyCode == 32)) {
                        oEvent.preventDefault();
                        oEvent.srcControl.$().click();
                    }
                }
            });
            return oVbox;
        },

        openStack: function () {
            if (this.oObjectStream) {
                var oListBinding = this.oObjectStream.getBinding("content");
                if (oListBinding.getCurrentContexts().length > 0) {
                    var cardWidth = this.getView().$().width();
                    this.getView().addDependent(this.oObjectStream);
                    this.oObjectStream.setModel(this.getView().getModel("@i18n"), "@i18n");
                    this.oObjectStream.open(cardWidth, this._oCard);
                }
            }
        },

        /**
         * Handler for press of object stream header.
         * @param oEvent
         */
        handleObjectStreamTitlePressed: function(oEvent) {
            /**
             * Object stream header follows the same navigation as the placeholder card.
             */
            this.doNavigation(null);
        }
    });
})();

