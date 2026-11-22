export const VERSION = '0.4.0';
export const VOWELS = {a:['ā','á','ǎ','à'],o:['ō','ó','ǒ','ò'],e:['ē','é','ě','è'],i:['ī','í','ǐ','ì'],u:['ū','ú','ǔ','ù'],ü:['ǖ','ǘ','ǚ','ǜ']};
export const LETTERS = {
  a:{sound:'a1',tip:'嘴巴张大，听一听，再试着读。'},
  o:{sound:'o1',tip:'嘴巴圆圆，跟着声音读。'},
  e:{sound:'e1',tip:'听清声音，看看家长的口形。'},
  i:{sound:'yi1',tip:'嘴角向两边展开，牙齿靠近。'},
  u:{sound:'wu1',tip:'嘴唇收圆，向前轻轻突出。'},
  ü:{sound:'yu1',tip:'先摆出 i 的口形，再把嘴唇收圆。'},
  m:{sound:'mo1',tip:'双唇合拢，让声音从鼻子出来。拼读时，前面的音轻短。',initial:true},
  b:{sound:'bo1',tip:'双唇先闭合，再轻轻打开。拼读时，前面的音轻短。',initial:true},
  p:{sound:'po1',tip:'双唇先闭合，打开时送出一股气。',initial:true},
  f:{sound:'fo1',tip:'上牙轻触下唇，让气流从缝隙里出来。',initial:true}
};
export const TONES = [
  {id:1,name:'一声',hint:'高高平平',symbol:'ˉ',path:'M18 28 L142 28'},
  {id:2,name:'二声',hint:'往上扬',symbol:'ˊ',path:'M18 80 L142 24'},
  {id:3,name:'三声',hint:'先降再升',symbol:'ˇ',path:'M18 45 Q65 116 87 83 L142 24'},
  {id:4,name:'四声',hint:'往下降',symbol:'ˋ',path:'M18 24 L142 88'}
];
export const SYLLABLES = [
  ['ma1','m','a',1],['mi3','m','i',3],['mu4','m','u',4],['ma3','m','a',3],
  ['ba1','b','a',1],['bi3','b','i',3],['bu4','b','u',4],
  ['pa1','p','a',1],['pa2','p','a',2],['pi2','p','i',2],
  ['fa1','f','a',1],['fu4','f','u',4]
].map(([id,initial,final,tone])=>({id,initial,final,tone,finalLabel:VOWELS[final][tone-1],label:initial+VOWELS[final][tone-1],sound:id}));
export const WORDS = [
  {id:'rice',hanzi:'米',pinyin:'mǐ',sounds:['word-rice'],syllables:['mi3'],description:'一碗大米'},
  {id:'pen',hanzi:'笔',pinyin:'bǐ',sounds:['word-pen'],syllables:['bi3'],description:'一支铅笔'},
  {id:'cloth',hanzi:'布',pinyin:'bù',sounds:['word-cloth'],syllables:['bu4'],description:'一块布'},
  {id:'horse',hanzi:'马',pinyin:'mǎ',sounds:['word-horse'],syllables:['ma3'],description:'一匹马'},
  {id:'wood',hanzi:'木',pinyin:'mù',sounds:['word-wood'],syllables:['mu4'],description:'一段木头'},
  {id:'eight',hanzi:'八',pinyin:'bā',sounds:['word-eight'],syllables:['ba1'],description:'八颗小星星'},
  {id:'rocking-horse',hanzi:'木马',pinyin:'mù mǎ',sounds:['mu4','ma3'],syllables:['mu4','ma3'],description:'一只摇摇木马'}
];
export const ACTIVITIES = {
  mail:{name:'城堡小邮差',short:'听音认读',color:'peach',icon:'mail',description:'听一听，把信送给拼音朋友。'},
  tone:{name:'跟声音走小路',short:'听听四声',color:'mint',icon:'path',description:'小手和声音一起，走过高低小路。'},
  blend:{name:'拼音接车',short:'试着拼读',color:'lavender',icon:'train',description:'让两个声音，变成一个音节。'},
  word:{name:'读词找宝物',short:'读懂词语',color:'sky',icon:'basket',description:'读出小纸条，找到生活里的宝物。'}
};
export const LESSONS = [
  {id:'ao',stage:1,title:'认识 a 和 o',mode:'mail',items:['a','o'],rounds:4,intro:['a','o'],guide:'先各听一遍，再找对应门牌。孩子选好后，可试着看卡读一遍。'},
  {id:'aoe',stage:2,title:'加上新朋友 e',mode:'mail',items:['a','o','e'],rounds:5,intro:['e'],guide:'先认识 e，再与 a、o 混合。选项位置会变化。'},
  {id:'tone14',stage:3,title:'平平走，向下走',mode:'tone',items:['a1','a4'],rounds:4,intro:[],guide:'听 ā、à，用手势跟随声音。先模仿，再选小路。'},
  {id:'tone23',stage:3,title:'向上走，拐个弯',mode:'tone',items:['a2','a3'],rounds:4,intro:[],guide:'听 á、ǎ，手势配合发音。三声这里用单独发音的示范。'},
  {id:'tone-all',stage:3,title:'四条声音小路',mode:'tone',items:['a1','a2','a3','a4'],rounds:5,intro:[],guide:'四声混合听。若某两声容易混淆，回到前一组玩一会儿。'},
  {id:'iu',stage:4,title:'认识 i 和 u',mode:'mail',items:['i','u'],rounds:4,intro:['i','u'],guide:'看看口形，先听再选。可以和已熟悉的 a 一起复习。'},
  {id:'uv',stage:4,title:'认识带两点的 ü',mode:'mail',items:['u','ü'],rounds:4,intro:['ü'],guide:'对比 u 和 ü 的口形与声音。ü 没记住，也可以先用已会韵母拼读。'},
  {id:'vowels',stage:4,title:'韵母朋友来做客',mode:'mail',items:['a','o','e','i','u','ü'],rounds:6,intro:[],guide:'每次出现三个候选。先复习接触过的内容，没学过的可先点听。'},
  {id:'tone-iu',stage:4,title:'给 i、u 换声调',mode:'tone',items:['i1','i3','u1','u4'],rounds:4,intro:[],guide:'先听本轮带调韵母，后面会把它们用于拼读。'},
  {id:'m-first',stage:5,title:'第一次拼出 mā',mode:'blend',items:['ma1'],rounds:3,intro:['m'],guide:'先听完整的 mā，再看拼读示范。孩子愿意跟读即可；跟读与独立拼读分别记录。'},
  {id:'m-mix',stage:5,title:'m 换一节车厢',mode:'blend',items:['ma1','mi3','mu4','ma3'],rounds:4,intro:[],guide:'用已学的韵母换车厢，试着读出 mǐ、mù、mǎ。卡片接好只是准备，读出来才是本轮观察重点。'},
  {id:'b-first',stage:5,title:'b 也来接车',mode:'blend',items:['ba1','bi3','bu4'],rounds:4,intro:['b'],guide:'先认识 b。请孩子尝试拼读，再听示范核对。'},
  {id:'p-first',stage:6,title:'认识 p，试着拼',mode:'blend',items:['pa1','pa2','pi2'],rounds:4,intro:['p'],guide:'p 发音时有较明显的送气。先听，再尝试和 a、i 拼起来。'},
  {id:'f-first',stage:6,title:'认识 f，试着拼',mode:'blend',items:['fa1','fu4'],rounds:4,intro:['f'],guide:'用上牙轻触下唇。能读出 fā 后，再换成 fù。'},
  {id:'blend-mix',stage:6,title:'拼音小火车出发',mode:'blend',items:['ma1','mi3','mu4','ma3','ba1','bi3','bu4','pa1','pa2','pi2','fa1','fu4'],rounds:5,intro:[],guide:'只安排已经成立的组合。混淆的音节少量复习，不按点对次数判断口头拼读。'},
  {id:'words',stage:7,title:'读懂小纸条',mode:'word',items:['rice','pen','cloth','horse','wood','eight'],rounds:4,intro:[],guide:'先让孩子看拼音试读，再出现图片。能拼出来与能理解意思分别观察。'},
  {id:'reading',stage:7,title:'一起读一句',mode:'word',items:['rocking-horse','pen','cloth','horse'],rounds:4,intro:[],shared:true,guide:'家长读“这是”，孩子接着读学过的词。可点汉字听读音；看拼音读出不等于已经认识汉字。'}
];
export const STAGES = [
  {id:1,title:'两个新朋友',sub:'a · o',icon:'mail'},
  {id:2,title:'再认识一个',sub:'a · o · e',icon:'flower'},
  {id:3,title:'声音有高低',sub:'四声',icon:'path'},
  {id:4,title:'更多韵母朋友',sub:'i · u · ü',icon:'leaf'},
  {id:5,title:'声音连起来',sub:'m · b',icon:'train'},
  {id:6,title:'换一换，拼一拼',sub:'p · f',icon:'star'},
  {id:7,title:'读懂小小世界',sub:'词语 · 亲子共读',icon:'basket'}
];
export function vowelSound(letter,tone=1){return ({i:'yi',u:'wu',ü:'yu'}[letter]||letter)+tone;}
export function itemInfo(mode,id){
  if(mode==='mail') return {id,label:id,sounds:[LETTERS[id].sound]};
  if(mode==='tone') {const vowel=id.slice(0,-1),tone=Number(id.slice(-1));return {id,label:VOWELS[vowel][tone-1],vowel,tone,sounds:[vowelSound(vowel,tone)]};}
  if(mode==='blend'){const item=SYLLABLES.find(x=>x.id===id);return {...item,sounds:[item.sound]};}
  return {...WORDS.find(x=>x.id===id),label:WORDS.find(x=>x.id===id)?.pinyin};
}
