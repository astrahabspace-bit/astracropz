var SUPABASE_URL='https://aaztdbodrtqvsprypzfd.supabase.co';
var SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenRkYm9kcnRxdnNwcnlwemZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzM0NzQsImV4cCI6MjEwNzgwOTQ3NH0.jcdojcQCEn4J9BmA46aS0AbByhZAoAFIikmyAU4-Crk';
var sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
var mode='signin';

function displayNameFromUser(user){
  if(!user)return 'there';
  try{
    var meta=user.user_metadata||{};
    if(meta.full_name&&String(meta.full_name).trim())return String(meta.full_name).trim().split(' ')[0];
    if(meta.name&&String(meta.name).trim())return String(meta.name).trim().split(' ')[0];
  }catch(e){}
  var email=user.email||'';
  var local=(email.split('@')[0]||'there').replace(/[._0-9]+$/g,'').replace(/[._]/g,' ');
  local=local.trim()||'there';
  return local.charAt(0).toUpperCase()+local.slice(1);
}

function openSidebar(){
  var s=document.getElementById('sidebar');
  var o=document.getElementById('sidebarOverlay');
  if(s)s.classList.add('open');
  if(o)o.classList.add('open');
}
function closeSidebar(){
  var s=document.getElementById('sidebar');
  var o=document.getElementById('sidebarOverlay');
  if(s)s.classList.remove('open');
  if(o)o.classList.remove('open');
}
window.openSidebar=openSidebar;
window.closeSidebar=closeSidebar;

function initAuth(){
  var needInject=true;
  var existing=document.getElementById('authModal');
  if(existing&&document.getElementById('authSubmitBtn')&&document.getElementById('authSuccess')&&document.getElementById('authSubtitle')){
    needInject=false;
  }else if(existing){
    existing.remove();
  }
  if(needInject){
    document.body.insertAdjacentHTML('beforeend',
      '<div id="authModal" class="auth-modal" style="display:none">'+
      '<div class="auth-overlay" onclick="closeAuthModal()"></div>'+
      '<div class="auth-box">'+
      '<button class="auth-close" onclick="closeAuthModal()">×</button>'+
      '<h2 id="authTitle">Sign In</h2>'+
      '<p id="authSubtitle" class="auth-subtitle">Welcome back</p>'+
      '<div id="authError" class="auth-message error" style="display:none"></div>'+
      '<div id="authSuccess" class="auth-message success" style="display:none"></div>'+
      '<form id="authForm">'+
      '<div class="form-group"><label>Email</label><input type="email" id="authEmail" required placeholder="you@example.com"></div>'+
      '<div class="form-group" id="passwordGroup"><label>Password</label><input type="password" id="authPassword" required minlength="6"></div>'+
      '<div class="form-group" id="confirmPasswordGroup" style="display:none"><label>Confirm password</label><input type="password" id="authConfirmPassword" minlength="6"></div>'+
      '<button type="submit" id="authSubmitBtn" class="btn btn-full">Sign In</button>'+
      '</form>'+
      '<div class="auth-footer">'+
      '<a href="#" onclick="switchAuthMode(\'forgot\');return false">Forgot password?</a>'+
      '<p id="authSwitch">No account? <a href="#" onclick="switchAuthMode(\'signup\');return false">Sign up</a></p>'+
      '</div></div></div>'+
      '<div id="verifyPopup" class="auth-modal" style="display:none">'+
      '<div class="auth-overlay" onclick="closeVerifyPopup()"></div>'+
      '<div class="auth-box" style="text-align:center">'+
      '<h2>Check your inbox</h2>'+
      '<p style="color:#555;margin:16px 0">We sent a verification link. Please confirm your email.</p>'+
      '<button class="btn" onclick="closeVerifyPopup()">Got it</button>'+
      '</div></div>'
    );
  }
  var form=document.getElementById('authForm');
  if(form)form.addEventListener('submit',handleAuth);
  checkSession();
}

function openAuthModal(m){mode=m||'signin';switchAuthMode(mode);var el=document.getElementById('authModal');if(el)el.style.display='flex';}
function closeAuthModal(){var el=document.getElementById('authModal');if(el)el.style.display='none';}
function closeVerifyPopup(){var el=document.getElementById('verifyPopup');if(el)el.style.display='none';}

