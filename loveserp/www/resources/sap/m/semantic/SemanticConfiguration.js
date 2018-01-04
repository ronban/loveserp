/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['jquery.sap.global','sap/ui/base/Metadata',"sap/m/OverflowToolbarLayoutData","sap/ui/core/InvisibleText","sap/ui/core/IconPool"],function(q,M,O,I,a){"use strict";var S=M.createClass("sap.m.semantic.SemanticConfiguration",{});S.prototype._PositionInPage={headerLeft:"headerLeft",headerRight:"headerRight",headerMiddle:"headerMiddle",footerLeft:"footerLeft",footerRight_IconOnly:"footerRight_IconOnly",footerRight_TextOnly:"footerRight_TextOnly",shareMenu:"shareMenu"};S._PageMode={display:"display",edit:"edit",multimode:"multimode"};S.isKnownSemanticType=function(t){return S.getConfiguration(t)!=undefined;};S.getConfiguration=function(t){return S._oTypeConfigs[t];};S.getSettings=function(t){return S._oTypeConfigs[t].getSettings();};S.getPositionInPage=function(t){return S._oTypeConfigs[t].position;};S.getSequenceOrderIndex=function(t){return S._oTypeConfigs[t].order;};S.getAriaId=function(t){return S._oTypeConfigs[t].getSettings().ariaLabelledBy;};S._oTypeConfigs=(function(){var t={},b=sap.ui.getCore().getLibraryResourceBundle("sap.m");t["sap.m.semantic.MultiSelectAction"]={position:S.prototype._PositionInPage.headerRight,getSettings:function(){return{icon:a.getIconURI("multi-select"),tooltip:b.getText("SEMANTIC_CONTROL_MULTI_SELECT")};}};t["sap.m.semantic.MainAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,getSettings:function(){return{type:sap.m.ButtonType.Emphasized,layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:0};t["sap.m.semantic.EditAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,triggers:S._PageMode.edit,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_EDIT"),type:sap.m.ButtonType.Emphasized,layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:1};t["sap.m.semantic.SaveAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,triggers:S._PageMode.display,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_SAVE"),type:sap.m.ButtonType.Emphasized,layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:3};t["sap.m.semantic.DeleteAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,triggers:S._PageMode.display,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_DELETE"),layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:4};t["sap.m.semantic.PositiveAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,getSettings:function(){return{type:sap.m.ButtonType.Accept,layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:5};t["sap.m.semantic.NegativeAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,getSettings:function(){return{type:sap.m.ButtonType.Reject,layoutData:new O({moveToOverflow:false,stayInOverflow:false})};},order:6};t["sap.m.semantic.CancelAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,triggers:S._PageMode.display,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_CANCEL")};},order:7};t["sap.m.semantic.ForwardAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_FORWARD"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},order:8};t["sap.m.semantic.OpenInAction"]={position:S.prototype._PositionInPage.footerRight_TextOnly,getSettings:function(){return{text:b.getText("SEMANTIC_CONTROL_OPEN_IN")};},order:9};t["sap.m.semantic.AddAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,triggers:S._PageMode.edit,getSettings:function(){return{icon:a.getIconURI("add"),text:b.getText("SEMANTIC_CONTROL_ADD"),tooltip:b.getText("SEMANTIC_CONTROL_ADD")};},order:0,constraints:"IconOnly"};t["sap.m.semantic.FavoriteAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("favorite"),text:b.getText("SEMANTIC_CONTROL_FAVORITE"),tooltip:b.getText("SEMANTIC_CONTROL_FAVORITE")};},order:1,constraints:"IconOnly"};t["sap.m.semantic.FlagAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("flag"),text:b.getText("SEMANTIC_CONTROL_FLAG"),tooltip:b.getText("SEMANTIC_CONTROL_FLAG")};},order:2,constraints:"IconOnly"};t["sap.m.semantic.ISort"]={position:S.prototype._PositionInPage.footerRight_IconOnly,order:3};t["sap.m.semantic.IFilter"]={position:S.prototype._PositionInPage.footerRight_IconOnly,order:4};t["sap.m.semantic.IGroup"]={position:S.prototype._PositionInPage.footerRight_IconOnly,order:5};t["sap.m.semantic.SortAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("sort"),text:b.getText("SEMANTIC_CONTROL_SORT"),tooltip:b.getText("SEMANTIC_CONTROL_SORT"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},constraints:"IconOnly"};t["sap.m.semantic.SortSelect"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("sort"),type:"IconOnly",autoAdjustWidth:true,tooltip:b.getText("SEMANTIC_CONTROL_SORT"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},getEventDelegates:function(c){return{onAfterRendering:function(){this.$().attr({"aria-haspopup":true,"role":""});}.bind(c)};},constraints:"IconOnly"};t["sap.m.semantic.FilterAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("filter"),text:b.getText("SEMANTIC_CONTROL_FILTER"),tooltip:b.getText("SEMANTIC_CONTROL_FILTER"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},constraints:"IconOnly"};t["sap.m.semantic.FilterSelect"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("filter"),type:"IconOnly",autoAdjustWidth:true,tooltip:b.getText("SEMANTIC_CONTROL_FILTER"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},constraints:"IconOnly"};t["sap.m.semantic.GroupAction"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("group-2"),text:b.getText("SEMANTIC_CONTROL_GROUP"),tooltip:b.getText("SEMANTIC_CONTROL_GROUP"),layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},constraints:"IconOnly"};t["sap.m.semantic.GroupSelect"]={position:S.prototype._PositionInPage.footerRight_IconOnly,getSettings:function(){return{icon:a.getIconURI("group-2"),type:"IconOnly",autoAdjustWidth:true,layoutData:new O({moveToOverflow:true,stayInOverflow:false})};},getEventDelegates:function(c){return{onAfterRendering:function(){this.$().attr({"aria-haspopup":true,"role":""});}.bind(c)};},constraints:"IconOnly"};t["saveAsTileAction"]={position:S.prototype._PositionInPage.shareMenu,order:0,constraints:"IconOnly"};t["pagingAction"]={position:S.prototype._PositionInPage.headerRight};t["sap.m.semantic.DiscussInJamAction"]={position:S.prototype._PositionInPage.shareMenu,getSettings:function(){return{icon:a.getIconURI("discussion-2"),text:b.getText("SEMANTIC_CONTROL_DISCUSS_IN_JAM")};},order:1,constraints:"IconOnly"};t["sap.m.semantic.ShareInJamAction"]={position:S.prototype._PositionInPage.shareMenu,getSettings:function(){return{icon:a.getIconURI("share-2"),text:b.getText("SEMANTIC_CONTROL_SHARE_IN_JAM")};},order:2,constraints:"IconOnly"};t["sap.m.semantic.SendMessageAction"]={position:S.prototype._PositionInPage.shareMenu,getSettings:function(){return{icon:a.getIconURI("discussion"),text:b.getText("SEMANTIC_CONTROL_SEND_MESSAGE")};},order:3,constraints:"IconOnly"};t["sap.m.semantic.SendEmailAction"]={position:S.prototype._PositionInPage.shareMenu,getSettings:function(){return{icon:a.getIconURI("email"),text:b.getText("SEMANTIC_CONTROL_SEND_EMAIL")};},order:4,constraints:"IconOnly"};t["sap.m.semantic.PrintAction"]={position:S.prototype._PositionInPage.shareMenu,getSettings:function(){return{icon:a.getIconURI("print"),text:b.getText("SEMANTIC_CONTROL_PRINT")};},order:5,constraints:"IconOnly"};t["sap.m.semantic.MessagesIndicator"]={position:S.prototype._PositionInPage.footerLeft,getSettings:function(){return{icon:a.getIconURI("message-popup"),text:{path:"message>/",formatter:function(m){return m.length||0;}},tooltip:b.getText("SEMANTIC_CONTROL_MESSAGES_INDICATOR"),type:sap.m.ButtonType.Emphasized,visible:{path:"message>/",formatter:function(m){return m&&m.length>0;}},models:{message:sap.ui.getCore().getMessageManager().getMessageModel()},layoutData:new O({moveToOverflow:false,stayInOverflow:false})};}};t["draftIndicator"]={position:S.prototype._PositionInPage.footerLeft,getSettings:function(){return{layoutData:new sap.m.OverflowToolbarLayoutData({shrinkable:false})};},order:1};return t;})();return S;},false);
