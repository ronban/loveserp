/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2016 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['jquery.sap.global','./InputBase','./library'],function(q,I,l){"use strict";var T=I.extend("sap.m.TextArea",{metadata:{library:"sap.m",properties:{rows:{type:"int",group:"Appearance",defaultValue:2},cols:{type:"int",group:"Appearance",defaultValue:20},height:{type:"sap.ui.core.CSSSize",group:"Appearance",defaultValue:null},maxLength:{type:"int",group:"Behavior",defaultValue:0},wrapping:{type:"sap.ui.core.Wrapping",group:"Behavior",defaultValue:sap.ui.core.Wrapping.None},valueLiveUpdate:{type:"boolean",group:"Behavior",defaultValue:false},growing:{type:"boolean",group:"Behavior",defaultValue:false},growingMaxLines:{type:"int",group:"Behavior",defaultValue:0}},events:{liveChange:{parameters:{value:{type:"string"}}}}}});T.prototype.exit=function(){I.prototype.exit.call(this);q(window).off("resize.sapMTextAreaGrowing");};T.prototype.onAfterRendering=function(){I.prototype.onAfterRendering.call(this);if(this.getGrowing()){var t=this.getFocusDomRef();if(this.getGrowingMaxLines()>0){var s=window.getComputedStyle(t),m=parseFloat(s.lineHeight)*this.getGrowingMaxLines()+parseFloat(s.paddingTop)+parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth);if(sap.ui.Device.browser.firefox){m+=parseFloat(s.paddingBottom);}t.style.maxHeight=m+"px";}this._adjustHeight(t);}if(!sap.ui.Device.support.touch){return;}var $=this.$("inner");if(this._behaviour.INSIDE_SCROLLABLE_WITHOUT_FOCUS){$.on("touchstart",q.proxy(this._onTouchStart,this));$.on("touchmove",q.proxy(this._onTouchMove,this));}else if(this._behaviour.PAGE_NON_SCROLLABLE_AFTER_FOCUS){$.on("touchmove",function(e){if($.is(":focus")){e.stopPropagation();}});}};T.prototype.onsapenter=function(e){e.setMarked();};T.prototype.onValueRevertedByEscape=function(v){if(this.getValueLiveUpdate()){this.setProperty("value",v,true);v=this.getValue();}this.fireLiveChange({value:v,newValue:v});};T.prototype.getValue=function(){var t=this.getFocusDomRef();return t?t.value:this.getProperty("value");};T.prototype.onsapnext=function(e){e.setMarked();};T.prototype.onsapprevious=function(e){e.setMarked();};T.prototype.oninput=function(e){I.prototype.oninput.call(this,e);if(e.isMarked("invalid")){return;}var t=this.getFocusDomRef(),v=t.value,m=this.getMaxLength();if(m>0&&v.length>m){v=v.substring(0,m);t.value=v;}if(this.getValueLiveUpdate()){this.setProperty("value",v,true);v=this.getValue();}if(this.getGrowing()){this._adjustHeight(t);}this.fireLiveChange({value:v,newValue:v});};T.prototype.setGrowing=function(g){this.setProperty("growing",g);if(this.getGrowing()){q(window).on("resize.sapMTextAreaGrowing",this._updateOverflow.bind(this));}else{q(window).off("resize.sapMTextAreaGrowing");}return this;};T.prototype._adjustHeight=function(t){t.style.height=sap.ui.Device.browser.firefox?"0px":"auto";t.style.height=t.scrollHeight+t.offsetHeight-t.clientHeight-1+"px";this._updateOverflow();};T.prototype._updateOverflow=function(){var t=this.getFocusDomRef();var m=parseFloat(window.getComputedStyle(t)["max-height"]);t.style.overflowY=(t.scrollHeight>m)?"auto":"";};T.prototype._getInputValue=function(v){v=I.prototype._getInputValue.call(this,v);return v.replace(/\r\n/g,"\n");};T.prototype._behaviour=(function(d){return{INSIDE_SCROLLABLE_WITHOUT_FOCUS:d.os.ios||d.os.blackberry||d.browser.chrome,PAGE_NON_SCROLLABLE_AFTER_FOCUS:d.os.android&&d.os.version>=4.1};}(sap.ui.Device));T.prototype._onTouchStart=function(e){var t=e.touches[0];this._iStartY=t.pageY;this._iStartX=t.pageX;this._bHorizontalScroll=undefined;e.setMarked("swipestartHandled");};T.prototype._onTouchMove=function(e){var t=this.getFocusDomRef(),p=e.touches[0].pageY,s=t.scrollTop,b=s<=0,B=s+t.clientHeight>=t.scrollHeight,g=this._iStartY>p,G=this._iStartY<p,o=b&&G||B&&g;if(this._bHorizontalScroll===undefined){this._bHorizontalScroll=Math.abs(this._iStartY-p)<Math.abs(this._iStartX-e.touches[0].pageX);}if(this._bHorizontalScroll||!o){e.setMarked();}};var _=sap.ui.Device.os.windows_phone&&(/MSAppHost/i).test(navigator.appVersion);T.prototype.onfocusin=function(e){var s,$=this.$();I.prototype.onfocusin.apply(this,arguments);function a(){q(window).scrollTop(0);s.scrollTop($.offset().top-s.offset().top+s.scrollTop());}if(_&&$.height()+$.offset().top>260){for(s=$.parent();s[0];s=s.parent()){if(s.css("overflow-y")=="auto"){s.children().last().css("padding-bottom",q(window).height()+"px");window.setTimeout(a,100);return;}}}};return T;},true);
