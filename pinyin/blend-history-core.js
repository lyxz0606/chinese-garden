export const RECORD_VERSION='pinyin-blend-practice-1';
export const RECORD_KEY='chinese-pinyin-blend-practice-v1';
export function shuffle(items,random=Math.random){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
export function eligible(items,group,type='all'){return items.filter(i=>i.earliestGroup<=group&&i.wholeAudio&&(type==='all'||i.mode===type));}
export function oneDifference(a,b){if(a.parts.length!==b.parts.length)return -1;const differences=a.parts.map((p,i)=>p!==b.parts[i]?i:-1).filter(i=>i>=0);return differences.length===1?differences[0]:-1;}
export function changePairs(items){const pairs=[];for(const from of items)for(const to of items){const changed=oneDifference(from,to);if(changed>=0)pairs.push({id:from.id+'>'+to.id,fromId:from.id,toId:to.id,changed});}return pairs;}
export function selectRound(pool,count,recent=[],random=Math.random){const ordered=shuffle(pool,random).sort((a,b)=>Number(recent.includes(a.id))-Number(recent.includes(b.id)));return ordered.slice(0,Math.min(count,ordered.length));}
export function choicesFor(item,index,items,random=Math.random){const correct=item.parts[index],others=[...new Set(items.filter(i=>i.parts.length===item.parts.length).map(i=>i.parts[index]))].filter(p=>p!==correct);return shuffle([correct,...shuffle(others,random).slice(0,2)],random);}
export function oralOutcome(observation,helped){if(observation==='unobserved')return 'unobserved';if(observation==='together')return 'together';if(observation==='read')return helped?'after-help':'independent';throw Error('请选择本次观察结果。');}
export function emptyRecords(){return {version:RECORD_VERSION,events:[],recent:[]};}
export function validateRecords(raw,knownIds){
 if(!raw||raw.version!==RECORD_VERSION||!Array.isArray(raw.events)||raw.events.length>10000)throw Error('这不是本版拼读练习的记录文件。');
 const ids=new Set(knownIds),seen=new Set();
 const events=raw.events.map(e=>{
  if(!e||typeof e.id!=='string'||e.id.length>100||!e.id||seen.has(e.id)||!ids.has(e.targetId)||!['train','change'].includes(e.game)||!['independent','after-help','together','unobserved'].includes(e.oral)||typeof e.helped!=='boolean'||!['guided','try'].includes(e.mode)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))throw Error('记录内容不完整，已保留当前记录。');
  if(e.oral==='independent'&&(e.helped||e.mode==='guided'))throw Error('记录中的帮助状态与口读结果不一致。');
  seen.add(e.id);return {id:e.id,targetId:e.targetId,game:e.game,mode:e.mode,helped:e.helped,oral:e.oral,at:e.at};
 });
 return {version:RECORD_VERSION,events,recent:Array.isArray(raw.recent)?raw.recent.filter(id=>typeof id==='string'&&id.length<120).slice(-30):[]};
}
export function mergeRecords(current,incoming,knownIds){const a=validateRecords(current,knownIds),b=validateRecords(incoming,knownIds),merged=new Map(a.events.map(e=>[e.id,e]));for(const e of b.events){if(merged.has(e.id)&&JSON.stringify(merged.get(e.id))!==JSON.stringify(e))throw Error('同一条记录的内容不同，已保留当前记录，请核对备份。');merged.set(e.id,e);}if(merged.size>10000)throw Error('合并后的记录过多，请保留导出的备份。');return {version:RECORD_VERSION,events:[...merged.values()].sort((x,y)=>Date.parse(x.at)-Date.parse(y.at)),recent:[...new Set([...a.recent,...b.recent,...[...merged.values()].sort((x,y)=>Date.parse(x.at)-Date.parse(y.at)).map(e=>e.targetId)].reverse())].reverse().slice(-30)};}
