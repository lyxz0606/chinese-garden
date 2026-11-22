import {ReaderAudio,readerReady} from './reader-audio.js';
const status=document.getElementById('status'),groups=document.getElementById('groups');
let selected=null;
const audio=new ReaderAudio(message=>status.textContent=message,active=>{
  document.querySelectorAll('[aria-pressed="true"]').forEach(button=>button.setAttribute('aria-pressed','false'));
  if(active&&selected){selected.button.setAttribute('aria-pressed','true');status.textContent='正在播放：'+selected.label;}
  else status.textContent='选择一个字词试听';
});
document.getElementById('stop').addEventListener('click',()=>audio.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();});
try{
  const [ready,response]=await Promise.all([readerReady,fetch('./pronunciation-guide.json')]);
  if(!ready||!response.ok)throw Error('unavailable');
  const data=await response.json();
  for(const group of data.groups){
    const article=document.createElement('article');article.className='card';
    const title=document.createElement('h2');title.textContent=group.title;title.style.fontSize='26px';
    const note=document.createElement('p');note.className='hint';note.textContent=group.note;
    article.append(title,note);
    for(const item of group.items){
      const button=document.createElement('button');button.className='choice review-choice';button.type='button';
      const label=document.createElement('span');label.textContent=item.label||item.text;
      const pinyin=document.createElement('small');pinyin.textContent=item.pinyin;
      button.append(label,pinyin);button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',`${item.label||item.text}，${item.pinyin}`);
      button.dataset.text=item.text;if(item.context)button.dataset.context=item.context;
      button.addEventListener('click',()=>{selected={button,label:item.label||item.text};audio.speak(item.text,{rate:.8,context:item.context});});
      article.append(button);
    }
    groups.append(article);
  }
  document.getElementById('loading').hidden=true;
}catch{document.getElementById('loading').textContent='读音内容未能载入，请返回小花园或刷新重试。';}
