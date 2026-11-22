import {familyStorage} from './family-store.js';
import {downloadFamily,downloadRaw,inspectImport,importFamily,recordCounts} from './family-records.js';
const $=id=>document.getElementById(id);let pending;
const describe=c=>`识字 ${c.literacy} 条 · 拼音 ${c.pinyin} 条 · 拼读 ${c.practice} 条 · 早期活动 ${c.legacy} 轮`;
function summary(){try{$('record-summary').textContent=describe(recordCounts(familyStorage.snapshot()));}catch(err){message(err.message,true);}}
function message(text,error=false){$('record-message').textContent=text;$('record-message').classList.toggle('error',error);}
$('export').onclick=async()=>{try{await downloadFamily();message('备份已准备下载，请保存到“文件”中。');}catch(err){message(err.message+' 请先导出原始备份。',true);}};
$('raw-export').onclick=()=>{try{downloadRaw();message('原始备份已准备下载。它用于保留和修复数据，不能直接当作学习记录导入。');}catch(err){message(err.message,true);}};
$('import').onchange=async e=>{pending=null;$('import-preview').hidden=true;const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('文件超过20MB，请核对是否为学习备份。');const raw=JSON.parse(await file.text()),info=await inspectImport(raw);pending=raw;$('import-description').textContent='文件内：'+describe(info.incoming)+'。合并后：'+describe(info.merged)+'。';$('import-preview').hidden=false;message('文件检查通过，点击合并后才会保存。');}catch(err){message(err.message||'未能读取文件，当前记录保留。',true);}finally{e.target.value='';}};
$('confirm-import').onclick=async()=>{if(!pending)return;try{await importFamily(pending);pending=null;$('import-preview').hidden=true;summary();message('合并完成，已有活动已保留。');}catch(err){message(err.message+' 本次未保存。',true);}};
window.addEventListener('storage',summary);summary();
