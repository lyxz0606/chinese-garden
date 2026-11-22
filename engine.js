import {LESSONS,LETTERS,WORDS,SYLLABLES,itemInfo} from './content.js';
export const STORAGE_KEY='chinese-garden-progress-v1';
export const FORMAT='family-chinese-garden';
export function emptyState(){return {schema:1,activeLesson:'ao',seen:[],sessions:[],settings:{rounds:0},updatedAt:new Date().toISOString()};}
export function shuffle(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function deck(items,count,random=Math.random){if(!items.length)return [];const out=[];while(out.length<count){let next=shuffle(items,random);if(items.length>1&&next[0]===out[out.length-1]) [next[0],next[1]]=[next[1],next[0]];out.push(...next);}return out.slice(0,count);}
export function makeRound(lesson,id,random=Math.random){
  const target=itemInfo(lesson.mode,id);
  let options=[];
  if(lesson.mode==='mail') options=shuffle([id,...shuffle(lesson.items.filter(x=>x!==id),random).slice(0,2)],random);
  if(lesson.mode==='tone') options=shuffle([...new Set(lesson.items.map(x=>Number(x.slice(-1))))],random);
  if(lesson.mode==='word') options=shuffle([id,...shuffle(WORDS.map(x=>x.id).filter(x=>x!==id),random).slice(0,2)],random);
  return {id,target,options,wrong:0,hint:false,spokenHelp:false,spoken:null,choice:null,replays:0,connected:false,revealed:false};
}
export function makeSession(lesson,state,random=Math.random){
  const count=state.settings.rounds||lesson.rounds;
  return {id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`,lessonId:lesson.id,mode:lesson.mode,startedAt:new Date().toISOString(),completed:false,items:deck(lesson.items,count,random),results:[]};
}
export function markSpeechHelp(round){if(round.spoken===null)round.spokenHelp=true;}
export function resultFor(round,mode){const canChoose=!['mail','tone'].includes(mode)||round.options.length>1;return {item:round.id,mode,at:new Date().toISOString(),choice:round.choice&&canChoose?((round.hint||round.wrong)?'assisted':'independent'):null,spoken:round.spoken==='independent'&&round.spokenHelp?'assisted':round.spoken,wrong:round.wrong,replays:round.replays};}
export function saveSession(state,session){const existing=state.sessions.find(s=>s.id===session.id);if(existing&&existing.results.length>session.results.length)return state;const next={...state,sessions:[...state.sessions.filter(s=>s.id!==session.id),JSON.parse(JSON.stringify(session))],updatedAt:new Date().toISOString()};return next;}
export function summary(state){
  const items={};
  for(const session of state.sessions){for(const r of session.results){const key=`${r.mode}:${r.item}`;const t=items[key]||(items[key]={mode:r.mode,item:r.item,encounters:0,choice:0,spoken:0,help:0,dates:[],last:r.at});t.encounters++;t.choice+=Number(r.choice==='independent');t.spoken+=Number(r.spoken==='independent');t.help+=Number(r.choice==='assisted'||r.spoken==='assisted'||r.spoken==='later');if(r.at>t.last)t.last=r.at;if(!t.dates.includes(r.at.slice(0,10)))t.dates.push(r.at.slice(0,10));}}
  return items;
}
export function reviewLesson(state){
  const items=Object.values(summary(state));
  if(!items.length)return null;
  const candidates=items.sort((a,b)=>Number(b.help>0)-Number(a.help>0)||a.last.localeCompare(b.last));
  const mode=candidates[0].mode;
  const chosen=candidates.filter(x=>x.mode===mode).slice(0,4).map(x=>x.item);
  return {id:`review-${mode}`,mode,title:'和老朋友再见面',items:chosen,rounds:Math.min(4,Math.max(2,chosen.length)),intro:[],guide:'复习只从玩过的内容里选。先试一试，需要时再听示范；随时可以回到地图换内容。'};
}
export function allowedItem(mode,item){
  if(mode==='mail')return Object.prototype.hasOwnProperty.call(LETTERS,item);
  if(mode==='tone')return /^(a|o|e|i|u|ü)[1-4]$/.test(item);
  if(mode==='blend')return SYLLABLES.some(x=>x.id===item);
  if(mode==='word')return WORDS.some(x=>x.id===item);
  return false;
}
function validTime(v){return typeof v==='string'&&v.length<40&&!Number.isNaN(Date.parse(v));}
export function validateState(raw){
  if(!raw||raw.schema!==1||!Array.isArray(raw.sessions)||raw.sessions.length>10000||!Array.isArray(raw.seen))throw Error('这份文件不是本游戏的有效学习记录。');
  const clean=emptyState();
  clean.activeLesson=LESSONS.some(l=>l.id===raw.activeLesson)?raw.activeLesson:'ao';
  clean.settings.rounds=[0,3,5,7].includes(raw.settings?.rounds)?raw.settings.rounds:0;
  clean.seen=raw.seen.filter(x=>typeof x==='string'&&x.length<50).slice(0,200);
  clean.updatedAt=validTime(raw.updatedAt)?raw.updatedAt:clean.updatedAt;
  clean.sessions=raw.sessions.map(s=>{
    if(!s||typeof s.id!=='string'||s.id.length>100||!['mail','tone','blend','word'].includes(s.mode)||!validTime(s.startedAt)||!Array.isArray(s.results)||s.results.length>30)throw Error('学习记录中有无法识别的活动。');
    const results=s.results.map(r=>{
      if(!r||r.mode!==s.mode||!allowedItem(r.mode,r.item)||!validTime(r.at)||![null,'independent','assisted'].includes(r.choice)||![null,'independent','assisted','later'].includes(r.spoken))throw Error('学习记录中有无法识别的内容。');
      return {item:r.item,mode:r.mode,at:r.at,choice:r.choice,spoken:r.spoken,wrong:Number.isInteger(r.wrong)?Math.max(0,Math.min(99,r.wrong)):0,replays:Number.isInteger(r.replays)?Math.max(0,Math.min(99,r.replays)):0};
    });
    return {id:s.id,lessonId:typeof s.lessonId==='string'?s.lessonId.slice(0,80):'imported',mode:s.mode,startedAt:s.startedAt,completed:s.completed===true,items:Array.isArray(s.items)?s.items.filter(i=>allowedItem(s.mode,i)).slice(0,30):results.map(r=>r.item),results};
  });
  return clean;
}
export function exportRecord(state){return {format:FORMAT,version:1,exportedAt:new Date().toISOString(),state};}
export function mergeImport(current,record){
  if(record?.format!==FORMAT||record.version!==1)throw Error('请选择从“拼音小花园”导出的记录文件。');
  const incoming=validateState(record.state);const sessions=new Map(current.sessions.map(s=>[s.id,s]));
  for(const s of incoming.sessions){const existing=sessions.get(s.id);if(!existing||s.results.length>existing.results.length||(s.results.length===existing.results.length&&s.completed))sessions.set(s.id,s);}
  return {...current,seen:[...new Set([...current.seen,...incoming.seen])],sessions:[...sessions.values()].sort((a,b)=>a.startedAt.localeCompare(b.startedAt)),updatedAt:new Date().toISOString()};
}
