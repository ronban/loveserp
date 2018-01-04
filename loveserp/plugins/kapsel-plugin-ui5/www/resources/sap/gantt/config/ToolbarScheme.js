/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */
sap.ui.define(['jquery.sap.global','sap/ui/core/Element'],function(q,E){"use strict";var T=E.extend("sap.gantt.config.ToolbarScheme",{metadata:{properties:{key:{type:"string",defaultValue:null},sourceSelect:{type:"sap.gantt.config.ToolbarGroup",defaultValue:null},layout:{type:"sap.gantt.config.LayoutGroup",defaultValue:null},customToolbarItems:{type:"sap.gantt.config.ToolbarGroup",defaultValue:null},expandChart:{type:"sap.gantt.config.ExpandChartGroup",defaultValue:null},expandTree:{type:"sap.gantt.config.ToolbarGroup",defaultValue:null},timeZoom:{type:"sap.gantt.config.ToolbarGroup",defaultValue:null},legend:{type:"sap.gantt.config.ToolbarGroup",defaultValue:null},settings:{type:"sap.gantt.config.SettingGroup",defaultValue:null},mode:{type:"sap.gantt.config.ModeGroup",defaultValue:null},toolbarDesign:{type:"string",defaultValue:sap.m.ToolbarDesign.Auto}}}});return T;},true);
