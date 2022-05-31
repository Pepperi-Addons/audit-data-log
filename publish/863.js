(self["webpackJsonpclient-side"]=self["webpackJsonpclient-side"]||[]).push([[863],{5757:(e,t,s)=>{"use strict";s.r(t),s.d(t,{AuditDataLogBlockComponent:()=>m,AuditDataLogBlockModule:()=>v});var i=s(4762),n=s(8235),a=s(518),o=s(6342),r=s(741),d=s(3832),l=s(9790),c=s(8248),u=s(5248),p=s(6850);let j=(()=>{class e{constructor(e,t,s){this.session=e,this.addonService=t,this.dialogService=s,this.accessToken="",this.papiBaseURL="",this.addonUUID="00000000-0000-0000-0000-00000da1a109",this.isSupportAdminUser=!0;const i=this.session.getIdpToken();this.parsedToken=i?(0,c.Z)(i):{},this.papiBaseURL=this.parsedToken["pepperi.baseurl"],this.isSupportAdminUser=this.parsedToken.email.startsWith("SupportAdminUser")}get papiClient(){return new u.PapiClient({baseURL:this.papiBaseURL,token:this.session.getIdpToken(),addonUUID:this.addonUUID,suppressLogging:!0})}getExecutionLog(e){return(0,i.mG)(this,void 0,void 0,function*(){return this.papiClient.get(`/audit_logs/${e}`)})}getUsers(){return(0,i.mG)(this,void 0,void 0,function*(){return[...yield this.papiClient.users.iter({fields:["InternalID","Email","UUID"],page_size:-1}).toArray(),...yield this.papiClient.get("/contacts?fields=InternalID,Email,UUID")]})}getSupportAdminUser(){return(0,i.mG)(this,void 0,void 0,function*(){return(yield this.papiClient.get("/distributor")).SupportAdminUser.Name})}getAddons(){return(0,i.mG)(this,void 0,void 0,function*(){return yield this.papiClient.addons.iter({page_size:-1}).toArray()})}getUserBuUUID(e){return(0,i.mG)(this,void 0,void 0,function*(){return this.papiClient.get(`/users/uuid/${e}`)})}audit_data_log_query(e,t,s){const i={};return e&&(i.search_string=e),t&&(i.where=t),s&&(i.search_string_fields=s),i.order_by="ObjectModificationDateTime desc",i.page_size=200,this.addonService.getAddonApiCall(this.addonUUID,"api","audit_data_logs",{params:i},!1)}audit_data_log_distinct_values(e,t,s,i){let n={};return e&&(n.search_string=e),s&&(n.search_string_fields=s),t&&(n.where=t),n.distinct_fields=i,this.addonService.getAddonApiCall(this.addonUUID,"api","filters",{params:n},!1)}cloud_watch_logs(e,t,s,i,n,a,o,r){let d=this.buildCloudWatchParams(s,i,n,a,o,r);const l={StartDateTime:e.toUTCString(),EndDateTime:t.toUTCString()};return this.addonService.postAddonApiCall(this.addonUUID,"api","get_logs_from_cloud_watch",l,{params:d},!1)}cloud_watch_logs_stats(e,t,s,i,n,a,o,r,d){let l=this.buildCloudWatchParams(s,i,n,a,r,d);l.distinct_field=o;const c={StartDateTime:e.toUTCString(),EndDateTime:t.toUTCString()};return this.addonService.postAddonApiCall(this.addonUUID,"api","get_stats_from_cloud_watch",c,{params:l},!1)}buildCloudWatchParams(e,t,s,i,n,a){let o={};return"00000000-0000-0000-0000-00000000c07e"===e&&(a="Nuclues"),e&&"00000000-0000-0000-0000-00000000c07e"!=e&&(o.addon_uuid=e),t&&(o.action_uuid=t),s&&(o.search_string=s),n&&(o.level=n),a&&(o.log_groups=a),i&&(o.search_string_fields=i),o}openDialog(e,t,s){const i=new p.Hi({title:e,content:t,actionButtons:[{title:"OK",className:"",callback:s}],actionsType:"custom",showClose:!1});this.dialogService.openDefaultDialog(i)}}return e.\u0275fac=function(t){return new(t||e)(d["\u0275\u0275inject"](n.WF),d["\u0275\u0275inject"](n.xD),d["\u0275\u0275inject"](p.iu))},e.\u0275prov=d["\u0275\u0275defineInjectable"]({token:e,factory:e.\u0275fac,providedIn:"root"}),e})();var h=s(8270);let m=(()=>{class e{constructor(e,t,s){this.translate=e,this.addonService=t,this.dataConvertorService=s,this.hostEvents=new d.EventEmitter,this.users=[],this.addons=[],this.docs=[],this.viewType="table"}set hostObject(e){this._hostObject=e,e&&(this.AddonUUID=e.dataLogHostObject.AddonUUID,this.ObjectKey=e.dataLogHostObject.ObjectKey,this.Resource=e.dataLogHostObject.Resource)}ngOnInit(){return(0,i.mG)(this,void 0,void 0,function*(){this.reloadList()})}reloadList(){this.addonService.audit_data_log_query(null,`AddonUUID.keyword=${this.AddonUUID} and ObjectKey.keyword=${this.ObjectKey} and Resource.keyword=${this.Resource}`,null).subscribe(e=>{this.docs=e,this.loadDataLogsList(e)})}capitalize(e){return e[0].toUpperCase()+e.slice(1)}loadDataLogsList(e){const t=new Array;e.forEach(e=>{t.push(this.convertConflictToPepRowData(e,["ID","Type","UpdatedFields","User","ActionDateTime"]))});let s,i=[];t.length>0&&(s=this.dataConvertorService.getUiControl(t[0]),i=this.dataConvertorService.convertListData(t)),this.customConflictList.initListData(s,i.length,i)}convertConflictToPepRowData(e,t){const s=new n.n1;return s.Fields=[],t.forEach(t=>s.Fields.push(this.initDataRowFieldOfConflicts(e,t))),console.log(s),s}initDataRowFieldOfConflicts(e,t){const s={ApiName:t,Title:this.translate.instant(t),XAlignment:n.Mk.Left,FormattedValue:e[t]?e[t]:"",Value:e[t]?e[t]:"",ColumnWidth:10,OptionalValues:[],FieldType:n.t9.RichTextHTML,Enabled:!1},i=this.users.find(t=>t.UUID===e.UserUUID),o=i?i.Email:"Pepperi Admin",r="settings/"+this.addonService.addonUUID+"/logs";switch(t){case"ID":s.ColumnWidth=3;const n=`<span class="custom-span">${e.ActionUUID===a.Z?"":e.ActionUUID}</span>`,d=`<a href="${r}?action_uuid=${e.ActionUUID}&action_date_time=${e.CreationDateTime}&user=${o}">${n}</span></a>`;s.FormattedValue=s.Value=this.addonService.isSupportAdminUser?d:n,s.Title="ID";break;case"Type":s.ColumnWidth=3;const l=this.capitalize(e.ActionType);s.FormattedValue=s.Value=l;break;case"UpdatedFields":s.Title="Changes";const c=this.buildUpdatedFieldsTable(e.UpdatedFields);s.FormattedValue=s.Value=c;break;case"User":s.ColumnWidth=5;let u=`${(null==i?void 0:i.Email)?i.Email:"Pepperi Admin"}`;(null==i?void 0:i.InternalID)&&(u+=` (${null==i?void 0:i.InternalID})`),s.FormattedValue=s.Value=u,e.UserEmail=null==i?void 0:i.Email;break;case"ActionDateTime":s.Title="Date & Time",s.ColumnWidth=5,s.FormattedValue=s.Value=new Date(e.ObjectModificationDateTime).toLocaleString();break;default:s.FormattedValue=e[t]?e[t].toString():""}return s}buildUpdatedFieldsTable(e){let t="";if(e&&e.length>0){t+='<div class="updated-fields">';for(const s of e)t+=`<div class="updated-field"> \n            <p><b>${s.FieldID}</b></p>\n            <div class="updated-field__item">\n              <p><i>${s.OldValue}</i></p>\n              <svg>${o.ro.data}</svg>\n              <p><i>${s.NewValue}</i></p>\n            </div>\n          </div>`;t+="</div>"}return t}}return e.\u0275fac=function(t){return new(t||e)(d["\u0275\u0275directiveInject"](l.sK),d["\u0275\u0275directiveInject"](j),d["\u0275\u0275directiveInject"](n._1))},e.\u0275cmp=d["\u0275\u0275defineComponent"]({type:e,selectors:[["audit-data-log-block"]],viewQuery:function(e,t){if(1&e&&d["\u0275\u0275viewQuery"](r.wk,5),2&e){let e;d["\u0275\u0275queryRefresh"](e=d["\u0275\u0275loadQuery"]())&&(t.customConflictList=e.first)}},inputs:{AddonUUID:"AddonUUID",ObjectKey:"ObjectKey",Resource:"Resource",hostObject:"hostObject"},outputs:{hostEvents:"hostEvents"},decls:3,vars:5,consts:[["pep-main-area",""],["id","list","noDataFoundMsg","No results were found.",3,"supportSorting","pagerType","pageSize","viewType","selectionTypeForActions"]],template:function(e,t){1&e&&(d["\u0275\u0275elementStart"](0,"pep-page-layout"),d["\u0275\u0275elementContainerStart"](1,0),d["\u0275\u0275element"](2,"pep-list",1),d["\u0275\u0275elementContainerEnd"](),d["\u0275\u0275elementEnd"]()),2&e&&(d["\u0275\u0275advance"](2),d["\u0275\u0275property"]("supportSorting",!0)("pagerType","pages")("pageSize",50)("viewType",t.viewType)("selectionTypeForActions","none"))},directives:[h.O,r.wk],styles:[".text-bold[_ngcontent-%COMP%]{font-weight:700}#list[_ngcontent-%COMP%]     .table-body .table-row, #list[_ngcontent-%COMP%]     .table-body .table-row fieldset{height:auto;font-size:var(--pep-font-size-sm,.875rem)!important}#list[_ngcontent-%COMP%]     #UpdatedFields{width:100%}#list[_ngcontent-%COMP%]     .updated-fields{list-style:none}#list[_ngcontent-%COMP%]     .updated-field{font-size:var(--pep-font-size-xs)}#list[_ngcontent-%COMP%]     .updated-field p{margin:.1rem 0 .3rem}#list[_ngcontent-%COMP%]     .updated-field__item{display:flex;flex-direction:row;grid-gap:.5rem;gap:.5rem;max-width:100%;margin-bottom:.75rem}#list[_ngcontent-%COMP%]     .updated-field__item p{margin:0;max-width:calc(50% - .75rem);line-break:anywhere}#list[_ngcontent-%COMP%]     .updated-field__item svg{width:.75rem;height:.75rem}#list[_ngcontent-%COMP%]     .custom-span{display:block;text-anchor:end;box-sizing:border-box;-ms-text-overflow:ellipsis;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;width:100%}#list[_ngcontent-%COMP%]     .card-flex-container{display:block}"]}),e})();var g=s(218),f=s(5835);let v=(()=>{class e{constructor(e,t){this.pepAddonService=t,this.pepAddonService.setDefaultTranslateLang(e)}}return e.\u0275fac=function(t){return new(t||e)(d["\u0275\u0275inject"](l.sK),d["\u0275\u0275inject"](n.xD))},e.\u0275mod=d["\u0275\u0275defineNgModule"]({type:e}),e.\u0275inj=d["\u0275\u0275defineInjector"]({providers:[l.gM,j],imports:[[g.CommonModule,f.PW,h.Z,r.qF,l.aw.forChild({loader:{provide:l.Zw,useFactory:e=>n.xD.createMultiTranslateLoader(e,["ngx-lib","ngx-composite-lib"]),deps:[n.xD]}})]]}),e})()},6700:(e,t,s)=>{var i={"./af":6431,"./af.js":6431,"./ar":1286,"./ar-dz":1616,"./ar-dz.js":1616,"./ar-kw":9759,"./ar-kw.js":9759,"./ar-ly":3160,"./ar-ly.js":3160,"./ar-ma":2551,"./ar-ma.js":2551,"./ar-sa":30,"./ar-sa.js":30,"./ar-tn":6962,"./ar-tn.js":6962,"./ar.js":1286,"./az":5887,"./az.js":5887,"./be":4572,"./be.js":4572,"./bg":3276,"./bg.js":3276,"./bm":3344,"./bm.js":3344,"./bn":8985,"./bn-bd":3990,"./bn-bd.js":3990,"./bn.js":8985,"./bo":4391,"./bo.js":4391,"./br":6728,"./br.js":6728,"./bs":5536,"./bs.js":5536,"./ca":1043,"./ca.js":1043,"./cs":420,"./cs.js":420,"./cv":3513,"./cv.js":3513,"./cy":6771,"./cy.js":6771,"./da":7978,"./da.js":7978,"./de":6061,"./de-at":5204,"./de-at.js":5204,"./de-ch":2653,"./de-ch.js":2653,"./de.js":6061,"./dv":85,"./dv.js":85,"./el":8579,"./el.js":8579,"./en-au":5724,"./en-au.js":5724,"./en-ca":525,"./en-ca.js":525,"./en-gb":2847,"./en-gb.js":2847,"./en-ie":7216,"./en-ie.js":7216,"./en-il":9305,"./en-il.js":9305,"./en-in":3364,"./en-in.js":3364,"./en-nz":9130,"./en-nz.js":9130,"./en-sg":1161,"./en-sg.js":1161,"./eo":802,"./eo.js":802,"./es":328,"./es-do":5551,"./es-do.js":5551,"./es-mx":5615,"./es-mx.js":5615,"./es-us":4790,"./es-us.js":4790,"./es.js":328,"./et":6389,"./et.js":6389,"./eu":2961,"./eu.js":2961,"./fa":6151,"./fa.js":6151,"./fi":7997,"./fi.js":7997,"./fil":8898,"./fil.js":8898,"./fo":7779,"./fo.js":7779,"./fr":8174,"./fr-ca":3287,"./fr-ca.js":3287,"./fr-ch":8867,"./fr-ch.js":8867,"./fr.js":8174,"./fy":452,"./fy.js":452,"./ga":5014,"./ga.js":5014,"./gd":4127,"./gd.js":4127,"./gl":2124,"./gl.js":2124,"./gom-deva":6444,"./gom-deva.js":6444,"./gom-latn":7953,"./gom-latn.js":7953,"./gu":6604,"./gu.js":6604,"./he":1222,"./he.js":1222,"./hi":4235,"./hi.js":4235,"./hr":622,"./hr.js":622,"./hu":7735,"./hu.js":7735,"./hy-am":402,"./hy-am.js":402,"./id":9187,"./id.js":9187,"./is":536,"./is.js":536,"./it":5007,"./it-ch":4667,"./it-ch.js":4667,"./it.js":5007,"./ja":2093,"./ja.js":2093,"./jv":59,"./jv.js":59,"./ka":6870,"./ka.js":6870,"./kk":880,"./kk.js":880,"./km":1083,"./km.js":1083,"./kn":8785,"./kn.js":8785,"./ko":1721,"./ko.js":1721,"./ku":7851,"./ku.js":7851,"./ky":1727,"./ky.js":1727,"./lb":346,"./lb.js":346,"./lo":3002,"./lo.js":3002,"./lt":4035,"./lt.js":4035,"./lv":6927,"./lv.js":6927,"./me":5634,"./me.js":5634,"./mi":4173,"./mi.js":4173,"./mk":6320,"./mk.js":6320,"./ml":1705,"./ml.js":1705,"./mn":1062,"./mn.js":1062,"./mr":2805,"./mr.js":2805,"./ms":1341,"./ms-my":9900,"./ms-my.js":9900,"./ms.js":1341,"./mt":7734,"./mt.js":7734,"./my":9034,"./my.js":9034,"./nb":9324,"./nb.js":9324,"./ne":6495,"./ne.js":6495,"./nl":673,"./nl-be":6272,"./nl-be.js":6272,"./nl.js":673,"./nn":2486,"./nn.js":2486,"./oc-lnc":6219,"./oc-lnc.js":6219,"./pa-in":2829,"./pa-in.js":2829,"./pl":8444,"./pl.js":8444,"./pt":3170,"./pt-br":6117,"./pt-br.js":6117,"./pt.js":3170,"./ro":6587,"./ro.js":6587,"./ru":9264,"./ru.js":9264,"./sd":2135,"./sd.js":2135,"./se":5366,"./se.js":5366,"./si":3379,"./si.js":3379,"./sk":6143,"./sk.js":6143,"./sl":196,"./sl.js":196,"./sq":1082,"./sq.js":1082,"./sr":1621,"./sr-cyrl":8963,"./sr-cyrl.js":8963,"./sr.js":1621,"./ss":1404,"./ss.js":1404,"./sv":5685,"./sv.js":5685,"./sw":3872,"./sw.js":3872,"./ta":4106,"./ta.js":4106,"./te":9204,"./te.js":9204,"./tet":3692,"./tet.js":3692,"./tg":6361,"./tg.js":6361,"./th":1735,"./th.js":1735,"./tk":1568,"./tk.js":1568,"./tl-ph":6129,"./tl-ph.js":6129,"./tlh":3759,"./tlh.js":3759,"./tr":1644,"./tr.js":1644,"./tzl":875,"./tzl.js":875,"./tzm":6878,"./tzm-latn":1041,"./tzm-latn.js":1041,"./tzm.js":6878,"./ug-cn":4357,"./ug-cn.js":4357,"./uk":4810,"./uk.js":4810,"./ur":6794,"./ur.js":6794,"./uz":8966,"./uz-latn":7959,"./uz-latn.js":7959,"./uz.js":8966,"./vi":5386,"./vi.js":5386,"./x-pseudo":3156,"./x-pseudo.js":3156,"./yo":8028,"./yo.js":8028,"./zh-cn":9330,"./zh-cn.js":9330,"./zh-hk":9380,"./zh-hk.js":9380,"./zh-mo":874,"./zh-mo.js":874,"./zh-tw":6508,"./zh-tw.js":6508};function n(e){var t=a(e);return s(t)}function a(e){if(!s.o(i,e)){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}return i[e]}n.keys=function(){return Object.keys(i)},n.resolve=a,e.exports=n,n.id=6700}}]);