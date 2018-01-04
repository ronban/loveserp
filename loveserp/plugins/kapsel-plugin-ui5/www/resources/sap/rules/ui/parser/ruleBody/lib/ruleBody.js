jQuery.sap.declare("sap.rules.ui.parser.ruleBody.lib.ruleBody");jQuery.sap.require("sap.rules.ui.parser.businessLanguage.lib.parsingBackendMediator");jQuery.sap.require("sap.rules.ui.parser.ruleBody.lib.constants");jQuery.sap.require("sap.rules.ui.parser.infrastructure.errorHandling.hrfException");jQuery.sap.require("sap.rules.ui.parser.infrastructure.messageHandling.lib.responseCollector");jQuery.sap.require("sap.rules.ui.parser.infrastructure.util.utilsBase");sap.rules.ui.parser.ruleBody.lib.ruleBody=sap.rules.ui.parser.ruleBody.lib.ruleBody||{};sap.rules.ui.parser.ruleBody.lib.ruleBody.lib=(function(){var p=new sap.rules.ui.parser.businessLanguage.lib.parsingBackendMediator.lib.parsingBackendMediatorLib();var r=sap.rules.ui.parser.ruleBody.lib.constants.lib;var h=sap.rules.ui.parser.infrastructure.errorHandling.hrfException.lib;var R=sap.rules.ui.parser.infrastructure.messageHandling.lib.responseCollector.lib.ResponseCollector;var u=sap.rules.ui.parser.infrastructure.util.utilsBase.lib;var a=new u.utilsBaseLib();var e=function(c){if(c===null||c===undefined||c===""){return true;}return false;};function b(){this.ruleType="";}b.prototype.initTraversalParts=function initTraversalParts(t){this.traversalParts={};if(t!==undefined&&t!==null){this.traversalParts[r.traversalEnum.condition]=(t.hasOwnProperty(r.traversalEnum.condition)?t[r.traversalEnum.condition]:true);this.traversalParts[r.traversalEnum.outputParams]=(t.hasOwnProperty(r.traversalEnum.outputParams)?t[r.traversalEnum.outputParams]:true);this.traversalParts[r.traversalEnum.actionParams]=(t.hasOwnProperty(r.traversalEnum.actionParams)?t[r.traversalEnum.actionParams]:true);this.traversalParts[r.traversalEnum.actions]=(t.hasOwnProperty(r.traversalEnum.actions)?t[r.traversalEnum.actions]:true);}else{this.traversalParts[r.traversalEnum.condition]=true;this.traversalParts[r.traversalEnum.outputParams]=true;this.traversalParts[r.traversalEnum.actionParams]=true;this.traversalParts[r.traversalEnum.actions]=true;}};b.prototype.traverse=function traverse(c,v,d,t,f){jQuery.sap.log.debug("Traverse rule --> "+JSON.stringify(c));this.initTraversalParts(t);this.vocabulary=v;this.vocaRTServ=d;if(c!==null&&c!==undefined){if(c.hasOwnProperty(r.RULE_BODY_TYPE)){this.ruleType=c.type;this.setHitPolicy(c);if(this.ruleType===r.SINGLE_TEXT){this.traverseText(c,f);}else if(this.ruleType===r.DECISION_TABLE||this.ruleType===r.RULE_SET){this.traverseDecisionTable(c,f);}}}return this;};b.prototype.traverseText=function traverseText(c,d){var i;var f;if(c.hasOwnProperty(r.RULE_CONTENT)){this.initResult();var g=this.initRowResult(c.content,0);f=a.buildJsonPath(d,r.RULE_CONTENT);if(c.content.hasOwnProperty(r.CONDITION)&&this.traversalParts[r.traversalEnum.condition]===true){f=a.buildJsonPath(f,r.CONDITION);g=this.handleTextCondition(c.content.condition,g,f);}if(c.content.hasOwnProperty(r.RULE_OUTPUTS)&&this.traversalParts[r.traversalEnum.outputParams]===true){this.initTextOutputsResult();var j;for(i=0;i<c.content.outputs.length;i++){f=a.buildJsonPath(d,r.RULE_OUTPUTS,i);j=c.content.outputs[i];if(j.hasOwnProperty(r.RULE_CONTENT)){g=this.handleTextOutputParameter(j,g,f);}}}if(c.content.hasOwnProperty(r.RULE_PARAMETERS)&&this.traversalParts[r.traversalEnum.actionParams]===true){this.initTextParametersResult();var k;for(i=0;i<c.content.parameters.length;i++){f=a.buildJsonPath(d,r.RULE_PARAMETERS,i);k=c.content.parameters[i];if(k.hasOwnProperty(r.RULE_CONTENT)){g=this.handleTextActionParameter(k,g,i,f);}}}if(c.content.hasOwnProperty(r.RULE_ACTIONS)&&this.traversalParts[r.traversalEnum.actionParams]===true){this.initTextActionsResult();var l;for(i=0;i<c.content.actions.length;i++){f=a.buildJsonPath(d,r.RULE_ACTIONS,i);l=c.content.actions[i];g=this.handleTextAction(l,g,f);}}this.addRowResult(g);}else{this.handleEmptyRuleBody();}};b.prototype.traverseDecisionTable=function traverseDecisionTable(c,d){var f,g;var i;var j;var k=null;if(c.hasOwnProperty(r.RULE_CONTENT)&&c.content.hasOwnProperty(r.RULE_ROWS)&&c.content.hasOwnProperty(r.RULE_HEADERS)){i=c.content;this.initResult();j=this.handleHeaders(i);var l,m;for(f=0;f<i.rows.length;f++){l=i.rows[f];if(l.hasOwnProperty(r.RULE_ROW)&&l.hasOwnProperty(r.RULE_ROW_ID)){m=this.initRowResult(i,f);for(g=0;g<l.row.length;g++){if(l.row[g].hasOwnProperty(r.RULE_COL_ID)){k=null;if(j.hasOwnProperty(l.row[g].colID)){k=j[l.row[g].colID];}if(k.hasOwnProperty(r.RULE_CELL_TYPE)){if(k.type===r.CONDITION&&this.traversalParts[r.traversalEnum.condition]===true){m=this.handleDecisionTableCondition(k,l,g,m);}else if(k.type===r.PARAM&&this.traversalParts[r.traversalEnum.actionParams]===true){m=this.handleDecisionTableActionParameter(k,l,g,m);}else if(k.type===r.OUTPUT_PARAM&&this.traversalParts[r.traversalEnum.outputParams]===true){m=this.handleDecisionTableOutputParameter(k,l,g,m);}else if(k.type===r.ACTION_PARAM&&this.traversalParts[r.traversalEnum.actions]===true){m=this.handleDecisionTableAction(k,l,g,m);}}}}this.addRowResult(m);}}this.finalizeResult(c);}else{this.handleEmptyRuleBody();}};b.prototype.handleTextCondition=function handleTextCondition(c,d,f){};b.prototype.initTextOutputsResult=function initTextOutputsResult(){};b.prototype.handleTextOutputParameter=function handleTextOutputParameter(c,d,f){};b.prototype.initTextParametersResult=function initTextParametersResult(){};b.prototype.handleTextActionParameter=function handleTextActionParameter(c,d,i,f){};b.prototype.initTextActionsResult=function initTextActionsResult(){};b.prototype.handleTextAction=function handleTextAction(c,d,f){};b.prototype.handleHeaders=function handleHeaders(c){return[];};b.prototype.handleDecisionTableCondition=function handleDecisionTableCondition(c,d,f,g){return g;};b.prototype.handleDecisionTableActionParameter=function handleDecisionTableActionParameter(c,d,f,g){return g;};b.prototype.handleDecisionTableOutputParameter=function handleDecisionTableOutputParameter(c,d,f,g){return g;};b.prototype.handleDecisionTableAction=function handleDecisionTableAction(c,d,f,g){return g;};b.prototype.traverseDecisionTableHeaders=function traverseDecisionTableHeaders(c,d){var f=0,g=0;var i={};if(c.hasOwnProperty(r.RULE_HEADERS)){g=c.headers.length;for(f=0;f<g;f++){i=c.headers[f];if(i.hasOwnProperty(r.RULE_COL_ID)){if(d!==null){d(i);}}}}};b.prototype.buildHeadersMap=function buildHeadersMap(c){var d=[];this.traverseDecisionTableHeaders(c,function(f){d[f.colID]=f;});return d;};b.prototype.concatToDecisionTableCondition=function concatToDecisionTableCondition(c,d){return c+" "+d;};b.prototype.splitDecisionTableCondition=function splitDecisionTableCondition(c,d){var f,g,i;g=c.length+1;i=d.length-c.length-1;f=d.substr(g,i);return f;};b.prototype.initResult=function initResult(){};b.prototype.initRowResult=function initRowResult(c,d){};b.prototype.addRowResult=function addRowResult(c){};b.prototype.finalizeResult=function finalizeResult(c){};b.prototype.handleEmptyRuleBody=function handleEmptyRuleBody(){};b.prototype.getParserAST=function getParserAST(c,d,v,f,g){var i=p.parseInputRT(c,d,this.vocaRTServ,v,f,this.vocabulary,g);jQuery.sap.log.debug("****************************************************************************************************");jQuery.sap.log.debug("expresstion to parser: "+c+" type: "+f+" vocabulary: "+this.vocabulary+" "+d);jQuery.sap.log.debug("*****************************************************************************************************");if(i===undefined||(i===null&&e(c)===false)){R.getInstance().addMessage("error_in_parsing_expression",[c]);throw new h.HrfException("error_in_parsing_expression: "+c,false);}if(d===p.PARSE_MODE){if(i!==null&&i.status==='Error'){throw new h.HrfException('',false);}}jQuery.sap.log.debug(JSON.stringify(i));return i;};b.prototype.setHitPolicy=function setHitPolicy(c){if(c.hasOwnProperty(r.HIT_POLICY_PROPERTY)){this.hitPolicy=c.hitPolicy;}else{this.hitPolicy=r.ALL_MATCH;}};b.prototype.getHitPolicy=function getHitPolicy(){return this.hitPolicy;};return{RuleBody:b};}());