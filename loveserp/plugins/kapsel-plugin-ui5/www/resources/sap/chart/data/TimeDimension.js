/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(["sap/chart/data/Dimension","sap/chart/utils/ChartUtils"],function(D,C){"use strict";var T=D.extend("sap.chart.data.TimeDimension",{metadata:{library:"sap.chart",properties:{timeUnit:{type:"string"}}}});T.prototype.setTimeUnit=C.makeNotifyParentProperty("timeUnit");return T;});
