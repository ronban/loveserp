/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/gantt/shape/Path","sap/ui/core/Core"],function(P,C){"use strict";var R=P.extend("sap.gantt.shape.ext.rls.Relationship",{metadata:{properties:{htmlClass:{type:"string",defaultValue:"relationshipLine"},category:{type:"string",defaultValue:sap.gantt.shape.ShapeCategory.Relationship},isClosed:{type:"boolean",defaultValue:true},isDuration:{type:"boolean",defaultValue:false},stroke:{type:"string",defaultValue:"#000000"},fill:{type:"string",defaultValue:"#000000"},type:{type:"sap.gantt.shape.ext.rls.RelationshipType",defaultValue:sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish},fromObjectPath:{type:"string"},fromShapeId:{type:"string"},fromDataId:{type:"string"},toObjectPath:{type:"string"},toShapeId:{type:"string"},toDataId:{type:"string"},showStart:{type:"boolean",defaultValue:false},showEnd:{type:"boolean",defaultValue:true},lShapeforTypeFS:{type:"boolean",defaultValue:true},minXLen:{type:"number",defaultValue:10},arrowSideLength:{type:"number",defaultValue:5}},aggregations:{selectedShape:{type:"sap.gantt.shape.ext.rls.SelectedRelationship",multiple:false}}}});R.prototype.init=function(){this._isRTL=C.getConfiguration().getRTL();var r=sap.ui.getCore().getLibraryResourceBundle("sap.gantt");this.setProperty("ariaLabel",r.getText("ARIA_RELATIONSHIP"));};R.prototype.getType=function(d){return this._configFirst("type",d);};R.prototype.getFromObjectPath=function(d){return this._configFirst("fromObjectPath",d);};R.prototype.getFromShapeId=function(d){return this._configFirst("fromShapeId",d);};R.prototype.getFromDataId=function(d){return this._configFirst("fromDataId",d);};R.prototype.getToObjectPath=function(d){return this._configFirst("toObjectPath",d);};R.prototype.getToShapeId=function(d){return this._configFirst("toShapeId",d);};R.prototype.getToDataId=function(d){return this._configFirst("toDataId",d);};R.prototype.getLShapeforTypeFS=function(d){return this._configFirst("lShapeforTypeFS",d);};R.prototype.getHtmlClass=function(d){return this._configFirst("htmlClass",d);};R.prototype.getShowStart=function(d){return this._configFirst("showStart",d);};R.prototype.getShowEnd=function(d){return this._configFirst("showEnd",d);};R.prototype.getD=function(d,r){var s=this.getShowEnd(d,r);var a=this.getShowStart(d,r);var x,y,b,c;var t;try{t=window.parseInt(this.getType(d,r));}catch(e){jQuery.sap.log.warning("invalid relationship type");}var l=this.getLShapeforTypeFS(d,r);var I=this.mChartInstance._getIdByShapeId(this.getFromShapeId(d,r.from.objectInfo));var p=sap.ui.getCore().byId(I).getRLSAnchors(r.from.shapeRawData,r.from.objectInfo);I=this.mChartInstance._getIdByShapeId(this.getToShapeId(d,r.from.objectInfo));var o=sap.ui.getCore().byId(I).getRLSAnchors(r.to.shapeRawData,r.to.objectInfo);if(this._isRTL){if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish){x=p.startPoint.x;y=p.startPoint.y;b=o.startPoint.x;c=o.startPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToStart){x=p.startPoint.x;y=p.startPoint.y;b=o.endPoint.x;c=o.endPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToFinish){x=p.endPoint.x;y=p.endPoint.y;b=o.startPoint.x;c=o.startPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToStart){x=p.endPoint.x;y=p.endPoint.y;b=o.endPoint.x;c=o.endPoint.y;}}else if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish){x=p.endPoint.x;y=p.endPoint.y;b=o.endPoint.x;c=o.endPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToStart){x=p.endPoint.x;y=p.endPoint.y;b=o.startPoint.x;c=o.startPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToFinish){x=p.startPoint.x;y=p.startPoint.y;b=o.endPoint.x;c=o.endPoint.y;}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToStart){x=p.startPoint.x;y=p.startPoint.y;b=o.startPoint.x;c=o.startPoint.y;}var S="";if(a){var f=this._calculateSquareCoordinate(t,x,y);S=S.concat("M").concat(f[0].x).concat(",").concat(f[0].y).concat(" ");var g=f.length;for(var i=1;i<g;i++){S=S.concat("L").concat(f[i].x).concat(",").concat(f[i].y).concat(" ");}}var h=this._calculateLineCoordinate(l,t,x,b,y,c,r.from.objectInfo,o.startPoint.height);S=S.concat("M").concat(h[0].x).concat(",").concat(h[0].y).concat(" ");var m=h.length;for(var j=0;j<m;j++){S=S.concat("L").concat(h[j].x).concat(",").concat(h[j].y).concat(" ");S=S.concat("M").concat(h[j].x).concat(",").concat(h[j].y).concat(" ");}if(s){var n=this._calculateArrowCoordinate(l,t,x,b,y,c,o.startPoint.height);var q=n.length;for(var k=0;k<q;k++){S=S.concat("L").concat(n[k].x).concat(",").concat(n[k].y).concat(" ");}}S=S.concat("Z");if(this.isValid(S)){return S;}else{jQuery.sap.log.warning("Relationship shape generated invalid d: "+S+" from the given data: "+d);return null;}};R.prototype._calculateSquareCoordinate=function(t,x,y){var s=[];if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish||t===sap.gantt.shape.ext.rls.RelationshipType.FinishToStart){if(this._isRTL){s=[x,y-2,x-3,y-2,x-3,y+1.5,x,y+1.5,x,y-2];}else{s=[x-1,y-2,x-1+3,y-2,x-1+3,y+1.5,x-1,y+1.5,x-1,y-2];}}else if(this._isRTL){s=[x-1,y-2,x-1+3,y-2,x-1+3,y+1.5,x-1,y+1.5,x-1,y-2];}else{s=[x,y-2,x-3,y-2,x-3,y+1.5,x,y+1.5,x,y-2];}var o=[];var a=s.length;for(var i=0;i<a;){o[o.length]={"x":s[i++],"y":s[i++]};}return o;};R.prototype._calculateLineCoordinate=function(l,t,x,a,y,b,f,s){var d=[];var r,c;if(y===b){d=d.concat([x,y,a,b]);}else{var k=this.getMinXLen();if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish){if(this._isRTL){d=d.concat([x,y,Math.min(x,a)-k,y,Math.min(x,a)-k,b,a,b]);}else{d=d.concat([x,y,Math.max(x,a)+k,y,Math.max(x,a)+k,b,a,b]);}}else if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToStart){if(l){if(this._isRTL){if(x>a){if(y<b){b=b-s/2;}else{b=b+s/2;}d=d.concat([x,y,a,y,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x-k,y,x-k,c,a+k,c,a+k,b,a,b]);}else if(y>b){r=f.y;d=d.concat([x,y,x-k,y,x-k,r,a+k,r,a+k,b,a,b]);}}else if(x<=a){if(y<b){b=b-s/2-2;}else{b=b+s/2+2;}d=d.concat([x,y,a,y,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x+k,y,x+k,c,a-k,c,a-k,b,a,b]);}else if(y>b){r=f.y;d=d.concat([x,y,x+k,y,x+k,r,a-k,r,a-k,b,a,b]);}}else if(this._isRTL){if(x-k>a){d=d.concat([x,y,x-k,y,x-k,b,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x-k,y,x-k,c,a+k,c,a+k,b,a,b]);}else if(y>b){r=f.y-f.rowHeight;d=d.concat([x,y,x-k,y,x-k,r,a+k,r,a+k,b,a,b]);}}else if(x+k<=a){if(this.getShowEnd()){var e=this.getArrowSideLength();k=(x+k+e>a)?Math.abs(k-e):k;}d=d.concat([x,y,x+k,y,x+k,b,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x+k,y,x+k,c,a-k,c,a-k,b,a,b]);}else if(y>b){r=f.y-f.rowHeight;d=d.concat([x,y,x+k,y,x+k,r,a-k,r,a-k,b,a,b]);}}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToFinish){if(this._isRTL){if(x<a-k){d=d.concat([x,y,x+k,y,x+k,b,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x+k,y,x+k,c,a-k,c,a-k,b,a,b]);}else if(y>b){r=f.y;d=d.concat([x,y,x+k,y,x+k,r,a-k,r,a-k,b,a,b]);}}else if(x>=a+k){d=d.concat([x,y,x-k,y,x-k,b,a,b]);}else if(y<b){c=f.y+f.rowHeight;d=d.concat([x,y,x-k,y,x-k,c,a+k,c,a+k,b,a,b]);}else if(y>b){r=f.y;d=d.concat([x,y,x-k,y,x-k,r,a+k,r,a+k,b,a,b]);}}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToStart){if(this._isRTL){d=d.concat([x,y,Math.max(x,a)+k,y,Math.max(x,a)+k,b,a,b]);}else{d=d.concat([x,y,Math.min(x,a)-k,y,Math.min(x,a)-k,b,a,b]);}}}var o=[];var g=d.length;for(var i=0;i<g;){o[o.length]={"x":d[i++],"y":d[i++]};}return o;};R.prototype._calculateArrowCoordinate=function(l,t,x,a,y,b,s){var c=[];var d=this.getArrowSideLength();if(t===sap.gantt.shape.ext.rls.RelationshipType.FinishToFinish||t===sap.gantt.shape.ext.rls.RelationshipType.StartToFinish){if(this._isRTL){c=[a-d*Math.pow(3,1/2)/2,b-d/2,a-d*Math.pow(3,1/2)/2,b+d/2];}else{c=[a+d*Math.pow(3,1/2)/2,b-d/2,a+d*Math.pow(3,1/2)/2,b+d/2];}}else if(t===sap.gantt.shape.ext.rls.RelationshipType.StartToStart){if(this._isRTL){c=[a+d*Math.pow(3,1/2)/2,b-d/2,a+d*Math.pow(3,1/2)/2,b+d/2];}else{c=[a-d*Math.pow(3,1/2)/2,b-d/2,a-d*Math.pow(3,1/2)/2,b+d/2];}}else if(l){if(this._isRTL){if(x>a){if(y<b){b=b-s/2-1;}else if(y>b){b=b+s/2+1;}else{}if(y<b){c=[a+d/2,b-d*Math.pow(3,1/2)/2,a-d/2,b-d*Math.pow(3,1/2)/2];}else if(y==b){c=[a+d*Math.pow(3,1/2)/2,b-d/2,a+d*Math.pow(3,1/2)/2,b+d/2];}else{c=[a+d/2,b+d*Math.pow(3,1/2)/2,a-d/2,b+d*Math.pow(3,1/2)/2];}}else{c=[a+d*Math.pow(3,1/2)/2,b-d/2,a+d*Math.pow(3,1/2)/2,b+d/2];}}else if(x<=a){if(y<b){b=b-s/2-1;}else if(y>b){b=b+s/2+1;}else{}if(y<b){c=[a-d/2,b-d*Math.pow(3,1/2)/2,a+d/2,b-d*Math.pow(3,1/2)/2];}else if(y==b){c=[a-d*Math.pow(3,1/2)/2,b-d/2,a-d*Math.pow(3,1/2)/2,b+d/2];}else{c=[a-d/2,b+d*Math.pow(3,1/2)/2,a+d/2,b+d*Math.pow(3,1/2)/2];}}else{c=[a-d*Math.pow(3,1/2)/2,b-d/2,a-d*Math.pow(3,1/2)/2,b+d/2];}}else if(this._isRTL){c=[a+d*Math.pow(3,1/2)/2,b-d/2,a+d*Math.pow(3,1/2)/2,b+d/2];}else{c=[a-d*Math.pow(3,1/2)/2,b-d/2,a-d*Math.pow(3,1/2)/2,b+d/2];}var o=[];var e=c.length;for(var i=0;i<e;){o[o.length]={"x":c[i++],"y":c[i++]};}return o;};return R;},true);
