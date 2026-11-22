// Pure task selection and family observation records. No automatic speech scoring.
import {groupProgress,complexityPool,hasIndependentOral} from './course-learning.js';
export const VERSION = 'pinyin-course-records-1';
export const RECORD_KEY = 'chinese-pinyin-course-v1';
export const SETTINGS_KEY = RECORD_KEY + '-settings';
export const GAMES = ['mail','tone','train','change','repair','object','list','sentence','story','teacher'];
export const SKILLS = {mail:'listening',tone:'tone',train:'blending',change:'transfer',repair:'spelling',object:'meaning',list:'application',sentence:'sentence',story:'reading',teacher:'oral'};
export function shuffle(values, random = Math.random) {
  const a = [...values]; for (let i=a.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}
export function defaults() {return {group:1, mode:'guided', length:3, scope:'mixed', parts:'all'};}
export function validSettings(raw) {
  const s={...defaults(),...raw};
  if (!Number.isInteger(s.group)||s.group<1||s.group>20||!['guided','try','apply'].includes(s.mode)||![3,5,7].includes(s.length)||!['mixed','current','review'].includes(s.scope)||!['all','two-part','three-part'].includes(s.parts)) return defaults();
  return {group:s.group,mode:s.mode,length:s.length,scope:s.scope,parts:s.parts};
}
export function targetIndex(data) {
  return new Map(['foundations','toneCards','syllables','words','sentences','readings','repairs'].flatMap(k=>data[k]).map(x=>[x.id,x]));
}
export function trainSlots(target, syllables) {
  // A missing part needs a genuine alternative within the learned syllables.
  // Keep all other parts fixed so every choice can form a valid learned syllable.
  return target.parts.map((answer,missing)=>({missing,answer,alternatives:[...new Set(syllables
    .filter(x=>x.parts.length===target.parts.length&&x.parts[missing]!==answer&&x.parts.every((p,i)=>i===missing||p===target.parts[i]))
    .map(x=>x.parts[missing]))]})).filter(slot=>slot.alternatives.length);
}
export function listeningChoices(data,group,target,mode='try') {
  const source=target.kind?data.foundations.filter(x=>x.kind===target.kind):data.syllables.filter(x=>x.tone!==5);
  const plain=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const score=x=>Number(plain(x.label)===plain(target.label))*8+Number(x.parts?.[0]===target.parts?.[0])*2+Number(x.tone===target.tone);
  const choices=source.filter(x=>x.groupNumber<=group&&x.label!==target.label);
  return mode==='try'?shuffle(choices):choices.sort((a,b)=>mode==='apply'?score(b)-score(a):score(a)-score(b));
}
export function mixedChunkOrder(chunks,random=Math.random) {
  const order=shuffle(chunks.map((_,i)=>i),random),text=a=>a.map(i=>chunks[i].text).join('|');
  if(text(order)===text(chunks.map((_,i)=>i))){
    const different=order.findIndex(i=>chunks[i].text!==chunks[order[0]].text);
    if(different>0)[order[0],order[different]]=[order[different],order[0]];
  }
  return order;
}
export function shoppingChoices(target,words,mode,random=Math.random) {
  const other=uniquePictures(words.filter(w=>w.picture&&!samePictureMeaning(w,target)),random);
  const same=other.filter(w=>w.picture.scene===target.picture.scene),rest=other.filter(w=>w.picture.scene!==target.picture.scene);
  const count=Math.min(mode==='guided'?2:mode==='try'?3:4,other.length);
  const targets=[target,...[...same,...rest].slice(0,Math.max(0,count-1))],icons=new Set(targets.map(w=>w.picture.icon));
  return {targets,choices:shuffle([...targets,...other.filter(w=>!icons.has(w.picture.icon)).slice(0,2)],random)};
}
function baseTaskPool(data, settings, game) {
  const {group,parts}=settings, allowed=x=>x.groupNumber<=group;
  const basic=data.foundations.filter(allowed), sy=data.syllables.filter(x=>allowed(x)&&x.tone!==5), words=data.words.filter(allowed);
  const make=(x,kind)=>({id:game+':'+x.id,targetId:x.id,groupNumber:x.groupNumber,kind});
  if(game==='mail') return [...basic,...sy].filter(x=>x.audio&&!x.qualityHold&&listeningChoices(data,group,x).length).map(x=>make(x,'sound'));
  if(game==='tone') {
    const cards=data.toneCards.filter(allowed).filter(x=>x.audio),labels=new Set(cards.map(x=>x.label));
    return [...cards,...sy.filter(x=>x.tone<5&&!labels.has(x.label))].filter(x=>x.audio&&!x.qualityHold).map(x=>make(x,'tone'));
  }
  if(game==='teacher') return [...basic,...sy.filter(x=>!x.qualityHold),...words.filter(w=>!(w.syllables.length===1&&w.syllables[0].endsWith('5')))].map(x=>make(x,'oral'));
  if(game==='repair') return data.repairs.filter(allowed).map(x=>make(x,'repair'));
  if(game==='object'||game==='list') return new Set(words.filter(x=>x.picture).map(x=>x.picture.icon)).size>=2?words.filter(x=>x.picture).map(x=>make(x,game)):[];
  if(game==='sentence') return data.sentences.filter(x=>allowed(x)&&!x.activityRetired&&new Set(x.chunks.map(c=>c.text)).size>1).map(x=>make(x,'sentence'));
  if(game==='story') return data.readings.filter(allowed).map(x=>make(x,'story'));
  const blends=sy.filter(x=>['two-part','three-part'].includes(x.mode)&&(parts==='all'||x.mode===parts));
  if(game==='train') return blends.filter(x=>x.audio&&!x.qualityHold&&trainSlots(x,sy).length).map(x=>make(x,'train'));
  if(game==='change') {
    const buckets=new Map();
    for(const x of blends) for(let i=0;i<x.parts.length;i++) {
      const key=x.parts.map((p,j)=>i===j?'?':p).join('|');
      if(!buckets.has(key)) buckets.set(key,[]); buckets.get(key).push({x,i});
    }
    const result=[];
    for(const bucket of buckets.values()) for(const {x,i} of bucket) {
      // Up to three genuine alternative starting syllables per target and position.
      for(const {x:from} of bucket.filter(v=>v.x.parts[i]!==x.parts[i]).slice(0,3))
        result.push({...make(x,'change'),id:'change:'+from.id+'>'+x.id,fromId:from.id,changed:i,groupNumber:Math.max(from.groupNumber,x.groupNumber)});
    }
    return result;
  }
  return [];
}
export function taskPool(data,settings,game){return complexityPool(baseTaskPool(data,settings,game),settings,targetIndex(data),game);}
export function emptyRecords() {return {version:VERSION,events:[],recent:[]};}
export function dateKey(at) {const d=new Date(at);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
const ORAL=['independent','after-help','together','unobserved'];
const RESULTS=['independent','after-help','together','unobserved'];
// Corrected prerequisites apply to new questions while older observations remain readable.
export const recordGroupAllowed=(target,group)=>group>=Math.min(target.groupNumber,target.previousEarliestGroupNumber??target.groupNumber);
export function validateRecords(raw, index) {
  if(!raw||raw.version!==VERSION||!Array.isArray(raw.events)||raw.events.length>30000||!Array.isArray(raw.recent)||raw.recent.length>120) throw Error('这不是本版拼音记录，或记录结构不完整。');
  const ids=new Set();
  const events=raw.events.map(e=>{
    if(!e||typeof e.id!=='string'||!e.id||e.id.length>120||ids.has(e.id)||!GAMES.includes(e.game)||e.skill!==SKILLS[e.game]||!index.has(e.targetId)||!Array.isArray(e.targets)||!e.targets.length||e.targets.length>5||e.targets.some(id=>!index.has(id))||!e.targets.includes(e.targetId)||new Set(e.targets).size!==e.targets.length||!Number.isInteger(e.group)||e.group<1||e.group>20||e.targets.some(id=>!recordGroupAllowed(index.get(id),e.group))||!['guided','try','apply'].includes(e.mode)||typeof e.helped!=='boolean'||!ORAL.includes(e.oral)||!RESULTS.includes(e.result)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||typeof e.session!=='string'||!e.session||e.session.length>100||typeof e.variant!=='string'||e.variant.length>500||typeof e.taskId!=='string'||e.taskId.length>250) throw Error('记录含有不能识别的任务或学习表现，未导入。');
    if((e.oral==='independent'||e.result==='independent')&&(e.helped||e.mode==='guided')) throw Error('有帮助的练习不能记为独立完成。');
    ids.add(e.id);
    const extra={};
    if(e.contextKey!==undefined){if(typeof e.contextKey!=='string'||e.contextKey.length>500)throw Error('任务语境记录格式有误。');extra.contextKey=e.contextKey;}
    if(e.fromId!==undefined){if(e.game!=='change'||!index.has(e.fromId)||!recordGroupAllowed(index.get(e.fromId),e.group))throw Error('换音来源记录格式有误。');extra.fromId=e.fromId;}
    if(e.novel!==undefined){if(e.game!=='change'||typeof e.novel!=='boolean')throw Error('新组合观察记录格式有误。');extra.novel=e.novel;}
    if(e.usage!==undefined){if(!ORAL.includes(e.usage))throw Error('应用观察记录格式有误。');extra.usage=e.usage;}
    return {id:e.id,game:e.game,skill:e.skill,targetId:e.targetId,targets:[...e.targets],taskId:e.taskId,group:e.group,mode:e.mode,helped:e.helped,oral:e.oral,result:e.result,at:e.at,session:e.session,variant:e.variant,...extra};
  });
  if(raw.recent.some(x=>typeof x!=='string'||x.length>250))throw Error('最近练习记录格式有误。');
  return {version:VERSION,events, recent:raw.recent.slice(-60)};
}
export function mergeRecords(left,right,index) {
  const a=validateRecords(left,index),b=validateRecords(right,index),map=new Map(a.events.map(e=>[e.id,e]));
  const previousSize=map.size;
  for(const e of b.events) {if(map.has(e.id)&&JSON.stringify(map.get(e.id))!==JSON.stringify(e))throw Error('同一条记录存在不同内容，原记录已保留。');map.set(e.id,e);}
  if(map.size===previousSize)return a;
  const recent=[...new Set([...a.recent,...b.recent].reverse())].reverse().slice(-60);
  return validateRecords({version:VERSION,events:[...map.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),recent},index);
}
export function evidence(events, targetId, skill, now=Date.now()) {
  const relevant=events.filter(e=>e.targets.includes(targetId)&&e.skill===skill).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const value=e=>['blending','transfer','oral'].includes(skill)?e.oral:
    ['meaning','application','sentence','reading'].includes(skill)&&e.result==='independent'?
      (e.oral==='independent'?'independent':e.oral==='unobserved'?'unobserved':'after-help'):e.result;
  const observed=relevant.filter(e=>value(e)!=='unobserved');
  const passed=observed.filter(e=>value(e)==='independent');
  const last=observed[observed.length-1], days=new Set(passed.map(e=>dateKey(e.at)));
  const stable=days.size>=2&&(!last||value(last)==='independent');
  const lastPass=passed[passed.length-1],lastValue=last?value(last):null;
  const needs=!!last&&lastValue!=='independent'&&lastValue!=='unobserved';
  const interval=stable?Math.min(14,days.size>=4?14:7):passed.length?2:1;
  const due=!!last&&(needs||now-Date.parse(lastPass?.at||last.at)>=interval*86400000);
  return {attempts:observed.length,independent:passed.length,days:days.size,stable,needs,due,lastAt:last?.at||null};
}
export function eligibleTasks(pool,records,settings,game,now=Date.now()){
  let candidates=pool;
  if(settings.scope==='current')candidates=candidates.filter(t=>t.groupNumber===settings.group);
  if(settings.scope==='review')candidates=candidates.filter(t=>evidence(records.events,t.targetId,SKILLS[game],now).due);
  if(game==='change'&&settings.mode==='apply')candidates=candidates.filter(t=>hasIndependentOral(records,t.fromId));
  return candidates;
}
export function chooseTasks(pool,count,records,settings,game,random=Math.random,now=Date.now()) {
  const skill=SKILLS[game],memo=new Map();
  const status=id=>{if(!memo.has(id))memo.set(id,evidence(records.events,id,skill,now));return memo.get(id);};
  const candidates=eligibleTasks(pool,records,settings,game,now);
  const recent=new Set(records.recent.slice(-Math.max(12,count*2)));
  const ranked=shuffle(candidates,random).map(t=>{
    const s=status(t.targetId);
    return {t,rank:(recent.has(t.id)?100:0)+(s.needs?0:s.due?10:!s.attempts?20:t.groupNumber===settings.group?30:40)};
  }).sort((a,b)=>a.rank-b.rank);
  const chosen=[],targets=new Set();
  for(const {t} of ranked) {if(targets.has(t.targetId))continue;chosen.push({...t});targets.add(t.targetId);if(chosen.length>=count)break;}
  return chosen;
}
export function canRecommendNext(data,records,group) {
  return groupProgress(data,records,group);
}
export function oralOutcome(choice, helped) {return choice==='read'?(helped?'after-help':'independent'):choice==='together'?'together':'unobserved';}
export function uniquePictures(words,random=Math.random) {
  const seen=[];return shuffle(words.filter(w=>w.picture),random).filter(w=>{if(seen.some(old=>samePictureMeaning(w,old)))return false;seen.push(w);return true;});
}
export function samePictureMeaning(a,b){return !!a.picture&&!!b.picture&&(a.picture.icon===b.picture.icon||!!a.picture.equivalence&&a.picture.equivalence===b.picture.equivalence);}
