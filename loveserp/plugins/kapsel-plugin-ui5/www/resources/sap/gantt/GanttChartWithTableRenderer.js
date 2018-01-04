/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */
sap.ui.define(['sap/ui/core/theming/Parameters','sap/gantt/misc/Utility'],function(P,U){"use strict";var G={};G.render=function(r,g){r.write("<div");r.writeControlData(g);r.addClass("sapUiTableHScr");r.addClass("sapGanttChartWithTable");r.writeClasses();r.addStyle("width",g.getWidth());r.addStyle("height",g.getHeight());r.writeStyles();r.write(">");var h=this._getColumnHeaderHeight(g);g._oTT.setColumnHeaderHeight(h);r.renderControl(g._oSplitter);r.write("</div>");};G._getColumnHeaderHeight=function(g){var h=0;if(g._oToolbar.getAllToolbarItems().length==0){var p=sap.ui.getCore().getConfiguration().getTheme()==="sap_hcb"?2:0,m=U.findSapUiSizeClass(g);if(m==="sapUiSizeCompact"||m==="sapUiSizeCondensed"){h=parseInt(P.get("sapGanttChartCompactHeaderHeight"),10)-p;}else if(m==="sapUiSizeCozy"){h=parseInt(P.get("sapGanttChartHeaderHeight"),10)-p;}else{h=parseInt(P.get("sapGanttChartHeaderDefaultHeight"),10)-p;}}return h;};return G;},true);
