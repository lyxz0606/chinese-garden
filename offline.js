// Shared by all pages; always register at the app root, including /pinyin/ pages.
const root=new URL('./',import.meta.url),$=id=>document.getElementById(id),mb=n=>(n/1024/1024).toFixed(1)+' MB';
let registration,worker,status,busy=false;
const parent=()=>{location.href=new URL('parent.html#offline',root).href;};
document.addEventListener('click',e=>{if(e.target.closest('[data-open-offline]'))parent();});
function message(text,error=false){if($('offline-status')){$('offline-status').textContent=text;$('offline-status').classList.toggle('error',error);}}
function enable(ready){for(const id of ['download-all','download-selected','download-selection','verify-offline'])if($(id))$(id).disabled=!ready||busy;if($('pause-download'))$('pause-download').disabled=!busy;}
function paint(s){
 status=s;const d=s.download;if($('offline-progress'))$('offline-progress').style.width=(100*(d?d.bytes/Math.max(1,d.totalBytes):s.bytes/Math.max(1,s.totalBytes)))+'%';
 if($('offline-detail'))$('offline-detail').textContent=`已保存 ${mb(s.bytes)} / ${mb(s.totalBytes)} · ${s.done} / ${s.total} 个文件。暂停后可以继续，无需重下已完成文件。`;
 if(d)message(`正在保存 ${d.done} / ${d.total} 个文件，请保持页面在前台。`);
 else message(s.allAudioReady?'全部课程与声音已保存，可以断网检查。':s.coreReady?'页面与文字已保存。请继续保存近期或全部声音。':'页面仍在准备，请稍候。');
 if($('download-selection')&&s.units){const selected=$('download-selection').value;$('download-selection').replaceChildren();const base=[['core','页面与文字内容'],['reader-all','全部识字声音'],['pinyin-all','全部拼音声音'],...s.units.map(u=>[u.id,`${u.direction==='reader'?'识字 · ':''}${u.title}${u.done===u.total?'（已保存）':''}`])];for(const [value,label] of base){const option=document.createElement('option');option.value=value;option.textContent=label;$('download-selection').append(option);}$('download-selection').value=base.some(a=>a[0]===selected)?selected:'core';}
}
function call(action,extra={}){return new Promise((resolve,reject)=>{if(!worker){reject(Error('离线服务尚未就绪，请稍候。'));return;}const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('后台响应较慢，请保持页面打开，稍后检查进度。'));},action==='prepare'?1800000:120000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data?.error?reject(Error(e.data.error)):resolve(e.data);};worker.postMessage({action,...extra},[channel.port2]);});}
async function check(deep=false){try{paint(await call('status',{deep}));}catch(err){message(err.message,true);}}
async function download(selection){if(busy)return;busy=true;enable(true);try{const s=await call('prepare',{selection});paint(s);if(s.paused)message('已暂停，已保存的内容保留。再次选择保存即可继续。');else if(selection!=='all'&&!s.allAudioReady)message('所选内容已保存。可继续下载其他单元，或断网检查这些内容。');}catch(err){message(err.message,true);}finally{busy=false;enable(true);}}
function updateNotice(){if(!registration.waiting||!$('update-box'))return;$('update-box').hidden=false;$('apply-update').textContent='查看切换方法';$('apply-update').onclick=()=>{message('先导出记录，结束活动并关闭这个网址的所有页面，再从主屏幕或书签重新打开，新版会自动接续。');};}
async function init(){
 if(!isSecureContext||!('serviceWorker' in navigator)){message('当前是本地 Wi-Fi 试用入口，保持电脑与本地服务运行即可游玩。手机离线安装需要后续确定的 HTTPS 正式入口。');if($('offline-detail'))$('offline-detail').textContent='本地试用不消耗发布额度。记录可以正常导出；当前入口无法准备手机离线缓存。';return;}
 navigator.serviceWorker.addEventListener('message',e=>{if(!e.data?.gardenOffline)return;const s=e.data;if(s.type==='progress'){if(e.source===worker||!worker){busy=true;enable(true);paint(s);}}else if(s.type==='ready'||s.type==='paused'){if(e.source===worker||!worker){busy=false;enable(true);paint(s);if(s.type==='paused')message('已暂停，已保存部分保留。');}}else if(s.type==='error'){busy=false;enable(!!worker);message(s.message,true);}else if(s.type==='activated'){worker=registration?.active;check();}});
 try{
  registration=await navigator.serviceWorker.register(new URL('sw.js',root).href,{scope:root.pathname,updateViaCache:'none'});updateNotice();registration.addEventListener('updatefound',()=>{registration.installing?.addEventListener('statechange',updateNotice);});
  const ready=await navigator.serviceWorker.ready;worker=ready.active;enable(true);
  if($('offline-status'))await check();
  if($('download-all'))$('download-all').onclick=()=>download('all');if($('download-selected'))$('download-selected').onclick=()=>download($('download-selection').value);
  if($('pause-download'))$('pause-download').onclick=async()=>{try{await call('pause');}catch(err){message(err.message,true);}};
  if($('verify-offline'))$('verify-offline').onclick=async()=>{busy=true;enable(true);message('正在检查已保存文件，请稍候。');await check(true);busy=false;enable(true);};
 }catch(err){message('离线准备未完成：'+err.message+'。联网后重新打开即可继续。',true);}
}
init();
