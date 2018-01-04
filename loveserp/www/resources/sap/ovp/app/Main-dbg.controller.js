(function () {
    "use strict";
    /*global sap, jQuery */

    jQuery.sap.require("sap.ui.model.odata.ODataUtils");
    jQuery.sap.require("sap.ovp.cards.generic.Component");
    jQuery.sap.require("sap.ui.generic.app.navigation.service.NavigationHandler");
    jQuery.sap.require("sap.m.MessageBox");
    jQuery.sap.require("sap.ovp.cards.CommonUtils");

    sap.ui.controller("sap.ovp.app.Main", {

        onInit: function () {
            this.oCardsModels = {};
            this.oLoadedComponents = {};
            jQuery.sap.measure.start("ovp:GlobalFilter", "Main Controller init -> Global Filter loaded", "ovp");
            jQuery.sap.measure.start("ovp:Personalization", "Main Controller init -> Personalization loaded", "ovp");
            this.isInitialLoading = true;
            if (this.getOwnerComponent()) {
                this.oValueHelpMap = this.getOwnerComponent().getModel("ui").getProperty("/ValueHelpEntityMap");
            }
            this._initSmartVariantManagement();
            this.getLayout().addStyleClass("ovpLayoutElement");
            /* Appstate*/
            this.oState = {};
            this.oState.oSmartFilterbar = this.byId("ovpGlobalFilter");
            /* Appstate */
            this._initGlobalFilter();
        },

        recreateCard: function (sCardProperties) {
            var oCard = this._getCardFromManifest(sCardProperties.cardId);
            if (oCard.template == "sap.ovp.cards.charts.analytical") {
                oCard.settings.chartAnnotationPath = sCardProperties.chartAnnotationPath;
                oCard.settings.navigation = sCardProperties.navigation;
            }
            oCard.settings.annotationPath = sCardProperties.annotationPath;
            oCard.settings.presentationAnnotationPath = sCardProperties.presentationAnnotationPath;
            oCard.settings.selectionAnnotationPath = sCardProperties.selectionAnnotationPath;
            oCard.settings.dataPointAnnotationPath = sCardProperties.dataPointAnnotationPath;
            oCard.settings.identificationAnnotationPath = sCardProperties.identificationAnnotationPath;
            oCard.settings.selectedKey = sCardProperties.selectedKey;
            if (oCard) {
                this.createLoadingCard(oCard);
                oCard.settings.baseUrl = this._getBaseUrl();
                this._initCardModel(oCard.model);
                this._loadCardComponent(oCard.template);
                this.createCard(oCard);
            }
            if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                var oDashboardUtil = this.getLayout().getDashboardLayoutUtil();
                if (oDashboardUtil) {
                    var oDashBoardLayoutModel = oDashboardUtil.getDashboardLayoutModel();
                    var oDashboardCard = oDashBoardLayoutModel.getCardById(oCard.id);
                    var resizeData = {
                        colSpan: oDashboardCard.dashboardLayout.colSpan,
                        rowSpan: oDashboardCard.dashboardLayout.rowSpan
                    };
                    oDashboardUtil.setRecreateCard(resizeData);
                    oDashboardCard.dashboardLayout.autoSpan = true;
                }
            }



            this.saveVariant();

        },

        //clarify with UI5 Core: why can view models not be accessed in onInit?
        onBeforeRendering: function () {
        },

        onAfterRendering: function () {
            //make sure we will not initialize more then ones
            if (this.initialized) {
                return;
            }
            this.initialized = true;

            this.oPersistencyVariantPromise.then(function (oVariant) {
                jQuery.sap.measure.end("ovp:Personalization");
                this.persistencyVariantLoaded = true;
                var oCard;
                var cardsIntentWithIndex = [], cardsIntent = [];
                this.aManifestOrderedCards = this._getCardArrayAsVariantFormat(this.getLayout().getContent());

                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    this.aOrderedCards = this._mergeLrepDashboardLayout(this.aManifestOrderedCards, oVariant);
                } else {
                    this.aOrderedCards = this._mergeCards(this.aManifestOrderedCards, oVariant);
                }

                //Check For Authorization
                for (var counter = 0; counter < this.aOrderedCards.length; counter++) {
                    oCard = this._getCardFromManifest(this.aOrderedCards[counter].id);
                    if (oCard && oCard.settings && oCard.settings.requireAppAuthorization) {
                        cardsIntentWithIndex.push({
                            id: oCard.id,
                            cardIntent: oCard.settings.requireAppAuthorization
                        });
                        cardsIntent.push(oCard.settings.requireAppAuthorization);
                    }
                }

                if (cardsIntent.length > 0) {
                    this._checkForAuthorization(cardsIntentWithIndex, cardsIntent);
                }

                this._updateLayoutWithOrderedCards();
                if (this.isDragAndDropEnabled()) {
                    this._initShowHideCardsButton();
                }

                jQuery.sap.measure.start("ovp:CreateLoadingCards", "Create Loading cards", "ovp");
                //First create the loading card
                for (var i = 0; i < this.aOrderedCards.length; i++) {
                    if (this.aOrderedCards[i].visibility) {
                        oCard = this._getCardFromManifest(this.aOrderedCards[i].id);
                        if (oCard) {
                            this.createLoadingCard(oCard);
                        }
                    }
                }
                jQuery.sap.measure.end("ovp:CreateLoadingCards");

                //In order to add the below css class after second layout rendering which caused by this._updateLayoutWithOrderedCards()
                setTimeout(function () {
                    this.getLayout().addStyleClass("ovpLayoutElementShow");
                }.bind(this), 0);

                //Second load each card component and create the card
                //We would like to wait for the loading cards invocation
                setTimeout(function () {
                    jQuery.sap.measure.start("ovp:CreateCards", "Create cards loop", "ovp");
                    for (var i = 0; i < this.aOrderedCards.length; i++) {
                        if (this.aOrderedCards[i].visibility) {
                            oCard = this._getCardFromManifest(this.aOrderedCards[i].id);
                            if (!oCard.settings.title) {
                                jQuery.sap.log.error("title is mandatory for card ID : " + oCard.id);
                            }
                            if (oCard.settings.tabs) {
                                var iIndex = 0;
                                if (this.aOrderedCards[i].selectedKey) {
                                    iIndex = this.aOrderedCards[i].selectedKey - 1;
                                }
                                this.initializeTabbedCard(oCard, iIndex);
                            }
                            if (oCard) {
                                oCard.settings.baseUrl = this._getBaseUrl();
                                this._initCardModel(oCard.model);
                                this._loadCardComponent(oCard.template);
                                this.createCard(oCard);
                            }
                        }
                    }
                    jQuery.sap.measure.end("ovp:CreateCards");
                }.bind(this), 10);

                if (this.busyDialog) {
                    this.busyDialog.close();
                }
            }.bind(this), function (err) {
                jQuery.sap.log.error("Could not load information from LREP Persistency");
                jQuery.sap.log.error(err);
            });
            if (sap.ui.Device.system.phone) {
                jQuery.sap.require("sap.ovp.ui.SmartphoneHeaderToggle");
                sap.ovp.ui.SmartphoneHeaderToggle.enable(this);
            }

            setTimeout(function () {
                if (!this.persistencyVariantLoaded) {
                    this.busyDialog = new sap.m.BusyDialog({
                        text: this._getLibraryResourceBundle().getText("loading_dialog_text")
                    });
                    this.busyDialog.open();
                    this.busyDialog.addStyleClass('sapOVPBusyDialog');
                }
            }.bind(this), 500);
        },

        initializeTabbedCard: function (oCard, iIndex) {
            if (oCard.template == "sap.ovp.cards.charts.analytical") {
                oCard.settings.chartAnnotationPath = oCard.settings.tabs[iIndex].chartAnnotationPath;
                oCard.settings.navigation = oCard.settings.tabs[iIndex].navigation;
            }
            oCard.settings.annotationPath = oCard.settings.tabs[iIndex].annotationPath;
            oCard.settings.presentationAnnotationPath = oCard.settings.tabs[iIndex].presentationAnnotationPath;
            oCard.settings.selectionAnnotationPath = oCard.settings.tabs[iIndex].selectionAnnotationPath;
            oCard.settings.dataPointAnnotationPath = oCard.settings.tabs[iIndex].dataPointAnnotationPath;
            oCard.settings.identificationAnnotationPath = oCard.settings.tabs[iIndex].identificationAnnotationPath;
            oCard.settings.selectedKey = iIndex + 1;
        },

        _getLibraryResourceBundle: function () {
            if (!this.oLibraryResourceBundle) {
                this.oLibraryResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
            }
            return this.oLibraryResourceBundle;
        },

        _getOvplibResourceBundle: function() {
            if (!this.ovplibResourceBundle) {
                var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ovp");
                this.ovplibResourceBundle = oResourceBundle ? new sap.ui.model.resource.ResourceModel({
                    bundleUrl: oResourceBundle.oUrlInfo.url
                }) : null;
            }
            return this.ovplibResourceBundle;
        },

        _getCardsModel: function () {
            var oUIModel = this.getView().getModel("ui");
            if (!this.oCards) {
                this.oCards = oUIModel.getProperty("/cards");
            }
            return this.oCards;
        },

        _getBaseUrl: function () {
            var oUIModel = this.getView().getModel("ui");
            if (!this.sBaseUrl) {
                this.sBaseUrl = oUIModel.getProperty("/baseUrl");
            }
            return this.sBaseUrl;
        },

        _getCardFromManifest: function (sCardId) {
            var aCards = this._getCardsModel();
            for (var i = 0; i < aCards.length; i++) {
                if (aCards[i].id === sCardId) {
                    return aCards[i];
                }
            }

            return null;
        },

        _getCardArrayAsVariantFormat: function (aComponentContainerArray) {
            var aCards = [];

            for (var i = 0; i < aComponentContainerArray.length; i++) {
                var sId = this._getCardId(aComponentContainerArray[i].getId());
                aCards.push({
                    id: sId,
                    visibility: aComponentContainerArray[i].getVisible()
                });
                var iSelectedKey;
                if (this.getView() && this.getView().byId) {
                    if (this.getView().byId(sId).getComponentInstance()) {
                        iSelectedKey = this.getView().byId(sId).getComponentInstance().getComponentData().settings.selectedKey;
                    }
                }

                if (iSelectedKey) {
                    aCards[aCards.length - 1].selectedKey = iSelectedKey;
                }

            }
            return aCards;
        },

        _mergeCards: function (aLayoutCardsArray, oVariant) {
            var variantCardsArray = (oVariant && oVariant.cards) ? oVariant.cards : [];
            var oResult = [];
            var sCardId;
            var bCardVisibility;
            var iSelectedKey;
            var aLayoutCardsArr = (aLayoutCardsArray && aLayoutCardsArray.length) ? aLayoutCardsArray : [];

            //First, we insert into the oResult the cards from the variant which exist in the oLayoutCard:
            for (var i = 0; i < variantCardsArray.length; i++) {
                bCardVisibility = variantCardsArray[i].visibility;
                iSelectedKey = variantCardsArray[i].selectedKey;
                for (var j = 0; j < aLayoutCardsArr.length; j++) {
                    sCardId = aLayoutCardsArr[j].id;
                    if (variantCardsArray[i].id === sCardId) {
                        oResult.push({
                            id: sCardId,
                            visibility: bCardVisibility
                        });
                        if (iSelectedKey) {
                            oResult[oResult.length - 1].selectedKey = iSelectedKey;
                        }
                        break;
                    }
                }
            }

            //Second, we add additional cards from the current layout (fragment + manifest) into the end of the oResult
            for (var j = 0; j < aLayoutCardsArr.length; j++) {
                var isFound = false;
                sCardId = aLayoutCardsArr[j].id;
                bCardVisibility = aLayoutCardsArr[j].visibility;
                iSelectedKey = aLayoutCardsArr[j].selectedKey;
                for (var i = 0; !isFound && i < oResult.length; i++) {
                    if (oResult[i].id === sCardId) {
                        isFound = true;
                    }
                }

                if (!isFound) {
                    oResult.push({
                        id: sCardId,
                        visibility: bCardVisibility
                    });
                    if (iSelectedKey) {
                        oResult[oResult.length - 1].selectedKey = iSelectedKey;
                    }
                }
            }

            return oResult;
        },

        // We have all the cards so we check with isIntentSupported
        // if the user has the app within it’s roles and only display the card in this case.
        _checkForAuthorization: function (cardsIntentWithIndex, cardsIntent) {
            var that = this;
            var oNavigationHandler = sap.ovp.cards.CommonUtils.getNavigationHandler();
            if (oNavigationHandler && oNavigationHandler.oCrossAppNavService) {
                oNavigationHandler.oCrossAppNavService.isIntentSupported(cardsIntent).done(function (oResponse) {
                    for (var i = 0; i < cardsIntentWithIndex.length; i++) {
                        if (oResponse[cardsIntentWithIndex[i].cardIntent].supported === false) {
                            for (var j = 0; j < that.aOrderedCards.length; j++) {
                                if (cardsIntentWithIndex[i].id === that.aOrderedCards[j].id) {
                                    that.aOrderedCards.splice(j, 1);
                                    break;
                                }
                            }
                        }
                    }
                }).fail(function () {
                    jQuery.sap.log.error("Could not get authorization from isIntentSupported");
                });
            }
        },

        /**
         * _mergeLrepDashboardLayout is called once in first onAfterRendering
         */
        _mergeLrepDashboardLayout: function (aLayoutCardsArray, oLrepContent) {
            var aCards = [];
            var oUiModel = this.getLayout().getModel("ui");
            var oLayouts = {};
            var layoutKey = null;

            //MANIFEST
            var oLayoutRaw = oUiModel.getProperty("/dashboardLayout");
            if (oLayoutRaw) {
                var oVariant = {};
                for (layoutKey in oLayoutRaw) {
                    if (oLayoutRaw.hasOwnProperty(layoutKey) && oLayoutRaw[layoutKey]) {
                        oVariant = oLayoutRaw[layoutKey];
                        oVariant.id = layoutKey;
                        oVariant.__ovpDBLVarSource = "manifest";
                        oVariant.__ovpDBLVarId = "C" + parseInt(oVariant.id.replace(/[^0-9\.]/g, ""), 10);
                        oLayouts[oVariant.__ovpDBLVarId] = oVariant;
                    }
                }
            }
            //set manifest json string in dashboardmodel (required for reset)
            this.getLayout().getDashboardLayoutModel().setManifestLayoutsJSON(JSON.stringify(oLayouts));
            //remember that merge was executed --> following changes can be persisted
            this._bDashboardLayoutLrepActive = true;
            // 			}
            if (oLrepContent && oLrepContent.dashboardLayout) {
                for (layoutKey in oLrepContent.dashboardLayout) {
                    if (oLrepContent.dashboardLayout[layoutKey]) {
                        oLrepContent.dashboardLayout[layoutKey].__ovpDBLVarSource = "lrep";
                        //add or overwrite manifest variant
                        oLayouts[layoutKey] = oLrepContent.dashboardLayout[layoutKey];
                    }
                }
            }
            //ui model keeps manifest version in /dashboardLayout (for reset)
            //update dashboardLayoutModel layout
            this.getLayout().getDashboardLayoutModel().setLayoutVars(oLayouts);
            //set initial layout (required for initial card rendering)
            oUiModel.setProperty("/initialDashboardLayout", [this.getLayout().getDashboardLayoutUtil().buildLayout(jQuery(window).width())]);
            //set card visibility
            if (layoutKey) {
                var aManifestCards = oUiModel.getProperty("/cards");
                var oLayout = oLayouts[layoutKey];
                if (aManifestCards && oLayout) {
                    aCards = this._initDashboardLayoutCardVisibility(aManifestCards, oLayout, aLayoutCardsArray);
                }
            }
            if (aCards.length === 0) {
                //fallback to EasyScan version
                aCards = this._mergeCards(this.aManifestOrderedCards, oVariant);
            }
            return aCards;
        },

        _initDashboardLayoutCardVisibility: function (aManifestCards, oLayout, aLayoutCardsArray) {
            var aCards = [];
            var i = 0;
            var sCardId;
            var oLayoutCard = null;
            var bVisible = true;

            if (oLayout && aManifestCards) {
                for (i = 0; i < aManifestCards.length; i++) {
                    sCardId = aManifestCards[i].id;
                    // in the first version the card visibility is same for all layout variants --> take the current variant
                    oLayoutCard = oLayout[sCardId];

                    if (oLayoutCard && oLayoutCard.hasOwnProperty("visible")) {
                        bVisible = oLayoutCard.visible;
                    } else {
                        bVisible = true;
                    }
                    aCards.push({
                        id: sCardId,
                        visibility: bVisible
                    });
                }
                //merge aLayoutCardsArray if required
                if (aLayoutCardsArray && aLayoutCardsArray.length > 0) {
                    for (i = 0; i < aLayoutCardsArray.length; i++) {
                        sCardId = aLayoutCardsArray[i].id;
                        if (!oLayout[sCardId]) {
                            aCards.push({
                                id: sCardId,
                                visibility: aLayoutCardsArray[i].visibility
                            });
                        }
                    }
                }
            }
            return aCards;
        },

        _updateLayoutWithOrderedCards: function () {
            var oLayout = this.getLayout();
            var aOrderedCards = this.aOrderedCards;
            oLayout.removeAllContent();
            for (var i = 0; i < aOrderedCards.length; i++) {
                var oComponentContainer = this.getView().byId(aOrderedCards[i].id);
                oComponentContainer.setVisible(aOrderedCards[i].visibility);
                oLayout.addContent(oComponentContainer);
            }
        },

        _updateDashboardLayoutCards: function (aCards) {
            if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                if (this.getLayout().getDashboardLayoutUtil()) {
                    this.getLayout().getDashboardLayoutUtil().updateCardVisibility(aCards);
                }
            }
        },

        _resetDashboardLayout: function () {
            if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                if (this.getLayout().getDashboardLayoutUtil()) {
                    this.getLayout().getDashboardLayoutUtil().resetToManifest();
                }
                this.getLayout().rerender();
            }
        },

        verifyGlobalFilterLoaded: function () {
            //Currently there is no public function to check if the mandatory filter is empty.
            //Hence using SmartFilter Bar's _validateMandatoryFields.
            //Will replace this once there's a valid method for this check.
            if (this.getGlobalFilter()._validateMandatoryFields()) {
                if (this.getGlobalFilter().search()) {
                    return true;
                }
            }
            //else make sure filter is open so user will see the required field
            return false;
        },

        /**
         * Register to the filterChange event of the filter bar in order to mark that
         * one or more of the filters were changed
         */
        onGlobalFilterChange: function () {
            this.filterChanged = true;
        },

        /**
         * Register to the search event of the filter bar in order to refresh all models
         * with the changes in the filter bar (if there are changes) when "go" is clicked
         */
        onGlobalFilterSearch: function () {
            if (this.filterChanged) {
                var sBatchGroupId = "ovp-" + new Date().getTime();
                for (var modelKey in this.oCardsModels) {
                    if (this.oCardsModels.hasOwnProperty(modelKey)) {
                        this.oCardsModels[modelKey].refresh(false, false, sBatchGroupId);
                    }
                }
                this.filterChanged = false;
            }
        },

        _initGlobalFilter: function () {
            var oGlobalFilter = this.getGlobalFilter();
            if (!oGlobalFilter) {
                this._parseNavigationVariant();
                jQuery.sap.measure.end("ovp:GlobalFilter");
                return;
            }

            this.oGlobalFilterLodedPromise = new Promise(function (resolve, reject) {
                oGlobalFilter.attachAfterVariantLoad(function () {
                    this.oParseNavigationPromise.done(function (oAppData, oURLParameters, sNavType) {
                        this._setNavigationVariantToGlobalFilter(oAppData, oURLParameters, sNavType);
                    }.bind(this));
                    this.oParseNavigationPromise.fail(function () {
                        jQuery.sap.log.error("Could not parse navigation variant from URL");
                    });
                    this.oParseNavigationPromise.always(function () {
                        if (oGlobalFilter && this.verifyGlobalFilterLoaded()) {
                            resolve();
                        }
                    }.bind(this));
                }, this);

                oGlobalFilter.attachInitialise(function () {
                    //Parse navigation variant from the URL (if exists)
                    this._parseNavigationVariant();
                    // in case no variant is selected by user then the attachAfterVariantLoad
                    //event is not fired, therefore we check if there is no variant we
                    //call the verification here
                    if (!oGlobalFilter.getCurrentVariantId()) {
                        if (this.oParseNavigationPromise) {
                            this.oParseNavigationPromise.done(function (oAppData, oURLParameters, sNavType) {
                                if (oAppData) {
                                    this._setNavigationVariantToGlobalFilter(oAppData, oURLParameters, sNavType);
                                }
                            }.bind(this));
                            this.oParseNavigationPromise.fail(function () {
                                jQuery.sap.log.error("Could not parse navigation variant from URL");
                            });
                            this.oParseNavigationPromise.always(function () {
                                if (oGlobalFilter && this.verifyGlobalFilterLoaded()) {
                                    resolve();
                                }
                            }.bind(this));
                        } else {
                            if (oGlobalFilter && this.verifyGlobalFilterLoaded()) {
                                resolve();
                            }
                        }
                    }
                }, this);

                oGlobalFilter.attachSearch(function () {
                    //If user pressed GO, it means that the required field varification
                    //was allredy done by the globalFilter, therefore we can resolve the promise.
                    //This is needed in case some required field was empty and therefore the promise
                    //object was not resolved in the initial flow, we have to do it now after user
                    //set the filter
                    resolve();

                    this.onGlobalFilterSearch();
                }, this);
                oGlobalFilter.attachFilterChange(this.onGlobalFilterChange, this);
            }.bind(this));

            this.oGlobalFilterLodedPromise.then(function (oVariant) {
                jQuery.sap.measure.end("ovp:GlobalFilter");
            });
        },

        _loadCardComponent: function (sComponentName) {
            if (!this.oLoadedComponents[sComponentName]) {
                jQuery.sap.measure.start("ovp:CardComponentLoad:" + sComponentName, "Card Component load", "ovp");
                this.oLoadedComponents[sComponentName] = sap.ui.component.load({
                    name: sComponentName,
                    url: jQuery.sap.getModulePath(sComponentName),
                    async: true
                });
                this.oLoadedComponents[sComponentName].then(function () {
                    jQuery.sap.measure.end("ovp:CardComponentLoad:" + sComponentName);
                });
            }
        },

        _initCardModel: function (sCardModel) {
            if (this.oCardsModels[sCardModel] || !sCardModel) {
                return;
            }
            this.oCardsModels[sCardModel] = this.getView().getModel(sCardModel);
            
            if (!this.oCardsModels[sCardModel].bUseBatch) {
                this.oCardsModels[sCardModel].setUseBatch(false);
            }else {
                this.oCardsModels[sCardModel].setUseBatch(true);
            }
            if (this.getGlobalFilter()) {
                this._overrideCardModelRead(this.oCardsModels[sCardModel]);
            }
        },

        toggleFilterBar: function toggleFilterBar() {
            var oGlobalFilter = this.getGlobalFilter();

            function toOpenState(jqGlobalFilter, jqGlobalFilterWrapper, height) {
                jqGlobalFilterWrapper.height(height);
                jqGlobalFilter.css('top', 0);
            }

            function toCloseState(jqGlobalFilter, jqGlobalFilterWrapper, height) {
                jqGlobalFilterWrapper.height(0);
                jqGlobalFilter.css("top", "-" + height + "px");
            }

            var isVisible = oGlobalFilter.getVisible();

            if ((sap.ui.Device.system.phone) || (sap.ui.Device.system.tablet)) {
                oGlobalFilter.setVisible(!isVisible);
                return;
            }
            if (toggleFilterBar.animationInProcess) {
                return;
            }
            toggleFilterBar.animationInProcess = true;

            if (isVisible) {
                var jqGlobalFilter = jQuery(oGlobalFilter.getDomRef());
                var jqGlobalFilterWrapper = jQuery(this.getView().byId("ovpGlobalFilterWrapper").getDomRef());
                var height = jqGlobalFilterWrapper.height();
                toOpenState(jqGlobalFilter, jqGlobalFilterWrapper, height);
                jqGlobalFilterWrapper.height(); //make browser render css change
                jqGlobalFilterWrapper.one('transitionend', function (e) {
                    oGlobalFilter.setVisible(false); //set filterbar invisible in case shell wants to reRender it
                    toggleFilterBar.animationInProcess = false;
                });
                toCloseState(jqGlobalFilter, jqGlobalFilterWrapper, height);
            } else {
                oGlobalFilter.setVisible(true);
                setTimeout(function () { //we need this to wait for globalFilter renderer
                    var jqGlobalFilter = jQuery(oGlobalFilter.getDomRef());
                    var jqGlobalFilterWrapper = jQuery(this.getView().byId("ovpGlobalFilterWrapper").getDomRef());
                    var height = jqGlobalFilter.outerHeight();
                    toCloseState(jqGlobalFilter, jqGlobalFilterWrapper, height);
                    jqGlobalFilterWrapper.height(); //make browser render css change
                    jqGlobalFilterWrapper.one('transitionend', function (e) {
                        jqGlobalFilterWrapper.css("height", "auto");
                        toggleFilterBar.animationInProcess = false;
                    });
                    toOpenState(jqGlobalFilter, jqGlobalFilterWrapper, height);
                }.bind(this));
            }
        },

        /**
         * This function is overriding the read function of the oDataModel with a function that will
         * first find the relevant filters from the filter bar and then will call the original
         * read function with the relevant filters as parameters.
         * @param oModel
         * @private
         */
        _overrideCardModelRead: function (oModel) {
            var fOrigRead = oModel.read;
            var that = this;
            oModel.read = function () {
                var aFilters = that.getGlobalFilter().getFilters();
                var oParameters = arguments[1];
                if (!oParameters) {
                    oParameters = {};
                    Array.prototype.push.call(arguments, oParameters);
                }
                var oEntityType = that._getEntityTypeFromPath(oModel, arguments[0], oParameters.context);
                var bValueHelpEntity = false;
                if (that.oValueHelpMap) {
                    if (that.oValueHelpMap.indexOf(oEntityType.entityType) != -1) {
                        bValueHelpEntity = true;
                    }
                }
                if (oEntityType && !bValueHelpEntity) {
                    var aRelevantFIlters = that._getEntityRelevantFilters(oEntityType, aFilters);
                    if (aRelevantFIlters.length > 0) {
                        var foundIndex = -1;
                        var aUrlParams = oParameters.urlParameters;
                        if (aUrlParams) {
                            for (var index = 0; index < aUrlParams.length; index++) {
                                // We use here lastIndexOf instead of startsWith because it doesn't work on safari (ios devices)
                                if ((aUrlParams[index]).lastIndexOf("$filter=", 0) === 0) {
                                    foundIndex = index;
                                    break;
                                }
                            }
                        }
                        if (foundIndex >= 0) {
                            aUrlParams[foundIndex] =
                                aUrlParams[foundIndex] + "%20and%20" +
                                sap.ui.model.odata.ODataUtils.createFilterParams(aRelevantFIlters, oModel.oMetadata, oEntityType).substr(8);
                        } else {
                            oParameters.filters = aRelevantFIlters;
                        }

                    }
                }

                fOrigRead.apply(oModel, arguments);
            };
        },

        /**
         * This is a temporary function used to retrieve the EntityType from a given path to an entity.
         * This function is required due to fact that the function _getEntityTypeByPath of the ODataMetadata is not public.
         * @param oModel
         * @param sPath
         * @param oContext
         * @returns {object}
         * @private
         */
        _getEntityTypeFromPath: function (oModel, sPath, oContext) {
            //TODO need to request UI5 to have this a public API!!!!
            var sNormPath = sap.ui.model.odata.v2.ODataModel.prototype._normalizePath.apply(oModel, [sPath, oContext]);
            var oEntityType = sap.ui.model.odata.ODataMetadata.prototype._getEntityTypeByPath.apply(oModel.oMetadata, [sNormPath]);
            return oEntityType;
        },

        /**
         * This function goes over the provided list of filters and checks which filter appears as a field
         * in the EntityType provided. The fields that appears in both lists  (filters and EntityType fields)
         * will be returned in an array.
         * @param oEntityType
         * @param aFilters
         * @returns {array}
         * @private
         */
        _getEntityRelevantFilters: function (oEntityType, aFilters) {
            var aRelevantFiltes = [];
            if (aFilters.length) {
                var allFilters = aFilters[0].aFilters;
                var entityProperties = oEntityType.property;
                for (var i = 0; i < allFilters.length; i++) {
                    var currentFilterName;
                    if (allFilters[i].aFilters) {
                        currentFilterName = allFilters[i].aFilters[0].sPath;
                    } else {
                        currentFilterName = allFilters[i].sPath;
                    }
                    for (var j = 0; j < entityProperties.length; j++) {
                        if (entityProperties[j].name === currentFilterName) {
                            aRelevantFiltes.push(allFilters[i]);
                            break;
                        }
                    }
                }
            }
            // Retaining the default OR/AND operation
            if (aRelevantFiltes.length != 0) {
                var aRelevantFilWrap = [];
                aRelevantFilWrap.push(new sap.ui.model.Filter(aRelevantFiltes, aFilters[0].bAnd));
                return aRelevantFilWrap;
            }

            return aRelevantFiltes;
        },

        /*
         Check derived Card Component is implemented with respect to the below restrictions:

         Custom card must be instance of sap.ovp.cards.generic.Component. In other words, custom card must extend sap.ovp.cards.generic.Component.
         If sap.ovp.cards.generic.Card view is replaced by another custom View it means the custom card is not valid.
         [If the extended Component has customization (under the component metadata) and the sap.ovp.cards.generic.Card is replaced by another view (using sap.ui.viewReplacements)]
         If the extended Component overrides the createContent function of the base sap.ovp.cards.generic.Component class, the custom card is not valid.
         If the extended Component overrides the getPreprocessors function of the base sap.ovp.cards.generic.Component class, the custom card is not valid.

         */
        _checkIsCardValid: function (sCardTemplate) {
            var sComponentClassName = sCardTemplate + ".Component";
            var oComponentMetadata, oCustomizations;

            jQuery.sap.require(sComponentClassName);

            var oComponentClass = jQuery.sap.getObject(sComponentClassName);

            if (!oComponentClass) {
                return false;
            }

            if ((oComponentClass !== sap.ovp.cards.generic.Component) && !(oComponentClass.prototype instanceof sap.ovp.cards.generic.Component)) {
                return false;
            }

            if ((oComponentMetadata = oComponentClass.getMetadata()) && (oCustomizations = oComponentMetadata.getCustomizing())) {
                //if OVP Card view was replaced
                if (oCustomizations["sap.ui.viewReplacements"] && oCustomizations["sap.ui.viewReplacements"]["sap.ovp.cards.generic.Card"]) {
                    return false;
                }
            }

            if (oComponentClass.prototype.createContent != sap.ovp.cards.generic.Component.prototype.createContent) {
                return false;
            }

            if (oComponentClass.prototype.getPreprocessors != sap.ovp.cards.generic.Component.prototype.getPreprocessors) {
                return false;
            }

            return true;
        },

        _createCardComponent: function (oView, oModel, card) {
            var sId = "ovp:CreateCard-" + card.template + ":" + card.id;
            jQuery.sap.measure.start(sId, "Create Card", "ovp");
            var oi18nModel = oView.getModel("@i18n");
            if (card.template && this._checkIsCardValid(card.template)) {
                var oComponentConfig = {
                    name: card.template,
                    componentData: {
                        model: oModel,
                        i18n: oi18nModel,
                        cardId: card.id,
                        settings: card.settings,
                        appComponent: this.getOwnerComponent(),
                        mainComponent: this
                    }
                };
                var oGlobalFilter = this.getGlobalFilter();

                if (oGlobalFilter) {
                    oComponentConfig.componentData.globalFilter = {
                        getFilterDataAsString: oGlobalFilter.getDataSuiteFormat.bind(oGlobalFilter)
                    };
                }
                var oComponent = sap.ui.component(oComponentConfig);
                var oComponentContainer = oView.byId(card.id);

                var oOldCard = oComponentContainer.getComponentInstance();
                oComponentContainer.setComponent(oComponent);
                if (oOldCard) {
                    //currently the old component is not destroyed when setting a different component
                    //so we need to do that in timeout to make sure that it will not be destoroyed
                    //too early, before real card will be rendered on the screen.
                    setTimeout(function () {
                        oOldCard.destroy();
                    }, 0);
                }
            } else {
                // TODO: define the proper behavior indicating a card loading failure
                jQuery.sap.log.error("Could not create Card from '" + card.template + "' template. Card is not valid.");
            }
            jQuery.sap.measure.end(sId);
        },

        createLoadingCard: function (card) {
            /*
             * we have to make sure metadata and filter are loaded before we create the card
             * so we first create loading card and once all promises will be resulved
             * we will create the real card and replace the loading card
             */
            var loadingCard = jQuery.extend(true, {}, card, {
                template: "sap.ovp.cards.loading"
            });
            this._createCardComponent(this.getView(), undefined, loadingCard);
        },

        createCard: function (card) {
            var oView = this.getView();
            var oModel = oView.getModel(card.model);

            ///*
            // * we have to make sure metadata and filter are loaded before we create the card
            // * so we first create loading card and once all promises will be resulved
            // * we will create the real card and replace the loading card
            // */

            Promise.all([
                oModel.getMetaModel().loaded(),
                this.oGlobalFilterLodedPromise,
                this.oLoadedComponents[card.template]
            ]).then(
                function () {
                    this._createCardComponent(oView, oModel, card);
                }.bind(this),
                function (reason) {
                    jQuery.sap.log.error("Can't load card with id:'" + card.id + "' and type:'" + card.template + "', reason:" + reason);
                }
            );
        },

        /**
         * The function gets an UI5 generated id and returns the element original Id
         *
         * @param {string} generatedId - the UI5 generated id
         * @param {string} elementId - the element original  id
         */
        _getCardId: function (generatedId) {
            var appIdString = this.getView().getId() + "--";
            if (generatedId.indexOf(appIdString) != -1) {
                var start = generatedId.indexOf(appIdString) + appIdString.length;
                return generatedId.substr(start);
            }
            return generatedId;
        },

        _initSmartVariantManagement: function () {
            var oPersistencyControl = this._createPersistencyControlForSmartVariantManagement();
            var oOVPVariantInfo = new sap.ui.comp.smartvariants.PersonalizableInfo({
                type: "OVPVariant",
                keyName: "persistencyKey",
                control: oPersistencyControl
            });

            this.oPersistencyVariantPromise = new Promise(function (resolve, reject) {
                this.smartVariandManagement = new sap.ui.comp.smartvariants.SmartVariantManagement({
                    personalizableControls: oOVPVariantInfo,
                    initialise: function (oEvent) {
                        var aKeys = oEvent.getParameters().variantKeys;
                        if (aKeys.length) { //the user has already a variant
                            resolve(this.smartVariandManagement.getVariantContent(oPersistencyControl, aKeys[0]));
                        } else { //the user do not have have any variant
                            resolve(null);
                        }
                    }.bind(this)
                });
                this.smartVariandManagement.initialise();
            }.bind(this));

        },

        layoutChanged: function () {
            if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                if (this._bDashboardLayoutLrepActive) {
                    //only save changes after persistency promise has been processed!
                    this.saveVariant();
                }
            } else {
                var aContent = this.getLayout().getContent();
                this.aOrderedCards = this._getCardArrayAsVariantFormat(aContent);
                this.saveVariant();
            }
        },

        saveVariant: function (oEvent) {
            var that = this;
            this.smartVariandManagement.getVariantsInfo(function (aVariants) {
                var oPersonalisationVariantKey = null;
                if (aVariants && aVariants.length > 0) {
                    oPersonalisationVariantKey = aVariants[0].key;
                }
                var bOverwrite = oPersonalisationVariantKey !== null;

                var oParams = {
                    name: "Personalisation",
                    global: false,
                    overwrite: bOverwrite,
                    key: oPersonalisationVariantKey,
                    def: true
                };
                that.smartVariandManagement.fireSave(oParams);
            });

        },

        getLayout: function () {
            return this.getView().byId("ovpLayout");
        },

        _createPersistencyControlForSmartVariantManagement: function () {
            var that = this;
            sap.ui.core.Control.extend("sap.ovp.app.PersistencyControl", {
                metadata: {
                    properties: {
                        persistencyKey: {
                            type: "string",
                            group: "Misc",
                            defaultValue: null
                        }
                    }
                }
            });
            var oPersistencyControl = new sap.ovp.app.PersistencyControl({
                persistencyKey: "ovpVariant"
            });

            /**
             * Interface function for SmartVariantManagment control, returns the current used variant data
             *
             * @public
             * @returns {json} The currently set variant
             */
            oPersistencyControl.fetchVariant = function () {
                //in the initial loading the variant is not saved
                if (that.isInitialLoading) {
                    that.isInitialLoading = false;
                    return {};
                }
                var oLayout = this.getLayout();
                if (!oLayout) {
                    jQuery.sap.log.error("Could not save persistency variant - 'ovpLayout' does not exists");
                    return;
                }

                if (this.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    var oVariants = this.getLayout().getLayoutDataJSON();
                    return {
                        dashboardLayout: oVariants
                    };
                } else {
                    var aLayoutContent = oLayout.getContent();
                    var aContentForSave = this._getCardArrayAsVariantFormat(aLayoutContent);
                    this.oOrderedCards = aContentForSave;
                    return {
                        cards: aContentForSave
                    };
                }
            }.bind(this);

            return oPersistencyControl;

        },

        _initShowHideCardsButton: function () {
            var srvc, oCardMenuButton;

            var srvc = sap.ushell.services.AppConfiguration;
            var oCardMenuButton = new sap.m.Button().addStyleClass("ovpManageCardsBtn");
            oCardMenuButton.setIcon('sap-icon://dimension');
            oCardMenuButton.setTooltip(this._getLibraryResourceBundle().getText("hideCardsBtn_tooltip"));
            oCardMenuButton.setText(this._getLibraryResourceBundle().getText("hideCardsBtn_title"));
            oCardMenuButton.attachPress((this._onCardMenuButtonPress).bind(this));
            srvc.addApplicationSettingsButtons([oCardMenuButton]);
        },

        _onCardMenuButtonPress: function () {
            var oModel;

            function getCardIndexInArray(aCardsArr, cardId) {
                for (var i = 0; i < aCardsArr.length; i++) {
                    if (aCardsArr[i].id == cardId) {
                        return i;
                    }
                }
                return -1;
            }

            function createOrDestroyCards(aOldContent, aNewContent) {
                var oldIndex = -1;
                for (var i = 0; i < aNewContent.length; i++) {
                    //In case the card position has been changed, we need to get the card index in the old array.
                    //Otherwise, the new and the old position are the same
                    if (aOldContent[i].id == aNewContent[i].id) {
                        oldIndex = i;
                    } else {
                        oldIndex = getCardIndexInArray(aOldContent, aNewContent[i].id);
                    }

                    if (aNewContent[i].visibility != aOldContent[oldIndex].visibility) {
                        if (aNewContent[i].visibility === true) {
                            var oCard = this._getCardFromManifest(aNewContent[i].id);
                            if (oCard) {
                                this.createLoadingCard(oCard);
                                oCard.settings.baseUrl = this._getBaseUrl();
                                this._initCardModel(oCard.model);
                                this._loadCardComponent(oCard.template);
                                this.createCard(oCard);
                            }
                        } else {
                            var oOldComponentContainer = this.getView().byId(aNewContent[i].id);
                            var oOldCard = oOldComponentContainer.getComponentInstance();
                            if (oOldCard) {
                                oOldCard.destroy();
                            }
                        }
                    }
                }
            }

            function cardTitleFormatter(id) {
                var oCard = this._getCardFromManifest(id);
                var cardSettings = oCard.settings;
                if (cardSettings.title) {
                    return cardSettings.title;
                } else if (cardSettings.category) {
                    return (cardSettings.category);
                } else if (cardSettings.subTitle) {
                    return cardSettings.subTitle;
                }
                return id;
            }

            var oCardsTableTemplate = new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({
                        text: {
                            path: "id",
                            formatter: cardTitleFormatter.bind(this)
                        }
                    }),
                    new sap.m.Switch({
                        state: "{visibility}",
                        customTextOff: " ",
                        customTextOn: " ",
                        change: function (event) {
                            var parent = event.oSource.getParent();
                            parent.toggleStyleClass('sapOVPHideCardsTableItem');
                            parent.getCells()[0].toggleStyleClass('sapOVPHideCardsDisabledCell');
                        },
                        tooltip: this._getLibraryResourceBundle().getText("hideCards_switchTooltip")
                    })
                ]
            });

            var oCardsTable = new sap.m.Table("sapOVPHideCardsTable", {
                backgroundDesign: sap.m.BackgroundDesign.Transparent,
                showSeparators: sap.m.ListSeparators.Inner,
                columns: [
                    new sap.m.Column({
                        vAlign: "Middle"
                    }),
                    new sap.m.Column({
                        hAlign: sap.ui.core.TextAlign.Right,
                        vAlign: "Middle",
                        width: "4.94rem"
                    })
                ]
            });
            oCardsTable.addStyleClass('sapOVPHideCardsTable');
            oCardsTable.bindItems({
                path: "/cards",
                template: oCardsTableTemplate
            });

            var oOrigOnAfterRendering = oCardsTable.onAfterRendering;
            oCardsTable.onAfterRendering = function (event) {
                oOrigOnAfterRendering.apply(oCardsTable, arguments);

                var items = event.srcControl.mAggregations.items;
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        if (!items[i].getCells()[1].getState()) {
                            items[i].addStyleClass('sapOVPHideCardsTableItem');
                            items[i].getCells()[0].addStyleClass('sapOVPHideCardsDisabledCell');
                        }
                    }
                }
                setTimeout(function () {
                    jQuery('.sapMListTblRow').first().focus();
                }, 200);
            };

            var oSaveButton = new sap.m.Button("manageCardsokBtn", {
                text: this._getLibraryResourceBundle().getText("okBtn"),
                press: function () {
                    var aDialogCards = this.oDialog.getModel().getProperty('/cards');
                    createOrDestroyCards.apply(this, [this.aOrderedCards, aDialogCards]);
                    this.aOrderedCards = aDialogCards;
                    this._updateDashboardLayoutCards(this.aOrderedCards);
                    this._updateLayoutWithOrderedCards();
                    this.saveVariant();
                    this.oDialog.close();
                }.bind(this)
            });

            var oCancelButton = new sap.m.Button("manageCardsCancelBtn", {
                text: this._getLibraryResourceBundle().getText("cancelBtn"),
                press: function () {
                    this.oDialog.close();
                }.bind(this)
            });

            var oResetButton = new sap.m.Button("manageCardsResetBtn", {
                text: this._getLibraryResourceBundle().getText("resetBtn"),
                press: function () {
                    sap.m.MessageBox.show(this._getLibraryResourceBundle().getText("reset_cards_confirmation_msg"), {
                        id: "resetCardsConfirmation",
                        icon: sap.m.MessageBox.Icon.QUESTION,
                        title: this._getLibraryResourceBundle().getText("reset_cards_confirmation_title"),
                        actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                this.smartVariandManagement.getVariantsInfo(function (aVariants) {
                                    var oPersonalisationVariantKeys = null;
                                    if (aVariants && aVariants.length > 0) {
                                        oPersonalisationVariantKeys = aVariants[0].key;
                                        this.smartVariandManagement.fireManage({
                                            deleted: [oPersonalisationVariantKeys]
                                        });
                                    }
                                    createOrDestroyCards.apply(this, [this.aOrderedCards, this.aManifestOrderedCards]);
                                    this.aOrderedCards = this.aManifestOrderedCards;
                                    this._resetDashboardLayout();
                                    this._updateDashboardLayoutCards(this.aOrderedCards);
                                    this._updateLayoutWithOrderedCards();
                                    this.oDialog.close();
                                }.bind(this));
                            }
                        }.bind(this)
                    });
                }.bind(this)
            });

            this.oDialog = new sap.m.Dialog({
                title: this._getLibraryResourceBundle().getText("hideCardsBtn_title"),
                contentWidth: "29.6rem",
                contentHeight: "50%",
                stretch: sap.ui.Device.system.phone,
                content: oCardsTable,
                buttons: [oResetButton, oSaveButton, oCancelButton],
                afterClose: function () {
                    this.oDialog.destroy();
                }.bind(this)
            }).addStyleClass("sapOVPCardsVisibilityDialog");

            var oDialogCardsModel = jQuery.extend(true, [], this.aOrderedCards);
            oModel = new sap.ui.model.json.JSONModel({
                cards: oDialogCardsModel
            });
            this.oDialog.setModel(oModel);

            this.oDialog.open();
        },

        isDragAndDropEnabled: function () {
            return !sap.ui.Device.system.phone;
        },

        getGlobalFilter: function () {
            if (!this.oGlobalFilter) {
                this.oGlobalFilter = this.getView().byId("ovpGlobalFilter");
            }
            return this.oGlobalFilter;
        },

        _parseNavigationVariant: function () {
            this.oNavigationHandler = this.oNavigationHandler || new sap.ui.generic.app.navigation.service.NavigationHandler(this);
            this.oParseNavigationPromise = this.oNavigationHandler.parseNavigation();
            sap.ovp.cards.CommonUtils.enable(this, this.oNavigationHandler);
        },

        _setNavigationVariantToGlobalFilter: function (oAppData, oURLParameters, sNavType) {
            if (sNavType === "iAppState") {
                var oGlobalFilter = this.getGlobalFilter();
                if (oGlobalFilter) {
                    //var bHasOnlyDefaults = oAppData && oAppData.bNavSelVarHasDefaultsOnly;
                    var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(oAppData.selectionVariant);
                    var aSelectionVariantProperties = oSelectionVariant.getParameterNames().concat(oSelectionVariant.getSelectOptionsPropertyNames());
                    for (var i = 0; i < aSelectionVariantProperties.length; i++) {
                        oGlobalFilter.addFieldToAdvancedArea(aSelectionVariantProperties[i]);
                    }
                    if (!this.filterChanged) {
                        oGlobalFilter.clearVariantSelection();
                        //BCP : 1670415881, Variants detecting false changes on navigation
                        if (oAppData.selectionVariant) {
                            var oCurrentVariant = JSON.parse(oAppData.selectionVariant);
                            var sVariantKey = oCurrentVariant["SelectionVariantID"];
                            oGlobalFilter.setCurrentVariantId(sVariantKey);
                            var oBeforeSettingVariant = oGlobalFilter.getDataSuiteFormat();
                            oGlobalFilter.setDataSuiteFormat(oAppData.selectionVariant, true);
                            var oAfterSettingVariant = oGlobalFilter.getDataSuiteFormat();
                            if (oBeforeSettingVariant === oAfterSettingVariant) {
                                oGlobalFilter.getSmartVariant().currentVariantSetModified(false);
                            } else {
                                oGlobalFilter.getSmartVariant().currentVariantSetModified(true);
                            }
                        }
                    }
                }
            }
        },

        /**
         * Event handler to change the snapped header text when the filters change
         * @param oEvent
         */
        onAssignedFiltersChanged: function (oEvent) {
            if (oEvent.getSource() && this.getView().byId("ovpFilterText")) {
                this.getView().byId("ovpFilterText").setText(oEvent.getSource().retrieveFiltersWithValuesAsText());
            }
        }


        /* Appstate */
        /*
         getCurrentAppState: function() {
         var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(this.oState.oSmartFilterbar.getDataSuiteFormat());
         return {
         selectionVariant: oSelectionVariant.toJSONString()
         };
         },

         storeCurrentAppStateAndAdjustURL: function(oCurrentAppState) {
         // oCurrentAppState is optional
         // - nothing, if NavigationHandler not available
         // - adjusts URL immediately
         // - stores appState for this URL (asynchronously)
         oCurrentAppState = oCurrentAppState || this.getCurrentAppState();
         try {
         var oNavigationHandler = new sap.ui.generic.app.navigation.service.NavigationHandler(this);
         oNavigationHandler.storeInnerAppState(oCurrentAppState);
         } catch (err) {
         jQuery.sap.log.error("OVP.storeCurrentAppStateAndAdjustURL: " + err);
         }
         },

         onSearchButtonPressed: function() {
         //store navigation context
         this.storeCurrentAppStateAndAdjustURL();
         }
         */
        /* Appstate */
    });
}());