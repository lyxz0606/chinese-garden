// One atomic localStorage value holds every learning direction and its settings.
// Earlier keys are preserved and read on first migration; no learning data is sent out.
export const FAMILY_KEY='chinese-garden-family-v1';
export const FAMILY_KEYS=['chinese-garden-literacy-v2','chinese-garden-progress-v1','chinese-pinyin-course-v1','chinese-pinyin-course-v1-settings','chinese-pinyin-course-v1-unfinished','chinese-pinyin-blend-practice-v1','chinese-pinyin-blend-practice-v1-settings'];
const allowed=key=>FAMILY_KEYS.includes(key)||/^chinese-pinyin-course-v1-unreadable-\d+$/.test(key);
export function createFamilyStore(storage){
  function read(){
    const raw=storage.getItem(FAMILY_KEY);
    if(raw!==null){
      let data;try{data=JSON.parse(raw);}catch{throw Error('统一记录无法读取，原内容已保留，请先导出原始备份。');}
      if(data?.schema!==1||!data.values||typeof data.values!=='object'||Array.isArray(data.values)||Object.entries(data.values).some(([key,value])=>!allowed(key)||typeof value!=='string'))throw Error('统一记录格式异常，原内容已保留。');
      return data;
    }
    const values={};for(const key of FAMILY_KEYS){const value=storage.getItem(key);if(value!==null)values[key]=value;}
    return {schema:1,revision:0,values};
  }
  function setMany(changes){
    if(!changes||typeof changes!=='object'||Object.entries(changes).some(([key,value])=>!allowed(key)||(value!==null&&typeof value!=='string')))throw Error('记录项目不能识别，尚未保存。');
    const data=read(),values={...data.values};
    for(const [key,value] of Object.entries(changes)){if(value===null)delete values[key];else values[key]=value;}
    const next={schema:1,revision:(Number(data.revision)||0)+1,updatedAt:new Date().toISOString(),values};
    // setItem is atomic: quota failures do not partially commit different subjects.
    storage.setItem(FAMILY_KEY,JSON.stringify(next));return next;
  }
  return {getItem:key=>{if(!allowed(key))return null;return read().values[key]??null;},setItem:(key,value)=>setMany({[key]:String(value)}),removeItem:key=>setMany({[key]:null}),setMany,
    snapshot:()=>({...read().values}),rawSnapshot:()=>({canonical:storage.getItem(FAMILY_KEY),legacy:Object.fromEntries(FAMILY_KEYS.map(key=>[key,storage.getItem(key)]))})};
}
let instance;
function current(){return instance||(instance=createFamilyStore(globalThis.localStorage));}
export const familyStorage={getItem:key=>current().getItem(key),setItem:(key,value)=>current().setItem(key,value),removeItem:key=>current().removeItem(key),setMany:changes=>current().setMany(changes),snapshot:()=>current().snapshot(),rawSnapshot:()=>current().rawSnapshot()};
