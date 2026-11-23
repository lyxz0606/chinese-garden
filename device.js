import {warmAudio,playPrepared,stopAudio} from './audio-player.js';
const $=id=>document.getElementById(id),audio=$('sample-audio');
let clips={},played=new Set(),active=null,ticket=0;
function workerStatus(worker){return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('检查响应较慢，请稍后重试。'));},120000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data?.error?reject(Error(e.data.error)):resolve(e.data);};worker.postMessage({action:'status',deep:true},[channel.port2]);});}
async function check(){
  $('recheck').disabled=true;
  const secure=isSecureContext&&'serviceWorker' in navigator,standalone=!!navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  const lines=[secure?'此入口支持准备离线内容。':'当前入口只供联网试用，需要电脑保持开机。',standalone?'当前从主屏幕应用打开。':'当前在浏览器中打开；苹果设备安装后请从主屏幕图标进入。'];
  $('device-status').textContent='正在核对这台设备保存的内容……';$('device-detail').textContent='';
  try{
    if(!secure){$('device-status').textContent='当前是局域网试用入口，尚不能在手机断网使用。';lines.push('确定 HTTPS 入口后，再完成主屏幕安装。');}
    else{
      const registration=await navigator.serviceWorker.getRegistration(new URL('./',location.href).href),worker=registration?.active;
      if(!worker){$('device-status').textContent='离线内容尚未就绪，请先去家长页保存课程。';}
      else{
        const s=await workerStatus(worker);lines.push(`已保存 ${s.done} / ${s.total} 个文件。`);
        $('device-status').textContent=s.allAudioReady?'课程与声音已保存完整。下一步请实际断网重开检查。':'声音尚未全部保存，请先去家长页补齐。';
        $('device-detail').textContent=`内容版本 ${s.version} · 当前检查不会修改学习记录。`;
        if(registration.waiting)lines.push('已有新版等待切换。结束活动，关闭这个网址的所有页面，再重新打开。');
      }
    }
  }catch(err){$('device-status').textContent='检查暂未完成：'+err.message;}
  $('device-checks').replaceChildren(...lines.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));$('recheck').disabled=false;
}
function stop(){ticket++;active=null;stopAudio(audio);}
$('recheck').onclick=check;$('stop-sample').onclick=()=>{stop();$('sound-message').textContent='声音已停止。';};
$('sound-checks').onclick=async e=>{
  const id=e.target.closest('[data-sound]')?.dataset.sound,clip=clips[id];if(!clip)return;
  stop();const serial=ticket;active=id;
  $('sound-message').textContent='正在准备声音：'+clip.label;
  try{await playPrepared(audio,clip.file);if(serial===ticket)$('sound-message').textContent='正在播放：'+clip.label;}catch(err){if(serial===ticket&&err.name!=='AbortError')$('sound-message').textContent='声音未能播放，请检查设备音量，并先补齐离线内容。';}
};
audio.addEventListener('ended',()=>{if(!active)return;played.add(active);$('sound-message').textContent=clips[active].label+'已播放结束。如果没有听见，请检查设备音量和耳机。';$('sound-results').textContent='已完整播放：'+[...played].map(id=>clips[id].label).join('、')+'。这些结果只表示播放完成，不代替人工听音。';active=null;});
audio.addEventListener('error',()=>{if(active)$('sound-message').textContent='声音文件暂时不可用，请返回家长页补齐离线内容。';});
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
async function load(){try{
  const get=async url=>{const response=await fetch(url);if(!response.ok)throw Error('课程未能加载');return response.json();};
  const [reader,pinyin]=await Promise.all([get('reader-audio/index.json'),get('pinyin/course-data.json')]);
  const first=reader.items.find(i=>i.text==='花')||reader.items.find(i=>i.text.length===1);
  clips={reader:{label:'识字“'+first.text+'”',file:'reader-audio/'+first.file},ong:{label:'拼音 ong',file:'pinyin/'+pinyin.foundations.find(i=>i.id==='final-ong').audio.file},bin:{label:'完整音节 bīn',file:'pinyin/'+pinyin.syllables.find(i=>i.id==='sy-bin1').audio.file}};
  warmAudio(Object.values(clips).map(clip=>clip.file),audio);
  for(const button of document.querySelectorAll('[data-sound]')){button.disabled=false;button.textContent=clips[button.dataset.sound].label;}
  $('sound-message').textContent='点一个按钮，听听声音是否正常。';
}catch(err){$('sound-message').textContent=err.message+'，请先联网打开或保存完整内容。';}}
check();load();
