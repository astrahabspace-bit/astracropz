/* satellite + dashboard fixes */
(function(){
async function searchBestSceneFixed(lat,lng,dateVal){
  var target=new Date((dateVal||new Date().toISOString().split('T')[0])+'T12:00:00Z');
  if(isNaN(target.getTime()))target=new Date();
  var today=new Date();
  if(target>today)target=today;
  var startDate=new Date(target);startDate.setDate(startDate.getDate()-45);
  var endDate=new Date(target);endDate.setDate(endDate.getDate()+2);
  if(endDate>today)endDate=today;
  var bbox=fieldBbox(lat,lng,0.05);
  async function query(cloudLt){
    var stacRes=await fetch(PC_STAC_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collections:['sentinel-2-l2a'],bbox:bbox,datetime:startDate.toISOString()+'/'+endDate.toISOString(),limit:24,query:{'eo:cloud_cover':{lt:cloudLt}}})});
    if(!stacRes.ok)return [];
    var stacData=await stacRes.json();
    return stacData.features||[];
  }
  var features=await query(35);
  if(!features.length)features=await query(70);
  if(!features.length)features=await query(95);
  if(!features.length)return null;
  var tMs=target.getTime();
  features.sort(function(a,b){
    var da=Math.abs(new Date(a.properties.datetime).getTime()-tMs);
    var db=Math.abs(new Date(b.properties.datetime).getTime()-tMs);
    if(da!==db)return da-db;
    return (a.properties['eo:cloud_cover']||100)-(b.properties['eo:cloud_cover']||100);
  });
  return features[0];
}
window.searchBestScene=searchBestSceneFixed;
async function searchSatelliteFixed(lat,lng,dateVal){
  var feature=await searchBestSceneFixed(lat,lng,dateVal);
  if(!feature)return null;
  var itemId=feature.id;
  var cloud=Number(feature.properties['eo:cloud_cover']||0);
  var acquired=(feature.properties.datetime||'').split('T')[0]||'';
  var stats=null;
  try{stats=await computeRealNdvi(itemId,lat,lng);}catch(e){stats=null;}
  var mean=stats?stats.mean:null;
  var score=mean!=null?ndviToScore(mean):null;
  return{itemId:itemId,cloud:cloud.toFixed(1),acquired:acquired,ndvi:mean!=null?mean.toFixed(3):null,ndviMean:mean,ndviStats:stats,score:score,thumb:pickThumbUrl(feature)||ndviPreviewUrl(itemId,lat,lng),ndviPreview:ndviPreviewUrl(itemId,lat,lng)};
}
window.searchSatellite=searchSatelliteFixed;
async function runDashAnalysisFixed(){
  var btn=document.getElementById('dashAnalyzeBtn');
  var resultBox=document.getElementById('dashResultBox');
  if(!btn||!resultBox)return;
  var user=await getSessionUser();
  var token=await getAccessToken();
  if(user&&!isProUser(user)){
    var used=await countMonthAnalyses(user.id,token);
    if(used>=FREE_LIMIT){showQuotaModal();return;}
  }
  btn.textContent='Analyzing field...';
  btn.disabled=true;
  resultBox.style.display='none';
  var locationText=(document.getElementById('dashLocation')||{}).value||'Delhi region';
  var analysisType=(document.getElementById('dashType')||{}).value||'Crop Health';
  var dateVal=(document.getElementById('dashDate')||{}).value||new Date().toISOString().split('T')[0];
  var dateVal2=(document.getElementById('dashDate2')||{}).value||'';
  var weatherInfo=await fetchWeather(currentLat,currentLng);
  var satelliteInfo=null,score=null,statusText='Unknown',statusCls='',summaryText='',thumbUrl=null,changeDelta=null;
  try{
    satelliteInfo=await searchSatelliteFixed(currentLat,currentLng,dateVal);
    if(satelliteInfo&&satelliteInfo.score!=null){
      score=satelliteInfo.score;
      thumbUrl=satelliteInfo.ndviPreview||satelliteInfo.thumb;
      var st=statusFromNdvi(satelliteInfo.ndviMean);
      statusText=st.text;statusCls=st.cls;
      if(dashMap&&satelliteInfo.itemId){setNdviOverlay(dashMap,satelliteInfo.itemId);setFieldMarker(dashMap,currentLat,currentLng);}
      if(analysisType==='Change Detection'&&dateVal2&&satelliteInfo.ndviMean!=null){
        var older=await searchSatelliteFixed(currentLat,currentLng,dateVal2);
        if(older&&older.ndviMean!=null)changeDelta=satelliteInfo.ndviMean-older.ndviMean;
      }
      summaryText=buildAdvice(satelliteInfo.ndviMean,weatherInfo,analysisType,changeDelta);
      if(satelliteInfo.acquired)summaryText+=' Image date: '+satelliteInfo.acquired+'.';
    }else{
      score=null;statusText='No clear image';
      summaryText='No usable satellite image for this date and field. Try another date or move the marker slightly.';
    }
  }catch(e){
    score=null;statusText='Check failed';
    summaryText='Could not finish the satellite check. Try again in a moment.';
  }
  var prev=null;if(user)prev=await findPreviousScore(user.id,token);
  var scoreEl=resultBox.querySelector('.score');
  var statusEl=resultBox.querySelector('.status');
  var summaryEl=resultBox.querySelector('.summary');
  var meaningEl=document.getElementById('dashScoreMeaning');
  var compareEl=document.getElementById('dashCompareLine');
  var weatherLine=document.getElementById('dashWeather');
  var thumbWrap=document.getElementById('dashThumbWrap');
  var thumbImg=document.getElementById('dashSatThumb');
  var legend=document.getElementById('ndviLegend');
  if(scoreEl)scoreEl.innerHTML=(score!=null?score:'--')+' <span>/ 100</span>';
  if(meaningEl)meaningEl.textContent=scoreMeaning(score);
  if(statusEl){statusEl.textContent='Status: '+statusText;statusEl.className='status '+statusCls;statusEl.style.color=(score!=null&&score<50)?'#dc2626':'';}
  if(compareEl){
    if(prev&&prev.score!=null&&score!=null){
      var delta=score-prev.score;var when=prev.date_analyzed||'last time';
      compareEl.style.display='block';
      if(delta>=5){compareEl.className='compare-line';compareEl.textContent='Up '+delta+' points vs your last check ('+prev.score+' on '+when+'). Field looks better.';}
      else if(delta<=-5){compareEl.className='compare-line warn';compareEl.textContent='Down '+Math.abs(delta)+' points vs your last check ('+prev.score+' on '+when+'). Field looks weaker.';}
      else{compareEl.className='compare-line neutral';compareEl.textContent='About the same as your last check ('+prev.score+' on '+when+').';}
    }else if(user){compareEl.style.display='block';compareEl.className='compare-line neutral';compareEl.textContent='First saved check for this account. Run again later to see if the field improved.';}
    else{compareEl.style.display='none';}
  }
  if(weatherLine){if(weatherInfo){weatherLine.style.display='block';weatherLine.textContent='Weather now: '+weatherInfo.temp+'\u00b0C \u00b7 Humidity '+weatherInfo.humidity+'% \u00b7 Rain '+weatherInfo.rain+' mm';}else{weatherLine.style.display='none';}}
  if(thumbWrap&&thumbImg){if(thumbUrl){thumbImg.src=thumbUrl;thumbImg.onerror=function(){thumbWrap.style.display='none';};thumbWrap.style.display='block';}else{thumbWrap.style.display='none';}}
  if(legend)legend.style.display=(satelliteInfo&&satelliteInfo.itemId)?'flex':'none';
  if(summaryEl)summaryEl.textContent=summaryText;
  var imgDateEl=document.getElementById('dashImageDate');
  if(imgDateEl){if(satelliteInfo&&satelliteInfo.acquired){imgDateEl.style.display='block';imgDateEl.className='date-meta strong';imgDateEl.textContent='Satellite image: '+satelliteInfo.acquired+(satelliteInfo.cloud!=null?' \u00b7 Cloud '+satelliteInfo.cloud+'%':'');}else{imgDateEl.style.display='none';}}
  var gndEl=document.getElementById('dashGroundDate');
  var gndVal=(document.getElementById('groundCheckDate')||{}).value;
  if(gndEl){if(gndVal){gndEl.style.display='block';gndEl.textContent='Ground check: '+gndVal;}else{gndEl.style.display='none';}}
  resultBox.style.display='block';
  resultBox.classList.remove('enter');void resultBox.offsetWidth;resultBox.classList.add('enter');
  try{
    var body={location_text:locationText,analysis_type:analysisType,score:score,status:statusText,summary:summaryText,date_analyzed:dateVal,latitude:currentLat,longitude:currentLng};
    if(user){body.user_id=user.id;await fetch(SUPABASE_URL+'/rest/v1/analyses',{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});refreshUsageUI();if(typeof loadDashboard==='function')loadDashboard();}
  }catch(e){}
  btn.textContent='Run Analysis';
  btn.disabled=false;
}
window.runDashAnalysis=runDashAnalysisFixed;
function bindAnalysisBtn(){
  var btn=document.getElementById('dashAnalyzeBtn');
  if(btn){btn.onclick=null;btn.addEventListener('click',runDashAnalysisFixed);}
  var dd=document.getElementById('dashDate');
  if(dd){var todayStr=new Date().toISOString().split('T')[0];dd.setAttribute('max',todayStr);if(!dd.value)dd.value=todayStr;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAnalysisBtn);else bindAnalysisBtn();
setTimeout(bindAnalysisBtn,800);
})();
