jQuery.sap.declare("sap.rules.ui.parser.resources.vocabulary.lib.JSONLoader");jQuery.sap.require("sap.rules.ui.parser.infrastructure.util.utilsBase");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.utilsBase");jQuery.sap.require("sap.rules.ui.parser.resources.common.lib.constants");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.utils");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.constants");jQuery.sap.require("sap.rules.ui.parser.businessLanguage.lib.constants");jQuery.sap.require("sap.rules.ui.parser.infrastructure.messageHandling.lib.responseCollector");jQuery.sap.require("sap.rules.ui.parser.infrastructure.errorHandling.hrfException");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.termGeneration");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.vocaObjects");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.runtimeServicesUtils");jQuery.sap.require("sap.rules.ui.parser.resources.vocabulary.lib.vocabularyDataProviderFactory");sap.rules.ui.parser.resources.vocabulary.lib.JSONLoader=sap.rules.ui.parser.resources.vocabulary.lib.JSONLoader||{};sap.rules.ui.parser.resources.vocabulary.lib.JSONLoader.lib=(function(){var a=sap.rules.ui.parser.infrastructure.util.utilsBase.lib;var b=new a.utilsBaseLib();var v=sap.rules.ui.parser.resources.vocabulary.lib.utilsBase.lib;var c=new v.utilsBaseLib();var r=sap.rules.ui.parser.resources.common.lib.constants.lib;var d=sap.rules.ui.parser.resources.vocabulary.lib.utils.lib;var e=new d.utilsLib();var f=sap.rules.ui.parser.resources.vocabulary.lib.constants.lib;var g=sap.rules.ui.parser.businessLanguage.lib.constants.lib;var R=sap.rules.ui.parser.infrastructure.messageHandling.lib.responseCollector.lib.ResponseCollector;var h=sap.rules.ui.parser.infrastructure.errorHandling.hrfException.lib;var t=sap.rules.ui.parser.resources.vocabulary.lib.termGeneration.lib;var k=new t.termGenerationLib();var l=sap.rules.ui.parser.resources.vocabulary.lib.vocaObjects.lib;var m=sap.rules.ui.parser.resources.vocabulary.lib.runtimeServicesUtils.lib;var n=new m.runtimeServicesUtilsLib();function J(){}J.prototype.loadAll=function(o,p,q,s,u,w,x){var y=null;var z=null;var A=JSON.parse(JSON.stringify(p));var B=u.name;var C=b.createUUID();var D=null;var E;var F;var G;var H;if(s){jQuery.sap.require("sap.rules.ui.parser.ruleBody.lib.ruleBodyValidator");H=sap.rules.ui.parser.ruleBody.lib.ruleBodyValidator.lib;}var I=sap.rules.ui.parser.resources.vocabulary.lib.vocabularyDataProviderFactory.lib;F=new I.vocaDataProviderFactoryLib();jQuery.sap.require("sap.rules.ui.parser.businessLanguage.lib.parsingBackendMediator");var K=new sap.rules.ui.parser.businessLanguage.lib.parsingBackendMediator.lib.parsingBackendMediatorLib();if(x){jQuery.sap.require("sap.rules.ui.parser.resources.dependencies.lib.constants");G=sap.rules.ui.parser.resources.dependencies.lib.constants.lib;jQuery.sap.require("sap.rules.ui.parser.resources.dependencies.lib.dependenciesUtils");y=sap.rules.ui.parser.resources.dependencies.lib.dependenciesUtils;jQuery.sap.require("sap.rules.ui.parser.resources.dependencies.lib.dependencyManager");z=sap.rules.ui.parser.resources.dependencies.lib.dependencyManager.DependencyManager;}if(u.package&&u.package.length>0){B=e.getVocabularyFullName(u,A);}function L(A){if(A.hasOwnProperty(f.PROPERTY_NAME_CONVERSION_FLAGS)){return A[f.PROPERTY_NAME_CONVERSION_FLAGS];}return null;}function M(A){var i=L(A);if(i===null){return"0";}if(i.hasOwnProperty(f.PROPERTY_NAME_IS_VALUE_LIST_CONVERTED)){return(i[f.PROPERTY_NAME_IS_VALUE_LIST_CONVERTED]===true?"1":"0");}return"0";}function N(o,B,A,u,i,C,w,E){var q=(i===true)?"1":"0";var j=A[f.PROPERTY_NAME_IS_WRITABLE]?"1":"0";D=M(A);var y1=new l.VocaInfo(C,B,u[r.PROPERTY_NAME_SUFFIX],E,j,q,D,u[r.PROPERTY_NAME_PACKAGE],u[r.PROPERTY_NAME_NAME],w);o.allVocabularies=o.allVocabularies||{};o.allVocabularies[B]=y1;}function O(y1,z1,A,A1,q,u,B1){var C1;var i,j;var D1;var E1;var F1;var G1,H1;var I1;var J1=[];if(!A){return;}for(i=0;i<A.length;i++){if(A[i].hasOwnProperty(f.PROPERTY_NAME_STATIC_PARAMS)){F1=A[i][f.PROPERTY_NAME_STATIC_PARAMS];for(j=0;j<F1.length;j++){D1=F1[j][f.PROPERTY_NAME_MAPPING];E1=F1[j][f.PROPERTY_NAME_NAME];C1=K.parseInput(D1,g.VALIDATE_MODE,y1,null,null,z1,{"dependenciesOutput":true});if(C1===undefined||C1===null){G1=[A1,D1,C1];H1=R.getInstance().addMessage("error_vocabulary_invalid_expression",G1);throw new h.HrfException(JSON.stringify(H1),false);}if(C1.status===g.statusEnum.ERROR){G1=[A1,D1,C1.errorDetails];H1=R.getInstance().addMessage("error_vocabulary_problem_in_rule",G1);throw new h.HrfException(JSON.stringify(H1),false);}if(B1===false&&C1.isCollection===true){G1=[A[i][f.PROPERTY_NAME_NAME],E1];H1=R.getInstance().addMessage("error_vocabulary_parameter_action_param_cant_be_collection",G1);throw new h.HrfException(JSON.stringify(H1),false);}if(x){I1=C1[G.PROPERTY_NAME_DEPENDENCIES_OUTPUT];if(I1!==null&&I1!==undefined){J1=J1.concat(y.createDependenciesInVocabulary(A1+"."+A[i][f.PROPERTY_NAME_NAME],z1,I1,q,y1));}}}}}if(x&&J1.length>0){z.getInstance(y1).setDependencies(u,J1);}}function P(i,j,s){var y1;var z1=F.getVocabularyDataProvider(s);var A1=z1.getValueList(j,i[f.PROPERTY_NAME_VALUE_LIST]);if(A1===null){var B1=[i[f.PROPERTY_NAME_VALUE_LIST],i[f.PROPERTY_NAME_NAME]];y1=R.getInstance().addMessage("error_vocabulary_value_list_does_not_exist",B1);throw new h.HrfException(JSON.stringify(y1),false);}i[f.PROPERTY_NAME_OM_ATTR_VALUE_LIST_ID]=A1[f.ATT_ID];if(A1.hasOwnProperty(f.PROPERTY_VALUE_LIST_DESCRIPTION_COLUMN)&&A1[f.PROPERTY_VALUE_LIST_DESCRIPTION_COLUMN]!==null){i[f.PROPERTY_NAME_BUSINESS_DATA_TYPE]=g.SIMPLE_SELECTION_VALUE_TYPE.STRING.string;}else{i[f.PROPERTY_NAME_BUSINESS_DATA_TYPE]=A1[f.PROPERTY_NAME_BUSINESS_DATA_TYPE];}i[f.PROPERTY_NAME_DATA_TYPE]=A1[f.PROPERTY_NAME_DATA_TYPE];i[f.PROPERTY_NAME_SIZE]=A1[f.PROPERTY_NAME_SIZE];}function Q(i,j,s){if(i[f.PROPERTY_NAME_VALUE_LIST]){P(i,j,s);}if(!i[f.PROPERTY_NAME_BUSINESS_DATA_TYPE]){var y1=e.getBusinessDataType(i[f.PROPERTY_NAME_DATA_TYPE]);i[f.PROPERTY_NAME_BUSINESS_DATA_TYPE]=y1;}}function S(i){if(!i[f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING]){i[f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING]={column:i[f.PROPERTY_NAME_OM_ATTR_NAME]};}else if(!i[f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING][f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING_COLUMN]){i[f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING][f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING_COLUMN]=i[f.PROPERTY_NAME_OM_ATTR_NAME];}}function T(o,i,j,y1,z1,A1,E,q,s){var B1="";var C1="";var D1;var E1=b.createUUID();var F1="",G1="",H1="",I1="",J1=null,K1="",L1="",M1=null;Q(i,A1,s);S(i);for(B1 in i){if(i.hasOwnProperty(B1)){switch(B1){case f.PROPERTY_NAME_OM_ATTR_NAME:F1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_DESCRIPTION:H1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_DATA_TYPE:I1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_SIZE:J1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_BUSINESS_DATA_TYPE:K1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_SOURCE_TYPE:L1=i[B1];break;case f.PROPERTY_NAME_VALUE_LIST:M1=i[B1];break;case f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING:D1=i[B1];for(C1 in D1){if(D1.hasOwnProperty(C1)){switch(C1){case f.PROPERTY_NAME_OM_ATTR_DATA_MAPPING_COLUMN:G1=D1[C1];break;}}}break;}}}var N1=new l.AttrInfo(j,F1,y1,G1,H1,I1,K1,J1,L1,z1,A1,E,q?'1':'0',M1,E1);o.allAttr=o.allAttr?o.allAttr.concat([N1]):[N1];}function U(o,j,y1,z1,A1,B1,E,q,s){var i;var C1;for(i=0;i<j.length;++i){C1=j[i];T(o,C1,y1,z1,A1,B1,E,q,s);}}function V(o,i,j,y1){var z1="",A1="",B1="";var C1=b.createUUID();for(z1 in i){if(i.hasOwnProperty(z1)){switch(z1){case f.PROPERTY_NAME_OM_ASSOC_ATTR_MAPPINGS_SOURCE:A1=i[z1];break;case f.PROPERTY_NAME_OM_ASSOC_ATTR_MAPPINGS_TARGET:B1=i[z1];break;}}}var D1=new l.AssocAttrInfo(y1,A1,B1,j,C1);o.allAssocAttr=o.allAssocAttr?o.allAssocAttr.concat([D1]):[D1];}function W(o,j,y1,z1){var i;var A1;for(i=0;i<j.length;++i){A1=j[i];V(o,A1,y1,z1);}}function X(o,i,j,y1){var z1,A1="",B1="",C1="";var D1=b.createUUID();var E1="";for(E1 in i){if(i.hasOwnProperty(E1)){switch(E1){case f.PROPERTY_NAME_OM_ASSOC_NAME:A1=i[E1];break;case f.PROPERTY_NAME_OM_ASSOC_TARGET:B1=i[E1];break;case f.PROPERTY_NAME_OM_ASSOC_CARDINALITY:C1=i[E1];break;case f.PROPERTY_NAME_OM_ASSOC_ATTR_MAPPINGS:z1=i[E1];W(o,z1,j,D1);break;}}}var F1=new l.AssocInfo(j,D1,A1,B1,C1,y1);o.allAssoc=o.allAssoc?o.allAssoc.concat([F1]):[F1];}function Y(o,j,y1,z1){var i;var A1;for(i=0;i<j.length;++i){A1=j[i];X(o,A1,y1,z1);}}function Z(o,i,C,j,E,q,s){var y1,z1,A1;var B1="";var C1=b.createUUID();var D1="";var E1="";var F1="";var G1="";var H1="";var I1=null;if(i.hasOwnProperty(f.PROPERTY_NAME_OM_NAME)){D1=i[f.PROPERTY_NAME_OM_NAME];}if(i.hasOwnProperty(f.PROPERTY_NAME_OM_DESCRIPTION)){E1=i[f.PROPERTY_NAME_OM_DESCRIPTION];}if(i.hasOwnProperty(f.PROPERTY_NAME_OM_MAPPING_INFO)){y1=i[f.PROPERTY_NAME_OM_MAPPING_INFO];for(B1 in y1){if(y1.hasOwnProperty(B1)){switch(B1){case f.PROPERTY_NAME_OM_MAPPING_INFO_SCHEMA:G1=y1[f.PROPERTY_NAME_OM_MAPPING_INFO_SCHEMA];break;case f.PROPERTY_NAME_OM_MAPPING_INFO_TYPE:H1=y1[f.PROPERTY_NAME_OM_MAPPING_INFO_TYPE];break;case f.PROPERTY_NAME_OM_MAPPING_INFO_NAME:F1=y1[f.PROPERTY_NAME_OM_MAPPING_INFO_NAME];break;case f.PROPERTY_NAME_OM_MAPPING_INFO_PARAMETERS:I1=y1[f.PROPERTY_NAME_OM_MAPPING_INFO_PARAMETERS];break;}}}}if(i.hasOwnProperty(f.PROPERTY_NAME_OM_ATTRIBUTES)){U(o,i[f.PROPERTY_NAME_OM_ATTRIBUTES],C1,D1,F1,j,E,q,s);}if(i.hasOwnProperty(f.PROPERTY_NAME_OM_ASSOCIATIONS)){Y(o,i[f.PROPERTY_NAME_OM_ASSOCIATIONS],C1,j);}z1=new l.ObjectInfo(C,j,f.OM_SOURCE,C1,D1,F1,G1,E,q,E1,H1);o.allObjects=o.allObjects?o.allObjects.concat([z1]):[z1];if(I1){A1=new l.ParameterInfo(C,j,f.OM_SOURCE,C1,D1,F1,G1,I1,o,E,q,E1,H1);o.allParameterInfos=o.allParameterInfos?o.allParameterInfos.concat([A1]):[A1];}}function $(o,i,j){var y1=b.createUUID();var z1="",A1="",B1="",C1;for(z1 in i){if(i.hasOwnProperty(z1)){switch(z1){case f.PROPERTY_NAME_ACTION_STATIC_PARAM_NAME:A1=i[z1];break;case f.PROPERTY_NAME_ACTION_STATIC_PARAM_MAPPING:B1=i[z1];break;}}}C1=new l.ActionStaticParams(j,A1,B1,y1);o.allActionsStaticParams=o.allActionsStaticParams?o.allActionsStaticParams.concat([C1]):[C1];}function _(o,j,y1){var i;var z1;for(i=0;i<j.length;++i){z1=j[i];$(o,z1,y1);}}function a1(o,i,j,y1,s){var z1=b.createUUID();var A1,B1="",C1="",D1=null,E1="";var F1="";Q(i,y1,s);for(F1 in i){if(i.hasOwnProperty(F1)){switch(F1){case f.PROPERTY_NAME_ACTION_INPUT_PARAM_NAME:B1=i[F1];break;case f.PROPERTY_NAME_ACTION_INPUT_PARAM_DATA_TYPE:C1=i[F1];break;case f.PROPERTY_NAME_ACTION_INPUT_BUSINESS_DATA_TYPE:E1=i[F1];break;case f.PROPERTY_NAME_ACTION_INPUT_PARAM_SIZE:D1=i[F1];break;}}}A1=new l.ActionRequiredParams(j,B1,C1,D1,E1,z1);o.allActionsRequiredParams=o.allActionsRequiredParams?o.allActionsRequiredParams.concat([A1]):[A1];}function b1(o,j,y1,z1,s){var i;var A1;for(i=0;i<j.length;++i){A1=j[i];a1(o,A1,y1,z1,s);}}function c1(o,i,C,j,s,E,q,D){var y1="";var z1=b.createUUID();var A1="";var B1="";var C1="";var D1="";var E1,F1="",G1="",H1="",I1="";for(y1 in i){if(i.hasOwnProperty(y1)){switch(y1){case f.PROPERTY_NAME_ACTION_NAME:F1=i[y1];break;case f.PROPERTY_NAME_ACTION_DESCRIPTION:G1=i[y1];break;case f.PROPERTY_NAME_ACTION_STATIC_PARAMS:C1=i[y1];_(o,C1,z1);break;case f.PROPERTY_NAME_ACTION_INPUT_PARAMS:D1=i[y1];b1(o,D1,z1,j,s);break;case f.PROPERTY_NAME_ACTION_RUNTIME_EXE:A1=i[y1];for(B1 in A1){if(A1.hasOwnProperty(B1)){switch(B1){case f.PROPERTY_NAME_ACTION_LIB_NAME:I1=A1[B1];break;case f.PROPERTY_NAME_ACTION_LIB_PATH:H1=A1[B1];break;}}}break;}}}E1=new l.ActionInfo(C,j,z1,F1,H1,I1,E,q,D,G1);o.allActions=o.allActions?o.allActions.concat([E1]):[E1];}function d1(o,j,C,y1,s,E,q,D){var z1;var i;for(i=0;i<j.length;++i){z1=j[i];c1(o,z1,C,y1,s,E,q,D);}}function e1(o,j,C,y1,E,q,s){var z1;var i;for(i=0;i<j.length;++i){z1=j[i];Z(o,z1,C,y1,E,q,s);}}function f1(o,i,j){var y1="";var z1=b.createUUID();var A1,B1="",C1="";for(y1 in i){if(i.hasOwnProperty(y1)){switch(y1){case f.PROPERTY_NAME_OUTPUT_STATIC_PARAM_NAME:B1=i[y1];break;case f.PROPERTY_NAME_OUTPUT_STATIC_PARAM_MAPPING:C1=i[y1];break;}}}A1=new l.OutputStaticParams(j,B1,C1,z1);o.allOutputsStaticParams=o.allOutputsStaticParams?o.allOutputsStaticParams.concat([A1]):[A1];}function g1(o,j,y1){var z1;var i;for(i=0;i<j.length;++i){z1=j[i];f1(o,z1,y1);}}function h1(o,i,j,y1,s){var z1="";var A1=b.createUUID();var B1,C1="",D1="",E1="",F1=null,G1=null;Q(i,y1,s);for(z1 in i){if(i.hasOwnProperty(z1)){switch(z1){case f.PROPERTY_NAME_OUTPUT_PARAM_NAME:C1=i[z1];break;case f.PROPERTY_NAME_OUTPUT_PARAM_DATA_TYPE:E1=i[z1];break;case f.PROPERTY_NAME_OUTPUT_PARAM_BUSINESS_DATA_TYPE:D1=i[z1];break;case f.PROPERTY_NAME_OUTPUT_PARAM_SIZE:F1=i[z1];break;case f.PROPERTY_NAME_IS_COLLECTION:G1=c.convertBooleanToTinyInt(i[z1]);break;}}}B1=new l.OutputRequiredParams(j,C1,E1,F1,D1,G1,A1);o.allOutputsRequiredParams=o.allOutputsRequiredParams?o.allOutputsRequiredParams.concat([B1]):[B1];}function i1(o,j,y1,z1,s){var A1;var i;for(i=0;i<j.length;++i){A1=j[i];h1(o,A1,y1,z1,s);}}function j1(o,i,C,j,s,E,q,D){var y1=null;var z1="";var A1="";var B1="";var C1="",D1="",E1;if(i.hasOwnProperty(f.ATT_ID)){y1=i[f.ATT_ID];}else{y1=b.createUUID();}for(z1 in i){if(i.hasOwnProperty(z1)){switch(z1){case f.PROPERTY_NAME_OUTPUT_NAME:C1=i[z1];break;case f.PROPERTY_NAME_OUTPUT_DESCRIPTION:D1=i[z1];break;case f.PROPERTY_NAME_OUTPUT_STATIC_PARAMS:B1=i[z1];g1(o,B1,y1);break;case f.PROPERTY_NAME_OUTPUT_INPUT_PARAMS:A1=i[z1];i1(o,A1,y1,j,s);break;}}}E1=new l.OutputInfo(C,j,y1,C1,E,q,D,D1);o.allOutputs=o.allOutputs?o.allOutputs.concat([E1]):[E1];}function k1(o,j,C,y1,s,E,q,D){var z1;var i;for(i=0;i<j.length;++i){z1=j[i];j1(o,z1,C,y1,s,E,q,D);}}function l1(o,i,j,y1,C,E,B,q,D){var z1=b.createUUID();var A1;var B1;var C1;var D1=null;var E1=null;var F1=null;if(y1[g.propertiesEnum.isCollection]===true){B1="1";}else{B1="0";}if(j[f.PROPERTY_NAME_TYPE]===f.ALIAS_CONTENT_DECISION_TABLE){C1=JSON.stringify(j[f.CONTENT]);}else{C1=j[f.CONTENT];}if(j[f.PROPERTY_NAME_ALIAS_DESCRIPTION]){D1=j[f.PROPERTY_NAME_ALIAS_DESCRIPTION];}if(j[f.PROPERTY_NAME_ALIAS_EXTERNAL_METADATA]){E1=JSON.stringify(j[f.PROPERTY_NAME_ALIAS_EXTERNAL_METADATA]);}if(j[f.PROPERTY_NAME_ALIAS_RENDERING_DATA]){F1=JSON.stringify(j[f.PROPERTY_NAME_ALIAS_RENDERING_DATA]);}A1=new l.AliasInfo(C,B,z1,i,C1,y1[g.propertiesEnum.businessType],B1,E,q?"1":"0",j[f.PROPERTY_NAME_TYPE],D1,E1,F1,D);o.allAliases=o.allAliases?o.allAliases.concat([A1]):[A1];if(!o.allVocabularies[B].aliases){o.allVocabularies[B].aliases={};}o.allVocabularies[B].aliases[i]=A1;}function m1(i){var j;if(i===f.ALIAS_CONTENT_DECISION_TABLE){j=new H.RuleBodyValidator();}else{j=K;}return j;}function n1(j){var y1={};var z1;var A1;var B1;var C1;var i;var D1;var E1;var F1;for(i=0;i<j.length;++i){z1=j[i];e.autoCompleteAliasType(z1);A1=z1[f.PROPERTY_NAME_ALIAS_NAME];B1=z1[f.PROPERTY_NAME_ALIAS_CONTENT];C1=z1[f.PROPERTY_NAME_ALIAS_TYPE];D1=z1[f.PROPERTY_NAME_DESCRIPTION];E1=z1[f.PROPERTY_NAME_ALIAS_EXTERNAL_METADATA];F1=z1[f.PROPERTY_NAME_ALIAS_RENDERING_DATA];y1[A1]={};y1[A1][f.IS_CREATED]=false;y1[A1][f.TYPE]=C1;y1[A1][f.CONTENT]=B1;y1[A1][f.PROPERTY_NAME_DESCRIPTION]=D1;y1[A1][f.PROPERTY_NAME_ALIAS_EXTERNAL_METADATA]=E1;y1[A1][f.PROPERTY_NAME_ALIAS_RENDERING_DATA]=F1;}return y1;}function o1(o,i,j,y1,C,B,s,z1,q,u,E,D){var A1=[];var B1=null;var C1;var D1;var E1=[];var F1;var G1;var H1,I1;var J1;var K1=false;var L1=null;var M1=null;z1[i]={};F1=j[f.PROPERTY_NAME_TYPE];var N1=m1(F1);R.getInstance().hold();M1=F.getVocabularyDataProvider(s);var O1=e.validateAliasContent(N1,j[f.CONTENT],B,F1,M1);G1=R.getInstance().getStandByMessagesList();R.getInstance().unHold();if(e.isAliasContentValid(O1,F1)===false){A1=O1[g.propertiesEnum.unknownTokens];if(A1.length===0){H1=e.collectErrorMessages(F1,O1,G1);I1=e.addErrorMessages("error_vocabulary_invalid_alias_content",H1,i);throw new h.HrfException(I1,false);}for(B1 in A1){if(A1.hasOwnProperty(B1)){if(z1.hasOwnProperty(B1)){L1=[B1];continue;}if(y1.hasOwnProperty(B1)===false){continue;}C1=y1[B1];if(C1[f.IS_CREATED]===true){continue;}D1=JSON.parse(JSON.stringify(z1));K1=true;E1=E1.concat(o1(o,B1,C1,y1,C,B,s,D1,q,u,E,D));}}if(K1===true&&L1===null){R.getInstance().hold();O1=e.reValidateAliasContent(N1,j[f.CONTENT],B,F1,M1);G1=R.getInstance().getStandByMessagesList();R.getInstance().unHold();if(e.isAliasContentValid(O1,F1)===false){H1=e.collectErrorMessages(F1,O1,G1);I1=e.addErrorMessages("error_vocabulary_invalid_alias_content",H1,i,L1);throw new h.HrfException(I1,false);}if(x){J1=O1[G.PROPERTY_NAME_DEPENDENCIES_OUTPUT];if(J1!==null&&J1!==undefined){E1=E1.concat(y.createDependenciesInVocabulary(f.PROPERTY_NAME_ALIASES+"."+i,B,J1,q,s));}}}else{H1=e.collectErrorMessages(F1,O1,G1);I1=e.addErrorMessages("error_vocabulary_invalid_alias_content",H1,i,L1);throw new h.HrfException(I1,false);}}else{if(x){J1=O1[G.PROPERTY_NAME_DEPENDENCIES_OUTPUT];if(J1!==null&&J1!==undefined){E1=E1.concat(y.createDependenciesInVocabulary(f.PROPERTY_NAME_ALIASES+"."+i,B,J1,q,s));}}}l1(o,i,j,O1,C,E,B,q,D);j[f.IS_CREATED]=true;return E1;}function p1(o,i,C,B,s,q,u,E,D){n.loadAllAliases(o.allVocabularies[B],o.allAliases,F.getVocabularyDataProvider(s));var j=n1(i);var y1;var z1="";var A1={};var B1=[];for(z1 in j){if(j.hasOwnProperty(z1)){y1=j[z1];if(y1[f.IS_CREATED]===false){B1=B1.concat(o1(o,z1,y1,j,C,B,s,A1,q,u,E,D));}A1={};}}if(x&&B1.length>0){z.getInstance(s).setDependencies(u,B1);}}function q1(o,i,j,C,y1,E,q){var z1=b.createUUID();var A1;var B1=null;var C1=j[f.PROPERTY_VALUE_LIST_MAPPING_INFO];var D1=null;var E1=null;if(C1.hasOwnProperty(f.PROPERTY_VALUE_LIST_DESCRIPTION_COLUMN)&&C1[f.PROPERTY_VALUE_LIST_DESCRIPTION_COLUMN]!==null){B1=C1[f.PROPERTY_VALUE_LIST_DESCRIPTION_COLUMN];}if(j[f.PROPERTY_NAME_BUSINESS_DATA_TYPE]){E1=j[f.PROPERTY_NAME_BUSINESS_DATA_TYPE];}else{E1=e.getBusinessDataType(j[f.PROPERTY_NAME_DATA_TYPE]);}if(j.hasOwnProperty(f.PROPERTY_NAME_SIZE)&&j[f.PROPERTY_NAME_SIZE]!==null){D1=j[f.PROPERTY_NAME_SIZE];}A1=new l.ValueListInfo(C,y1,z1,i,C1[f.PROPERTY_VALUE_LIST_SCHEMA],C1[f.PROPERTY_VALUE_LIST_NAME],j[f.PROPERTY_NAME_DATA_TYPE],E1,D1,C1[f.PROPERTY_VALUE_LIST_VALUE_COLUMN],B1,E,q?'1':'0',C1[f.PROPERTY_VALUE_LIST_TYPE]);o.allValueLists=o.allValueLists?o.allValueLists.concat([A1]):[A1];}function r1(o,i,C,j,E,q){var y1;var z1="";for(z1 in i){if(i.hasOwnProperty(z1)){y1=i[z1];q1(o,z1,y1,C,j,E,q);}}}function s1(y1,z1,B,s,q){var A1;var B1;var C1;var D1;var E1;var F1=[];var i,j;var G1=F.getVocabularyDataProvider(s);var H1=[];var I1;var J1;var K1=f.PROPERTY_NAME_DATA_OBJECTS+"."+z1+"."+f.PROPERTY_NAME_OM_ASSOCIATIONS;var L1;var M1;var N1;for(i=0;i<y1.length;i++){A1=y1[i];D1=A1[f.PROPERTY_NAME_OM_ASSOC_TARGET];L1=f.PROPERTY_NAME_DATA_OBJECTS+"."+D1;J1=G1.getObject(B,D1);if(!J1){F1=[z1,y1[i].name];N1=R.getInstance().addMessage("error_vocabulary_invalid_association",F1);throw new h.HrfException(JSON.stringify(N1),false);}else if(x&&(!q||J1.vocaName!==B)){if(J1.vocaName!==B){I1=y.createDependencyInVocabulary(G.PROPERTY_NAME_EMPTY_PATH,J1.vocaName,G.PROPERTY_NAME_EMPTY_PATH,s);H1.push(I1);}I1=y.createDependencyInVocabulary(K1+"."+A1[f.PROPERTY_NAME_NAME],J1.vocaName,L1,s);H1.push(I1);I1=y.createDependencyInVocabulary(K1+"."+A1[f.PROPERTY_NAME_NAME],J1.vocaName,L1+"."+f.PROPERTY_NAME_OM_MAPPING_INFO,s);H1.push(I1);}B1=A1[f.PROPERTY_NAME_OM_ASSOC_ATTR_MAPPINGS];M1=L1+"."+f.PROPERTY_NAME_ATTRIBUTES;for(j=0;j<B1.length;j++){C1=B1[j];E1=C1[f.PROPERTY_NAME_OM_ASSOC_ATTR_MAPPINGS_TARGET];if(G1.getAttribute(B,D1,E1)===null){F1=[A1[f.PROPERTY_NAME_OM_ASSOC_NAME],E1];N1=R.getInstance().addMessage("error_vocabulary_invalid_assoc_attr",F1);throw new h.HrfException(JSON.stringify(N1),false);}else if(x&&(!q||J1.vocaName!==B)){I1=y.createDependencyInVocabulary(K1+"."+A1[f.PROPERTY_NAME_NAME],J1.vocaName,M1+"."+E1,s);H1.push(I1);}}}return H1;}function t1(A,B,s,q,u){var i;var j;var y1;var z1=[];var A1=A[f.PROPERTY_NAME_DATA_OBJECTS];if(A1.length>0){for(i=0;i<A1.length;i++){y1=A1[i];if(A1[i].hasOwnProperty([f.PROPERTY_NAME_OM_ASSOCIATIONS])){j=A1[i][f.PROPERTY_NAME_OM_ASSOCIATIONS];z1=z1.concat(s1(j,y1[f.PROPERTY_NAME_OM_NAME],B,s,q));}}if(x&&z1.length>0){z.getInstance(s).setDependencies(u,z1);}}}function u1(j,y1,B,s){var z1;var A1=[];var i;var B1=F.getVocabularyDataProvider(s);var C1=[];var D1;var E1;var F1=f.PROPERTY_NAME_DATA_OBJECTS+"."+y1+"."+f.PROPERTY_NAME_OM_ATTRIBUTES+".";var G1;var H1;var I1=f.PROPERTY_NAME_VALUE_LISTS+".";for(i=0;i<j.length;i++){z1=j[i];if(!z1[f.PROPERTY_NAME_VALUE_LIST]){continue;}G1=z1[f.PROPERTY_NAME_VALUE_LIST];E1=B1.getValueList(B,G1);H1=z1[f.PROPERTY_NAME_NAME];if(!E1){A1=[G1,H1,y1];R.getInstance().addMessage("error_vocabulary_value_list_does_not_exist",A1);throw new h.HrfException("error_vocabulary_value_list_does_not_exist",false);}if(x){D1=y.createDependencyInVocabulary(F1+H1,E1.vocaName,I1+G1,s);C1.push(D1);}}return C1;}function v1(A,B,s,q,u){var i;var j;var y1;var z1=[];var A1=A[f.PROPERTY_NAME_DATA_OBJECTS];if(A1.length>0){for(i=0;i<A1.length;i++){y1=A1[i];if(A1[i].hasOwnProperty([f.PROPERTY_NAME_OM_ATTRIBUTES])){j=A1[i][f.PROPERTY_NAME_OM_ATTRIBUTES];z1=z1.concat(u1(j,y1[f.PROPERTY_NAME_OM_NAME],B,s,q));}}if(x&&z1.length>0){z.getInstance(s).setDependencies(u,z1);}}}function w1(o,i,C,j,E,q){var y1="";var id=b.createUUID();var A1="";var B1;for(y1 in i){if(i.hasOwnProperty(y1)){switch(y1){case f.PROPERTY_NAME_ADVANCED_FUNCTION_NAME:A1=i[y1];break;}}}B1=new l.AdvancedFunctionInfo(id,A1,C,j,E,q);o.allAdvancedFunctions=o.allAdvancedFunctions?o.allAdvancedFunctions.concat([B1]):[B1];}function x1(o,j,C,y1,E,q){var z1;var i;for(i=0;i<j.length;i++){z1=j[i];w1(o,z1,C,y1,E,q);}}E=e.calculateScope(A,B,s);N(o,B,A,u,q,C,w,E);if(A.hasOwnProperty(f.PROPERTY_NAME_VALUE_LISTS)){r1(o,A[f.PROPERTY_NAME_VALUE_LISTS],C,B,E,q);}if(A.hasOwnProperty(f.PROPERTY_NAME_DATA_OBJECTS)){e1(o,A[f.PROPERTY_NAME_DATA_OBJECTS],C,B,E,q,s);k.generate(o,A[f.PROPERTY_NAME_DATA_OBJECTS],B,C,s,q,u,E,x);}if(A.hasOwnProperty(f.PROPERTY_NAME_ALIASES)){p1(o,A[f.PROPERTY_NAME_ALIASES],C,B,s,q,u,E,D);}if(A.hasOwnProperty(f.PROPERTY_NAME_DATA_OBJECTS)){t1(A,B,s,q,u);v1(A,B,s,q,u);}if(A.hasOwnProperty(f.PROPERTY_NAME_ACTIONS)){O(s,B,A[f.PROPERTY_NAME_ACTIONS],f.PROPERTY_NAME_ACTIONS,q,u,false);d1(o,A[f.PROPERTY_NAME_ACTIONS],C,B,s,E,q,D);}if(A.hasOwnProperty(f.PROPERTY_NAME_OUTPUTS)){O(s,B,A[f.PROPERTY_NAME_OUTPUTS],f.PROPERTY_NAME_OUTPUTS,q,u,true);k1(o,A[f.PROPERTY_NAME_OUTPUTS],C,B,s,E,q,D);}if(A.hasOwnProperty(f.PROPERTY_NAME_ADVANCED_FUNCTION)){x1(o,A[f.PROPERTY_NAME_ADVANCED_FUNCTION],C,B,E,q);}};return{JSONLoaderLib:J};}());
