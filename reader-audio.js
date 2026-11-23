import {warmAudio,playPrepared,stopAudio} from './audio-player.js';
let files=new Map(),contextFiles=new Map(),loaded=false;
export const readerReady=fetch(new URL('./reader-audio/index.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('声音清单未载入');return r.json();}).then(data=>{
  if(!data.complete)throw Error('声音清单不完整');
  const defaults=new Map(),contexts=new Map();
  for(const item of data.items){
    const record={...item,url:new URL('./reader-audio/'+item.file,import.meta.url).href};
    if(!item.contextVariant){
      if(defaults.has(item.text))throw Error('同一文字有多个默认录音');
      defaults.set(item.text,record);
    }
    for(const context of item.contexts||[]){
      const key=JSON.stringify([context,item.text]);
      if(contexts.has(key))throw Error('同一语境有多个录音');
      contexts.set(key,record);
    }
  }
  for(const item of data.items){if(item.contextVariant&&!defaults.has(item.text))throw Error('语境录音缺少默认文字');}
  files=defaults;contextFiles=contexts;loaded=true;return data;
}).catch(()=>null);
export class ReaderAudio {
  constructor(notify,status,onFailure){this.notify=notify;this.status=status;this.onFailure=onFailure;this.token=0;this.recording=new Audio();}
  voices(){return [];}
  stop(){this.token++;stopAudio(this.recording);this.status?.(false);}
  playFile(file,settings={}){
    this.stop();const token=this.token,player=this.recording;
    player.onended=()=>{if(token===this.token)this.status?.(false);};
    let failedOnce=false;
    const failed=()=>{if(token===this.token&&!failedOnce){failedOnce=true;this.status?.(false);this.onFailure?.();this.notify('这段声音没有加载成功。联网后可在家长页补下载对应单元；现在可以先由家长示范。');}};
    player.onerror=failed;
    playPrepared(player,file,Math.max(.75,Math.min(1.25,(settings.rate||.8)/.8)))
      .then(()=>{if(token===this.token&&!failedOnce)this.status?.(true);}).catch(failed);
    return true;
  }
  prepare(items=[]){
    const selected=[...items];
    readerReady.then(()=>warmAudio(selected.map(item=>{
      const value=String(item.text??item).trim();
      return (contextFiles.get(JSON.stringify([item.context||'',value]))||files.get(value))?.url;
    }),this.recording));
  }
  speak(text,settings={}){
    const value=String(text).trim();
    const record=contextFiles.get(JSON.stringify([settings.context||'',value]))||files.get(value);
    if(record)return this.playFile(record.url,settings);
    this.stop();this.notify(loaded?'没有找到这段课程录音，请由家长先示范，并反馈具体文字。':'声音清单还未载入，请稍后再点，或联网重新打开。');return false;
  }
}
