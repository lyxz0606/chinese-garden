import {familyStorage as store} from './family-store.js';
try{
 const literacy=JSON.parse(store.getItem('chinese-garden-literacy-v2')||'null');
 if(literacy){const seen=new Set(literacy.events.filter(e=>['cards','listen','words','exposure'].includes(e.kind)).map(e=>e.item));document.getElementById('literacy-status').textContent=`已接触 ${seen.size} 个字 · 本轮安排 ${literacy.cycle?.ids?.length||0} 个字`;if(literacy.pending)document.getElementById('literacy-start').textContent='继续识字活动 →';}
 const pinyin=JSON.parse(store.getItem('chinese-pinyin-course-v1')||'null'),settings=JSON.parse(store.getItem('chinese-pinyin-course-v1-settings')||'null');
 if(pinyin)document.getElementById('pinyin-status').textContent=`${pinyin.events.length} 次活动观察 · 当前第 ${settings?.group||1} 组`;
 if(store.getItem('chinese-pinyin-course-v1-unfinished'))document.getElementById('pinyin-start').textContent='继续拼音学习 →';
}catch{document.getElementById('home-message').textContent='有学习记录暂时无法读取，已保留原内容。请先到家长页导出原始备份。';}
