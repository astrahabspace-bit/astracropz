var SUPABASE_URL='https://aaztdbodrtqvsprypzfd.supabase.co';
var SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenRkYm9kcnRxdnNwcnlwemZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzM0NzQsImV4cCI6MjEwNzgwOTQ3NH0.jcdojcQCEn4J9BmA46aS0AbByhZAoAFIikmyAU4-Crk';
var PC_STAC_URL='https://planetarycomputer.microsoft.com/api/stac/v1/search';
var PC_DATA='https://planetarycomputer.microsoft.com/api/data/v1';
var FREE_LIMIT=5;var DODO_PRODUCT_ID='';var DODO_CHECKOUT_BASE='https://checkout.dodopayments.com/buy/';
var DELHI_LAT=28.6139;var DELHI_LNG=77.2090;var currentLat=DELHI_LAT;var currentLng=DELHI_LNG;
var demoMap=null;var dashMap=null;var ndviLayer=null;var fieldLayer=null;
var PANEL_TITLES={overview:'Overview',analyze:'New analysis',history:'My analyses',fields:'Saved fields',settings:'Settings'};
function isProUser(user){if(!user)return false;try{return localStorage.getItem('astracropz_plan_'+user.id)==='pro';}catch(e){return false;}}
function setProUser(user){if(!user)return;try{localStorage.setItem('astracropz_plan_'+user.id,'pro');}catch(e){}}
function monthStartISO(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString();}
async function countMonthAnalyses(userId,token){try{var url=SUPABASE_URL+'/rest/v1/analyses?user_id=eq.'+encodeURIComponent(userId)+'&created_at=gte.'+encodeURIComponent(monthStartISO())+'&select=id';var res=await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+token,Prefer:'count=exact'}});var range=res.headers.get('content-range');if(range&&range.indexOf('/')!==-1){var total=parseInt(range.split('/')[1],10);if(!isNaN(total))return total;}var rows=await res.json();return Array.isArray(rows)?rows.length:0;}catch(e){return 0;}}
