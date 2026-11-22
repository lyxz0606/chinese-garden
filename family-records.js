import {familyStorage,FAMILY_KEYS} from './family-store.js';
import {catalogFrom,emptyLiteracy,validateLiteracy,mergeLiteracy,restorePending} from './literacy-engine.js';
import {emptyState,validateState,mergeImport,FORMAT as OLD_FORMAT} from './engine.js';
import {targetIndex,emptyRecords,validateRecords,mergeRecords,validSettings,recordGroupAllowed,GAMES,RECORD_KEY,SETTINGS_KEY,VERSION} from './pinyin/course-core.js';
import {validateRecords as validateBlend,mergeRecords as mergeBlend,RECORD_VERSION as BLEND_VERSION} from './pinyin/blend-history-core.js';
export const FAMILY_FORMAT='family-chinese-garden-all';
const LIT='chinese-garden-literacy-v2',OLD='chinese-garden-progress-v1',BLEND='chinese-pinyin-blend-practice-v1',DRAFT=RECORD_KEY+'-unfinished';
let catalogs;
export function setRecordCatalogs(value){catalogs=Promise.resolve(value);}
async function content(){return catalogs||(catalogs=Promise.all([fetch(new URL('./literacy-content.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('识字目录未载入');return r.json();}),fetch(new URL('./pinyin/course-data.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('拼音目录未载入');return r.json();})]).then(([literacy,pinyin])=>({literacy:catalogFrom(literacy),pinyin,index:targetIndex(pinyin),blendIds:new Set(pinyin.audioPolicy.stage5.practiceTargets.map(p=>'blend-'+p.targetId.slice(3)))})));}
const parsed=(values,key,fallback)=>values[key]===undefined?fallback:JSON.parse(values[key]);
export function validateFamilyValues(values,c){
  if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).some(k=>!FAMILY_KEYS.includes(k)))throw Error('备份包含无法识别的记录类型。');
  for(const value of Object.values(values))if(typeof value!=='string')throw Error('备份记录格式不完整。');
  const clean={...values};
  if(values[LIT]){const raw=JSON.parse(values[LIT]),state=validateLiteracy(raw,c.literacy);state.pending=restorePending(raw.pending,c.literacy);clean[LIT]=JSON.stringify(state);}
  if(values[OLD])clean[OLD]=JSON.stringify(validateState(JSON.parse(values[OLD])));
  if(values[RECORD_KEY])clean[RECORD_KEY]=JSON.stringify(validateRecords(JSON.parse(values[RECORD_KEY]),c.index));
  if(values[SETTINGS_KEY]){
    const raw=JSON.parse(values[SETTINGS_KEY]),valid=validSettings(raw);
    if(Object.keys(valid).some(k=>raw?.[k]!==valid[k]))throw Error('拼音设置不完整，未导入。');clean[SETTINGS_KEY]=JSON.stringify(valid);
  }
  if(values[BLEND])clean[BLEND]=JSON.stringify(validateBlend(JSON.parse(values[BLEND]),c.blendIds));
  if(values[BLEND+'-settings']){const raw=JSON.parse(values[BLEND+'-settings']);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('旧拼读设置不能识别。');}
  if(values[DRAFT]){
    const d=JSON.parse(values[DRAFT]);
    if(!d||d.version!==1||!GAMES.includes(d.game)||typeof d.session!=='string'||!d.session||d.session.length>100||!d.settings||JSON.stringify(validSettings(d.settings))!==JSON.stringify(d.settings)||!Array.isArray(d.tasks)||d.tasks.length>7||!Number.isInteger(d.index)||d.index<0||d.index>d.tasks.length||d.tasks.some(q=>!c.index.has(q.targetId)||!Array.isArray(q.targets)||!q.targets.includes(q.targetId)||q.targets.length>5||q.targets.some(id=>!c.index.has(id)||!recordGroupAllowed(c.index.get(id),d.settings.group))||!Array.isArray(q.chosen)||typeof q.variant!=='string'||typeof q.helped!=='boolean'||(q.game&&!GAMES.includes(q.game))||(q.mode&&!['guided','try','apply'].includes(q.mode))))throw Error('拼音未完成活动不能识别，未导入。');
  }
  return clean;
}
export function incomingValues(raw){
  if(raw?.format===FAMILY_FORMAT&&raw.version===1)return raw.values;
  if(raw?.format==='family-chinese-garden-complete'&&raw.version===2)return {[LIT]:JSON.stringify(raw.literacy),...(raw.pinyin?{[OLD]:JSON.stringify(raw.pinyin.state)}:{})};
  if(raw?.format===OLD_FORMAT&&raw.version===1)return {[OLD]:JSON.stringify(raw.state)};
  if(raw?.version===VERSION)return {[RECORD_KEY]:JSON.stringify(raw)};
  if(raw?.version===BLEND_VERSION)return {[BLEND]:JSON.stringify(raw)};
  if(raw?.format==='pinyin-blend-practice-backup'&&raw.records?.version===BLEND_VERSION)return {[BLEND]:JSON.stringify(raw.records)};
  throw Error('请选择本游戏导出的统一备份、识字记录或拼音记录。');
}
export function mergeFamilyValues(current,incoming,c){
  const a=validateFamilyValues(current,c),b=validateFamilyValues(incoming,c),result={...a};
  for(const key of Object.keys(b)){
    if(!a[key]){result[key]=b[key];continue;}
    if(key===LIT){const left=parsed(a,key,emptyLiteracy()),right=JSON.parse(b[key]),merged=mergeLiteracy(left,right,c.literacy);merged.pending=restorePending(left.pending||right.pending,c.literacy);result[key]=JSON.stringify(merged);}
    else if(key===RECORD_KEY)result[key]=JSON.stringify(mergeRecords(parsed(a,key,emptyRecords()),JSON.parse(b[key]),c.index));
    else if(key===OLD)result[key]=JSON.stringify(mergeImport(parsed(a,key,emptyState()),{format:OLD_FORMAT,version:1,state:JSON.parse(b[key])}));
    else if(key===BLEND)result[key]=JSON.stringify(mergeBlend(parsed(a,key,{version:BLEND_VERSION,events:[],recent:[]}),JSON.parse(b[key]),c.blendIds));
    else if(key===DRAFT){if(!a[key])result[key]=b[key];}
    else if(!a[key])result[key]=b[key];
  }
  return validateFamilyValues(result,c);
}
export async function exportFamily(additional={}){const c=await content(),extra=validateFamilyValues(additional,c),values=mergeFamilyValues(familyStorage.snapshot(),extra,c);if(extra[LIT]){const state=JSON.parse(extra[LIT]),merged=JSON.parse(values[LIT]);values[LIT]=JSON.stringify({...state,events:merged.events,baseline:merged.baseline});}for(const key of [SETTINGS_KEY,DRAFT,BLEND+'-settings'])if(extra[key])values[key]=extra[key];return {format:FAMILY_FORMAT,version:1,appVersion:'0.6.0',exportedAt:new Date().toISOString(),values};}
export function recordCounts(values){const get=key=>parsed(values,key,{});return {literacy:get(LIT).events?.length||0,pinyin:get(RECORD_KEY).events?.length||0,practice:get(BLEND).events?.length||0,legacy:get(OLD).sessions?.length||0};}
export async function inspectImport(raw){const c=await content(),incoming=validateFamilyValues(incomingValues(raw),c),next=mergeFamilyValues(familyStorage.snapshot(),incoming,c);return {incoming:recordCounts(incoming),merged:recordCounts(next)};}
export async function importFamily(raw){const c=await content(),next=mergeFamilyValues(familyStorage.snapshot(),incomingValues(raw),c);familyStorage.setMany(next);window.dispatchEvent(new Event('garden-records-imported'));return next;}
export function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function downloadFamily(additional={}){const value=await exportFamily(additional);downloadJSON(value,'语文小花园-全部学习记录-'+new Date().toISOString().slice(0,10)+'.json');return value;}
export function downloadRaw(){downloadJSON({format:'family-chinese-garden-raw',version:1,exportedAt:new Date().toISOString(),...familyStorage.rawSnapshot()},'语文小花园-原始记录备份.json');}
