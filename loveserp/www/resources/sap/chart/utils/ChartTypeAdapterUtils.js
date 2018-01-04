/*
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(['sap/chart/ChartType','sap/chart/TimeUnitType'],function(C,T){"use strict";var a={};var A={"line":"timeseries_line","column":"timeseries_column","scatter":"timeseries_scatter","bubble":"timeseries_bubble","combination":"timeseries_combination","dual_combination":"dual_timeseries_combination"};function t(c,d){var h=d.some(function(D){return D instanceof sap.chart.data.TimeDimension;});if(h){return A[c];}else{return c;}}a.adaptChartType=function(c,d){if(A[c]){return t(c,d);}else{return c;}};return a;});
