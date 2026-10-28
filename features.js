/* AstraCropz feature layer — load after app.js */
PANEL_TITLES.fields='Saved fields';
var reportLang='en';
var lastReportData=null;
showDashPanel=function(id){
  var panels=['overview','analyze','history','fields','settings'];
  panels.forEach(function(p){var el=document.getElementById('panel-'+p);if(el)el.style.display=(p===id)?'block':'none';});
  document.querySelectorAll('.side-link').forEach(function(b){if(b.getAttribute('data-panel')===id)b.classList.add('active');else b.classList.remove('active');});
  var title=document.getElementById('dashPageTitle');if(title)title.textContent=PANEL_TITLES[id]||'Dashboard';
  if(typeof closeSidebar==='function')closeSidebar();
  if(id==='analyze'&&typeof initDashMap==='function')setTimeout(function(){initDashMap();},80);
  if(id==='history'&&typeof loadDashboard==='function')loadDashboard();
  if(id==='overview'){refreshUsageUI();loadDashboard();if(typeof renderScoreAlerts==='function')renderScoreAlerts();if(typeof renderOverviewFields==='function')renderOverviewFields();}
  if(id==='fields'){if(typeof renderSavedFields==='function')renderSavedFields();if(typeof renderFieldsPanel==='function')renderFieldsPanel();}
  window.scrollTo(0,0);
};
window.showDashPanel=showDashPanel;
function fieldsKey(user){return 'astracropz_fields_'+(user&&user.id?user.id:'guest');}
async function getSavedFields(){var user=await getSessionUser();try{return JSON.parse(localStorage.getItem(fieldsKey(user))||'[]');}catch(e){return [];}}
async function setSavedFields(list){var user=await getSessionUser();try{localStorage.setItem(fieldsKey(user),JSON.stringify(list||[]));}catch(e){}renderSavedFields();renderFieldsPanel();if(typeof renderOverviewFields==='function')renderOverviewFields();}
async function saveCurrentField(){var nameEl=document.getElementById('fieldNameInput');var name=(nameEl&&nameEl.value?nameEl.value:'').trim();if(!name){alert('Enter a field name first.');return;}var list=await getSavedFields();list=list.filter(function(f){return f.name!==name;});var sc=lastReportData&&lastReportData.score!=null?lastReportData.score:null;list.unshift({name:name,lat:currentLat,lng:currentLng,label:(document.getElementById('dashLocation')||{}).value||name,lastScore:sc});if(list.length>30)list=list.slice(0,30);await setSavedFields(list);if(nameEl)nameEl.value='';}
async function useSavedField(idx){var list=await getSavedFields();var f=list[idx];if(!f)return;currentLat=f.lat;currentLng=f.lng;setLocationInput(f.label||f.name);if(dashMap){setFieldMarker(dashMap,f.lat,f.lng);try{dashMap.flyTo([f.lat,f.lng],13,{duration:0.5});}catch(e){dashMap.setView([f.lat,f.lng],13);}}showDashPanel('analyze');}
async function deleteSavedField(idx){var list=await getSavedFields();list.splice(idx,1);await setSavedFields(list);}
function escapeHtml(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
async function renderSavedFields(){var el=document.getElementById('savedFieldList');if(!el)return;var list=await getSavedFields();if(!list.length){el.innerHTML='<p class="field-hint">No saved fields yet</p>';return;}el.innerHTML=list.map(function(f,i){return '<div class="field-chip" onclick="useSavedField('+i+')"><strong>'+escapeHtml(f.name)+'</strong><button type="button" class="field-del" onclick="event.stopPropagation();deleteSavedField('+i+')" aria-label="Remove">×</button></div>';}).join('');}
async function renderFieldsPanel(){var el=document.getElementById('fieldsPanelList');if(!el)return;var list=await getSavedFields();if(!list.length){el.innerHTML='<p class="empty-msg">No saved fields. Name a field on the New analysis page and click Save.</p>';return;}el.innerHTML=list.map(function(f,i){return '<div class="field-chip" onclick="useSavedField('+i+')"><div><strong>'+escapeHtml(f.name)+'</strong><br><span style="font-size:.8rem;color:#666">'+escapeHtml(f.label||'')+'</span></div><button type="button" class="field-del" onclick="event.stopPropagation();deleteSavedField('+i+')">×</button></div>';}).join('');}
function buildSharePayload(){if(!lastReportData)return null;var d=lastReportData;var obj={s:d.score,m:d.meaning,st:d.status,sum:d.summary,l:d.location,d:d.date,c:d.crop||'',w:d.weather||'',t:Date.now()};try{return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}catch(e){return null;}}
function getShareUrl(){var p=buildSharePayload();if(!p)return location.origin+'/';return location.origin+'/report.html?r='+encodeURIComponent(p);}
async function copyShareLink(){var url=getShareUrl();try{await navigator.clipboard.writeText(url);alert('Report link copied. Anyone with the link can open it.');}catch(e){prompt('Copy this link:',url);}}
function buildLocalAction(score,status,crop){
  var s=score;
  if(s==null)return 'आज खेत घूमकर हरी-पीली पट्टियाँ देखें। 7 दिन बाद फिर जाँच करें।';
  if(s>=75)return 'फसल अच्छी दिख रही है। नियमित सिंचाई बनाए रखें। 10–14 दिन बाद फिर स्कोर देखें।';
  if(s>=55)return 'फसल ठीक है। इस हफ्ते नमी और पोषण जाँचें। कमज़ोर हिस्से में घूमकर देखें।';
  if(s>=40)return 'ध्यान दें। कल या परसों खेत घूमें — पानी की कमी, कीट या पीले धब्बे जाँचें।';
  return 'तनाव दिख रहा है। जल्द खेत जाँचें — सिंचाई, जलभराव और कीट/रोग देखें। 5–7 दिन में फिर स्कोर लें।';
}
function shareWhatsApp(){
  var url=getShareUrl();
  var d=lastReportData||{};
  var name=d.fieldName||d.location||'Field';
  var score=d.score!=null?d.score:'--';
  var action=d.action||d.meaning||'';
  var text='खेत: '+name+'\nस्कोर: '+score+'/100\n'+action+'\n\nरिपोर्ट: '+url;
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
}
function printReport(){window.print();}
window.copyShareLink=copyShareLink;window.shareWhatsApp=shareWhatsApp;window.printReport=printReport;
window.saveCurrentField=saveCurrentField;window.useSavedField=useSavedField;window.deleteSavedField=deleteSavedField;
var HI={'Crop looks strong':'फसल अच्छी दिख रही है','Crop looks okay':'फसल ठीक लग रही है','Needs a closer look':'नज़दीक से जाँच करें','Field looks stressed':'खेत पर तनाव दिख रहा है','Could not score this field':'स्कोर नहीं बन सका','Healthy':'स्वस्थ','Moderately Healthy':'मध्यम स्वस्थ','Fair - Monitor':'निगरानी रखें','Stressed - Needs Attention':'तनाव — ध्यान दें','Unknown':'अज्ञात','Limited coverage':'सीमित कवरेज'};
function setReportLang(lang){reportLang=lang||'en';document.querySelectorAll('#reportLangToggle button').forEach(function(b){if(b.getAttribute('data-lang')===reportLang)b.classList.add('active');else b.classList.remove('active');});applyReportLang();}
function tr(s){if(reportLang!=='hi')return s;return HI[s]||s;}
function applyReportLang(){if(!lastReportData)return;var meaningEl=document.getElementById('dashScoreMeaning');var statusEl=document.querySelector('#dashResultBox .status');var summaryEl=document.getElementById('dashSummary')||document.querySelector('#dashResultBox .summary');if(meaningEl)meaningEl.textContent=tr(lastReportData.meaning||scoreMeaning(lastReportData.score));if(statusEl)statusEl.textContent=(reportLang==='hi'?'स्थिति: ':'Status: ')+tr(lastReportData.status||'');if(summaryEl&&lastReportData.summary){if(reportLang==='hi'){summaryEl.textContent='स्कोर '+(lastReportData.score!=null?lastReportData.score:'--')+'। '+(lastReportData.crop?('फसल: '+lastReportData.crop+'. '):'')+tr(lastReportData.meaning||'')+'. मौसम और नक्शा देखें।';}else{summaryEl.textContent=lastReportData.summary;}}}
window.setReportLang=setReportLang;
async function renderScoreAlerts(){var el=document.getElementById('scoreAlert');if(!el)return;var user=await getSessionUser();if(!user){el.className='alert-banner empty';el.textContent='Sign in and run checks to see score alerts.';return;}var token=await getAccessToken();try{var url=SUPABASE_URL+'/rest/v1/analyses?user_id=eq.'+encodeURIComponent(user.id)+'&select=score,location_text,date_analyzed,created_at&order=created_at.desc&limit=40';var res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});var rows=await res.json();if(!Array.isArray(rows)||rows.length<2){el.className='alert-banner empty';el.textContent='Run a few checks on the same field to see if the score drops.';return;}var byLoc={};rows.forEach(function(r){var k=(r.location_text||'Field').trim();if(!byLoc[k])byLoc[k]=[];byLoc[k].push(r);});var drops=[];Object.keys(byLoc).forEach(function(k){var arr=byLoc[k];if(arr.length<2)return;var newer=arr[0],older=arr[1];if(newer.score==null||older.score==null)return;var delta=newer.score-older.score;if(delta<=-10)drops.push({name:k,delta:delta,from:older.score,to:newer.score});});if(!drops.length){el.className='alert-banner ok';el.textContent='No big score drops in your recent checks.';return;}var d=drops[0];el.className='alert-banner';el.textContent='Score dropped '+Math.abs(d.delta)+' points on '+d.name+' ('+d.from+' → '+d.to+'). Check that field soon.';}catch(e){el.className='alert-banner empty';el.textContent='Could not load alerts right now.';}}
async function renderOverviewFields(){
  var el=document.getElementById('overviewFields');
  if(!el)return;
  var list=await getSavedFields();
  if(!list.length){
    el.innerHTML='<p class="empty-msg">Save a field name on New analysis to see it here with its last score.</p>';
    return;
  }
  var scores={};
  try{
    var user=await getSessionUser();
    if(user){
      var token=await getAccessToken();
      var url=SUPABASE_URL+'/rest/v1/analyses?user_id=eq.'+encodeURIComponent(user.id)+'&select=score,location_text,created_at&order=created_at.desc&limit=40';
      var res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
      var rows=await res.json();
      if(Array.isArray(rows)){
        rows.forEach(function(r){
          var k=(r.location_text||'').trim().toLowerCase();
          if(k&&scores[k]==null&&r.score!=null)scores[k]=r.score;
        });
      }
    }
  }catch(e){}
  el.innerHTML='<div class="field-list">'+list.map(function(f,i){
    var key=(f.label||f.name||'').trim().toLowerCase();
    var sc=scores[key];
    if(sc==null&&f.lastScore!=null)sc=f.lastScore;
    var scHtml=sc!=null?('<span class="ov-score '+(sc>=55?'good':'bad')+'">'+sc+'</span>'):'<span class="ov-score muted">—</span>';
    return '<div class="field-chip ov-field" onclick="useSavedField('+i+')"><div><strong>'+escapeHtml(f.name)+'</strong><br><span style="font-size:.8rem;color:#666">'+escapeHtml(f.label||'')+'</span></div>'+scHtml+'</div>';
  }).join('')+'</div>';
}
if(typeof runDashAnalysis==='function'){
  var _run=runDashAnalysis;
  runDashAnalysis=async function(){
    await _run.apply(this,arguments);
    try{
      var scoreEl=document.querySelector('#dashResultBox .score');
      var meaningEl=document.getElementById('dashScoreMeaning');
      var statusEl=document.querySelector('#dashResultBox .status');
      var summaryEl=document.getElementById('dashSummary')||document.querySelector('#dashResultBox .summary');
      var loc=(document.getElementById('dashLocation')||{}).value||'';
      var date=(document.getElementById('dashDate')||{}).value||'';
      var crop=(document.getElementById('dashCrop')||{}).value||'';
      var scoreTxt=scoreEl?scoreEl.textContent:'';
      var score=parseInt(scoreTxt,10);
      if(isNaN(score))score=null;
      var action=buildLocalAction(score,statusEl?statusEl.textContent:'',crop);
      lastReportData={score:score,meaning:meaningEl?meaningEl.textContent:'',status:statusEl?statusEl.textContent.replace(/^Status:\s*/,''):'',summary:summaryEl?summaryEl.textContent:'',location:loc,date:date,crop:crop,weather:(document.getElementById('dashWeather')||{}).textContent||'',fieldName:(document.getElementById('fieldNameInput')&&document.getElementById('fieldNameInput').value)||loc,action:action};
      var actEl=document.getElementById('dashActionLine');
      if(actEl&&action){actEl.style.display='block';actEl.textContent=action;}
      if(summaryEl&&action)summaryEl.textContent=action;
    }catch(e){}
  };
  window.runDashAnalysis=runDashAnalysis;
}
if(typeof buildAdvice==='function'){
  var _buildAdviceOrig=buildAdvice;
  buildAdvice=function(mean,weather,analysisType,changeDelta){
    var score=null;
    if(mean!=null&&!isNaN(mean)){
      score=Math.round(((mean+0.05)/0.85)*100);
      score=Math.max(0,Math.min(100,score));
    }
    var action=buildLocalAction(score,'','');
    var extra=[];
    if(weather){
      if(weather.rain>2)extra.push('बारिश के बाद खेत में पानी न रुकने दें।');
      else if(weather.temp>38)extra.push('तेज़ गर्मी — दोपहर में सिंचाई से बचें।');
      else if(weather.humidity>80&&weather.temp>28)extra.push('नमी ज़्यादा — फफूंद पर नज़र रखें।');
    }
    if(analysisType==='Change Detection'&&changeDelta!=null){
      if(changeDelta<-0.08)extra.push('पिछली तारीख से हरापन घटा है।');
      else if(changeDelta>0.08)extra.push('पिछली तारीख से हरापन बढ़ा है।');
    }
    return action+(extra.length?' '+extra.join(' '):'');
  };
  window.buildAdvice=buildAdvice;
}
document.addEventListener('DOMContentLoaded',function(){if(typeof renderSavedFields==='function')renderSavedFields();});
