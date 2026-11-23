// Prepare visible sounds silently. Keep original URLs for Safari compatibility;
// the service worker saves full files and serves media byte ranges locally.
const ready=new Set(),pending=new Set();
let queue=[],visible=[];
const absolute=file=>new URL(file,globalThis.document?.baseURI||import.meta.url).href;
function pump(){
  while(pending.size<2&&queue.length){
    const file=queue.shift();if(ready.has(file)||pending.has(file))continue;
    pending.add(file);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    fetch(file,{credentials:'same-origin',signal:controller.signal}).then(async response=>{
      if(!response.ok||response.status===206)throw Error('Incomplete sound');
      // Consume the response so worker/browser saving can finish.
      await response.arrayBuffer();ready.add(file);
      if(ready.size>16)ready.delete(ready.values().next().value);
    }).catch(()=>{/* Playback retains its ordinary URL and error handling. */})
      .finally(()=>{clearTimeout(timer);pending.delete(file);pump();});
  }
}
export function warmAudio(files=[],player){
  visible=[...new Set(files.filter(Boolean).map(absolute))].filter(file=>{
    const url=new URL(file);return url.origin===new URL(import.meta.url).origin&&/\.(mp3|wav|m4a|ogg)$/i.test(url.pathname);
  }).slice(0,8);
  queue=visible.filter(file=>!ready.has(file)&&!pending.has(file));pump();
  // Also prime the native media pipeline for the first/current task sound.
  // Some WebKit ports do not route native media requests through the worker.
  // Never interrupt playback or count preparation as listening.
  if(player?.paused&&visible[0]&&player.src!==visible[0]){
    player.preload='auto';player.src=visible[0];player.load();
  }
}
// On the first visit, prepare again once requests can use the offline cache.
globalThis.navigator?.serviceWorker?.addEventListener('controllerchange',()=>{ready.clear();warmAudio(visible);});
export function stopAudio(player){
  player.pause();
  // Retain the source instead of aborting and reloading it for every tap.
  try{player.currentTime=0;}catch{/* Metadata may not be available yet. */}
}
export function playPrepared(player,file,rate=1){
  const url=absolute(file);
  player.preload='auto';
  if(player.src!==url)player.src=url;
  else if(player.error)player.load();
  player.playbackRate=rate;player.preservesPitch=true;player.webkitPreservesPitch=true;
  // Keep play() inside the user's tap: awaiting fetch first loses iOS activation.
  return player.play();
}
