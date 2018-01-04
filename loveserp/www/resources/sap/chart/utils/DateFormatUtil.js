/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(['sap/chart/TimeUnitType','sap/ui/core/format/DateFormat'],function(T,D){"use strict";function g(t){var p;switch(t){case T.yearmonthday:p="yyyyMMdd";break;default:return null;}return D.getDateInstance({pattern:p});}return{getInstance:g};});
