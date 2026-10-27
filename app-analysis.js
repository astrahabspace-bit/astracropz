/* loaded after app.js */
function scoreMeaning(score){if(score==null)return'Could not score this field';if(score>=75)return'Crop looks strong';if(score>=55)return'Crop looks okay';if(score>=40)return'Needs a closer look';return'Field looks stressed';}
async function findPreviousScore(userId,token){
  try{
    var url=SUPABASE_URL+'/rest/v1/analyses?user_id=eq.'+encodeURIComponent(userId)+'&select=score,date_analyzed,location_text,created_at&order=created_at.desc&limit=12';
    var res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
    var rows=await res.json();
    if(!Array.isArray(rows)||!rows.length)return null;
    for(var i=0;i<rows.length;i++){if(rows[i].score!=null)return rows[i];}
  }catch(e){}
  return null;
}
function enhanceResultUI(score,statusText,statusCls,summaryText,weatherInfo,thumbUrl,satelliteInfo,user,token,prev){
  var resultBox=document.getElementById('dashResultBox');
  if(!resultBox)return;
  var scoreEl=resultBox.querySelector('.score');
  var statusEl=resultBox.querySelector('.status');
  var summaryEl=resultBox.querySelector('.summary');
  var meaningEl=document.getElementById('dashScoreMeaning');
  var compareEl=document.getElementById('dashCompareLine');
  var weatherLine=document.getElementById('dashWeather');
  var thumbWrap=document.getElementById('dashThumbWrap');
  var thumbImg=document.getElementById('dashSatThumb');
  var ndviLine=document.getElementById('dashNdviLine');
  var legend=document.getElementById('ndviLegend');
  if(scoreEl)scoreEl.innerHTML=(score!=null?score:'--')+' <span>/ 100</span>';
  if(meaningEl)meaningEl.textContent=scoreMeaning(score);
  if(statusEl){statusEl.textContent='Status: '+statusText;statusEl.className='status '+statusCls;statusEl.style.color=(score!=null&&score<50)?'#dc2626':'';}
  if(compareEl){
    if(prev&&prev.score!=null&&score!=null){
      var delta=score-prev.score;
      var when=prev.date_analyzed||'last time';
      compareEl.style.display='block';
      if(delta>=5){compareEl.className='compare-line';compareEl.textContent='Up '+delta+' points vs your last check ('+prev.score+' on '+when+'). Field looks better.';}
      else if(delta<=-5){compareEl.className='compare-line warn';compareEl.textContent='Down '+Math.abs(delta)+' points vs your last check ('+prev.score+' on '+when+'). Field looks weaker.';}
      else{compareEl.className='compare-line neutral';compareEl.textContent='About the same as your last check ('+prev.score+' on '+when+').';}
    }else if(user){
      compareEl.style.display='block';compareEl.className='compare-line neutral';
      compareEl.textContent='First saved check for this account. Run again later to see if the field improved.';
    }else{compareEl.style.display='none';}
  }
  if(ndviLine)ndviLine.style.display='none';
  if(weatherLine){if(weatherInfo){weatherLine.style.display='block';weatherLine.textContent='Weather now: '+weatherInfo.temp+'\u00b0C \u00b7 Humidity '+weatherInfo.humidity+'% \u00b7 Rain '+weatherInfo.rain+' mm';}else{weatherLine.style.display='none';}}
  if(thumbWrap&&thumbImg){if(thumbUrl){thumbImg.src=thumbUrl;thumbImg.onerror=function(){thumbWrap.style.display='none';};thumbWrap.style.display='block';}else{thumbWrap.style.display='none';}}
  if(legend)legend.style.display=(satelliteInfo&&satelliteInfo.itemId)?'flex':'none';
  if(summaryEl)summaryEl.textContent=summaryText;
  resultBox.style.display='block';
}
