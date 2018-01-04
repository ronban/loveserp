(function () {
    "use strict";
    /*global sap, jQuery */
    jQuery.sap.require("sap.ovp.cards.ActionUtils");
    jQuery.sap.require("sap.ui.generic.app.navigation.service.NavigationHandler");
    jQuery.sap.require("sap.ovp.cards.CommonUtils");

    var ActionUtils = sap.ovp.cards.ActionUtils;

    sap.ui.controller("sap.ovp.cards.generic.Card", {

        onInit: function () {
            var oHeader = this.getView().byId("ovpCardHeader");
            oHeader.attachBrowserEvent("click", this.onHeaderClick.bind(this));
            oHeader.addEventDelegate({
                onkeydown: function (oEvent) {
                    if (!oEvent.shiftKey && (oEvent.keyCode == 13 || oEvent.keyCode == 32)) {
                        oEvent.preventDefault();
                        this.onHeaderClick();
                    }
                }.bind(this)
            });

            var oNumericControl = this.getView().byId("kpiNumberValue");
            if (oNumericControl) {
                oNumericControl.addEventDelegate({
                    onAfterRendering: function () {
                        var $numericControl = oNumericControl.$();
                        var $number = $numericControl.find(".sapMNCValueScr");
                        var $scale = $numericControl.find(".sapMNCScale");
                        $number.attr("aria-label", $number.text());
                        $scale.attr("aria-label", $scale.text());
                    }
                });
            }

            //if this card is owned by a dashboard layout, check if autoSpan is required and register event handler
            try {
                var oCompData = this.getOwnerComponent().getComponentData();
                //Check Added for dashboard layout
                if (oCompData.appComponent && oCompData.mainComponent.getLayout().getMetadata().getName() === "sap.ovp.ui.DashboardLayout") {
                    var oDashboardLayoutUtil = oCompData.appComponent.getDashboardLayoutUtil();
                    if (!!oDashboardLayoutUtil) {
                        var oCard = oDashboardLayoutUtil.dashboardLayoutModel.getCardById(oCompData.cardId);
                        if (!!oCard && oCard.template === "sap.ovp.cards.stack") {
                            oCard.dashboardLayout.autoSpan = false;
                        }
                        if (oDashboardLayoutUtil.isCardAutoSpan(oCompData.cardId)) {
                            this.resizeHandlerId = sap.ui.core.ResizeHandler.register(this.getView(), function (oEvent) {
                                jQuery.sap.log.info("DashboardLayout autoSize:" + oEvent.target.id + " -> " + oEvent.size.height);
                                oDashboardLayoutUtil.setAutoCardSpanHeight(oEvent);
                            });
                            this.oDashboardLayoutUtil = oDashboardLayoutUtil;
                            this.cardId = oCompData.cardId;
                        }
                    }
                }
            } catch (err) {
                jQuery.sap.log.error("DashboardLayout autoSpan check failed.");
            }
        },

        exit: function () {
            //de-register event handler
            if (this.resizeHandlerId) {
                sap.ui.core.ResizeHandler.deregister(this.resizeHandlerId);
            }
        },

        onAfterRendering: function () {
            var footer = this.getCardPropertiesModel().getProperty("/footerFragment");
            if (footer) {
                this._handleCountFooter();
            }
            this._handleKPIHeader();
            var sSelectedKey = this.getCardPropertiesModel().getProperty("/selectedKey");
            if (sSelectedKey) {
                this.getView().byId("ovp_card_dropdown").setSelectedKey(sSelectedKey);
            }

            //dashboard layout: autoSpan cards - size card wrapper to card height
            if (this.oDashboardLayoutUtil && this.oDashboardLayoutUtil.isCardAutoSpan(this.cardId)) {
                var $wrapper = jQuery("#" + this.oDashboardLayoutUtil.getCardDomId(this.cardId));
                if (this.oView.$().outerHeight() > $wrapper.innerHeight()) {
                    this.oDashboardLayoutUtil.setAutoCardSpanHeight(null, this.cardId, this.oView.$().height());
                }
            }

            var bIsNavigable = 0;
            bIsNavigable = this.checkNavigation();
            var sContentFragment = this.getCardPropertiesModel().getProperty("/contentFragment");
            if (bIsNavigable) {
                /**
                 * If it's a Quickview card, it should not have "cursor: pointer" set.
                 * Only the header and footer action items of Quickview card are navigable.
                 */
                if (sContentFragment ? sContentFragment !== "sap.ovp.cards.quickview.Quickview" : true) {
                    this.getView().addStyleClass("sapOvpCardNavigable");
                }
                if (sContentFragment && sContentFragment === "sap.ovp.cards.quickview.Quickview") {
                    var oHeader = this.byId("ovpCardHeader");
                    if (oHeader) {
                        oHeader.addStyleClass("sapOvpCardNavigable");
                    }
                }
            }
            
            var dropDown = this.getView().byId("ovp_card_dropdown");
            var toolBar = this.getView().byId("toolbar");
            if (toolBar) {
                var toolBarDomRef = toolBar.getDomRef();
                jQuery(toolBarDomRef).attr("aria-label", dropDown.getValue());
            }
            
        },

        checkNavigation: function () {
            if (this.getEntityType()) {
                var oEntityType = this.getEntityType();
                if (this.getCardPropertiesModel()) {
                    var oCardPropsModel = this.getCardPropertiesModel();
                    var sIdentificationAnnotationPath = oCardPropsModel.getProperty("/identificationAnnotationPath");
                    var sAnnotationPath = sIdentificationAnnotationPath;
                    /* In case of Stack Card, there can be two entries for the identification annotation path
                    When more than one IdentificationAnnotationPath exists, they need to be split and assigned accordingly to Stack and Quickview Cards */
                    var sContentFragment = this.getCardPropertiesModel().getProperty("/contentFragment");
                    if (sContentFragment && (sContentFragment === "sap.ovp.cards.stack.Stack" || sContentFragment === "sap.ovp.cards.quickview.Quickview")){
                        var aAnnotationPath = (sIdentificationAnnotationPath) ? sIdentificationAnnotationPath.split(",") : [];
                        if (aAnnotationPath && aAnnotationPath.length > 1) {
                            if (sContentFragment === "sap.ovp.cards.stack.Stack"){
                                sAnnotationPath = aAnnotationPath[0];  
                            } else {
                                sAnnotationPath = aAnnotationPath[1];
                            }
                        }
                    }
                    // if we have an array object e.g. we have records
                    var aRecords = oEntityType[sAnnotationPath];
                    if (aRecords && aRecords.length) {
                        for (var i = 0; i < aRecords.length; i++) {
                            var oItem = aRecords[i];
                            if (oItem.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" ||
                                oItem.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
                                oItem.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
                                return 1;
                            }
                        }
                    }
                }
            }
            return 0;
        },

        onHeaderClick: function () {
            sap.ui.core.BusyIndicator.show(0);
            setTimeout(function(){sap.ui.core.BusyIndicator.hide(); }, 1000);
            //call the navigation with the binded context to support single object cards such as quickview card
            this.doNavigation(this.getView().getBindingContext());
        },

        resizeCard: function (cardSpan) {
            jQuery.sap.log.info(cardSpan);
            //card was manually resized --> de-register handler
            if (this.resizeHandlerId) {
                sap.ui.core.ResizeHandler.deregister(this.resizeHandlerId);
                this.resizeHandlerId = null;
            }
        },

        _handleCountFooter: function () {
            var countFooter = this.getView().byId("ovpCountFooter");
            if (countFooter) {
                //Gets the card items binding object
                var oItemsBinding = this.getCardItemsBinding();
                if (oItemsBinding) {
                    oItemsBinding.attachDataReceived(function () {
                        var iTotal = oItemsBinding.getLength();
                        var iCurrent = oItemsBinding.getCurrentContexts().length;
                        var countFooterText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Count_Zero_Footer");
                        if (iTotal !== 0) {
                            countFooterText = sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Count_Footer", [iCurrent, iTotal]);
                        }
                        countFooter.setText(countFooterText);
                        var countFooterDomRef = countFooter.$();
                        countFooterDomRef.attr("aria-label", countFooterText);
                    });
                }
            }
        },

        /*
         *   Hide the KPI Header when there is no Data to be displayed
         */
        _handleKPIHeader: function () {
            var kpiHeader;
            if (this.getView() && this.getView().getDomRef()) {
                kpiHeader = this.getView().getDomRef().getElementsByClassName("sapOVPKpiHeaderVbox");
            } else {
                return;
            }
            if (kpiHeader) {
                var oItemsBinding = this.getCardItemsBinding();
                if (oItemsBinding) {
                    oItemsBinding.attachDataReceived(function () {
                        var iTotal = oItemsBinding.getLength();
                        if (kpiHeader[0]) {
                            kpiHeader[0].style.display = 'flex';
                            if (iTotal === 0) {
                                kpiHeader[0].style.display = 'none';
                            }
                        }
                    });
                }
            }
        },

        /**
         * default empty implementation for the count footer
         */
        getCardItemsBinding: function () {
        },

        onActionPress: function (oEvent) {
            var sourceObject = oEvent.getSource(),
                oCustomData = this._getActionObject(sourceObject),
                context = sourceObject.getBindingContext();
            if (oCustomData.type.indexOf("DataFieldForAction") !== -1) {
                this.doAction(context, oCustomData);
            } else {
                this.doNavigation(context, oCustomData);
            }
        },
        _getActionObject: function (sourceObject) {
            var aCustomData = sourceObject.getCustomData();
            var oCustomData = {};
            for (var i = 0; i < aCustomData.length; i++) {
                oCustomData[aCustomData[i].getKey()] = aCustomData[i].getValue();
            }
            return oCustomData;
        },

        doNavigation: function (oContext, oNavigationField) {

            if (!oNavigationField) {
                oNavigationField = this.getEntityNavigationEntries(oContext)[0];
            }

            if (oNavigationField) {
                switch (oNavigationField.type) {
                    case "com.sap.vocabularies.UI.v1.DataFieldWithUrl":
                        this.doNavigationWithUrl(oContext, oNavigationField);
                        break;
                    case "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation":
                        this.doIntentBasedNavigation(oContext, oNavigationField, false);
                        break;
                }
            }
        },

        doNavigationWithUrl: function (oContext, oNavigationField) {
            var oParsingSerivce = sap.ushell.Container.getService("URLParsing");

            //Checking if navigation is external or IntentBasedNav with paramters
            //If Not a internal navigation, navigate in a new window
            if (!(oParsingSerivce.isIntentUrl(oNavigationField.url))) {
                window.open(oNavigationField.url);
            } else {
                var oParsedShellHash = oParsingSerivce.parseShellHash(oNavigationField.url);
            //Url can also contain an intent based navigation with route, route can be static or dynamic with paramters
                this.doIntentBasedNavigation(oContext, oParsedShellHash, true);
            }
        },

        doIntentBasedNavigation: function (oContext, oIntent, oUrlWithIntent) {
            var oParameters,
                oNavArguments,
                sIntent,
                oEntity = oContext ? oContext.getObject() : null;

            if (oEntity && oEntity.__metadata) {
                delete oEntity.__metadata;
            }

            var oNavigationHandler = sap.ovp.cards.CommonUtils.getNavigationHandler();

            if (oNavigationHandler) {
                if (oIntent) {
                    oParameters = this._getEntityNavigationParameters(oEntity);
                    oNavArguments = {
                        target: {
                            semanticObject: oIntent.semanticObject,
                            action: oIntent.action
                        },
                        appSpecificRoute: oIntent.appSpecificRoute,
                        params: oParameters.newSelectionVariant
                    };

                    //var oMain = this.getOwnerComponent().getComponentData().mainComponent;
                    //var oGlobalFilter = oMain.getView().byId("ovpGlobalFilter");

                    var oAppInnerData = {
                        selectionVariant: oParameters.oldSelectionVariant
                    };

                    var fnHandleError = function (oError) {
                        if (oError instanceof Error) {
                            oError.showMessageBox();
                        }
                    };

                    if (oUrlWithIntent) {
                        if (oIntent && oIntent.semanticObject && oIntent.action) {
                            sIntent = oIntent.semanticObject + '-' + oIntent.action;
                            sap.ushell.Container.getService("CrossApplicationNavigation").isIntentSupported([sIntent])
                                .done(function (oResponse) {
                                    if (oResponse[sIntent].supported === true) {
                                        // enable link
                                        oNavArguments.params = JSON.parse(oNavArguments.params);
                                        sap.ushell.Container.getService("CrossApplicationNavigation").toExternal(oNavArguments);
                                    }
                                })
                                .fail(function () {
                                    jQuery.sap.log.error("Could not get authorization from isIntentSupported");
                                });
                        }
                    } else {
                        oNavigationHandler.navigate(oNavArguments.target.semanticObject, oNavArguments.target.action, oNavArguments.params,
                            oAppInnerData, fnHandleError);
                    }
                }
            }
        },

        doAction: function (oContext, action) {
            this.actionData = ActionUtils.getActionInfo(oContext, action, this.getEntityType());
            if (this.actionData.allParameters.length > 0) {
                this._loadParametersForm();
            } else {
                this._callFunction();
            }
        },

        getEntityNavigationEntries: function (oContext, sAnnotationPath) {
            var aNavigationFields = [];
            var oEntityType = this.getEntityType();

            if (!sAnnotationPath) {
                var oCardPropsModel = this.getCardPropertiesModel();
                var sIdentificationAnnotationPath = oCardPropsModel.getProperty("/identificationAnnotationPath");
                /**
                 * In the case of stack card there can be 2 entries for the identification annotation path.
                 * The second entry corresponds to the object stream, so we avoid this entry (it is processed separately).
                 */
                var aAnnotationPath = (sIdentificationAnnotationPath) ? sIdentificationAnnotationPath.split(",") : [];
                if (aAnnotationPath && aAnnotationPath.length > 1) {
                    sAnnotationPath = aAnnotationPath[0];
                } else {
                    sAnnotationPath = sIdentificationAnnotationPath;
                }
            }

            // if we have an array object e.g. we have records
            var aRecords = oEntityType[sAnnotationPath];
            if (Array.isArray(aRecords)) {

                // sort the records by Importance - before we initialize the navigation-actions of the card
                aRecords = sap.ovp.cards.AnnotationHelper.sortCollectionByImportance(aRecords);

                for (var i = 0; i < aRecords.length; i++) {
                    if (aRecords[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
                        aNavigationFields.push({
                            type: aRecords[i].RecordType,
                            semanticObject: aRecords[i].SemanticObject.String,
                            action: aRecords[i].Action.String,
                            label: aRecords[i].Label ? aRecords[i].Label.String : null
                        });
                    }
                    if (aRecords[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl" && !aRecords[i].Url.UrlRef) {

                        var oModel = this.getView().getModel();
                        var oMetaData = oModel.oMetaModel;
                        var oEntityBindingContext = oMetaData.createBindingContext(oEntityType.$path);
                        var sBindingString = sap.ui.model.odata.AnnotationHelper.format(oEntityBindingContext, aRecords[i].Url);
                        var oCustomData = new sap.ui.core.CustomData({
                            key: "url",
                            value: sBindingString
                        });
                        oCustomData.setModel(oModel);
                        oCustomData.setBindingContext(oContext);
                        var oUrl = oCustomData.getValue();

                        aNavigationFields.push({
                            type: aRecords[i].RecordType,
                            url: oUrl,
                            value: aRecords[i].Value.String,
                            label: aRecords[i].Label ? aRecords[i].Label.String : null
                        });
                    }
                }
            }
            return aNavigationFields;
        },

        getModel: function () {
            return this.getView().getModel();
        },

        getMetaModel: function () {
            if (this.getModel()) {
                return this.getModel().getMetaModel();
            }
        },

        getCardPropertiesModel: function () {
            return this.getView().getModel("ovpCardProperties");
        },

        getEntitySet: function () {
            if (!this.entitySet) {
                var sEntitySet = this.getCardPropertiesModel().getProperty("/entitySet");
                this.entitySet = this.getMetaModel().getODataEntitySet(sEntitySet);
            }

            return this.entitySet;
        },

        getEntityType: function () {
            if (!this.entityType) {
                if (this.getMetaModel() && this.getEntitySet()) {
                    this.entityType = this.getMetaModel().getODataEntityType(this.getEntitySet().entityType);
                }
            }

            return this.entityType;
        },

        getCardContentContainer: function () {
            if (!this.cardContentContainer) {
                this.cardContentContainer = this.getView().byId("ovpCardContentContainer");
            }
            return this.cardContentContainer;
        },

        //_saveAppState: function(sFilterDataSuiteFormat) {
        //	var oDeferred = jQuery.Deferred();
        //	var oAppState = sap.ushell.Container.getService("CrossApplicationNavigation").createEmptyAppState(this.getOwnerComponent());
        //	var sAppStateKey = oAppState.getKey();
        //	var oAppDataForSave = {
        //		selectionVariant: sFilterDataSuiteFormat
        //	};
        //	oAppState.setData(oAppDataForSave);
        //	var oSavePromise = oAppState.save();
        //
        //	oSavePromise.done(function() {
        //       oDeferred.resolve(sAppStateKey,oAppDataForSave);
        //	});
        //
        //	return oDeferred.promise();
        //},

        /**
         * Retrieve entity parameters (if exists) and add xAppState from oComponentData.appStateKeyFunc function (if exists)
         * @param oEntity
         * @returns {*}
         * @private
         */
        _getEntityNavigationParameters: function (oEntity) {
            var oUrlParameters = {};
            var oEntityType;
            var oComponentData = this.getOwnerComponent().getComponentData();
            var oGlobalFilter = oComponentData ? oComponentData.globalFilter : undefined;
            var oCardFilters = sap.ovp.cards.AnnotationHelper.getCardFilters(this.getCardPropertiesModel());
            if (oCardFilters && oCardFilters[0] && oCardFilters[0].path) {
                oCardFilters[0].path = oCardFilters[0].path.replace("/", ".");
            }
            var oSelectionVariant, oGlobalSelectionVariant;

            // Build result object of card parameters
            if (oEntity) {
                oEntityType = this.getEntityType();
                var key;
                for (var i = 0; oEntityType.property && i < oEntityType.property.length; i++) {
                    key = oEntityType.property[i].name;
                    var vAttributeValue = oEntity[key];

                    if (oEntity.hasOwnProperty(key)) {
                        if (window.Array.isArray(oEntity[key]) && oEntity[key].length === 1) {
                            oUrlParameters[key] = oEntity[key][0];
                        } else if (jQuery.type(vAttributeValue) !== "object") {
                            oUrlParameters[key] = vAttributeValue;
                        }
                    }
                }
            }

            //Build selection variant object from global filter, card filter and card parameters
            var sGlobalFilter = oGlobalFilter ? oGlobalFilter.getFilterDataAsString() : "{}";
            oGlobalSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(sGlobalFilter);
            oSelectionVariant = this._buildSelectionVariant(oGlobalFilter, oCardFilters);

            var oNavigationHandler = sap.ovp.cards.CommonUtils.getNavigationHandler();
            var newSelectionVariant = null;
            if (oNavigationHandler) {
                newSelectionVariant = oNavigationHandler.mixAttributesAndSelectionVariant(oUrlParameters, oSelectionVariant.toJSONString());
            }

            return {
                oldSelectionVariant: oGlobalSelectionVariant ? oGlobalSelectionVariant.toJSONString() : null,
                newSelectionVariant: newSelectionVariant ? newSelectionVariant.toJSONString() : null
            };
        },

        _buildSelectionVariant: function (oGlobalFilter, oCardFilters) {
            var sGlobalFilter = oGlobalFilter ? oGlobalFilter.getFilterDataAsString() : "{}";
            var oSelectionVariant = new sap.ui.generic.app.navigation.service.SelectionVariant(sGlobalFilter);
            var oFilter, sValue1, sValue2;

            // Add card filters to selection variant
            for (var i = 0; i < oCardFilters.length; i++) {
                oFilter = oCardFilters[i];
                //value1 might be typeof number, hence we check not typeof undefined
                if (oFilter.path && oFilter.operator && typeof oFilter.value1 !== "undefined") {
                    //value2 is optional, hence we check it separately
                    sValue1 = oFilter.value1.toString();
                    sValue2 = (typeof oFilter.value2 !== "undefined") ? oFilter.value2.toString() : undefined;
                    oSelectionVariant.addSelectOption(oFilter.path, oFilter.sign, oFilter.operator, sValue1, sValue2);
                }
            }

            return oSelectionVariant;
        },

        _loadParametersForm: function () {
            var oParameterModel = new sap.ui.model.json.JSONModel();
            oParameterModel.setData(this.actionData.parameterData);
            var that = this;

            // first create dialog
            var oParameterDialog = new sap.m.Dialog('ovpCardActionDialog', {
                title: this.actionData.sFunctionLabel,
                afterClose: function () {
                    oParameterDialog.destroy();
                }
            }).addStyleClass("sapUiNoContentPadding");

            // action button (e.g. BeginButton)
            var actionButton = new sap.m.Button({
                text: this.actionData.sFunctionLabel,
                press: function (oEvent) {
                    var mParameters = ActionUtils.getParameters(oEvent.getSource().getModel(), that.actionData.oFunctionImport);
                    oParameterDialog.close();
                    that._callFunction(mParameters);
                }
            });

            // cancel button (e.g. EndButton)
            var cancelButton = new sap.m.Button({
                text: "Cancel",
                press: function () {
                    oParameterDialog.close();
                }
            });
            // assign the buttons to the dialog
            oParameterDialog.setBeginButton(actionButton);
            oParameterDialog.setEndButton(cancelButton);

            // preparing a callback function which will be invoked on the Form's Fields-change
            var onFieldChangeCB = function (oEvent) {
                var missingMandatory = ActionUtils.mandatoryParamsMissing(oEvent.getSource().getModel(), that.actionData.oFunctionImport);
                actionButton.setEnabled(!missingMandatory);
            };

            // get the form assign it the Dialog and open it
            var oForm = ActionUtils.buildParametersForm(this.actionData, onFieldChangeCB);

            oParameterDialog.addContent(oForm);
            oParameterDialog.setModel(oParameterModel);
            oParameterDialog.open();
        },

        _callFunction: function (mUrlParameters) {
            var mParameters = {
                batchGroupId: "Changes",
                changeSetId: "Changes",
                urlParameters: mUrlParameters,
                forceSubmit: true,
                context: this.actionData.oContext,
                functionImport: this.actionData.oFunctionImport
            };
            var that = this;
            var oPromise = new Promise(function (resolve, reject) {
                var model = that.actionData.oContext.getModel();
                var sFunctionImport;
                sFunctionImport = "/" + mParameters.functionImport.name;
                model.callFunction(sFunctionImport, {
                    method: mParameters.functionImport.httpMethod,
                    urlParameters: mParameters.urlParameters,
                    batchGroupId: mParameters.batchGroupId,
                    changeSetId: mParameters.changeSetId,
                    headers: mParameters.headers,
                    success: function (oData, oResponse) {
                        resolve(oResponse);
                    },
                    error: function (oResponse) {
                        reject(oResponse);
                    }
                });
            });
            //Todo: call translation on message toast
            oPromise.then(function (oResponse) {
                return sap.m.MessageToast.show(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Toast_Action_Success"), {
                    duration: 1000
                });
            }, function (oError) {
                return sap.m.MessageToast.show(sap.ui.getCore().getLibraryResourceBundle("sap.ovp").getText("Toast_Action_Error"), {
                    duration: 1000
                });
            });
        },

        /**
         * In case of error card implementation can call this method to display
         * card error state.
         * Current instance of the card will be destroied and instead loading card
         * will be presenetd with the 'Cannot load card' meassage
         */
        setErrorState: function () {
            //get the current card component
            var oCurrentCard = this.getOwnerComponent();
            //get the component container
            var oComponentContainer = oCurrentCard.oContainer;
            //prepare card configuration, i.e. category, title, description and entitySet
            //which are required for the loading card. in addition set the card state to error
            //so no loading indicator will be presented
            var oCardPropertiesModel = this.getCardPropertiesModel();
            var oComponentConfig = {
                name: "sap.ovp.cards.loading",
                componentData: {
                    model: this.getView().getModel(),
                    settings: {
                        category: oCardPropertiesModel.getProperty("/category"),
                        title: oCardPropertiesModel.getProperty("/title"),
                        description: oCardPropertiesModel.getProperty("/description"),
                        entitySet: oCardPropertiesModel.getProperty("/entitySet"),
                        state: sap.ovp.cards.loading.State.ERROR
                    }
                }
            };
            //create the loading card
            var oLoadingCard = sap.ui.component(oComponentConfig);
            //set the loading card in the container
            oComponentContainer.setComponent(oLoadingCard);
            //destroy the current card
            setTimeout(function () {
                oCurrentCard.destroy();
            }, 0);
        },

        changeSelection: function (oEvent) {
            //get the index of the combo box
            var oDropdown = this.getView().byId("ovp_card_dropdown");
            var selectedKey = parseInt(oDropdown.getSelectedKey(), 10);
            //update the card properties
            var oTabValue = this.getCardPropertiesModel().getProperty("/tabs")[selectedKey - 1];
            var oUpdatedCardProperties = {
                cardId: this.getOwnerComponent().getComponentData().cardId,
                selectedKey: selectedKey
            };
            for (var prop in oTabValue) {
                oUpdatedCardProperties[prop] = oTabValue[prop];
            }
            this.getOwnerComponent().getComponentData().mainComponent.recreateCard(oUpdatedCardProperties);

        }

    });
})();