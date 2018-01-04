sap.ui.jsview("view.askUsageCollectionPermission", {

    getControllerName: function() {
        return null;
    },

    /**
     * 
     * @param oController may be null
     * @returns {sap.ui.cre.Control}
     */
    createContent: function(oController) {
            if (!window.idIterator) {
                window.idIterator = 1;
            }
            var jsView = this;

            var data = window.iab.context;
            
            // create JSON model instance
            var oModel = new sap.ui.model.json.JSONModel();
            // set the data for the model
            oModel.setData(data);
            // set the model to the core
            sap.ui.getCore().setModel(oModel);

            // This function calculates how wide the vbox containing all the controls should be.
            var calculateDisplayWidth = function(totalWidth) {
                var displayWidth = 0;
                if (totalWidth <= 360) {
                    displayWidth = totalWidth*0.9;
                } else {
                    // On a wide screen, use a little more space
                    displayWidth = 324 + ((totalWidth - 360)*0.1);
                }
                return Math.round(displayWidth);
            }
            
            // Determine the initial checkbox state and Allow button visibility
            var currentUsagePermission = false;
            if (window.iab.context.currentUsagePermission) {
                currentUsagePermission = true;
            }

            var vbox = new sap.m.VBox('askUsageCollectionPermissionScreen');
            
            var appName = window.iab.context.appName;
            if (!appName){
                appName = window.iab.context._defaultAppName;
            }
            
            var explainChoice = new sap.m.Text('explain_choice_label', {
                text: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_QUESTION")
            });
            var panelVBox = new sap.m.VBox('panel_vbox', {
                items: [explainChoice]
            });
            var panel = new sap.m.Panel('usage_permission_header_panel', {
                content: [panelVBox],
                backgroundDesign: sap.m.BackgroundDesign.Solid
            });

            var policies = [];
            var addPolicy = function(index) {
                var pol = data.privacyPolicies[index];
                var infoStr;
                var infoState;
                if (pol.change === "UNCHANGED") {
                    infoStr = "";
                    infoState = sap.ui.core.ValueState.None;
                }
                else if (pol.change === "ADDED") {
                    infoStr = getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_STATUS_NEW");
                    infoState = sap.ui.core.ValueState.Success;
                }
                else if (pol.change === "CHANGED") {
                    infoStr = getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_STATUS_UPDATED");
                    infoState = sap.ui.core.ValueState.Warning;
                }
                else if (pol.change === "REMOVED") {
                    infoStr = getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_STATUS_REMOVED");
                    infoState = sap.ui.core.ValueState.Error;
                }

                var policyItem = new sap.m.StandardListItem('button_learn_more_' + index, {
                        title: pol.label,
                        info: infoStr,
                        infoState: infoState,
                        type: sap.m.ListType.Active,
                        press: function() {
                            window.iab.triggerEventForJsView("LEARNMORE", index);
                        }
                    });
                policies.push(policyItem);
            };
            for (var i = 0; i < data.privacyPolicies.length; i += 1) {
                addPolicy(i);
            }
            var policyList = new sap.m.List('policy_list', {
                    footerText: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_CLICK_ITEM_TO_LEARN_MORE"),
                    items: policies,
                    backgroundDesign: sap.m.BackgroundDesign.Solid
                });

            var checkboxAllow = new sap.m.CheckBox('checkbox_allow', {
                    text: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_ALLOW_CHECKBOX"),
                    width: "100%",
                    selected: currentUsagePermission,
                    select: function(event) {
                        currentUsagePermission = checkboxAllow.getSelected();
                        checkboxAllow.setValueState(sap.ui.core.ValueState.None);
                        checkboxMsg.close();
                    }
                });
            var checkboxItem = new sap.m.CustomListItem({
                    content: [checkboxAllow]
                });
            var checkboxList = new sap.m.List('checkbox_list', {
                    footerText: null,
                    items: [checkboxItem],
                    backgroundDesign: sap.m.BackgroundDesign.Solid
                });

            var buttonDeny = new sap.m.Button('button_deny', {
                    text: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_DENY"),
                    width: "100%",
                    press: function() {
                        window.iab.busy.open();
                        data.isPermissionGranted = false;
                        window.iab.triggerEventForJsView("SUBMIT", data);
                    }
                });

            var buttonAllow = new sap.m.Button('button_allow', {
                    type: sap.m.ButtonType.Emphasized,
                    text: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_ALLOW_BUTTON"),
                    width: "100%",
                    press: function() {
                        window.iab.busy.open();
                        if (currentUsagePermission) {
                            data.isPermissionGranted = true;
                            window.iab.triggerEventForJsView("SUBMIT", data);
                        }
                        else {
                            setTimeout(function() {
                                    checkboxAllow.setValueState(sap.ui.core.ValueState.Error);
                                    checkboxMsg.setVisible(true);
                                    window.iab.busy.close();
                                    checkboxAllow.focus();
                                }, 500);
                        }
                    }
                });

            var checkboxMsg = new sap.m.MessageStrip("checkbox_msg", {
                    text: getLocalizedString("SCR_ASK_USAGE_COLLECTION_PERMISSION_MUST_AGREE_BEFORE_ALLOW"),
                    type: sap.ui.core.MessageType.Error,
                    visible: false
                });

            var vboxPlaceholder1 = new sap.m.HBox('vbox_placeholder1', { height: "25px" });
            var vboxPlaceholder2 = new sap.m.HBox('vbox_placeholder2', { height: "25px" });
            var vboxPlaceholder3 = new sap.m.HBox('vbox_placeholder3', { height: "5px" });
            var vboxPlaceholder4 = new sap.m.HBox('vbox_placeholder4', { height: "5px" });

            vbox.addItem(vboxPlaceholder1);
            vbox.addItem(panel);
            vbox.addItem(policyList);
            vbox.addItem(vboxPlaceholder2);
            vbox.addItem(checkboxList);
            vbox.addItem(vboxPlaceholder3);
            vbox.addItem(buttonDeny);
            vbox.addItem(buttonAllow);
            vbox.addItem(vboxPlaceholder4);
            vbox.addItem(checkboxMsg);

            vboxPageContent = new sap.m.VBox('vbox_content', {
                alignItems:sap.m.FlexAlignItems.Center,
                justifyContent:sap.m.FlexJustifyContent.Start,
                items:[vbox]
            });

            var logoPath;
            if (data.custom && data.custom.copyrightLogo) {
                logoPath = data.custom.copyrightLogo;
            } else {
                logoPath = "img/sapLogo.png";
            }
            var logo = new sap.m.Image( 'logo', {
                src: logoPath,
                height:"40px"
            });

            var cprMsg1, cprMsg2;
            if (data.custom && data.custom.copyrightMsg) {
                cprMsg1 = data.custom.copyrightMsg[0];
                cprMsg2 = data.custom.copyrightMsg[1];
            } else {
                cprMsg1 = getLocalizedString("COPYRIGHT_1");
                cprMsg2 = getLocalizedString("COPYRIGHT_2");
            }

            var copyright1 = new sap.m.Text( 'copyright1', {
                text: cprMsg1
            });

            var copyright2 = new sap.m.Text( 'copyright2', {
                text: cprMsg2
            });

            var copyright = new sap.m.VBox('copyright', {
                items: [copyright1, copyright2]
            });

            var footerHBox = new sap.m.HBox('panel_footer_hbox', {
                justifyContent:sap.m.FlexJustifyContent.SpaceBetween,
                width: "90%",
                items: [logo, copyright],
                visible: !(data && data.custom && data.custom.hideLogoCopyright && data.custom.hideLogoCopyright.toString() == "true")
            });

            vboxOuter = new sap.m.FlexBox('vbox_outer', {
                direction:sap.m.FlexDirection.Column,
                justifyContent:sap.m.FlexJustifyContent.SpaceBetween,
                alignItems:sap.m.FlexAlignItems.Center,
                items:[vboxPageContent, footerHBox],
                fitContainer: true
            });

            // If the screen width is available, pre-calculate how wide the vbox should be
            // so that the user can't see it draw as the wrong size then quickly redraw as
            // the correct size.
            if ($(window).width()) {
                vbox.setWidth(calculateDisplayWidth($(window).width()) + "px");
            }

            sap.ui.core.ResizeHandler.register(vboxOuter, function(e){
                vbox.setWidth(calculateDisplayWidth(e.size.width) + "px");
                jsView.setHeight(null);
                var domRef = jsView.getDomRef();
                if( $(window).height() && $(window).height() > domRef.offsetHeight) {
                    // The view is not taking up the whole screen height, force it.
                    jsView.setHeight($(window).height() + "px");
                }
            });

            window.iab.page.setShowHeader(false);
            this.onAfterRendering = function() {
                var domRef = this.getDomRef();
                var newHeight = $(window).height();
                if (!(jQuery.device.is.ipad || jQuery.device.is.iphone)){
                    if (window.iab.heightWithoutKeyboard != null) {
                        // If we know the height of the screen without the keyboard, use that
                        // (since the keyboard will affect $(window).height()).
                        newHeight = window.iab.heightWithoutKeyboard;
                    }
                }
                if( newHeight && newHeight > domRef.offsetHeight) {
                    // The view is not taking up the whole screen height, force it.
                    this.setHeight(newHeight + "px");
                }
                
            }
            return vboxOuter;

    }
});
