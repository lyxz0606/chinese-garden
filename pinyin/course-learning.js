// Capability summaries and a short mixed activity plan. No family records are changed here.
const day=at=>{const d=new Date(at);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
const independent=e=>!e.helped&&e.mode!=='guided';
const spoken=e=>independent(e)&&e.oral==='independent';
const understood=e=>spoken(e)&&e.result==='independent';
const label=t=>t.label||t.pinyin||t.text;

function observation(events,filter,passed){
  const rows=events.filter(filter).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const observed=rows.filter(e=>e.oral!=='unobserved'||e.result!=='unobserved');
  const good=observed.filter(passed),days=new Set(good.map(e=>day(e.at)));
  return {seen:rows.length>0,attempts:observed.length,independent:good.length,days:days.size,
    stable:days.size>=2&&!!observed.length&&passed(observed[observed.length-1]),last:observed[observed.length-1]};
}
export function hasIndependentOral(records,id,before=Infinity){
  return records.events.some(e=>e.targets.includes(id)&&Date.parse(e.at)<before&&spoken(e));
}
function targetsBucket(key,title,targets,need,records,filter,passed,description){
  const rows=targets.map(t=>({id:t.id,label:label(t),...observation(records.events,e=>e.targets.includes(t.id)&&filter(e),passed)}));
  const required=Math.min(need,rows.length),count=Math.min(required,rows.filter(t=>t.stable).length);
  return {key,title,description,count,total:required,available:rows.length,ready:required>0&&count>=required,targets:rows,
    nextTargetIds:rows.filter(t=>!t.stable).sort((a,b)=>Number(b.seen)-Number(a.seen)).map(t=>t.id)};
}
export function groupProgress(data,records,group){
  const buckets=[],foundations=data.foundations.filter(t=>t.groupNumber===group);
  if(group===2){
    const rows=[1,2,3,4].map(tone=>{
      const ids=new Set(data.toneCards.filter(t=>t.groupNumber<=group&&t.tone===tone).map(t=>t.id));
      return {id:'tone-category-'+tone,label:['','第一声','第二声','第三声','第四声'][tone],
        ...observation(records.events,e=>ids.has(e.targetId)&&e.game==='tone',e=>independent(e)&&e.result==='independent')};
    });
    buckets.push({key:'tone',title:'听辨四声',description:'四种声调分别在不同日期听辨。',count:rows.filter(r=>r.stable).length,total:4,available:4,ready:rows.every(r=>r.stable),targets:rows,
      nextTargetIds:data.toneCards.filter(t=>t.groupNumber<=group&&!rows[t.tone-1].stable).map(t=>t.id)});
  }else if(foundations.length){
    buckets.push(targetsBucket('recognition','看卡认读',foundations,foundations.length,records,e=>e.oral!=='unobserved',spoken,'本组新卡片需要先看卡尝试读，听后复述另记。'));
  }
  if(group>=4){
    const syllables=data.syllables.filter(t=>t.tone!==5&&!t.qualityHold&&t.groupNumber<=group&&['two-part','three-part'].includes(t.mode));
    const fresh=syllables.filter(t=>t.groupNumber===group),focus=fresh.length?fresh:syllables;
    buckets.push(targetsBucket('blending','独立拼读',focus,3,records,e=>['teacher','change'].includes(e.game)&&e.oral!=='unobserved',spoken,'不同日期自己读出至少3个有效音节；接车听后跟读不计入。'));
    const allWords=data.words.filter(t=>t.groupNumber<=group&&t.picture),newWords=allWords.filter(t=>t.groupNumber===group);
    const useWords=newWords.length>=2?newWords:allWords;
    buckets.push(targetsBucket('application','读懂并应用',useWords,2,records,e=>['object','list'].includes(e.game)&&e.oral!=='unobserved',understood,'至少2个词既能自己读出，也能在找物或清单任务中用对。'));
    const allowed=new Set(focus.map(t=>t.id));
    const successful=records.events.filter(e=>e.game==='change'&&allowed.has(e.targetId)&&spoken(e)&&typeof e.fromId==='string'&&hasIndependentOral(records,e.fromId,Date.parse(e.at)));
    const freshSuccess=successful.some(e=>e.novel===true&&!hasIndependentOral(records,e.targetId,Date.parse(e.at)));
    const pairs=new Set(successful.map(e=>e.fromId+'>'+e.targetId)),days=new Set(successful.map(e=>day(e.at)));
    const ready=freshSuccess||(pairs.size>=2&&days.size>=2);
    buckets.push({key:'transfer',title:'换组合再读',description:'从会读的音节换出新音节；若都已读过，则在不同日期独立完成两种换音关系。换选项顺序不计入。',count:ready?1:0,total:1,available:focus.length,ready,targets:[],nextTargetIds:focus.map(t=>t.id)});
  }
  if(group>=19){
    for(const [family,title] of [['tone','标调规则'],['dots','ü的两点'],['separator','隔音规则']]){
      buckets.push(targetsBucket('spelling-'+family,title,data.repairs.filter(t=>t.groupNumber<=group&&t.ruleFamily===family),1,records,e=>e.game==='repair',e=>independent(e)&&e.result==='independent','在不同日期独立处理这一类拼写问题，不用同一种规则的题数代替其他规则。'));
    }
  }
  if(group===20){
    buckets.push(targetsBucket('sentence','读懂短句',data.sentences,3,records,e=>e.game==='sentence'&&e.oral!=='unobserved',understood,'先读懂词块，再组成并独立读出完整意思。'));
    buckets.push(targetsBucket('reading','理解消息',data.readings.filter(t=>t.level!=='shared'),2,records,e=>e.game==='story'&&e.oral!=='unobserved',understood,'独立读简短消息并回答问题；亲子共读另记。'));
  }
  const count=buckets.filter(b=>b.ready).length;
  return {ready:buckets.length>0&&count===buckets.length,count,total:buckets.length,kind:'关键能力',buckets,
    next:buckets.find(b=>!b.ready)||null};
}

// Task complexity is separate from session length; unavailable challenge levels use an explicit simpler task.
export function complexityPool(pool,settings,index,game){
  if(settings.mode==='try')return pool;
  if(game==='sentence'){
    const preferred=pool.filter(q=>{const n=index.get(q.targetId).chunks.length;return settings.mode==='guided'?n<=3:n>=4;});
    return preferred.length?preferred:pool;
  }
  if(game==='story'){
    const preferred=pool.filter(q=>settings.mode==='guided'?index.get(q.targetId).level==='shared':index.get(q.targetId).level!=='shared');
    return preferred.length?preferred:pool;
  }
  if(game==='train'&&settings.mode==='apply'){
    const preferred=pool.filter(q=>index.get(q.targetId).mode==='three-part');return preferred.length?preferred:pool;
  }
  if(game==='teacher'&&settings.mode==='apply'){
    const preferred=pool.filter(q=>q.targetId.startsWith('w'));return preferred.length?preferred:pool;
  }
  if(game==='repair'&&settings.mode==='apply'){
    const preferred=pool.filter(q=>index.get(q.targetId).ruleFamily!=='tone'||q.groupNumber>=4);return preferred.length?preferred:pool;
  }
  return pool;
}

export function buildLearningPlan(data,records,settings,services){
  const {pool,choose,evidence,skills}=services,progress=groupProgress(data,records,settings.group),jobs=[],used=new Set();
  const modeFor=id=>records.events.some(e=>e.targets.includes(id))?'try':'guided';
  const add=(game,source,mode,phase,reason)=>{
    const choices=choose(source.filter(q=>!used.has(q.targetId)),1,records,{...settings,scope:'mixed',mode:mode==='auto'?'try':mode},game);
    if(!choices.length||jobs.length>=settings.length)return false;
    const task=choices[0];used.add(task.targetId);jobs.push({...task,game,mode:mode==='auto'?modeFor(task.targetId):mode,phase,reason});return true;
  };
  const base={...settings,mode:'try',scope:'mixed'};
  const get=(game,s=base)=>pool(game,s);
  const reviewGames=['teacher','change','object','list','tone','repair','sentence','story','mail'];
  const reviewLimit=settings.scope==='review'?settings.length:settings.length>=5?2:1;
  for(let i=0;i<reviewLimit;i++){
    let found=false;
    for(const game of reviewGames){
      const due=get(game).filter(t=>evidence(records.events,t.targetId,skills[game]).due);
      if(add(game,due,'try','review','上次需要帮助，或已经到了再练一次的时候。')){found=true;break;}
    }
    if(!found)break;
  }
  if(settings.scope==='review')return {jobs,progress};
  const first=progress.next;
  if(first){
    let game=first.key.startsWith('spelling-')?'repair':({recognition:'teacher',tone:'tone',blending:'teacher',application:'object',transfer:'change',sentence:'sentence',reading:'story'})[first.key];
    const ids=new Set(first.nextTargetIds),candidate=get(game).filter(q=>ids.has(q.targetId)&&(first.key!=='transfer'||hasIndependentOral(records,q.fromId)));
    const target=candidate.find(q=>!used.has(q.targetId));
    if(target){const mode=first.key==='transfer'?'try':'auto';add(game,candidate,mode,'learn',first.title+'：先练当前需要的这一步。');}
  }
  if(settings.group>=4){
    const blends=progress.buckets.find(b=>b.key==='blending'),ids=new Set(blends?.nextTargetIds||[]);
    const candidates=get('teacher').filter(t=>ids.has(t.targetId));
    const target=candidates.find(q=>!used.has(q.targetId));
    if(target)add('teacher',candidates,'auto','learn','把已经学过的部分连起来，自己尝试读音节。');
  }
  const recentGames=records.events.slice(-10).map(e=>e.game);
  const apps=(settings.group>=4?['list','object','sentence','story']:['mail','tone','teacher']).sort((a,b)=>recentGames.filter(g=>g===a).length-recentGames.filter(g=>g===b).length);
  for(const game of apps){
    if(jobs.length>=settings.length)break;
    const source=get(game),target=source.find(q=>!used.has(q.targetId));
    if(target&&add(game,source,'auto','use',settings.group>=4?'把读出的内容用于一个小任务。':'换一种方式，认识刚学过的声音。'))break;
  }
  const transfer=progress.buckets.find(b=>b.key==='transfer');
  if(transfer&&!transfer.ready&&jobs.length<settings.length){
    const possible=get('change').filter(q=>hasIndependentOral(records,q.fromId)&&!records.events.some(e=>e.game==='change'&&e.fromId===q.fromId&&e.targetId===q.targetId&&spoken(e)));
    add('change',possible,'try','use','从会读的音节出发，试一个新的组合。');
  }
  const fallback=['teacher','mail','tone','object','sentence','story','change','repair','list'];
  while(jobs.length<settings.length){
    let found=false;
    const varied=[...fallback].sort((a,b)=>jobs.filter(q=>q.game===a).length-jobs.filter(q=>q.game===b).length);
    for(const game of varied){
      const source=get(game),target=source.find(q=>!used.has(q.targetId));
      if(target&&add(game,source,'auto','practice','换一个内容或玩法，再试一小步。')){found=true;break;}
    }
    if(!found)break;
  }
  return {jobs,progress};
}
