export const LITERACY_KEY='chinese-garden-literacy-v2';
export const RECORD_FORMAT='family-chinese-garden-complete';
export const MODES=['cards','listen','words','sentences','stories','sequence'];
export const LEVELS=['guided','independent','apply'];
export const hanzi=text=>[...new Set(String(text).match(/[\u3400-\u9fff]/gu)||[])];
const learningDay=at=>new Date(Date.parse(at)+8*3600000).toISOString().slice(0,10);
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function taskPieces(entry,mode,level){return mode==='sequence'?entry.lines:level==='apply'?[...entry.text.replace(/[\s，。！？、；：“”「」,.!?;:]/g,'')]:entry.chunks;}
export function shuffle(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function catalogFrom(raw){
  const characters=[],sentences=[],stories=[],units=raw.units.map((u,i)=>{
    const unit={...u,id:String(u.id),number:i+1,stage:Math.floor(i/10)+1};
    unit.characters=u.characters.map(c=>({...c,id:c.char,unit:unit.id,number:i+1,words:c.words.map(String)}));
    unit.sentences=u.sentences.map((s,j)=>({...s,id:`${unit.id}:s${j+1}`,unit:unit.id,number:i+1,chunks:s.chunks?.length?s.chunks:[...s.text.replace(/[\s，。！？、；：“”「」,.!?;:]/g,'')]}));
    unit.stories=u.stories.map((s,j)=>({...s,id:`${unit.id}:r${j+1}`,unit:unit.id,number:i+1}));
    characters.push(...unit.characters);sentences.push(...unit.sentences);stories.push(...unit.stories);return unit;
  });
  if(new Set(characters.map(c=>c.char)).size!==characters.length)throw Error('字库有重复目标字，请先检查内容。');
  return {units,characters,sentences,stories,charMap:new Map(characters.map(c=>[c.char,c])),sentenceMap:new Map(sentences.map(s=>[s.id,s])),storyMap:new Map(stories.map(s=>[s.id,s])),unitMap:new Map(units.map(u=>[u.id,u]))};
}
export function emptyLiteracy(){return {schema:2,settings:{weekly:30,rounds:5,level:'guided',materials:'stage',voice:'',rate:.8},events:[],baseline:[],cycle:null,pending:null,lastUnit:null};}
export function recordEvent(state,{kind,item,result,help=false,now=new Date().toISOString(),id=uid()}){
  if(state.events.some(e=>e.id===id))return state;
  return {...state,events:[...state.events,{id,kind,item,result:help&&result==='independent'?'assisted':result,at:now}]};
}
export function stats(state){
  const chars=new Map(),activities=new Map();
  for(const e of [...state.events].sort((a,b)=>a.at.localeCompare(b.at))){
    if(e.kind==='exposure'||e.kind==='cards'){
      const c=chars.get(e.item)||{char:e.item,first:e.at,last:e.at,result:null,independent:0,help:0,dates:[]};
      c.first=c.first<e.at?c.first:e.at;
      if(e.kind==='cards'){c.last=e.at;c.result=e.result;c.independent+=Number(e.result==='independent');c.help+=Number(e.result!=='independent');const day=learningDay(e.at);if(e.result==='independent'&&!c.dates.includes(day))c.dates.push(day);}
      chars.set(e.item,c);
    } else {
      const key=`${e.kind}:${e.item}`,r=activities.get(key)||{kind:e.kind,item:e.item,count:0,independent:0,last:e.at,result:e.result};
      r.count++;r.independent+=Number(e.result==='independent');r.last=e.at;r.result=e.result;activities.set(key,r);
    }
  }
  return {chars,activities,recognized:new Set([...state.baseline,...[...chars.values()].filter(c=>c.result==='independent').map(c=>c.char)]),stable:[...chars.values()].filter(c=>c.result==='independent'&&c.dates.length>=2).map(c=>c.char)};
}
export function newCycle(state,catalog,now=new Date().toISOString()){
  const report=stats(state),ids=catalog.characters.filter(c=>!state.baseline.includes(c.char)&&!report.chars.has(c.char)).slice(0,state.settings.weekly).map(c=>c.char);
  return {...state,cycle:{id:uid(),startedAt:now,ids},pending:null};
}
export function adjustCycle(state,catalog){
  if(!state.cycle)return newCycle(state,catalog);
  const report=stats(state),visited=state.cycle.ids.filter(id=>report.chars.has(id)&&!state.baseline.includes(id));
  const untouched=state.cycle.ids.filter(id=>!report.chars.has(id)&&!state.baseline.includes(id));
  const supplements=catalog.characters.map(c=>c.char).filter(id=>!state.baseline.includes(id)&&!report.chars.has(id)&&!state.cycle.ids.includes(id));
  return {...state,cycle:{...state.cycle,ids:[...visited,...untouched,...supplements].slice(0,Math.max(state.settings.weekly,visited.length))}};
}
export function dueCharacters(state,catalog,now=Date.now()){
  const report=stats(state);
  return [...report.chars.values()].filter(c=>catalog.charMap.has(c.char)).map(c=>{
    const days=(now-Date.parse(c.last))/86400000;
    return {...c,priority:c.result!=='independent'?100+days:days/(c.dates.length>=2?7:2)};
  }).sort((a,b)=>b.priority-a.priority).map(c=>c.char);
}
export function availableItems(state,catalog,mode,scope){
  let chars;
  if(scope==='review')chars=dueCharacters(state,catalog);
  else if(scope==='cycle')chars=state.cycle?.ids||[];
  else chars=catalog.unitMap.get(scope)?.characters.map(c=>c.char)||[];
  if(['cards','listen','words'].includes(mode))return chars;
  let unitIds=new Set(chars.map(c=>catalog.charMap.get(c)?.unit));
  if(scope!=='cycle'&&scope!=='review')unitIds=new Set([scope]);
  const pool=(mode==='sentences'?catalog.sentences:catalog.stories).filter(s=>unitIds.has(s.unit));
  const eligible=pool.filter(s=>mode!=='sequence'||s.lines.length>1);
  if(state.settings.materials!=='all'){
    const known=stats(state).recognized;
    const closed=eligible.filter(s=>Number(s.firstIndependentUnit||Infinity)<=s.number||hanzi(mode==='sentences'?s.text:s.lines.join('')).every(c=>known.has(c)));
    return closed.map(s=>s.id);
  }
  return eligible.map(s=>s.id);
}
export function makePractice(state,catalog,mode,scope,random=Math.random){
  const pool=availableItems(state,catalog,mode,scope),recent=new Map();
  const recordMode=mode==='cards'&&state.settings.level==='apply'?'words':mode;
  for(const e of state.events)if(e.kind===recordMode)recent.set(e.item,e.at);
  const ids=scope==='review'&&['cards','listen','words'].includes(mode)?pool:shuffle(pool,random).sort((a,b)=>(recent.get(a)||'').localeCompare(recent.get(b)||''));
  return {id:uid(),mode,scope,level:state.settings.level,ids:ids.slice(0,state.settings.rounds),index:0,completed:[],current:null};
}
export function makeTask(practice,catalog,state,random=Math.random){
  const id=practice.ids[practice.index],mode=practice.mode,level=practice.level;
  const entry=['cards','listen','words'].includes(mode)?catalog.charMap.get(id):mode==='sentences'?catalog.sentenceMap.get(id):catalog.storyMap.get(id);
  if(!entry)throw Error('这项内容没有找到，请重新选择活动。');
  const count=level==='guided'?2:level==='apply'?4:3;
  const task={id,help:level==='guided',revealed:false,solved:false,wrong:0,heard:false,message:'',selected:[],options:[],variant:entry.words?Math.floor(random()*entry.words.length):0};
  if(['listen','words'].includes(mode)){
    const candidates=shuffle(catalog.unitMap.get(entry.unit).characters.map(c=>c.char).filter(c=>c!==id),random);
    task.options=shuffle([id,...candidates.slice(0,count-1)],random);
    task.variant=Math.floor(random()*entry.words.length);
  }
  if(['sentences','sequence'].includes(mode)){
    const chunks=taskPieces(entry,mode,level);
    task.options=shuffle(chunks.map((_,i)=>i),random);
    if(chunks.length>1&&task.options.every((n,i)=>n===i))task.options.push(task.options.shift());
  }
  if(mode==='stories')task.options=shuffle(entry.options.map((_,i)=>i),random);
  return task;
}
const goodDate=v=>typeof v==='string'&&v.length<40&&Number.isFinite(Date.parse(v));
export function validateLiteracy(raw,catalog){
  if(!raw||raw.schema!==2||!Array.isArray(raw.events)||raw.events.length>60000||!Array.isArray(raw.baseline))throw Error('识字记录的格式或大小不正确。');
  const state=emptyLiteracy();
  state.settings={weekly:[25,30,35].includes(raw.settings?.weekly)?raw.settings.weekly:30,rounds:[3,5,8,12].includes(raw.settings?.rounds)?raw.settings.rounds:5,level:LEVELS.includes(raw.settings?.level)?raw.settings.level:'guided',materials:raw.settings?.materials==='all'?'all':'stage',voice:typeof raw.settings?.voice==='string'?raw.settings.voice.slice(0,250):'',rate:[.65,.8,1].includes(raw.settings?.rate)?raw.settings.rate:.8};
  state.baseline=[...new Set(raw.baseline.filter(c=>catalog.charMap.has(c)))];
  state.lastUnit=catalog.unitMap.has(raw.lastUnit)?raw.lastUnit:null;
  const ids=new Set();
  state.events=raw.events.map(e=>{
    const exists=['cards','listen','words','exposure'].includes(e?.kind)?catalog.charMap.has(e.item):e?.kind==='sentences'?catalog.sentenceMap.has(e.item):['stories','sequence'].includes(e?.kind)&&catalog.storyMap.has(e.item);
    if(!e||!exists||typeof e.id!=='string'||e.id.length>100||!goodDate(e.at)||!['independent','assisted','later','seen'].includes(e.result)||ids.has(e.id))throw Error('识字记录含有无法识别或重复的活动。');
    ids.add(e.id);return {id:e.id,kind:e.kind,item:e.item,result:e.result,at:e.at};
  });
  if(raw.cycle&&typeof raw.cycle.id==='string'&&goodDate(raw.cycle.startedAt)&&Array.isArray(raw.cycle.ids))state.cycle={id:raw.cycle.id.slice(0,100),startedAt:raw.cycle.startedAt,ids:[...new Set(raw.cycle.ids.filter(c=>catalog.charMap.has(c)))].slice(0,40)};
  // Pending tasks are validated against the current catalogue; imported records never resume an unchecked task.
  return state;
}
export function restorePending(raw,catalog){
  if(!raw||!MODES.includes(raw.mode)||!LEVELS.includes(raw.level)||!Array.isArray(raw.ids)||raw.ids.length>12||!Number.isInteger(raw.index)||raw.index<0||raw.index>=raw.ids.length)return null;
  const exists=id=>['cards','listen','words'].includes(raw.mode)?catalog.charMap.has(id):raw.mode==='sentences'?catalog.sentenceMap.has(id):catalog.storyMap.has(id);
  if(!raw.ids.every(exists)||typeof raw.id!=='string'||!Array.isArray(raw.completed)||raw.completed.length!==raw.index)return null;
  // An interrupted round resumes with help recorded conservatively, so a refresh cannot erase an earlier cue.
  return {id:raw.id.slice(0,100),mode:raw.mode,scope:String(raw.scope).slice(0,100),level:raw.level,ids:raw.ids,index:raw.index,completed:raw.completed.filter(v=>['independent','assisted','later'].includes(v)),current:null,resumed:true};
}
export function mergeLiteracy(current,raw,catalog){
  const incoming=validateLiteracy(raw,catalog),events=new Map(current.events.map(e=>[e.id,e]));
  for(const e of incoming.events){if(events.has(e.id)&&JSON.stringify(events.get(e.id))!==JSON.stringify(e))throw Error('同一条识字记录存在不同内容，未合并。');events.set(e.id,e);}
  if(events.size>60000)throw Error('合并后的记录过大，原记录保留。请先保存两份备份。');
  return {...current,baseline:[...new Set([...current.baseline,...incoming.baseline])],events:[...events.values()].sort((a,b)=>a.at.localeCompare(b.at)),cycle:current.cycle||incoming.cycle,pending:null};
}
