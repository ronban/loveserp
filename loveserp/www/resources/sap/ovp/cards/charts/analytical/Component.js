(function(){"use strict";jQuery.sap.declare("sap.ovp.cards.charts.analytical.Component");jQuery.sap.require("sap.ovp.cards.generic.Component");jQuery.sap.require("sap.ovp.cards.charts.VizAnnotationManager");sap.ovp.cards.generic.Component.extend("sap.ovp.cards.charts.analytical.Component",{metadata:{properties:{"headerExtensionFragment":{"type":"string","defaultValue":"sap.ovp.cards.generic.KPIHeader"},"contentFragment":{"type":"string","defaultValue":"sap.ovp.cards.charts.analytical.analyticalChart"}},version:"1.42.9",library:"sap.ovp",includes:[],dependencies:{libs:["sap.m","sap.viz"],components:[]},config:{},customizing:{"sap.ui.controllerExtensions":{"sap.ovp.cards.generic.Card":{controllerName:"sap.ovp.cards.charts.analytical.analyticalChart"}}}},onAfterRendering:function(){jQuery(".tabindex0").attr("tabindex",0);jQuery(".tabindex-1").attr("tabindex",-1);}});})();
