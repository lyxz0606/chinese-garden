import {warmAudio,playPrepared,stopAudio} from '../audio-player.js';
import {familyStorage as store,FAMILY_KEY} from '../family-store.js';
import {downloadFamily} from '../family-records.js';
import {RECORD_KEY,emptyRecords,validateRecords,mergeRecords} from './blend-history-core.js';
const $=id=>document.getElementById(id),key=RECORD_KEY+'-settings',audio=$('practice-audio');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let targets=[],known,prefs={group:4,type:'all',mode:'guided'},records=emptyRecords(),draft=null,ticket=0,storageProtected=false;
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
function message(text,error=false){$('practice-message').textContent=text;$('practice-message').classList.toggle('error',error);}
function stop(){ticket++;stopAudio(audio);}
function pool(){return targets.filter(t=>t.groupNumber<=prefs.group&&(prefs.type==='all'||(t.parts.length===3?'three-part':'two-part')===prefs.type));}
function current(){return targets.find(t=>t.targetId===draft?.targetId);}
function save(){if(storageProtected)return false;try{const raw=store.getItem(RECORD_KEY);if(raw)records=mergeRecords(records,JSON.parse(raw),known);store.setMany({[RECORD_KEY]:JSON.stringify(records),[key]:JSON.stringify({...prefs,draft})});return true;}catch(err){message(err.message+' 请先点击“备份当前记录”，再关闭页面。',true);return false;}}
function choose(targetId){stop();const choices=pool();if(!choices.length){draft=null;render();save();return;}let target=choices.find(t=>t.targetId===targetId);if(!target){const candidates=choices.filter(t=>t.targetId!==draft?.targetId),ordered=(candidates.length?candidates:choices).map(t=>({t,r:Math.random()})).sort((a,b)=>Number(records.recent.includes('blend-'+a.t.targetId.slice(3)))-Number(records.recent.includes('blend-'+b.t.targetId.slice(3)))||a.r-b.r);target=ordered[0].t;}draft={id:uid(),targetId:target.targetId,helped:prefs.mode==='guided',revealed:false,recorded:false,mode:prefs.mode};save();render();message('先试着把小卡片连起来读，可以请家长帮忙。');}
function render(){
 const choices=pool(),t=current();warmAudio(t?[t.normalAudio.file]:[],audio);$('practice-count').textContent=`当前可练 ${choices.length} 项 / 全部 ${targets.length} 项`;
 $('group').value=prefs.group;$('type').value=prefs.type;$('mode').value=prefs.mode;
 $('target').innerHTML=choices.map(x=>`<option value="${x.targetId}">${esc(x.label)} · 第 ${x.groupNumber} 组</option>`).join('');$('target').value=t?.targetId||'';
 $('next').disabled=!choices.length;
 if(!t){$('practice').innerHTML='<p>当前范围还没有这种拼读，请扩大组别，或先选择两拼。</p>';return;}
 const parts=draft.revealed?`<div class="joined" aria-label="完整音节">${esc(t.label)}</div>`:`<div class="parts" aria-label="拼读卡片">${t.parts.map(p=>`<span class="part">${esc(p)}</span>`).join('<span aria-hidden="true">＋</span>')}</div>`;
 $('practice').innerHTML=parts+`<p class="practice-hint">${draft.revealed?'再读一遍，然后可以听录音核对。':'先自己连着读；需要帮助时，再把卡片合起来看。'}</p><div class="actions"><button data-do="reveal">把卡片合起来</button><button data-do="listen">听完整音节</button>${t.slowListening?'<button data-do="slow">完整音节慢听</button>':''}</div><div class="observe"><p>${draft.recorded?'这次观察已保存，可以换一个练习。':'家长观察：这次读得怎么样？'}</p><div class="actions"><button data-do="read" ${draft.recorded?'disabled':''}>${draft.helped?'帮助后读出来了':'自己读出来了'}</button><button data-do="together" ${draft.recorded?'disabled':''}>还需要一起读</button><button data-do="unobserved" ${draft.recorded?'disabled':''}>先不记录口读</button></div></div>`;
}
async function listen(slow=false){const t=current();if(!t)return;stop();const serial=ticket;draft.helped=true;draft.revealed=true;save();render();message('正在准备声音…');try{await playPrepared(audio,t.normalAudio.file,slow&&t.slowListening&&t.normalAudio.allowSlowPlayback!==false?t.slowListening.rate:1);if(serial===ticket)message(slow?'正在慢听完整音节，之后再用正常速度读一次。':'正在听完整音节：'+t.label);}catch(err){if(serial===ticket&&err.name!=='AbortError')message('声音未能播放，请联网重试或补全离线内容。',true);}}
$('practice').onclick=e=>{const action=e.target.closest('[data-do]')?.dataset.do;if(!action||!draft)return;if(action==='reveal'){draft.revealed=true;draft.helped=true;save();render();}else if(action==='listen'||action==='slow'){listen(action==='slow');}else if(!draft.recorded){const oral=action==='read'?(draft.helped?'after-help':'independent'):action;records.events.push({id:draft.id,targetId:'blend-'+draft.targetId.slice(3),game:'train',mode:draft.mode,helped:draft.helped,oral,at:new Date().toISOString()});records.recent=[...records.recent,'blend-'+draft.targetId.slice(3)].slice(-30);draft.recorded=true;save();render();message('观察已保存，可以再听一遍或换一个练习。');}};
for(const id of ['group','type','mode'])$(id).onchange=()=>{prefs={...prefs,[id]:id==='group'?Number($(id).value):$(id).value};choose();};
$('target').onchange=()=>choose($('target').value);$('next').onclick=()=>choose();$('stop').onclick=()=>{stop();message('声音已停止。');};
document.getElementById('practice-backup').onclick=async()=>{try{await downloadFamily({[RECORD_KEY]:JSON.stringify(records),[key]:JSON.stringify({...prefs,draft})});message('包含本次练习的全部记录已准备下载。');}catch(err){message(err.message,true);}};
window.addEventListener('pagehide',()=>{stop();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();save();}});
window.addEventListener('garden-stop-audio',stop);window.addEventListener('garden-before-update',e=>{if(draft&&!draft.recorded)e.preventDefault();else if(!save())e.preventDefault();else stop();});
window.addEventListener('storage',e=>{if(e.key===FAMILY_KEY&&known){try{records=mergeRecords(records,JSON.parse(store.getItem(RECORD_KEY)||JSON.stringify(emptyRecords())),known);}catch(err){message(err.message,true);}}});
try{
 const response=await fetch('course-data.json');if(!response.ok)throw Error('课程没有载入');const data=await response.json();targets=data.audioPolicy.stage5.practiceTargets;known=new Set(targets.map(t=>'blend-'+t.targetId.slice(3)));
 $('group').innerHTML=data.groups.filter(g=>g.number>=4).map(g=>`<option value="${g.number}">第 ${g.number} 组 · ${esc(g.title)}</option>`).join('');
 try{const raw=store.getItem(RECORD_KEY);if(raw)records=validateRecords(JSON.parse(raw),known);const saved=JSON.parse(store.getItem(key)||'null');if(saved){prefs={group:Number.isInteger(saved.group)&&saved.group>=4&&saved.group<=20?saved.group:4,type:['all','two-part','three-part'].includes(saved.type)?saved.type:'all',mode:saved.mode==='try'?'try':'guided'};const d=saved.draft;if(d&&typeof d.id==='string'&&pool().some(t=>t.targetId===d.targetId)&&typeof d.revealed==='boolean'&&typeof d.helped==='boolean'&&typeof d.recorded==='boolean'&&['guided','try'].includes(d.mode))draft={...d,helped:d.helped||d.revealed||d.mode==='guided'};}}
 catch(err){storageProtected=true;message('原记录暂时无法读取，已保留原内容。请先在家长页导出原始备份。',true);}
 if(draft)render();else choose();
}catch(err){message(err.message+' 请确认本地服务或离线内容已准备好。',true);}
