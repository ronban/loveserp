/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/gantt/misc/Format"],function(F){"use strict";var U={};U.assign=function(i,d){if(typeof(i)!==typeof(d)){return d;}else if((typeof i==="undefined")||i===null){return d;}else{return i;}};U.assignDeep=function(i,d){if(!i&&!d){return null;}else if(i&&!d){return i;}else if(!i&&d){return d;}else if(typeof(i)==="object"&&typeof(d)==="object"){var r=i;for(var a in d){if(typeof(r[a])!=="boolean"&&!r[a]){r[a]=d[a];}else if(typeof(d[a])==="object"&&typeof(r[a])==="object"){r[a]=this.assignDeep(r[a],d[a]);}}return r;}else{return i;}};U.generateRowUid=function(d,o,s,p){jQuery.each(d,function(k,v){v.uid=v.id;if(p){v.uid=p+"|"+v.uid;}else if(v.bindingObj&&v.bindingObj.findNode){var n=v.bindingObj.findNode(v.rowIndex);while(n.parent&&n.level>0){n=n.parent;v.uid=n.context.getObject().id+"|"+v.uid;}}v.uid="PATH:"+v.uid+"|SCHEME:"+v.chartScheme+"["+v.index+"]";v.data.uid=v.uid;for(var i=0;i<s.length;i++){var D=s[i];if(D in v.data){for(var j=0;j<v.data[D].length;j++){var a=v.data[D][j];if(a.id===undefined){a.id=j;}a.uid=v.uid+"|DATA:"+D+"["+a.id+"]";}}}});};U.getChartSchemeByShapeUid=function(s){if(s&&s.indexOf("|SCHEME:")>-1){var a=s.split("|SCHEME:");if(a&&a[1].length>0){return a[1].split("[")[0];}}return"";};U.generateUidByShapeDataName=function(d,s){if(s===undefined){s="relationship";}for(var i=0;i<d.length;i++){if(d[i].id===undefined){d[i].id=i;}d[i].uid="|DATA:"+s+"["+d[i].id+"]";}};U.generateObjectPathToObjectMap=function(d,m,p){var r;for(var i in d){var o=d[i],a;if(o.objectInfoRef){a=o.objectInfoRef.data.id;o=o.objectInfoRef;}else{a=o.data.id;}if(p&&p!=""){a=p.concat(".").concat(a);}m[a]=o;if(o.children&&o.children.length>0){r=this.generateObjectPathToObjectMap(o.children,m,a);}}return r;};U.getShapeDataNameByUid=function(s){var S;if(s!==undefined){var a="|DATA:";if(s.split(a)[1]){S=s.split(a)[1].split("[")[0];}else{S=undefined;}}return S;};U.getObjectIdByUid=function(u,i){if(u!==null&&u!==undefined){var p=new RegExp("PATH:","");var s,o;if(i){s=new RegExp("\\|SCHEME:","");}else{s=new RegExp("\\|DATA:","");}var f=p.exec(u);var l=s.exec(u);if((f!==null)&&(l!==null)){o=u.substring(f.index+5,l.index);}if(o){return o;}else{return undefined;}}return undefined;};U.scaleBySapUiSize=function(m,n){switch(m){case"sapUiSizeCozy":return n*1.5;case"sapUiSizeCondensed":return n*0.78;default:return n;}};U.findSapUiSizeClass=function(c){var $,a;if(c){$=c.$();}else{$=jQuery("body");}if($){a=$.closest(".sapUiSizeCompact,.sapUiSizeCondensed,.sapUiSizeCozy");if(a.hasClass("sapUiSizeCondensed")){return"sapUiSizeCondensed";}else if(a.hasClass("sapUiSizeCompact")){return"sapUiSizeCompact";}else if(a.hasClass("sapUiSizeCozy")){return"sapUiSizeCozy";}}};U.floatEqual=function(v,V){return Math.abs(v-V)<0.0001;};U.calculateStringLength=function(s){var l=0;if(s.match("[\u4E00-\u9FFF]")===null){l=s.length;}else{l=s.length+s.match(/[\u4E00-\u9FFF]/g).length;}return l;};return U;},true);