/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(['sap/chart/data/TimeDimension'],function(T){"use strict";function R(f){this._sFeedingId=f;}R.prototype.toFeedingId=function(d){return this._sFeedingId;};function a(){this._bTimeFed=false;}R.TimeCategory=a;a.prototype=Object.create(R.prototype);a.prototype.toFeedingId=function(d){if(d instanceof T&&!this._bTimeFed){this._bTimeFed=true;return"timeAxis";}else{return"@context";}};return R;});
