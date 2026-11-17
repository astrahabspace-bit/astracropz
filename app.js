/* Load last known good analysis core, then apply local fixes in satellite-fix.js */
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/astrahabspace-bit/astracropz@ca68c8315a62407525308c4f3fd4a655a6addae6/app.js';
  s.onload=function(){var f=document.createElement('script');f.src='satellite-fix.js';document.body.appendChild(f);};
  s.onerror=function(){console.error('Could not load analysis core');};
  document.head.appendChild(s);
})();
