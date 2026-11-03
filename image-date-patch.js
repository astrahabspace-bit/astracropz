/* image-date-patch.js - load after app.js */
(function(){
  if(typeof searchSatellite!=='function')return;
  var _ss=searchSatellite;
  searchSatellite=async function(){
    var info=await _ss.apply(this,arguments);
    if(info&&info.acquired){window.__lastImageDate=info.acquired;}
    else{window.__lastImageDate='';}
    return info;
  };
  window.searchSatellite=searchSatellite;
  if(typeof runDashAnalysis!=='function')return;
  var _run=runDashAnalysis;
  runDashAnalysis=async function(){
    var gEl=document.getElementById('groundCheckDate');
    window.__lastGroundDate=gEl&&gEl.value?gEl.value:'';
    await _run.apply(this,arguments);
    var imgDateEl=document.getElementById('dashImageDate');
    if(imgDateEl){
      if(window.__lastImageDate){imgDateEl.style.display='block';imgDateEl.textContent='Satellite image: '+window.__lastImageDate;}
      else{imgDateEl.style.display='none';}
    }
    var gShow=document.getElementById('dashGroundDate');
    if(gShow){
      if(window.__lastGroundDate){gShow.style.display='block';gShow.textContent='Ground check: '+window.__lastGroundDate;}
      else{gShow.style.display='none';}
    }
  };
  window.runDashAnalysis=runDashAnalysis;
})();
