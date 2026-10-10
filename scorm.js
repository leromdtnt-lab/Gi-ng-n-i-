/* SCORM 1.2 bridge for "Bài 3 – Bảo hiểm".
   Works standalone too: without an LMS it falls back to browser storage. */
(function(){
  function findAPI(w){var n=0;while(w&&!w.API&&w.parent&&w.parent!==w&&n<12){n++;w=w.parent;}return (w&&w.API)?w.API:null;}
  var API=null;try{API=findAPI(window);if(!API&&window.opener)API=findAPI(window.opener);}catch(e){API=null;}
  var S={api:API,data:{},student:'',id:'',t0:Date.now(),finished:false,timer:null};
  function g(k){try{return API.LMSGetValue(k)||'';}catch(e){return '';}}
  function s(k,v){try{return API.LMSSetValue(k,String(v));}catch(e){return false;}}
  if(API){
    try{API.LMSInitialize('');}catch(e){}
    S.student=g('cmi.core.student_name');S.id=g('cmi.core.student_id');
    var st=g('cmi.core.lesson_status');if(!st||st==='not attempted')s('cmi.core.lesson_status','incomplete');
    var sd=g('cmi.suspend_data');if(sd){try{S.data=JSON.parse(sd)||{};}catch(e){S.data={};}}
    if(S.data.v!==6){S.data={v:6};}
  }
  /* local keys are namespaced per learner, so shared computers in a lab don't mix students */
  var prefix='bh3v6_'+(S.id?String(S.id).replace(/[^\w-]/g,'')+'_':'');
  function lsGet(k){try{var v=localStorage.getItem(prefix+k);return v==null?undefined:JSON.parse(v);}catch(e){return undefined;}}
  function lsSet(k,v){try{localStorage.setItem(prefix+k,JSON.stringify(v));}catch(e){}}
  function commit(){if(!API)return;var d={};for(var k in S.data){d[k]=S.data[k];}
    var j=JSON.stringify(d);
    ['stk','visited','f_stName','f_stClass'].forEach(function(k){if(j.length>4000){delete d[k];j=JSON.stringify(d);}});
    if(j.length<=4096)s('cmi.suspend_data',j);
    try{API.LMSCommit('');}catch(e){}}
  function later(){clearTimeout(S.timer);S.timer=setTimeout(commit,1500);}
  S.get=function(k,d){if(API&&Object.prototype.hasOwnProperty.call(S.data,k))return S.data[k];var v=lsGet(k);return v===undefined?d:v;};
  S.set=function(k,v){lsSet(k,v);if(!API)return;
    /* long free-text answers stay in browser storage; short progress data goes to the LMS */
    if(/^f_(?!stName|stClass)/.test(k))return;S.data[k]=v;later();};
  S.location=function(i){if(API){s('cmi.core.lesson_location',i);later();}};
  S.report=function(pct,done){if(!API)return;pct=Math.max(0,Math.min(100,Math.round(pct)));
    s('cmi.core.score.min',0);s('cmi.core.score.max',100);s('cmi.core.score.raw',pct);
    if(done)s('cmi.core.lesson_status','completed');later();};
  function hms(ms){var t=Math.floor(ms/1000),h=Math.floor(t/3600),m=Math.floor(t%3600/60),x=t%60;function p(n){return (n<10?'0':'')+n;}return (h<10?'000'+h:h<100?'00'+h:h<1000?'0'+h:h)+':'+p(m)+':'+p(x);}
  S.finish=function(){if(!API||S.finished)return;S.finished=true;clearTimeout(S.timer);
    s('cmi.core.session_time',hms(Date.now()-S.t0));s('cmi.core.exit','suspend');commit();try{API.LMSFinish('');}catch(e){}};
  window.addEventListener('pagehide',S.finish);window.addEventListener('beforeunload',S.finish);
  window.BHSCORM=S;
})();
