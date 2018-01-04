/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */
sap.ui.define(["../DefBase"],function(D){"use strict";var R=D.extend("sap.gantt.def.gradient.RadialGradient",{metadata:{properties:{cx:{type:"number",defaultValue:400},cy:{type:"number",defaultValue:200},r:{type:"number",defaultValue:300},fx:{type:"number",defaultValue:400},fy:{type:"number",defaultValue:200}},aggregations:{stops:{type:"sap.gantt.def.gradient.Stop",multiple:true,singularName:"stop"}}}});return R;},true);
