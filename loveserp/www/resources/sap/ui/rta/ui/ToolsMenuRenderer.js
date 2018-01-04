/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(['jquery.sap.global'],function(q){"use strict";var T={};T.render=function(r,c){if(c.getToolbars().length!==0){c.getToolbars().forEach(function(C){r.renderControl(C);});}};return T;},true);
