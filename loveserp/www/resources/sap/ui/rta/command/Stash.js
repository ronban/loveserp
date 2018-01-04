/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)

(c) Copyright 2009-2016 SAP SE. All rights reserved
 */
sap.ui.define(['sap/ui/rta/command/FlexCommand',"sap/ui/fl/changeHandler/StashControl"],function(F,S){"use strict";var a=F.extend("sap.ui.rta.command.Stash",{metadata:{library:"sap.ui.rta",properties:{changeType:{type:"string",defaultValue:"stashControl"}},associations:{},events:{}}});a.prototype.init=function(){this.setChangeHandler(S);};a.prototype._undoWithElement=function(e){e=sap.ui.getCore().byId(e.getId());this.setElement(e);e.setStashed(false);e.setVisible(true);};a.prototype.serialize=function(){return{changeType:this.getChangeType(),selector:{id:this._getElement().getId()}};};return a;},true);
