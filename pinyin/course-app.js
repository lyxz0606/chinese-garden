import {familyStorage as localStorage,FAMILY_KEY} from '../family-store.js';
import {downloadFamily,downloadRaw,importFamily} from '../family-records.js';
import {groupProgress,buildLearningPlan,hasIndependentOral} from './course-learning.js';
import {VERSION,RECORD_KEY,SETTINGS_KEY,GAMES,SKILLS,shuffle,defaults,validSettings,targetIndex,taskPool,trainSlots,listeningChoices,mixedChunkOrder,shoppingChoices,emptyRecords,validateRecords,mergeRecords,recordGroupAllowed,evidence,chooseTasks,oralOutcome,uniquePictures,eligibleTasks,samePictureMeaning} from './course-core.js';
const $=id=>document.getElementById(id), main=$('main'), audio=$('audio');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(text,action,value='',cls='')=>'<button class="'+cls+'" data-action="'+action+'" data-value="'+esc(value)+'">'+text+'</button>';
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const draftKey=RECORD_KEY+'-unfinished', icons={mail:'✉️',tone:'🌈',train:'🚂',change:'🪄',repair:'🧰',object:'🔎',list:'🧺',sentence:'🧩',story:'📖',teacher:'🧸'};
const skillNames={listening:'听音找卡',tone:'声调听辨',blending:'两拼三拼',transfer:'换音试读',spelling:'拼写规则',meaning:'读词找物',application:'读清单办事',sentence:'拼词成句',reading:'故事理解',oral:'看卡口读'};
let data,index,records=emptyRecords(),settings=defaults(),round=null,view='home',unreadable=null,playerTicket=0,blobUrl,libraryType='words',libraryQuery='',libraryLimit=30,lessonId=null;
let pools=new Map(),storyTimeId=null;
const currentGame=()=>current()?.game||round?.game;
const currentSettings=()=>({...round.settings,mode:current()?.mode||round.settings.mode});
const phaseNames={review:'先复习',learn:'学一点',use:'用起来',practice:'再试一试'};
function status(text,error=false){$('system-status').textContent=text;$('system-status').classList.toggle('error',error);}
function stop(){playerTicket++;audio.pause();audio.removeAttribute('src');audio.load();$('audio-status').textContent='声音已停止';$('audio-bar').hidden=true;}
async function play(record,label,asPrompt=false,rate=1){
  if(!record){$('audio-status').textContent='这条录音还在准备，请家长示范。';return;}
  stop();const ticket=playerTicket,q=current();
  audio.src=record.file;audio.playbackRate=record.allowSlowPlayback===false?1:rate;
  audio.preservesPitch=true;audio.webkitPreservesPitch=true;
  $('audio-bar').hidden=false;$('audio-status').textContent=asPrompt?'正在准备任务声音…':'正在准备声音：'+label;
  try{
    await audio.play();if(ticket!==playerTicket)return;
    if(q&&q===current()&&!q.recorded){
      if(asPrompt){q.stimulus=true;if(['mail','tone','train'].includes(currentGame())&&!q.answered)q.message='听好后再选，可以重复听。';}
      else q.helped=true;
      saveDraft();drawTask();
    }
    $('audio-status').textContent=asPrompt?'正在播放任务声音，请仔细听。':'正在播放：'+label;
  }catch(e){if(ticket!==playerTicket||e.name==='AbortError')return;$('audio-status').textContent='声音没有播放，请再点一次，或请家长示范。';}
}
audio.addEventListener('ended',()=>{$('audio-status').textContent='播放结束，可以再听一次';});
audio.addEventListener('error',()=>{if(audio.getAttribute('src'))$('audio-status').textContent='声音未能读取，请联网重试，或到家长页补全离线声音。';});
$('stop-audio').addEventListener('click',stop);window.addEventListener('pagehide',()=>{stop();saveDraft();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();saveDraft();}});
function getPool(game,s=settings){const key=game+':'+s.group+':'+s.parts+':'+s.mode;if(!pools.has(key))pools.set(key,taskPool(data,s,game));return pools.get(key);}
function current(){return view==='task'&&round&&round.index<round.tasks.length?round.tasks[round.index]:null;}
function focusMain(){main.focus({preventScroll:true});window.scrollTo(0,0);}
function saveDraft(){if(!round||unreadable!==null)return;try{localStorage.setItem(draftKey,JSON.stringify(round));}catch{status('本轮暂时只在内存中保存。完成后请导出记录。',true);}}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{status('设置暂时不能保存，下次打开需重新选择。',true);}}
function persist(next){records=validateRecords(next,index);try{const stored=localStorage.getItem(RECORD_KEY);if(stored)records=mergeRecords(records,JSON.parse(stored),index);localStorage.setItem(RECORD_KEY,JSON.stringify(records));status('学习记录已保存在当前设备。');return true;}catch{status('浏览器未能保存新记录，请在关闭页面前导出。',true);return false;}}
function refreshRecords(){const raw=localStorage.getItem(RECORD_KEY);if(raw)records=mergeRecords(records,JSON.parse(raw),index);}
window.addEventListener('storage',e=>{if(data&&(e.key===FAMILY_KEY||e.key===RECORD_KEY)){try{refreshRecords();if(view!=='task')render();}catch(err){status(err.message,true);}}});
window.addEventListener('garden-before-update',e=>{if(view==='task'||!persist(records))e.preventDefault();else stop();});
window.addEventListener('garden-stop-audio',stop);
function label(target){return target.label||target.pinyin||target.text;}
function hz(target){return target.text||'';}
function pictureHTML(icon,text=''){
  return icon?.startsWith('graphic:')?'<img class="picture-art" src="illustrations/'+esc(icon.slice(8))+'.svg" alt="'+esc(text)+'" width="100" height="100">':esc(icon||'🌼');
}
function audioButton(target,prompt=false){
  if(target.contextAudio&&!prompt)return btn(target.id==='final-ong'?'在 dōng 里听 ong':'在词句里听轻声','context-audio',target.id,'soft');
  if(target.audio?.role==='word-by-word-sentence')return btn('逐词慢读','answer-audio',target.id,'soft');
  return target.audio?btn(prompt?'听任务声音':target.kind==='initial'?'听认读音':target.title?'听整篇':'需要时听读音',prompt?'prompt-audio':'answer-audio',target.id,'soft'):'<p class="subtle">这一项请家长示范。</p>';
}
function slowButton(target){return target.slowListening&&target.audio?btn('完整音节慢听','slow-audio',target.id,'quiet'):'';}
function readingButton(target,field,number,text){
  const record=field==='sentence'?target.sentences[number]?.audio:target[field+'Audio'];
  if(record)return btn(text+(record.role==='word-by-word-sentence'?' · 逐词慢读':''),'reading-audio',target.id+'|'+field+'|'+number,'quiet');
  if(field==='sentence'&&target.audio)return btn('听整篇，找这一句','answer-audio',target.id,'quiet');
  return '<p class="subtle">'+(field==='sentence'?'这一句请家长读。':field==='question'?'这个问题请家长读。':'这部分请家长读。')+'</p>';
}
function readingSentences(target,withPinyin=true){return '<div class="sentence-audio-list">'+target.sentences.map((sentence,n)=>'<div class="reading-line"><p>'+(withPinyin?sentence.chunks.map(c=>'<ruby>'+esc(c.text)+'<rt>'+esc(c.pinyin)+'</rt></ruby>').join('')+'。':esc(sentence.text))+'</p>'+readingButton(target,'sentence',n,'听第 '+(n+1)+' 句')+'</div>').join('')+'</div>';}
function nav(next){stop();view=next;document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(next==='task'?'home':next)));render();focusMain();}
function render(){if(view==='home')home();if(view==='task')drawTask();if(view==='records')drawRecords();if(view==='games')gamesPage();if(view==='storytime')storyTime();if(view==='library')library();if(view==='lesson')lesson();}
function options(values,value){return values.map(([key,text])=>'<option value="'+key+'" '+(value===key?'selected':'')+'>'+esc(text)+'</option>').join('');}
function settingsHTML(){return '<details class="panel"><summary>家长设置：范围、难度和活动长度</summary><div class="settings">'+
  '<label>目前学到第几组<select id="setting-group">'+options(data.groups.map(g=>[g.number,g.number+' · '+g.title]),settings.group)+'</select></label>'+
  '<label>这次怎样玩<select id="setting-mode">'+options([['guided','跟着学 · 多给提示'],['try','自己试 · 需要时求助'],['apply','用一用 · 减少文字提示']],settings.mode)+'</select></label>'+
  '<label>一轮任务数<select id="setting-length">'+options([[3,'3 次 · 短一点'],[5,'5 次'],[7,'7 次']],settings.length)+'</select></label>'+
  '<label>题目怎么选<select id="setting-scope">'+options([['mixed','新内容＋复习'],['current','只练本组新内容'],['review','只练到期或需要帮助的内容']],settings.scope)+'</select></label>'+
  '<label>拼接练习类型<select id="setting-parts">'+options([['all','两拼与三拼'],['two-part','只练两拼'],['three-part','只练三拼']],settings.parts)+'</select></label></div><p class="subtle">学习组与轮次长度用于下一轮。推荐学习会按每项记录安排示范或尝试；此处的玩法难度与题目范围用于自由选游戏。家长可按接受程度调整学习组。“自己试”和“用一用”仍可随时求助。</p></details>';}