function switchAuthMode(m){
  mode=m;
  var t=document.getElementById('authTitle'),b=document.getElementById('authSubmitBtn');
  var c=document.getElementById('confirmPasswordGroup'),p=document.getElementById('passwordGroup');
  var sw=document.getElementById('authSwitch'),sub=document.getElementById('authSubtitle');
  var err=document.getElementById('authError'),ok=document.getElementById('authSuccess');
  if(err)err.style.display='none';if(ok)ok.style.display='none';
  if(!t||!b)return;
  if(m==='signin'){t.textContent='Sign In';b.textContent='Sign In';if(c)c.style.display='none';if(p)p.style.display='block';if(sub)sub.textContent='Welcome back';if(sw)sw.innerHTML='No account? <a href="#" onclick="switchAuthMode(\'signup\');return false">Sign up</a>';}
  else if(m==='signup'){t.textContent='Create Account';b.textContent='Sign Up';if(c)c.style.display='block';if(p)p.style.display='block';if(sub)sub.textContent='Start checking your fields';if(sw)sw.innerHTML='Have an account? <a href="#" onclick="switchAuthMode(\'signin\');return false">Sign in</a>';}
  else{t.textContent='Reset Password';b.textContent='Send Link';if(c)c.style.display='none';if(p)p.style.display='none';if(sub)sub.textContent='We will email you a reset link';if(sw)sw.innerHTML='<a href="#" onclick="switchAuthMode(\'signin\');return false">Back to Sign In</a>';}
}

async function handleAuth(e){
  e.preventDefault();
  var err=document.getElementById('authError');
  var ok=document.getElementById('authSuccess');
  var btn=document.getElementById('authSubmitBtn');
  if(err)err.style.display='none';
  if(ok)ok.style.display='none';
  var email=(document.getElementById('authEmail')||{}).value||'';
  var pass=(document.getElementById('authPassword')||{}).value||'';
  email=String(email).trim();
  if(btn)btn.disabled=true;
  try{
    if(mode==='signup'){
      var conf=(document.getElementById('authConfirmPassword')||{}).value||'';
      if(pass!==conf){if(err){err.textContent='Passwords do not match.';err.style.display='block';}return;}
      var r=await sb.auth.signUp({email:email,password:pass});
      if(r.error){
        if(err){err.textContent=r.error.message.indexOf('already')!==-1?'Account already exists. Please sign in.':r.error.message;err.style.display='block';}
        return;
      }
      closeAuthModal();
      var vp=document.getElementById('verifyPopup');
      if(vp)vp.style.display='flex';
      if(r.data.session)enterDashboard(r.data.user);
    }else if(mode==='signin'){
      var r2=await sb.auth.signInWithPassword({email:email,password:pass});
      if(r2.error){if(err){err.textContent=r2.error.message;err.style.display='block';}return;}
      closeAuthModal();enterDashboard(r2.data.user);
    }else{
      var r3=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://astracropz.vercel.app'});
      if(r3.error){if(err){err.textContent=r3.error.message;err.style.display='block';}return;}
      if(ok){ok.textContent='Reset link sent. Check your inbox.';ok.style.display='block';}
    }
  }catch(x){if(err){err.textContent='Something went wrong. Please try again.';err.style.display='block';}}
  finally{if(btn)btn.disabled=false;}
}

async function checkSession(){
  try{
    var s=await sb.auth.getSession();
    if(s.data.session)enterDashboard(s.data.session.user);
  }catch(e){}
}

function enterDashboard(user){
  var pub=document.getElementById('publicSite');
  var app=document.getElementById('appDashboard');
  if(pub)pub.style.display='none';
  if(app){app.style.display='flex';app.style.minHeight='100vh';app.style.width='100%';}

  var name=displayNameFromUser(user);
  var welcome=document.getElementById('welcomeTitle');
  var welcomeSub=document.getElementById('welcomeSub');
  if(welcome)welcome.textContent='Welcome, '+name;
  var dw=document.getElementById('dashWelcome');if(dw)dw.textContent='Welcome, '+name;
  if(welcomeSub)welcomeSub.textContent='Your field checks in one place';

  var se=document.getElementById('settingsEmail');
  var sn=document.getElementById('settingsName');
  if(se)se.textContent=user.email||'-';
  if(sn)sn.textContent=name;

  var sideName=document.getElementById('sideUserName');
  var sideEmail=document.getElementById('sideUserEmail');
  var sideAv=document.getElementById('sideAvatar');
  if(sideName)sideName.textContent=name;
  if(sideEmail)sideEmail.textContent=user.email||'';
  if(sideAv)sideAv.textContent=(name.charAt(0)||'A').toUpperCase();

  if(typeof showDashPanel==='function')showDashPanel('overview');
  if(typeof loadDashboard==='function')loadDashboard();
  if(typeof refreshUsageUI==='function')refreshUsageUI();
  if(typeof initDashMap==='function')setTimeout(function(){initDashMap();},100);
  window.scrollTo(0,0);
}

async function signOut(){try{await sb.auth.signOut();}catch(e){}location.href='/';}

window.openAuthModal=openAuthModal;window.closeAuthModal=closeAuthModal;
window.closeVerifyPopup=closeVerifyPopup;window.switchAuthMode=switchAuthMode;
window.signOut=signOut;window.signOutUser=signOut;
window.displayNameFromUser=displayNameFromUser;window.enterDashboard=enterDashboard;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAuth);else initAuth();