function learningPlan(reviewOnly=false){
  return buildLearningPlan(data,records,{...settings,scope:reviewOnly?'review':'mixed'},{pool:getPool,choose:chooseTasks,evidence,skills:SKILLS});
}
function capabilityHTML(progress){
  return '<div class="capability-list">'+progress.buckets.map(b=>'<div class="capability '+(b.ready?'ready':'')+'"><div><strong>'+esc(b.title)+'</strong><span>'+b.count+' / '+b.total+'</span></div><progress max="'+Math.max(1,b.total)+'" value="'+b.count+'" aria-label="'+esc(b.title)+'"></progress><p>'+esc(b.description)+'</p></div>').join('')+'</div>';
}
function home(){
  const group=data.groups[settings.group-1],plan=learningPlan(),unfinished=round&&round.index<round.tasks.length;
  if(unfinished)plan.jobs=round.tasks.slice(round.index).map(q=>({...q,game:q.game||round.game,phase:q.phase||'practice',reason:q.reason||'接着上次还没完成的内容。'}));
  const review=learningPlan(true),fresh=data.foundations.filter(t=>t.groupNumber===settings.group);
  const recent=records.events.slice(-12).filter(e=>e.oral==='independent'||e.result==='independent');
  const discoveries=[...new Set(recent.map(e=>e.targetId))].slice(-4).map(id=>index.get(id));
  main.innerHTML='<section class="learning-header"><div><span class="eyebrow">本次学习</span><h1>读一读，帮一个小忙</h1><p>第 '+settings.group+' 组 · '+esc(group.title)+'</p></div>'+btn('调整学习范围','parent','','quiet')+'</section>'+
    (unreadable!==null?'<p class="notice error">已有学习记录暂时不能读取，原内容已保留。先到家长页导出原记录。</p>':'')+
    '<div class="learning-layout"><section class="today-card"><div class="today-illustration" aria-hidden="true">🌱 <span>✉️</span> 🌼</div><span class="pill">'+(unfinished?'上次的小任务还在这里':'每次一小轮，随时可以休息')+'</span><h2>'+(unfinished?'接着上次的发现':'今天这样玩')+'</h2><p>'+(unfinished?'继续上次第 '+round.settings.group+' 组的题目，已经完成的内容都保留着。':'先熟悉声音，再试着读，最后用它完成一个任务。')+'</p><div class="actions">'+(unfinished?btn('继续上次','resume'):btn('开始本次学习','today'))+(unfinished?btn('重新安排一小轮','today','','quiet'):'')+'</div><ol class="lesson-sequence">'+plan.jobs.map((job,i)=>'<li><span class="step-number">'+(i+1)+'</span><div><small>'+phaseNames[job.phase]+'</small><strong>'+icons[job.game]+' '+esc(data.games.find(g=>g.id===job.game).name)+'</strong><span>'+esc(job.reason)+'</span></div></li>').join('')+'</ol><p class="subtle">这一轮最多 '+plan.jobs.length+' 个小任务，不用一次做完。</p></section>'+
    '<aside class="learning-side"><section class="panel review-card"><span class="eyebrow">先复习</span><h2>'+(review.jobs.length?'再和熟悉的声音见面':'慢慢积累，不急着赶路')+'</h2><p>'+(review.jobs.length?'上次还需要帮助，或已经到了再练一次的时候。':'有了练习记录，这里会安排需要再见一次的内容。')+'</p>'+(review.jobs.length?btn('只复习一小轮','review','','soft'):'')+'</section><section class="panel"><span class="eyebrow">学一点新内容</span><h2>'+esc(group.title)+'</h2><div class="card-row">'+fresh.map(t=>btn(esc(t.label),'lesson',t.id,'letter-card')).join('')+'</div><p>'+esc(group.goal)+'</p>'+btn('家长看具体进展','parent','','quiet')+'</section></aside></div>'+
    '<section class="explore-row"><button data-action="games" class="explore-card"><span aria-hidden="true">🎲</span><div><strong>自由选游戏</strong><small>按喜欢的玩法练一练</small></div><b aria-hidden="true">→</b></button><button data-action="storytime" class="explore-card"><span aria-hidden="true">📖</span><div><strong>亲子故事屋</strong><small>一起听、一起讲，不必等拼音全学完</small></div><b aria-hidden="true">→</b></button></section>'+
    (discoveries.length?'<section class="panel discoveries"><h2>最近的发现</h2><div class="discovery-cards">'+discoveries.map(t=>'<span><b>'+pictureHTML(t.picture?.icon,t.text)+'</b><span class="py">'+esc(label(t))+'</span></span>').join('')+'</div><p class="subtle">这里留下玩过的内容。是否能独立读出，家长页会分别记录。</p></section>':'');
}
function gamesPage(){
  const groups=[['听声音、认卡片',['mail','tone','teacher']],['拼一拼、修一修',['train','change','repair']],['读懂了，用起来',['object','list','sentence','story']]];
  main.innerHTML='<section class="learning-header"><div><span class="eyebrow">自由选游戏</span><h1>选一种喜欢的玩法</h1><p>第 1～'+settings.group+' 组 · '+({guided:'跟着学',try:'自己试',apply:'用一用'})[settings.mode]+'</p></div>'+btn('回到本次学习','home','','quiet')+'</section><section class="panel compact-settings"><label>怎样玩<select id="setting-mode">'+options([['guided','跟着学 · 有示范和帮助'],['try','自己试 · 先自己读'],['apply','用一用 · 增加任务要求']],settings.mode)+'</select></label><label>题目范围<select id="setting-scope">'+options([['mixed','当前范围＋复习'],['current','只练本组新内容'],['review','只练需要复习的内容']],settings.scope)+'</select></label><p class="subtle">不同玩法会调整选项、词块长度或任务要求。本轮优先换题，并穿插复习；轮次长短在家长页设置。</p></section>'+
    groups.map(([title,ids])=>'<section class="game-section"><h2>'+title+'</h2><div class="grid">'+ids.map(id=>{
      const game=data.games.find(g=>g.id===id),all=getPool(id),selected=eligibleTasks(all,records,settings,id),count=new Set(selected.map(q=>q.targetId)).size;
      const available=new Set(all.map(q=>q.targetId)).size;
      const explanation=!count?settings.scope==='review'?'目前没有到期复习项':settings.scope==='current'?'本组没有这种新内容':id==='change'&&settings.mode==='apply'?'先在“自己试”里读会几个音节':'先学习相关内容':count<settings.length?'这一范围适合短练习，之后可换个玩法':id==='train'&&settings.mode==='apply'&&!selected.some(q=>index.get(q.targetId).mode==='three-part')?'当前范围先练两拼，学到三拼后再加入':'';
      return '<article class="game-card"><span class="icon" aria-hidden="true">'+icons[id]+'</span><h3>'+esc(game.name)+'</h3><p>'+esc(game.task)+'</p><p class="game-guidance">'+explanation+'</p>'+btn(count?'玩一小轮':'查看学习范围',count?'start':'parent',count?id:'',count?'':'quiet')+'<details class="target-count"><summary>家长看可用内容</summary><p>当前筛选 '+count+' 项；本学习范围 '+available+' 项；本轮最多 '+Math.min(settings.length,count)+' 项。按不同学习内容统计，换位置不增加数量。</p></details></article>';
    }).join('')+'</div></section>').join('');
}
function storyTime(){
  const stories=data.readings,story=stories.find(t=>t.id===storyTimeId);
  if(!story){main.innerHTML='<section class="learning-header"><div><span class="eyebrow">亲子故事屋</span><h1>一起读，也一起讲</h1><p>家长可以读全文，孩子说说自己的想法。这一入口不记录为独立拼音阅读。</p></div>'+btn('回到本次学习','home','','quiet')+'</section><div class="grid">'+stories.map(t=>'<article class="game-card"><span class="icon" aria-hidden="true">📮</span><h2>'+esc(t.title)+'</h2><p>听一听、想一想，再讲给家长听。</p>'+btn('打开故事','story-open',t.id)+'</article>').join('')+'</div>';return;}
  main.innerHTML='<section class="panel story-time"><span class="pill">亲子共读与表达</span><h1>'+esc(story.title)+'</h1><div class="actions">'+audioButton(story)+btn('换个故事','storytime','','quiet')+'</div><div class="book">'+story.sentences.map(line=>'<p>'+esc(line.text)+'</p>').join('')+'</div><div class="story-question"><h2>读完聊一聊</h2><p>'+esc(story.question)+'</p>'+readingButton(story,'question',0,'听问题')+'<p>还可以说说：你最想帮谁？接下来可能会发生什么？</p><details><summary>家长听完回答后参考</summary><p>'+esc(story.answer)+'</p></details></div></section>';
}
function startToday(reviewOnly=false){
  if(unreadable!==null){nav('records');return;}
  const plan=learningPlan(reviewOnly);if(!plan.jobs.length){status('目前没有需要复习的任务，可以开始本次学习。');home();return;}
  stop();view='task';const s={...settings,scope:reviewOnly?'review':'mixed'};
  round={version:1,type:'today',session:id(),game:plan.jobs[0].game,settings:s,index:0,tasks:plan.jobs.map(t=>makeQuestion(t,t.game,{...s,mode:t.mode},plan.jobs))};
  saveDraft();drawTask();focusMain();
}
function makeQuestion(task,game,s,allTasks){
  const target=index.get(task.targetId), available=data.words.filter(w=>w.groupNumber<=s.group), sy=data.syllables.filter(x=>x.groupNumber<=s.group&&x.tone!==5);
  const q={...task,game,mode:s.mode,practiceVersion:4,targets:[task.targetId],helped:s.mode==='guided',answered:false,recorded:false,stimulus:false,chosen:[],message:'',result:null};
  if(game==='mail'){
    q.choices=shuffle([target,...listeningChoices(data,s.group,target,s.mode).slice(0,s.mode==='guided'?1:3)]).map(x=>({value:x.label,label:x.label}));q.answer=target.label;
  }
  if(game==='tone'){q.choices=(s.mode==='guided'?[target.tone,(target.tone+1)%4+1]:[1,2,3,4]).sort().map(n=>({value:String(n),label:['','第一声','第二声','第三声','第四声'][n]}));q.answer=String(target.tone);}
  if(game==='train'){
    const slot=shuffle(trainSlots(target,sy))[0];
    q.trainVersion=2;q.missing=slot.missing;q.answer=slot.answer;
    q.choices=shuffle([q.answer,...shuffle(slot.alternatives).slice(0,s.mode==='guided'?1:2)]).map(v=>({value:v,label:v}));
  }
  if(game==='change'){
    q.missing=q.changed;q.novel=!hasIndependentOral(records,target.id);
  }
  if(game==='repair'){q.answer=target.answer;q.choices=shuffle(target.choices).map(x=>({value:x,label:x}));}
  if(game==='object'){
    const distractors=uniquePictures(available.filter(w=>w.picture&&!samePictureMeaning(w,target))).slice(0,s.mode==='guided'?1:3);
    q.answer=target.id;q.choices=shuffle([target,...distractors]).map(x=>({value:x.id,label:x.text,icon:x.picture.icon}));
  }
  if(game==='list'){
    const {targets,choices}=shoppingChoices(target,available,s.mode);
    q.targets=targets.map(t=>t.id);
    q.choices=choices.map(x=>({value:x.id,label:x.text,icon:x.picture.icon}));
  }
  if(game==='sentence')q.chunkOrder=mixedChunkOrder(target.chunks);
  q.contextKey=[game,q.fromId||'',...q.targets].join('|');q.useDemand=s.mode==='apply'&&['object','teacher'].includes(game)&&!!target.text;
  q.variant=['practice-v4',s.mode,...(game==='train'?['listen-train-v2',q.missing]:[]),...(q.fromId?[q.fromId]:[]),...allTasks.map(x=>x.targetId),...(q.choices||[]).map(x=>x.value),...(q.chunkOrder||[])].join('|').slice(0,500);
  return q;
}
function start(game){
  if(unreadable!==null){nav('records');return;}
  stop();const chosen=chooseTasks(getPool(game),settings.length,records,settings,game);
  view='task';
  if(!chosen.length){round=null;main.innerHTML='<section class="panel empty"><h1>这次范围还没有合适的任务</h1><p>'+(settings.scope==='review'?'还没有到期或需要帮助的记录。可以改成“新内容＋复习”，先试一小轮。':settings.scope==='current'?'本组没有这种新任务。可以改成“新内容＋复习”，练已经学过的内容。':'先练已经出现的内容，或由家长调整学习组。')+'</p>'+btn('回到学习小路','home')+'</section>';return;}
  round={version:1,type:'game',session:id(),game,settings:{...settings},index:0,tasks:chosen.map(t=>makeQuestion(t,game,settings,chosen))};saveDraft();drawTask();focusMain();
}
function toneSVG(n){const paths=['','M10 14 L100 14','M10 37 L100 8','M10 20 Q50 64 100 9','M10 8 L100 39'];return '<svg class="tone-line" viewBox="0 0 110 50" aria-hidden="true"><path d="'+paths[n]+'" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';}
function cardText(target,showText=true){return '<span class="py">'+esc(label(target))+'</span>'+(showText&&target.text?'<span class="hz">'+esc(target.text)+'</span>':'');}
function drawTask(){
  const q=current();if(!q){finish();return;}const t=index.get(q.targetId),g=currentGame(),s=currentSettings(),game=data.games.find(x=>x.id===g);
  if(!q.recorded&&(q.practiceVersion!==4||q.targets.some(tid=>index.get(tid).groupNumber>s.group))){
    const pool=getPool(g,s),task=pool.find(x=>x.id===q.id)||pool.find(x=>x.targetId===q.targetId);
    if(task)round.tasks[round.index]=makeQuestion({...task,phase:q.phase,reason:q.reason},g,s,round.tasks);
    else {q.skipped=true;q.skipReason='practice-updated';round.index++;}
    saveDraft();status('未完成的题目已按新版调整；已完成记录保留。');drawTask();return;
  }
  if(['mail','tone','train'].includes(g)&&!q.recorded&&(!t.audio||t.qualityHold)){
    q.skipped=true;q.skipReason='audio-not-ready';round.index++;saveDraft();
    status('上一轮有尚未接入录音的听音题，已略过；已完成的记录保留。');drawTask();return;
  }
  let body='',heading=game.name,help='不会时，可以一起做一次，再换个题目。';
  if(g==='mail'||g==='tone'){
    heading=g==='mail'?'把声音送到正确的卡片':'声音走的是哪条小路？';
    body='<div class="task-prompt"><span style="font-size:58px" aria-hidden="true">'+icons[g]+'</span><p>先听一听，再来选择。</p><div class="actions">'+audioButton(t,true)+btn('请家长读任务音','parent-prompt','','quiet')+'</div>'+(q.stimulus?'<p class="subtle">听过以后再选；可以重复听。</p>':'')+'</div>';
    if(q.parentPrompt)body+='<div class="notice">家长读 <strong class="medium-pinyin">'+esc(label(t))+'</strong>，请先遮住这一行，不指向答案。'+(t.kind==='initial'?'这是声母认读活动，不是连续拼读。':'')+'</div>';
    help='家长正常读出目标音，让孩子在卡片或四声路线中选择。不要用路线名称提示答案。重复听题音不算额外帮助。';
  }
  if(g==='train'||g==='change'){
    heading=g==='train'?'听声音，把小火车接好':'换一张卡，读出新声音';
    if(g==='change'){const from=index.get(q.fromId);body='<p class="task-prompt"><span class="medium-pinyin">'+esc(from.label)+'</span> 出发，把第 '+(q.missing+1)+' 张卡换成 <b class="medium-pinyin">'+esc(t.parts[q.missing])+'</b>。</p>';}
    else {
      body='<div class="task-prompt"><span style="font-size:58px" aria-hidden="true">🚂</span><p>先听完整音节，再选缺少的那张卡。</p><div class="actions">'+audioButton(t,true)+(!q.answered?btn('请家长读任务音','parent-prompt','','quiet'):'')+'</div></div>';
      if(q.parentPrompt&&!q.answered)body+='<div class="notice">家长读 <strong class="medium-pinyin">'+esc(t.label)+'</strong>，请先遮住这一行，不指向答案。</div>';
    }
    body+='<div class="train">'+t.parts.map((p,i)=>'<span class="car '+(g==='train'&&i===q.missing&&!q.answered?'empty':g==='change'&&i===q.missing?'changed':'')+'">'+esc(g==='train'&&i===q.missing&&!q.answered?'？':p)+'</span>').join('<span aria-hidden="true">＋</span>')+'</div>'+(q.answered?'<p class="task-prompt big-pinyin">'+esc(t.label)+'</p>':'');
    if(g==='change'&&!q.answered)body+='<p class="task-prompt">新卡片已经换好，试着把新的声音连起来读。</p><div class="actions">'+btn('读好了，请家长听','oral-ready')+'</div>';
    help=(g==='train'?'先只听完整音节，让孩子选缺少的部分；选好后再读。听后读出不记为独立拼读。需要示范时，':'家长示范时，')+'声母读得轻短'+(t.parts.length===3?'，中间介音轻快':'')+'，紧接韵母连成一个音节。不要把各部分读成几个汉字。';
  }
  if(g==='repair'){heading='给拼音修一修';body='<div class="task-prompt"><span style="font-size:52px" aria-hidden="true">🧰</span><p>'+esc(t.prompt)+'</p></div>';help=t.tip;if(s.mode==='guided')body+='<p class="notice">'+esc(t.tip)+'</p>';}
  if(g==='object'){heading='读一读，找到它';body='<div class="task-prompt big-pinyin">'+esc(t.pinyin)+'</div>'+(s.mode==='guided'?'<p class="task-prompt hz">'+esc(t.text)+'</p>':'')+'<p>先读词语，再点对应的物品。图片看不明白时，可以请家长说明图片是什么。</p>';help='先让孩子读拼音，再找图。若图片不清楚，告诉孩子图中物品名称，并将本次记为有帮助。不要仅凭选对图片认定会拼读。';}
  if(g==='list'){
    heading='照着清单，装好小篮子';body='<div class="shopping">'+q.targets.map(tid=>{const w=index.get(tid);return '<div class="shopping-item '+(q.chosen.includes(tid)?'collected':'')+'"><span class="py">'+esc(w.pinyin)+'</span>'+(s.mode==='guided'?'<div>'+esc(w.text)+'</div>':'')+'<div>'+(q.chosen.includes(tid)?'✓ 已找到':'等你来找')+'</div>'+(w.audio?btn('听这一项','answer-audio',w.id,'quiet'):'<small>请家长示范</small>')+'</div>';}).join('')+'</div><p>读清单，把需要的东西都放进篮子。顺序可以不同。</p>';help='先读一项、找一样；熟悉后再尝试整张清单。找齐物品和自己读出清单分开记录。';
  }
  if(g==='sentence'){
    heading='把词语排成一句话';body='<p>先读词块，再排成通顺的句子。点已选词块可以撤回；排好后再看汉字。</p><div class="selected-strip" aria-label="已排好的句子">'+q.chosen.map(i=>'<button class="chunk" data-action="unchunk" data-value="'+i+'" '+(q.answered?'disabled':'')+'><span class="py">'+esc(t.chunks[i].pinyin)+'</span>'+(s.mode==='guided'||q.answered||q.reveal?esc(t.chunks[i].text):'')+'</button>').join('')+'</div><div class="chunks">'+q.chunkOrder.map(i=>'<button class="chunk" data-action="chunk" data-value="'+i+'" '+(q.chosen.includes(i)||q.answered?'disabled':'')+'><span class="py">'+esc(t.chunks[i].pinyin)+'</span>'+(s.mode==='guided'||q.answered||q.reveal?esc(t.chunks[i].text):'')+'</button>').join('')+'</div>'+
      '<div class="actions">'+(!q.answered?btn('读读排好的句子','check-sentence','','soft'):'')+'</div>';
    if(q.alternative&&!q.answered)body+='<div class="feedback-box"><p>和例句顺序不同。请家长听一听：意思清楚、语句通顺，也可以成立。</p><div class="actions">'+btn('家长确认这句也通顺','accept-sentence','','soft')+btn('一起再排一排','sentence-help','','quiet')+'</div></div>';
    help='先把各个词块读明白，再试着连成一句话。意思通顺的其他排列可由家长确认；这里不把只有一种顺序当成所有句子的标准。';
  }
  if(g==='story'){
    heading=q.answered?t.title:'读一读，再回答';body='<span class="pill">'+(t.level==='shared'?'亲子共读 · 孩子读绿色部分':t.level==='simple'?'短篇阅读':'故事阅读')+'</span><div class="book">';
    if(t.level==='shared')body+='<p>'+t.segments.map(seg=>seg.role==='child'?'<span class="child-segment"><span class="py">'+esc(seg.pinyin)+'</span>'+esc(seg.text)+'</span>':'<span class="parent-segment">'+esc(seg.text)+'</span>').join('')+'</p>';
    else body+=readingSentences(t);
    body+='</div>'+(t.level==='shared'?'<details class="panel"><summary>需要时逐句听</summary>'+readingSentences(t,false)+'</details>':'')+'<p><strong>读完想一想：</strong>'+esc(t.question)+'</p>'+readingButton(t,'question',0,'听问题')+'<p class="subtle">先让孩子说说自己的想法，家长再记录理解情况。</p>';
    if(!q.answered)body+='<div class="parent"><div class="actions">'+btn('理解了，能回答','story-understood')+btn('一起找到了线索','story-help','','soft')+btn('这次不记录理解','story-unobserved','','quiet')+'</div></div>';
    if(q.answered&&!q.recorded)body+='<details class="parent"><summary>孩子回答后，家长核对</summary><p>可接受的核心意思：'+esc(t.answer)+'。意思对即可，不要求逐字复述；若需要帮助，可点“一起做一次”。</p>'+readingButton(t,'answer',0,'听回答线索')+'</details>';
    help=t.level==='shared'?'家长读灰色文字，孩子只尝试绿色目标。家长读分工内的灰色文字不算帮助孩子读目标；示范绿色部分或直接给出答案时，请点“一起做”。':'先让孩子读懂消息，再说出线索。可以反复回看；家长说出答案或代读孩子的部分时记为有帮助。';
  }
  if(g==='teacher'){
    heading='读给小熊老师听';body='<div class="task-prompt"><span aria-hidden="true" style="font-size:54px">🧸</span><p>这次请你当小老师。</p><div class="big-pinyin">'+esc(label(t))+'</div>'+(s.mode==='guided'&&t.text?'<p class="hz">'+esc(t.text)+'</p>':'')+'</div><p>试着读出来。如果是词语，还可以说说它是什么意思。</p>';q.answered=true;help='给孩子几秒钟想一想。能读出才记录“自己读出”；犹豫时示范一次，记录为帮助后读出。不用根据口音给孩子打分。';
  }
  const hasChoices=!!q.choices;
  if(hasChoices)body+='<div class="choices '+(g==='tone'?'tone-choices':'')+'" aria-label="选择答案">'+q.choices.map(c=>'<button class="choice '+((g==='list'?q.chosen.includes(c.value):q.answered&&c.value===q.answer)?'correct':'')+'" data-action="choose" data-value="'+esc(c.value)+'" '+(q.answered||(g==='list'&&q.chosen.includes(c.value))?'disabled':'')+'>'+(g==='tone'?toneSVG(Number(c.value))+esc(c.label):c.icon?'<span class="picture" role="img" aria-label="'+esc(c.label)+'">'+pictureHTML(c.icon,c.label)+'</span>'+(s.mode==='guided'?'<small>'+esc(c.label)+'</small>':''):esc(c.label))+'</button>').join('')+'</div>';
  if(q.useDemand&&q.answered&&!q.recorded)body+='<p class="use-prompt">再用这个词说说：你想拿它做什么，或它是什么意思？</p>';
  body+='<div class="task-message" role="status">'+esc(q.message||(q.answered?'这一步完成了。':'慢慢来，先想一想。'))+'</div>';
  if(q.reveal)body+='<div class="notice">'+esc(help)+(['train','change'].includes(g)&&!q.answered?'<p class="medium-pinyin">'+t.parts.map(esc).join(' ＋ ')+' → '+esc(t.label)+'</p>':'')+(['mail','tone'].includes(g)?'<p class="medium-pinyin">'+esc(label(t))+'</p>':'')+(g==='sentence'?'<p>'+esc(t.text)+'</p>':'')+(g==='story'?'<p>一起在文中找：'+esc(t.answer)+'</p>':'')+(t.text&&['object','teacher'].includes(g)?'<p>'+esc(t.text)+'</p>':'')+'</div>';
  if(!q.recorded)body+='<div class="actions">'+(!['mail','tone','train','repair','list'].includes(g)?audioButton(t):'')+((q.reveal||q.answered)&&['train','change','teacher'].includes(g)?slowButton(t):'')+btn(g==='train'?'看一次示范':'需要一点提示','hint','','quiet')+btn('一起做一次','together','','quiet')+btn('这题先跳过','skip','','quiet')+'</div>';
  if(q.answered&&!q.recorded){
    const oralGame=['train','change','object','list','sentence','story','teacher'].includes(g);
    body+='<div class="parent"><strong>'+(oralGame?'家长听一听：'+(g==='story'&&t.level==='shared'?'孩子自己的绿色部分':'这次的口读表现'):'记下这次的选择表现')+'</strong><div class="actions">'+(oralGame?btn(q.useDemand?(q.helped?'帮助后读出并说明白了':'自己读出并说明白了'):q.helped?'帮助后读出了':g==='train'?'听后读出了':'自己读出了','observe','read')+btn('和家长一起读','observe','together','soft')+btn('这次没观察口读','observe','unobserved','quiet'):btn('记下这次，继续','observe','unobserved'))+'</div><p class="subtle">'+(g==='train'?'选对卡片与听后口读分别保存；听过目标音再读出，不记为独立拼读。':oralGame?'选择、排列或理解的表现与口读分别保存。没有观察口读时，不计入独立阅读的进阶依据。':'听题声音属于任务本身；额外提示和一起做会另外记录。')+'</p></div>';
  }
  if(q.recorded)body+='<div class="actions">'+btn(round.index+1<round.tasks.length?'下一个小任务 →':'收好这一轮','next')+'</div>';
  main.innerHTML='<section class="task"><div class="task-head"><div><span class="eyebrow">'+esc(round.type==='today'?(phaseNames[q.phase]||'小任务')+' · '+game.name:game.name)+' · '+(round.index+1)+' / '+round.tasks.length+'</span><div class="progress-dots" aria-label="本轮进度">'+round.tasks.map((_,i)=>'<span class="dot '+(i<round.index?'done':i===round.index?'now':'')+'"></span>').join('')+'</div></div>'+btn('休息一下','home','','quiet')+'</div><div class="task-board"><h1>'+esc(heading)+'</h1>'+body+'</div><details class="panel"><summary>这一题家长怎么陪</summary><p>'+esc(help)+'</p></details></section>';
}
function choose(value){
  const q=current();if(!q||q.recorded||q.answered)return;const g=currentGame();
  if(['mail','tone','train'].includes(g)&&!q.stimulus&&!(g==='train'&&q.reveal)){q.message='先点听任务声音，或请家长读任务音，再来选择。';drawTask();return;}
  if(g==='list'){
    if(!q.targets.includes(value)){q.helped=true;q.message='这一样不在清单里。再读读清单，看看还缺什么。';}
    else {if(!q.chosen.includes(value))q.chosen.push(value);q.message='放进篮子啦。';if(q.chosen.length===q.targets.length){q.answered=true;q.message='清单上的东西都找齐了！';}}
  }else if(value!==q.answer){q.helped=true;q.message=g==='train'?'再听一次，看看缺少的部分；也可以看示范。':'再看一看、读一读，可以点提示。';}
  else {q.answered=true;q.message='找到啦！'+(['train','change'].includes(g)?'再试着把它连起来读。':'');}
  if(q.answered)q.result=q.helped?'after-help':'independent';saveDraft();if(q.answered&&['mail','tone','repair'].includes(g)){observe('unobserved');return;}drawTask();
}
function observe(choice){
  const q=current();if(!q||!q.answered||q.recorded||unreadable!==null)return;stop();
  const oral=oralOutcome(choice,q.helped||currentGame()==='train'),result=['teacher','change'].includes(currentGame())?'unobserved':q.result||(q.helped?'after-help':'independent');
  const event={id:id(),game:currentGame(),skill:SKILLS[currentGame()],targetId:q.targetId,targets:q.targets,taskId:q.id,group:round.settings.group,mode:q.mode||round.settings.mode,helped:q.helped,oral,result:result==='independent'&&q.helped?'after-help':result,at:new Date().toISOString(),session:round.session,variant:q.variant,contextKey:q.contextKey||'',...(currentGame()==='change'?{fromId:q.fromId,novel:!!q.novel}:{}),...(q.useDemand?{usage:oral}: {})};
  persist({...records,events:[...records.events,event],recent:[...records.recent,q.id].slice(-60)});
  q.recorded=true;q.oral=oral;q.message='已记录。'+(choice==='unobserved'?'口读未观察，不算答错。':oral==='independent'?'这次是自己读出的。':oral==='after-help'?currentGame()==='train'&&!q.helped?'这次听后读出了。':'这次在帮助后读出了。':'这次一起读了一遍。');saveDraft();drawTask();
}
function finish(){
  stop();const done=round?.tasks.filter(q=>q.recorded)||[];
  const found=[...new Set(done.map(q=>q.targetId))].map(id=>index.get(id));
  main.innerHTML='<section class="panel finish"><div class="flowers" aria-hidden="true">🌱 🌷 🌼</div><h1>这一小段，走完啦</h1><p>完成了 '+done.length+' 个小任务。现在可以休息，也可以换一种玩法。</p><div class="discovery-cards">'+found.map(t=>'<span><b>'+pictureHTML(t.picture?.icon,t.text)+'</b><span class="py">'+esc(label(t))+'</span></span>').join('')+'</div><p class="subtle">下次会换一些内容，也会照顾需要再练的地方。</p><div class="actions">'+btn('收好，回到首页','home')+btn('自己选个游戏','games','','soft')+'</div></section>';
  if(round){round.index=round.tasks.length;saveDraft();}
}
function routeHTML(){return '<details class="panel"><summary>调整学习组 · 完整20组路线</summary><p class="subtle">选中某组表示使用范围，不表示已经掌握。</p><div class="route">'+data.groups.map(g=>'<button data-action="group" data-value="'+g.number+'" aria-current="'+(g.number===settings.group)+'"><span class="num">'+String(g.number).padStart(2,'0')+'</span>'+esc(g.title)+'</button>').join('')+'</div></details>';}
function audioCoverageHTML(){const c=data.coverage;return '<details class="panel"><summary>课程范围与声音进度</summary><p>'+c.words+'条词条、'+c.sentences+'条短句、'+c.readings+'篇阅读，分布在20个学习组。</p><p>当前可听：基础认读 '+c.foundationAudio+'/63；非轻声音节 '+c.syllableAudio+'/'+c.standaloneSyllables+'；轻声词例 '+c.neutralContextAudio+'/'+c.neutralToneTargets+'；词条 '+c.wordAudio+'/'+c.words+'；短句 '+c.sentenceAudio+'/'+c.sentences+'；整篇阅读 '+c.readingAudio+'/'+c.readings+'；阅读分句 '+c.readingSentenceAudio+'/140。</p><p>59个拼读练习目标均可听完整音节，58个另有保持音高的慢听。专门连续拼读示范 '+data.audioPolicy.continuousDemonstrationsReady+'/59，仍待补齐。“弟弟拿梨”目前提供逐词慢读，自然单句另行补充。</p><p><a href="course-audio-sources.html">声音来源与用途</a> · <a href="course-audio-review-v16.html">家长语音核听</a></p><p class="subtle">当前为本地试用，需要电脑运行。离线整合及苹果设备断网验收尚未完成。</p></details>';}
function drawRecords(){
  const observed=records.events.filter(e=>e.oral!=='unobserved'||e.result!=='unobserved'),oral=records.events.filter(e=>e.oral==='independent'),reviews=[];
  for(const [tid,t] of index)for(const skill of Object.values(SKILLS)){const e=evidence(records.events,tid,skill);if(e.due)reviews.push({t,skill,e});}
  const progress=groupProgress(data,records,settings.group);
  main.innerHTML='<section class="learning-header"><div><span class="eyebrow">家长</span><h1>看见孩子怎样学会</h1><p>第 '+settings.group+' 组 · '+esc(data.groups[settings.group-1].title)+'</p></div>'+btn('回到本次学习','home','','quiet')+'</section><section class="panel"><h2>本组的关键能力</h2>'+capabilityHTML(progress)+'<p class="notice">'+(progress.ready?'关键能力已有分开的独立观察，可以尝试下一组，并继续复习。':'继续练：'+esc(progress.next?.title||'当前内容')+'。点击正确、听后跟读和独立拼读分开记录。')+'</p><div class="actions">'+(settings.group<20?btn(progress.ready?'尝试下一组':'家长自行选择下一组','next-group','','soft'):'')+'</div><p class="subtle">旧记录保留。新版建议同时检查拼读和应用；未观察不算失败，家长可以调整范围。</p></section>'+settingsHTML()+routeHTML()+audioCoverageHTML()+'<section class="panel"><h2>学习记录</h2><p>不同本领分别记录。选对图片、听懂故事、独立拼读，各有自己的观察结果。</p><div class="stats"><div class="stat"><b>'+observed.length+'</b><span>次有效观察</span></div><div class="stat"><b>'+oral.length+'</b><span>次独立口读</span></div><div class="stat"><b>'+reviews.length+'</b><span>项到期或需要帮助</span></div></div><div class="actions">'+btn(unreadable!==null?'导出原始待修复记录':'导出拼音记录','export')+btn('导入并合并记录','import','','soft')+'</div><p class="subtle">在 iPad 导出后，可在手机导入。相同记录只保留一份；这个入口只处理新版拼音记录，原识字和旧拼读记录保留在原入口。</p>'+(unreadable!==null?'<p class="notice error">现有记录未能读取，原内容没有覆盖。先导出保留，再导入有效备份。</p>':'')+'</section>'+
    '<section class="panel"><h2>下次可以复习</h2><div class="review-items">'+(reviews.length?reviews.slice(0,30).map(({t,skill,e})=>'<div class="list-row"><div class="grow"><span class="py">'+esc(label(t))+'</span><small>'+esc(skillNames[skill])+' · '+(e.needs?'最近需要帮助':'到了再见一次的时候')+'</small></div>'+btn('看看卡片','lesson',t.id,'quiet')+'</div>').join(''):'<p>暂时没有到期内容。完成练习后，帮助较多的项目会优先出现；独立完成后，隔几天再复习。</p>')+'</div><p class="subtle">认读和拼读参考不同日期的独立表现；换组合另看是否真正读出新的有效组合。每天反复点同一题不会替代这些观察。</p></section>'+
    '<section class="panel"><h2>最近的观察</h2><div class="table-wrap"><table><thead><tr><th>内容</th><th>活动</th><th>任务表现</th><th>口读表现</th></tr></thead><tbody>'+records.events.slice(-30).reverse().map(e=>'<tr><td>'+esc(label(index.get(e.targetId)))+'<br><small>'+esc(new Date(e.at).toLocaleDateString('zh-CN'))+'</small></td><td>'+esc(skillNames[e.skill])+'</td><td>'+outcomeLabel(e.result)+'</td><td>'+outcomeLabel(e.oral)+'</td></tr>').join('')+'</tbody></table></div></section>';
}
function outcomeLabel(value){return {independent:'独立完成','after-help':'帮助后完成',together:'一起完成',unobserved:'未观察'}[value];}
function library(){
  const list=data[libraryType].filter(t=>t.groupNumber<=settings.group&&(!libraryQuery||(label(t)+' '+hz(t)+' '+(t.title||'')).includes(libraryQuery)));
  main.innerHTML='<section class="panel"><h1>课程卡片</h1><p>当前范围：第 1～'+settings.group+' 组。全部内容已经编入，可在家长页调整范围查看。</p><div class="library-filters"><select id="library-type" aria-label="卡片类别">'+options([['foundations','声母、韵母、整体认读'],['syllables','带调音节'],['words','词语'],['sentences','短句'],['readings','阅读']],libraryType)+'</select><input type="search" id="library-search" aria-label="搜索课程卡片" placeholder="输入汉字或带调拼音" value="'+esc(libraryQuery)+'"></div><p class="subtle">找到 '+list.length+' 项。点卡片查看示范和家长提示。</p><div>'+list.slice(0,libraryLimit).map(t=>'<div class="list-row"><div class="grow"><span class="py">'+esc(t.title||label(t))+'</span><small>'+esc(t.title?'第 '+t.groupNumber+' 组起':hz(t))+' '+(t.qualityHold?' · 单字录音待复核':'')+'</small></div>'+btn('打开卡片','lesson',t.id,'quiet')+'</div>').join('')+'</div>'+(list.length>libraryLimit?btn('再显示 30 项','more','','soft'):'')+'</section>';
}
function lesson(){
  const t=index.get(lessonId);if(!t){nav('home');return;}
  let content='<div class="big-pinyin">'+esc(label(t))+'</div>'+(t.text?'<p class="hz">'+esc(t.text)+'</p>':'');
  if(t.title)content='<h2>'+esc(t.title)+'</h2><div class="book">'+readingSentences(t)+'</div><p>'+esc(t.question)+'</p>'+readingButton(t,'question',0,'听问题');
  if(t.recognitionTip)content+='<p class="subtle">'+esc(t.recognitionTip)+'</p>';
  if(t.contextExample)content+='<div class="book"><p class="medium-pinyin">'+esc(t.contextExample.pinyin)+'</p><p>'+esc(t.contextExample.text)+'</p></div>';
  if(t.audioPendingReason)content+='<p class="notice">'+esc(t.audioPendingReason)+'</p>';
  if(t.prompt)content='<p>'+esc(t.prompt)+'</p><p class="medium-pinyin">'+esc(t.answer)+'</p><p>'+esc(t.tip)+'</p>';
  main.innerHTML='<section class="panel lesson-card"><span class="pill">第 '+t.groupNumber+' 组起</span>'+content+(t.tone!==5&&t.parts&&['two-part','three-part'].includes(t.mode)?'<div class="train">'+t.parts.map(p=>'<span class="car">'+esc(p)+'</span>').join('＋')+'</div><p class="subtle">家长示范轻短声母并连读。下面可听完整音节；慢听后再用正常速度读一次。</p>':'')+(t.qualityHold?'<p class="notice">这个音节的录音还在复核，暂由家长示范。'+(t.token==='xiao3'?'“小”按第三声 xiǎo 学习。':'')+'</p>':'')+'<div class="actions">'+audioButton(t)+slowButton(t)+btn('回到课程卡片','library','','quiet')+'</div><p class="subtle">卡片用于认识和示范，不自动增加独立掌握记录。可以回到游戏，观察孩子自己的尝试。</p></section>';
}
async function exportRecords(){
  try{if(unreadable!==null){downloadRaw();return;}persist(records);await downloadFamily({[RECORD_KEY]:JSON.stringify(records),[SETTINGS_KEY]:JSON.stringify(settings),...(round?{[draftKey]:JSON.stringify(round)}:{})});status('识字、拼音与拼读练习的全部记录已准备下载。');}catch(err){status(err.message+' 请先在家长页导出原始记录备份。',true);}
}
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>20*1024*1024)throw Error('请选择20MB以内的学习记录。');await importFamily(JSON.parse(await file.text()));refreshRecords();unreadable=null;status('全部学习记录已合并，同一条记录不会重复累计。');nav('records');}
  catch(err){status(err.message||'未导入，当前记录保持原样。',true);}finally{e.target.value='';}
});
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{if(data)nav(b.dataset.nav);}));
main.addEventListener('change',e=>{
  if(e.target.id.startsWith('setting-')){const opened=[...main.querySelectorAll('details[open]')].map(d=>d.querySelector('summary')?.textContent);const key=e.target.id.slice(8);settings=validSettings({...settings,[key]:['group','length'].includes(key)?Number(e.target.value):e.target.value});saveSettings();pools.clear();render();main.querySelectorAll('details').forEach(d=>{if(opened.includes(d.querySelector('summary')?.textContent))d.open=true;});}
  if(e.target.id==='library-type'){libraryType=e.target.value;libraryLimit=30;library();}
});
main.addEventListener('input',e=>{if(e.target.id==='library-search'){libraryQuery=e.target.value;libraryLimit=30;const pos=e.target.selectionStart;library();const input=$('library-search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}}});
main.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b||!data)return;const action=b.dataset.action,value=b.dataset.value,q=current(),t=q?index.get(q.targetId):null;
  if(action==='home')nav('home');
  if(action==='games')nav('games');
  if(action==='parent')nav('records');
  if(action==='today')startToday();
  if(action==='review')startToday(true);
  if(action==='storytime'){storyTimeId=null;nav('storytime');}
  if(action==='story-open'){storyTimeId=value;nav('storytime');}
  if(action==='library')nav('library');
  if(action==='library-group'){libraryType='words';libraryQuery='';nav('library');}
  if(action==='group'||action==='next-group'){settings.group=action==='group'?Number(value):Math.min(20,settings.group+1);saveSettings();nav('home');}
  if(action==='start')start(value);
  if(action==='resume'&&round){view='task';drawTask();focusMain();}
  if(action==='lesson'){lessonId=value;nav('lesson');}
  if(action==='more'){libraryLimit+=30;library();}
  if(action==='export')exportRecords();
  if(action==='import')$('import-file').click();
  if(action==='prompt-audio'||action==='answer-audio'){const target=index.get(value);if(target)play(target.audio,label(target),action==='prompt-audio');}
  if(action==='slow-audio'){const target=index.get(value);if(target?.slowListening)play(target.audio,label(target)+' · 完整音节慢听',false,target.slowListening.rate);}
  if(action==='context-audio'){const target=index.get(value);if(target?.contextAudio)play(target.contextAudio,'词例 '+target.contextExample.pinyin);}
  if(action==='reading-audio'){
    const [targetId,field,number]=value.split('|'),target=index.get(targetId);
    if(target?.sentences&&['sentence','question','answer','title'].includes(field)){
      const record=field==='sentence'?target.sentences[Number(number)]?.audio:target[field+'Audio'];
      play(record,target.title+' · '+(field==='sentence'?'第 '+(Number(number)+1)+' 句':field==='question'?'问题':field==='answer'?'回答线索':'标题'),field==='question');
    }
  }
  if(!q||q!==current()||q.recorded){if(action==='next'&&q?.recorded){stop();round.index++;saveDraft();drawTask();focusMain();}return;}
  if(action==='parent-prompt'){q.parentPrompt=true;q.stimulus=true;saveDraft();drawTask();}
  if(action==='choose')choose(value);
  if(action==='oral-ready'&&currentGame()==='change'){q.answered=true;q.result='unobserved';q.message='请家长听一听刚才读出的声音，再记录。';saveDraft();drawTask();}
  if(action==='hint'){q.helped=true;q.reveal=true;saveDraft();drawTask();}
  if(action==='skip'){stop();q.skipped=true;round.index++;saveDraft();drawTask();focusMain();}
  if(action==='together'){
    q.helped=true;q.reveal=true;q.answered=true;q.result='together';
    if(currentGame()==='list')q.chosen=[...q.targets];if(currentGame()==='sentence')q.chosen=t.chunks.map((_,i)=>i);
    q.message='和家长一起做完，再试着读一读。';saveDraft();drawTask();
  }
  if(action==='chunk'&&!q.answered){const n=Number(value);if(!q.chosen.includes(n))q.chosen.push(n);q.alternative=false;saveDraft();drawTask();}
  if(action==='unchunk'&&!q.answered){q.chosen=q.chosen.filter(n=>n!==Number(value));q.alternative=false;saveDraft();drawTask();}
  if(action==='check-sentence'){
    if(q.chosen.length!==t.chunks.length)q.message='先把每个词块都放进句子里。';
    else if(q.chosen.map(i=>t.chunks[i].text).join('')===t.chunks.map(c=>c.text).join('')){q.answered=true;q.result=q.helped?'after-help':'independent';q.message='句子排好了，试着连起来读。';}
    else {q.alternative=true;q.message='把现在这句话读给家长听，看看意思是否通顺。';}
    saveDraft();drawTask();
  }
  if(action==='accept-sentence'){q.answered=true;q.result=q.helped?'after-help':'independent';q.message='家长确认这也是一句通顺的话。';saveDraft();drawTask();}
  if(action==='sentence-help'){q.helped=true;q.reveal=true;q.message='一起看看例句，再试一试。';saveDraft();drawTask();}
  if(['story-understood','story-help','story-unobserved'].includes(action)){
    if(action==='story-help')q.helped=true;
    q.answered=true;q.result=action==='story-unobserved'?'unobserved':q.helped?'after-help':'independent';q.message='理解情况已选好，再记录口读表现。';saveDraft();drawTask();
  }
  if(action==='observe')observe(value);
});
async function load(){
  const response=await fetch('course-data.json',{cache:'no-store'});if(!response.ok)throw Error('课程文件未能读取。');data=await response.json();index=targetIndex(data);
  try{settings=validSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'));}catch{}
  try{const raw=localStorage.getItem(RECORD_KEY);if(raw){try{records=validateRecords(JSON.parse(raw),index);}catch{unreadable=raw;}}}catch{}
  try{const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(d&&d.version===1&&GAMES.includes(d.game)&&typeof d.session==='string'&&d.settings&&JSON.stringify(validSettings(d.settings))===JSON.stringify(d.settings)&&Number.isInteger(d.index)&&d.index>=0&&Array.isArray(d.tasks)&&d.tasks.length<=7&&d.index<=d.tasks.length&&d.tasks.every(q=>index.has(q.targetId)&&Array.isArray(q.targets)&&q.targets.every(tid=>index.has(tid)&&recordGroupAllowed(index.get(tid),d.settings.group))&&(!q.game||GAMES.includes(q.game))&&(!q.mode||['guided','try','apply'].includes(q.mode))&&Array.isArray(q.chosen)&&typeof q.variant==='string'&&typeof q.helped==='boolean'))round=d;}catch{}
  $('literacy-link').href='../literacy.html';
  status(unreadable!==null?'原记录已保留，请先到家长记录处理。':'课程已准备好。从孩子熟悉的一组开始即可。',unreadable!==null);home();
}
load().catch(error=>{status(error.message+' 请确认本地服务运行后重新打开。',true);});





